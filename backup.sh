#!/bin/bash
export PGPASSWORD=securepassword
BACKUP_DIR="$(pwd)/backups"

echo "Creating backup directory if it doesn't exist..."
mkdir -p "$BACKUP_DIR"

echo "Starting database backup..."
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="$BACKUP_DIR/bhu_db_backup_$TIMESTAMP.sql"

docker exec -i bhu_db pg_dump -U bhu_user bhu_db > "$BACKUP_FILE"

echo "Backup completed successfully: $BACKUP_FILE"
echo ""
echo "For 1-second interval WAL archiving, refer to documents/Comprehensive_Admin_Manual.md"
