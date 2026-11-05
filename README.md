# Backend business card

[![Verify](https://github.com/shellf1sh/backend-business-card/actions/workflows/verify.yml/badge.svg)](https://github.com/shellf1sh/backend-business-card/actions/workflows/verify.yml)

A small, read-only digital business card: profile, professional links, skills, work experience and projects. TypeScript, Node.js, NestJS, GraphQL, Apollo Sandbox, Prisma, PostgreSQL and Docker.

## Live demo

[Open Apollo Sandbox](https://backend-business-card.onrender.com/graphql)

No account or token is required. The complete `BusinessCard` query is prefilled; run it to read the profile and related data. The original query from the assignment also works unchanged.

The demo uses Free Render resources. A first request after inactivity can take about a minute while the service starts. See the hosting section for the temporary database's lifetime.

## Start from a clean checkout

Requirements: Node.js 24+ with npm, Docker Engine and Docker Compose v2.

```sh
npm run demo:up
```

Open **http://localhost:3100/graphql**. Apollo Sandbox contains the example query below. No account or token is needed. The first build downloads the base images and dependencies.

This command creates a random database password in `~/.config/backend-business-card/compose.env` with owner-only permissions. The configuration stays outside the checkout and Docker build context. It then builds the image, waits for PostgreSQL, applies committed migrations, seeds the profile and waits for API readiness. The database has no published port; the application is bound to localhost.

Useful commands:

```sh
npm run demo:logs
npm run demo:down
```

Stopping the demo preserves its database volume. Running `demo:up` again applies any pending migrations and restores the deterministic example dataset. To change the HTTP port, edit `APP_PORT` in the private configuration file.

## Query the API

Endpoint: `POST /graphql`. The root URL redirects to the Sandbox.

```graphql
query BusinessCard {
  profile {
    name
    description
    links {
      label
      url
    }
    skills {
      name
    }
    experience {
      company
      position
      startDate
      endDate
      achievements
    }
    projects {
      name
      description
      url
      repositoryUrl
      technologies
    }
  }
}
```

The shorter query from the assignment works unchanged:

```graphql
query {
  profile {
    name
    description
    skills {
      name
    }
    experience {
      company
      position
    }
    projects {
      name
    }
  }
}
```

Dates represent months: the first day of the month at midnight UTC. A null `endDate` means a current role. A null `repositoryUrl` means the project source is private. `profile` itself is nullable if its dataset has not been initialized; an initialized dataset exposes non-null lists in a stable, explicit order.

## Architecture and decisions

```text
GraphQL request
  -> ProfileResolver: transport and requested relations
  -> ProfileService: public-profile use case
  -> ProfileRepository: Prisma selection and ordering
  -> PostgreSQL
```

- **One small domain module.** The resolver does not access Prisma, and the repository does not know about GraphQL. The service is deliberately thin because the use case currently has no editing workflow or complex business rules. Database lifecycle and health endpoints are separate from the profile module.
- **Code-first GraphQL.** Decorated transport models generate the schema. They expose only public fields; internal IDs, ordering columns and foreign keys stay out of the API. The database and API models can evolve independently.
- **Selection-aware relation loading.** The resolver parses the actual GraphQL selection, including aliases, fragments and `@skip`/`@include` directives. The repository fetches only requested collections. There are no per-item database resolvers.
- **Bounded database work.** With Prisma's standard relation query strategy, `profile { name }` uses one SELECT. Adding `skills` uses two. Requesting all four collections uses five SELECTs: one parent query and one bulk query per collection. Adding 100 skills does not increase the query count; an integration test measures this against PostgreSQL. This avoids a query per child without introducing a preview ORM feature. A future query that lists many profiles would warrant revisiting batching or joins; it is outside this single-profile API.
- **Prisma migrations, not schema synchronization at runtime.** The initial migration is committed. The entrypoint runs `prisma migrate deploy` and the compiled seed before starting the server. A failed migration or seed stops startup instead of serving an incomplete application.
- **Deterministic, atomic seeding.** `prisma/profile.json` is the source for this demo's public content. The seed uses stable IDs, an upsert and bulk replacement of the four collections inside one transaction. It owns only the `primary` profile and preserves unrelated profiles. A transaction-level PostgreSQL advisory lock serializes concurrent initializers. Repeated runs produce the same data and IDs. Editing seeded rows directly is intentionally temporary: the next start restores the checked-in dataset.
- **Simple relational model.** Profile collections have foreign keys and indexes for profile-specific ordering. A skill name and a professional link label are unique within a profile. Achievement and technology lists are scalar arrays because the API does not search or manage their items independently.
- **Read-only public data.** No mutations or private contacts are exposed. Authentication and a separate frontend would not add value to this assignment. Introspection and Apollo Sandbox are explicitly enabled in production mode so the reviewer can explore the schema.
- **Operational limits.** HTTP body size and GraphQL operation complexity are limited; HTTP query batching is disabled. Standard introspection remains available. Unexpected errors return a generic message without connection details or stack traces. A small database pool and query timeout bound resource use. These measures are appropriate for a demo; an internet-facing production service would also use its hosting provider's traffic limits.
- **Container lifecycle.** A multi-stage build compiles TypeScript and generates Prisma Client. The runtime runs as an unprivileged user and omits development dependencies. The Prisma CLI remains a production dependency because the entrypoint applies migrations. Node receives termination signals directly through `exec` and Nest closes the database pool on shutdown.

## Verification

Local compilation and focused unit tests:

```sh
npm ci
npm run verify
```

Full integration checks in a separate disposable PostgreSQL environment:

```sh
npm run demo:test
```

The integration command builds the verification image, prepares a fresh database and exercises the real HTTP/GraphQL API. It checks content, dates, nullable fields, repeated seeding, stable IDs, preservation of unrelated data, measured query counts, aliases/fragments/directives, Sandbox/introspection, rejected queries, error redaction and health status. The test Docker project and its disposable volume are removed afterward; the demo database is separate.

Manual cold-start check: run `demo:up`, execute the example query in Sandbox, run `demo:down`, then run `demo:up` again and repeat the query. `/health/live` reports process liveness; `/health/ready` returns success only when the seeded profile can be read from PostgreSQL.

## Run without the application container

Provide `DATABASE_URL` through your shell or a private environment file. `.env.example` describes the variables but contains no usable credential.

```sh
npm ci
npm run build
npm start
```

`npm start` applies migrations and seeds the database before starting the compiled application. `npm run start:prepared` is an alias. The separate `db:migrate` and `db:seed` commands are available for maintenance. For development, rebuild after changes; keep migrations under version control. Integration tests deliberately require `ALLOW_DATABASE_TESTS=1` and must only target a disposable database.

## Hosting

The optional `render.yaml` Blueprint describes a Free Docker web service and a separate Free PostgreSQL 17 database in the same region. The connection URL is supplied by Render, and external database connections are blocked. Automatic redeploys are disabled. Publishing this file does not create hosting resources.

[Review the Render deployment](https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2Fshellf1sh%2Fbackend-business-card)

Before creating resources, review [Render's Free instance limitations](https://render.com/docs/free): the web service sleeps after 15 minutes without traffic, and a Free database expires after 30 days. This option is for a temporary assignment demo. Review the actual plan and any billing settings in the deployment screen before proceeding.

Deploy the Dockerfile's final `runtime` stage on a container host with a dedicated PostgreSQL database. Set `DATABASE_URL` to that database's connection URL and `PORT` if the host requires it; use the provider's prescribed TLS configuration. Configure the health check as `/health/ready`. The normal container entrypoint prepares the database automatically. Do not put database credentials in the repository or build arguments.

Share the public `/graphql` URL and the repository URL with the reviewer. A remote deployment requires a running backend host; the included Compose setup is for local review.

## Scope

The project implements the seven technologies explicitly required by the test and uses PostgreSQL from the vacancy stack. S3 uploads are not part of the requested business card. There is no admin panel, mutation API, file upload, artificial performance claim or external paid service dependency.

The seed records the latest role as current, as in the approved resume. Brand Map is identified as team work with a specific personal contribution. The mini-CRM links to the existing public demo and source repository.

Implementation references: [NestJS GraphQL](https://docs.nestjs.com/graphql/quick-start), [Prisma v7 relation queries](https://www.prisma.io/docs/orm/v7/prisma-client/queries/relation-queries), [Prisma v7 seeding](https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/seeding), [Apollo Sandbox landing page](https://www.apollographql.com/docs/apollo-server/api/plugin/landing-pages).
