import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { AppController } from './app.controller.js';
import { DatabaseModule } from './database/database.module.js';
import { EXAMPLE_QUERY } from './example-query.js';
import { HealthController } from './health.controller.js';
import { ProfileModule } from './profile/profile.module.js';
import { queryComplexityPlugin } from './query-complexity.plugin.js';

@Module({
  imports: [
    DatabaseModule,
    ProfileModule,
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      sortSchema: true,
      path: '/graphql',
      playground: false,
      introspection: true,
      includeStacktraceInErrorResponses: false,
      allowBatchedHttpRequests: false,
      parseOptions: { maxTokens: 10000 },
      plugins: [
        queryComplexityPlugin(),
        ApolloServerPluginLandingPageLocalDefault({
          embed: { runTelemetry: false },
          document: EXAMPLE_QUERY,
          footer: false,
        }),
      ],
      formatError(error) {
        if (error.extensions?.code === 'INTERNAL_SERVER_ERROR') {
          return {
            message: 'Unable to load the profile.',
            extensions: { code: 'INTERNAL_SERVER_ERROR' },
          };
        }
        return error;
      },
    }),
  ],
  controllers: [AppController, HealthController],
})
export class AppModule {}
