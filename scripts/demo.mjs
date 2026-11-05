import { randomBytes } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const action = process.argv[2];
if (!['up', 'down', 'logs', 'test'].includes(action)) {
  throw new Error('Use up, down, logs or test.');
}
const root = fileURLToPath(new URL('..', import.meta.url));
const config = join(homedir(), '.config', 'backend-business-card', 'compose.env');
if (!existsSync(config)) {
  mkdirSync(dirname(config), { recursive: true, mode: 0o700 });
  writeFileSync(
    config,
    `POSTGRES_PASSWORD=${randomBytes(24).toString('hex')}\nAPP_PORT=${process.env.APP_PORT ?? '3100'}\n`,
    { flag: 'wx', mode: 0o600 },
  );
  console.log('Created private local configuration outside the repository.');
}
chmodSync(config, 0o600);

const project = action === 'test' ? 'backend-business-card-tests' : 'backend-business-card';
const base = ['compose', '--project-name', project, '--env-file', config];
function compose(args) {
  const result = spawnSync('docker', [...base, ...args], { cwd: root, stdio: 'inherit' });
  if (result.error) throw result.error;
  return result.status ?? 1;
}

if (action === 'up') {
  process.exitCode = compose(['up', '--build', '-d', '--wait', '--wait-timeout', '120']);
  if (!process.exitCode) {
    const appPort = /^APP_PORT=(\d+)$/m.exec(readFileSync(config, 'utf8'))?.[1] ?? '3100';
    console.log(`Apollo Sandbox: http://localhost:${appPort}/graphql`);
  }
} else if (action === 'down') {
  process.exitCode = compose(['down']);
} else if (action === 'logs') {
  process.exitCode = compose(['logs', '--tail', '100', 'app']);
} else {
  console.log('Running integration tests against a separate disposable Docker project.');
  try {
    process.exitCode = compose(['--profile', 'verification', 'run', '--build', '--rm', 'verify']);
  } finally {
    const cleanup = compose(['--profile', 'verification', 'down', '--volumes']);
    if (!process.exitCode) process.exitCode = cleanup;
  }
}
