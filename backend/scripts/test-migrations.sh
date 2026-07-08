#!/bin/bash
set -e

echo "[MIGRATION TEST] Starting database migration test..."

# Ensure we're using a test database string
export DATABASE_URL="postgresql://testuser:testpass@localhost:5433/testdb?schema=public"

echo "[MIGRATION TEST] Spinning up a temporary PostgreSQL container..."
docker run --name bhu_test_db -e POSTGRES_USER=testuser -e POSTGRES_PASSWORD=testpass -e POSTGRES_DB=testdb -p 5433:5432 -d postgres:15

# Wait for DB to be ready
echo "[MIGRATION TEST] Waiting for database to initialize..."
sleep 5

echo "[MIGRATION TEST] Running Prisma Migrations..."
npx prisma migrate deploy

echo "[MIGRATION TEST] Running Database Seed..."
npx prisma db seed

echo "[MIGRATION TEST] Migrations and Seeding Successful!"

echo "[MIGRATION TEST] Cleaning up..."
docker stop bhu_test_db
docker rm bhu_test_db

echo "[MIGRATION TEST] Done."
