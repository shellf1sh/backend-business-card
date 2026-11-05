import 'reflect-metadata';
import 'dotenv/config';
import { port } from './config.js';
import { createApplication } from './create-app.js';

async function bootstrap(): Promise<void> {
  const app = await createApplication();
  app.enableShutdownHooks();
  await app.listen(port(), '0.0.0.0');
  console.log(`Apollo Sandbox is available at /graphql on port ${port()}.`);
}

bootstrap().catch(() => {
  console.error('Application startup failed. Check the database and configuration.');
  process.exitCode = 1;
});
