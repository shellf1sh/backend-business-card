import { Info, Query, Resolver } from '@nestjs/graphql';
import { GraphQLResolveInfo } from 'graphql';
import { ProfileService } from '../profile.service.js';
import { Profile } from './profile.model.js';
import { selectedRelations } from './profile-selection.js';

@Resolver(() => Profile)
export class ProfileResolver {
  constructor(private readonly profiles: ProfileService) {}

  @Query(() => Profile, { nullable: true, description: 'The public digital business card.' })
  profile(@Info() info: GraphQLResolveInfo): Promise<Profile | null> {
    return this.profiles.getPublicProfile(selectedRelations(info));
  }
}
