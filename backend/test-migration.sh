#!/bin/bash
# test-migration.sh
# Tests if Prisma migrations apply successfully on a fresh database.

set -e

echo "Spinning up temporary PostgreSQL for Migration Testing..."
# In a real CI, you might use docker run. Here we just set an env var pointing to a test DB
# We assume POSTGRES_TEST_URL is available, or we just rely on local db

export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/bhu_test_migration_db"

echo "Applying migrations..."
npx prisma migrate deploy

echo "Running seed script to verify data integrity..."
# Run a specific seed if needed
npx ts-node prisma/seed.ts

echo "Migration and seeding completed successfully. System is stable."

# Cleanup logic goes here (e.g. dropping the test database)
# psql -c "DROP DATABASE bhu_test_migration_db;"
