import type { ApolloServerPlugin } from '@apollo/server';
import { GraphQLError } from 'graphql';
// Use the same GraphQL runtime as Nest and Apollo, rather than graphql/index.mjs.
import { getComplexity, simpleEstimator } from 'graphql-query-complexity/cjs';

export function queryComplexityPlugin(maximumComplexity = 200): ApolloServerPlugin {
  return {
    async requestDidStart() {
      return {
        async didResolveOperation({ schema, document, operationName, request }) {
          const complexity = getComplexity({
            schema,
            query: document,
            operationName: operationName ?? undefined,
            variables: request.variables,
            estimators: [
              ({ field }) => (field.name.startsWith('__') ? 0 : undefined),
              simpleEstimator({ defaultComplexity: 1 }),
            ],
          });
          if (complexity > maximumComplexity) {
            throw new GraphQLError(
              `The query exceeds the maximum complexity of ${maximumComplexity}.`,
              {
                extensions: { code: 'QUERY_TOO_COMPLEX', http: { status: 400 } },
              },
            );
          }
        },
      };
    },
  };
}
