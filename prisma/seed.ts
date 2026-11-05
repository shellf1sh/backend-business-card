import 'dotenv/config';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { databaseUrl } from '../src/config.js';
import { createPrismaClient, DatabaseClient } from '../src/database/prisma-client.js';
import profile from './profile.json' with { type: 'json' };

export async function seedProfile(client: DatabaseClient): Promise<void> {
  await client.$transaction(async (tx) => {
    // Serialize concurrent initializers for this one owned demo profile.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(719111)`;
    const { id, name, description } = profile;
    await tx.profile.upsert({
      where: { id },
      create: { id, name, description },
      update: { name, description },
    });

    // Stable IDs and bulk replacement make repeated seeding deterministic.
    // Only this profile's collections are owned by the seed.
    await tx.professionalLink.deleteMany({ where: { profileId: id } });
    await tx.skill.deleteMany({ where: { profileId: id } });
    await tx.experience.deleteMany({ where: { profileId: id } });
    await tx.project.deleteMany({ where: { profileId: id } });

    await tx.professionalLink.createMany({
      data: profile.links.map(({ key, ...link }, sortOrder) => ({
        ...link,
        id: `${id}:link:${key}`,
        profileId: id,
        sortOrder,
      })),
    });
    await tx.skill.createMany({
      data: profile.skills.map((name, sortOrder) => ({
        id: `${id}:skill:${name}`,
        name,
        profileId: id,
        sortOrder,
      })),
    });
    await tx.experience.createMany({
      data: profile.experience.map(({ key, startDate, endDate, ...item }, sortOrder) => ({
        ...item,
        id: `${id}:experience:${key}`,
        startDate: new Date(`${startDate}T00:00:00Z`),
        endDate: endDate ? new Date(`${endDate}T00:00:00Z`) : null,
        profileId: id,
        sortOrder,
      })),
    });
    await tx.project.createMany({
      data: profile.projects.map(({ key, ...project }, sortOrder) => ({
        ...project,
        id: `${id}:project:${key}`,
        profileId: id,
        sortOrder,
      })),
    });
  });
}

async function main(): Promise<void> {
  const client = createPrismaClient(databaseUrl());
  try {
    await seedProfile(client);
    const saved = await client.profile.findUniqueOrThrow({
      where: { id: profile.id },
      select: {
        _count: { select: { links: true, skills: true, experience: true, projects: true } },
      },
    });
    console.log('Profile prepared:', saved._count);
  } finally {
    await client.$disconnect();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch(() => {
    console.error('Database seeding failed. Startup has been stopped.');
    process.exitCode = 1;
  });
}
