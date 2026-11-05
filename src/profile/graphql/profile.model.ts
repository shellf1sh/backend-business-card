import { Field, GraphQLISODateTime, ObjectType } from '@nestjs/graphql';

@ObjectType({ description: 'A public professional link.' })
export class ProfessionalLink {
  @Field()
  label!: string;

  @Field()
  url!: string;
}

@ObjectType()
export class Skill {
  @Field()
  name!: string;
}

@ObjectType()
export class Experience {
  @Field()
  company!: string;

  @Field()
  position!: string;

  @Field(() => GraphQLISODateTime, { description: 'First day of the starting month, UTC.' })
  startDate!: Date;

  @Field(() => GraphQLISODateTime, {
    nullable: true,
    description: 'First day of the ending month, UTC. Null means the role is current.',
  })
  endDate!: Date | null;

  @Field(() => [String])
  achievements!: string[];
}

@ObjectType()
export class Project {
  @Field()
  name!: string;

  @Field()
  description!: string;

  @Field()
  url!: string;

  @Field(() => String, { nullable: true, description: 'Null for closed-source work.' })
  repositoryUrl!: string | null;

  @Field(() => [String])
  technologies!: string[];
}

@ObjectType({ description: 'Public professional information. Read-only.' })
export class Profile {
  @Field()
  name!: string;

  @Field()
  description!: string;

  @Field(() => [ProfessionalLink])
  links?: ProfessionalLink[];

  @Field(() => [Skill])
  skills?: Skill[];

  @Field(() => [Experience])
  experience?: Experience[];

  @Field(() => [Project])
  projects?: Project[];
}
