import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { ProfileRelations, ProfileView } from './profile.types.js';

@Injectable()
export class ProfileRepository {
  constructor(private readonly database: DatabaseService) {}

  findPublicProfile(relations: ProfileRelations): Promise<ProfileView | null> {
    return this.database.client.profile.findUnique({
      where: { id: 'primary' },
      select: {
        name: true,
        description: true,
        links: relations.links && {
          orderBy: { sortOrder: 'asc' },
          select: { label: true, url: true },
        },
        skills: relations.skills && {
          orderBy: { sortOrder: 'asc' },
          select: { name: true },
        },
        experience: relations.experience && {
          orderBy: { sortOrder: 'asc' },
          select: {
            company: true,
            position: true,
            startDate: true,
            endDate: true,
            achievements: true,
          },
        },
        projects: relations.projects && {
          orderBy: { sortOrder: 'asc' },
          select: {
            name: true,
            description: true,
            url: true,
            repositoryUrl: true,
            technologies: true,
          },
        },
      },
    });
  }
}
