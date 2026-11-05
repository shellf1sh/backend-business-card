import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { ProfileResolver } from './graphql/profile.resolver.js';
import { ProfileRepository } from './profile.repository.js';
import { ProfileService } from './profile.service.js';

@Module({
  imports: [DatabaseModule],
  providers: [ProfileResolver, ProfileService, ProfileRepository],
})
export class ProfileModule {}
