import { Injectable } from '@nestjs/common';
import { ProfileRepository } from './profile.repository.js';
import { ProfileRelations, ProfileView } from './profile.types.js';

@Injectable()
export class ProfileService {
  constructor(private readonly repository: ProfileRepository) {}

  getPublicProfile(relations: ProfileRelations): Promise<ProfileView | null> {
    return this.repository.findPublicProfile(relations);
  }
}
