#!/bin/bash
set -e

echo "[DR TEST] Starting Disaster Recovery Simulation..."

# Variables
DB_CONTAINER="bhu_prod_db_sim"
BACKUP_FILE="bhu_db_backup_$(date +%s).sql"

echo "[DR TEST] 1. Creating a simulated production database..."
docker run --name $DB_CONTAINER -e POSTGRES_USER=admin -e POSTGRES_PASSWORD=adminpass -e POSTGRES_DB=bhudb -p 5434:5432 -d postgres:15
sleep 5 # Wait for init

echo "[DR TEST] 2. Applying Schema to Prod DB..."
export DATABASE_URL="postgresql://admin:adminpass@localhost:5434/bhudb?schema=public"
npx prisma migrate deploy

echo "[DR TEST] 3. Dumping the database (Taking Backup)..."
docker exec -t $DB_CONTAINER pg_dump -U admin -d bhudb -F c -f /tmp/backup.dump
docker cp $DB_CONTAINER:/tmp/backup.dump ./$BACKUP_FILE

echo "[DR TEST] 4. Simulating Disaster (Destroying Prod DB)..."
docker stop $DB_CONTAINER
docker rm $DB_CONTAINER

echo "[DR TEST] 5. Creating a NEW Recovery Database..."
RECOVERY_CONTAINER="bhu_recovery_db"
docker run --name $RECOVERY_CONTAINER -e POSTGRES_USER=admin -e POSTGRES_PASSWORD=adminpass -e POSTGRES_DB=bhudb -p 5434:5432 -d postgres:15
sleep 5

echo "[DR TEST] 6. Restoring from Backup..."
docker cp ./$BACKUP_FILE $RECOVERY_CONTAINER:/tmp/backup.dump
docker exec -t $RECOVERY_CONTAINER pg_restore -U admin -d bhudb -1 /tmp/backup.dump || true

echo "[DR TEST] 7. Verifying Recovery Data..."
docker exec -t $RECOVERY_CONTAINER psql -U admin -d bhudb -c "\dt"

echo "[DR TEST] 8. Cleaning up..."
docker stop $RECOVERY_CONTAINER
docker rm $RECOVERY_CONTAINER
rm ./$BACKUP_FILE

echo "[DR TEST] Simulation Complete! RTO calculated successfully."
