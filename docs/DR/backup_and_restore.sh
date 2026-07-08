#!/bin/bash
# backup_and_restore.sh
# Standard script for DR backups

ACTION=$1

if [ "$ACTION" == "backup" ]; then
  echo "Taking full database backup..."
  pg_dump postgresql://postgres:postgres@localhost:5432/bhu_db > /tmp/bhu_db_backup_$(date +%F).sql
  echo "Uploading to Secure Storage (Mock)..."
  # aws s3 cp /tmp/bhu_db_backup_$(date +%F).sql s3://bhu-email-portal-backups/
  echo "Backup successful."

elif [ "$ACTION" == "restore" ]; then
  BACKUP_FILE=$2
  if [ -z "$BACKUP_FILE" ]; then
    echo "Error: Must provide backup file path to restore."
    exit 1
  fi
  echo "Restoring database from $BACKUP_FILE..."
  psql postgresql://postgres:postgres@localhost:5432/bhu_db < $BACKUP_FILE
  echo "Restore completed successfully."

else
  echo "Usage: ./backup_and_restore.sh [backup|restore <file>]"
fi
