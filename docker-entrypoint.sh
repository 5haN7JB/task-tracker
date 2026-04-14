#!/bin/sh
set -e

# Run DB setup/seed (idempotent — uses CREATE TABLE IF NOT EXISTS + ON CONFLICT DO UPDATE)
echo "Running database setup..."
node lib/db/scripts/setup-local-sqlite.mjs

echo "Starting server..."
exec node artifacts/api-server/dist/index.mjs
