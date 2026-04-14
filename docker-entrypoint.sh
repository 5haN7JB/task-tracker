#!/bin/sh
set -e

# Wait for /data to be writable (Railway mounts volume asynchronously)
echo "Waiting for /data volume..."
RETRIES=15
until [ -w /data ] || [ $RETRIES -eq 0 ]; do
  echo "  /data not writable yet, retrying... ($RETRIES left)"
  sleep 2
  RETRIES=$((RETRIES - 1))
done

if [ ! -w /data ]; then
  echo "WARNING: /data is not writable — using fallback /tmp/db.sqlite"
  export DATABASE_URL="file:/tmp/db.sqlite"
fi

echo "DATABASE_URL=$DATABASE_URL"

# Run DB setup/seed (idempotent — CREATE TABLE IF NOT EXISTS + ON CONFLICT DO UPDATE)
echo "Running database setup..."
node lib/db/scripts/setup-local-sqlite.mjs

echo "Starting server..."
exec node artifacts/api-server/dist/index.mjs
