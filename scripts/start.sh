#!/bin/sh
set -eu

./node_modules/.bin/prisma migrate deploy
node dist/prisma/seed.js
exec "$@"
