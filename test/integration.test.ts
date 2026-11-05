import 'reflect-metadata';
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { INestApplication } from '@nestjs/common';
import { getIntrospectionQuery } from 'graphql';
import { seedProfile } from '../prisma/seed.js';
import fixture from '../prisma/profile.json' with { type: 'json' };
import { createApplication } from '../src/create-app.js';
import { DatabaseService } from '../src/database/database.service.js';
import { EXAMPLE_QUERY } from '../src/example-query.js';
import { ProfileRepository } from '../src/profile/profile.repository.js';

if (process.env.ALLOW_DATABASE_TESTS !== '1') {
  throw new Error('Integration tests require a disposable database. Use npm run demo:test.');
}

let app: INestApplication;
let database: DatabaseService;
let url: string;
const sql: string[] = [];

before(async () => {
  app = await createApplication({ logger: false });
  await app.listen(0, '127.0.0.1');
  url = await app.getUrl();
  database = app.get(DatabaseService);
  database.client.$on('query', (event) => sql.push(event.query));
});

after(async () => {
  await app?.close();
});

async function query(document: string, variables: Record<string, unknown> = {}) {
  const response = await fetch(`${url}/graphql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: document, variables }),
  });
  const body = (await response.json()) as {
    data?: Record<string, any>;
    errors?: { message: string; extensions?: Record<string, unknown> }[];
  };
  return { response, body };
}

async function snapshot() {
  return database.client.profile.findUniqueOrThrow({
    where: { id: fixture.id },
    include: {
      links: { orderBy: { sortOrder: 'asc' } },
      skills: { orderBy: { sortOrder: 'asc' } },
      experience: { orderBy: { sortOrder: 'asc' } },
      projects: { orderBy: { sortOrder: 'asc' } },
    },
  });
}

test('the complete business card matches the seeded public data', async () => {
  const { response, body } = await query(EXAMPLE_QUERY);
  assert.equal(response.status, 200);
  assert.equal(body.errors, undefined);
  const profile = body.data?.profile;
  assert.equal(profile.name, fixture.name);
  assert.deepEqual(
    profile.skills.map((skill: { name: string }) => skill.name),
    fixture.skills,
  );
  assert.deepEqual(
    profile.experience.map((item: { company: string }) => item.company),
    fixture.experience.map((item) => item.company),
  );
  assert.equal(profile.experience[0].endDate, null);
  assert.equal(profile.experience[0].startDate, '2026-04-01T00:00:00.000Z');
  assert.equal(profile.projects[0].repositoryUrl, null);
  assert.equal(profile.projects[1].repositoryUrl, fixture.projects[1]?.repositoryUrl);
  assert.equal(profile.links.length, fixture.links.length);
});

test('seeding is repeatable, preserves stable IDs and leaves other profiles untouched', async () => {
  const original = await snapshot();
  await database.client.profile.create({
    data: {
      id: 'integration-control',
      name: 'Control',
      description: 'Not owned by the seed.',
      skills: { create: { id: 'control-skill', name: 'Control', sortOrder: 0 } },
    },
  });
  try {
    await seedProfile(database.client);
    await seedProfile(database.client);
    assert.deepEqual(await snapshot(), original);
    assert.equal(await database.client.skill.count({ where: { id: 'control-skill' } }), 1);
  } finally {
    await database.client.profile.delete({ where: { id: 'integration-control' } });
  }
});

test('relation reads are selection-aware and do not grow with collection size', async () => {
  async function reads(document: string): Promise<number> {
    sql.length = 0;
    const { body } = await query(document);
    assert.equal(body.errors, undefined);
    return sql.filter((statement) => /^SELECT\b/i.test(statement.trim())).length;
  }
  const scalar = await reads('{ profile { name } }');
  const skills = await reads('{ profile { skills { name } } }');
  const full = await reads(EXAMPLE_QUERY);
  assert.equal(scalar, 1);
  assert.equal(skills, 2);
  assert.equal(full, 5);
  await database.client.skill.createMany({
    data: Array.from({ length: 100 }, (_, index) => ({
      id: `query-count-${index}`,
      name: `Query count ${index}`,
      profileId: fixture.id,
      sortOrder: 1000 + index,
    })),
  });
  try {
    assert.equal(await reads(EXAMPLE_QUERY), full);
  } finally {
    await database.client.skill.deleteMany({ where: { id: { startsWith: 'query-count-' } } });
  }
  console.log(
    `Measured SELECTs: scalar=${scalar}, skills=${skills}, full=${full}; +100 rows unchanged.`,
  );
});

test('a fragment with aliases works over HTTP and skipped relations are not queried', async () => {
  sql.length = 0;
  const { body } = await query(
    `query ($skip: Boolean!) {
      card: profile {
        ...Summary
        knowledge: skills @skip(if: $skip) { name }
      }
    }
    fragment Summary on Profile { name }`,
    { skip: true },
  );
  assert.equal(body.errors, undefined);
  assert.deepEqual(body.data?.card, { name: fixture.name });
  assert.equal(sql.filter((statement) => /^SELECT\b/i.test(statement.trim())).length, 1);
});

test('the production-mode landing page and introspection needed by Sandbox are enabled', async () => {
  const response = await fetch(`${url}/graphql`, { headers: { Accept: 'text/html' } });
  assert.equal(response.status, 200);
  assert.match(await response.text(), /apollo/i);
  const { body } = await query(getIntrospectionQuery());
  assert.equal(body.errors, undefined);
  assert.equal(body.data?.__schema.queryType.name, 'Query');
  assert.equal(body.data?.__schema.mutationType, null);
});

test('unknown fields, oversized query complexity and HTTP batching fail before database reads', async () => {
  sql.length = 0;
  const invalid = await query('{ profile { unknownField } }');
  assert.equal(invalid.response.status, 400);
  assert.ok(invalid.body.errors?.length);
  const aliases = Array.from({ length: 110 }, (_, index) => `p${index}: profile { name }`).join(
    ' ',
  );
  const expensive = await query(`{ ${aliases} }`);
  assert.equal(expensive.response.status, 400);
  assert.match(expensive.body.errors?.[0]?.message ?? '', /complexity/i);
  const batched = await fetch(`${url}/graphql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([{ query: '{ profile { name } }' }]),
  });
  assert.equal(batched.status, 400);
  assert.equal(sql.length, 0);
});

test('unexpected errors do not disclose internal details', async () => {
  const repository = app.get(ProfileRepository);
  const original = repository.findPublicProfile;
  repository.findPublicProfile = async () => {
    throw new Error('private-connection-detail');
  };
  try {
    const { body } = await query('{ profile { name } }');
    assert.equal(body.data?.profile, null);
    assert.equal(body.errors?.[0]?.message, 'Unable to load the profile.');
    assert.doesNotMatch(JSON.stringify(body), /private-connection-detail|stacktrace/);
  } finally {
    repository.findPublicProfile = original;
  }
});

test('an absent profile returns null and readiness is false until it is prepared', async () => {
  await database.client.profile.delete({ where: { id: fixture.id } });
  try {
    assert.equal((await query('{ profile { name } }')).body.data?.profile, null);
    assert.equal((await fetch(`${url}/health/ready`)).status, 503);
    assert.equal((await fetch(`${url}/health/live`)).status, 200);
  } finally {
    await seedProfile(database.client);
  }
  assert.equal((await fetch(`${url}/health/ready`)).status, 200);
});
