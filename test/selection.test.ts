import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildSchema, graphql, GraphQLResolveInfo } from 'graphql';
import { selectedRelations } from '../src/profile/graphql/profile-selection.js';
import { ProfileRelations } from '../src/profile/profile.types.js';

const schema = buildSchema(`
  type Query { profile: Profile }
  type Profile {
    name: String!
    links: [Link!]!
    skills: [Skill!]!
    experience: [Experience!]!
    projects: [Project!]!
  }
  type Link { url: String! }
  type Skill { name: String! }
  type Experience { company: String! }
  type Project { name: String! }
`);

async function selection(source: string, variableValues = {}): Promise<ProfileRelations> {
  let captured: ProfileRelations | undefined;
  const result = await graphql({
    schema,
    source,
    variableValues,
    rootValue: {
      profile(_args: unknown, _context: unknown, info: GraphQLResolveInfo) {
        captured = selectedRelations(info);
        return { name: 'Test', links: [], skills: [], experience: [], projects: [] };
      },
    },
  });
  assert.equal(result.errors, undefined);
  assert.ok(captured);
  return captured;
}

test('a scalar-only query does not load any relation', async () => {
  assert.deepEqual(await selection('{ profile { name } }'), {
    links: false,
    skills: false,
    experience: false,
    projects: false,
  });
});

test('aliases, named fragments and inline fragments select actual relation names', async () => {
  assert.deepEqual(
    await selection(`
      query {
        card: profile {
          ...Basics
          knowledge: skills { name }
          ... on Profile { projects { name } }
        }
      }
      fragment Basics on Profile { links { url } }
    `),
    { links: true, skills: true, experience: false, projects: true },
  );
});

test('variable directives exclude unrequested relations', async () => {
  assert.deepEqual(
    await selection(
      `query ($withSkills: Boolean!, $skipWork: Boolean!) {
        profile {
          name
          skills @include(if: $withSkills) { name }
          experience @skip(if: $skipWork) { company }
        }
      }`,
      { withSkills: false, skipWork: true },
    ),
    { links: false, skills: false, experience: false, projects: false },
  );
});

test('merged selections of the same root field are all considered', async () => {
  assert.deepEqual(await selection('{ profile { name } profile { skills { name } } }'), {
    links: false,
    skills: true,
    experience: false,
    projects: false,
  });
});
