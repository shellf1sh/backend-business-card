import { getNamedType, GraphQLResolveInfo } from 'graphql';
import {
  parseResolveInfo,
  simplifyParsedResolveInfoFragmentWithType,
  ResolveTree,
} from 'graphql-parse-resolve-info';
import { ProfileRelations } from '../profile.types.js';

export function selectedRelations(info: GraphQLResolveInfo): ProfileRelations {
  const parsed = parseResolveInfo(info, { keepRoot: false }) as ResolveTree | null;
  if (!parsed) {
    throw new Error('The profile selection could not be parsed.');
  }
  const simplified = simplifyParsedResolveInfoFragmentWithType(
    parsed,
    getNamedType(info.returnType),
  );
  const fields = simplified.fields as Record<string, ResolveTree>;
  const requested = new Set(Object.values(fields).map((field) => field.name));
  return {
    links: requested.has('links'),
    skills: requested.has('skills'),
    experience: requested.has('experience'),
    projects: requested.has('projects'),
  };
}
