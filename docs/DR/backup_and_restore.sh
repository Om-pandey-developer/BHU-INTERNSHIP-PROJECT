#!/bin/bash
# ==============================================================================
# BHU Email Portal - Automated Backup & Restore Script
# Description: Handles PostgreSQL database backups, compression, and restoration.
# Intended for cron execution and manual DR scenarios.
# ==============================================================================

# --- Configuration ---
DB_URL=${DATABASE_URL:-"postgresql://bhu_admin:bhu_secure_password_2024@localhost:5433/bhu_email_portal"}
BACKUP_DIR="/var/backups/bhu_portal"
RETENTION_DAYS=7
TIMESTAMP=$(date +"%Y-%m-%d_%H%M")
BACKUP_FILE="${BACKUP_DIR}/bhu_db_backup_${TIMESTAMP}.sql.gz"

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

ACTION=$1

log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

if [ "$ACTION" == "backup" ]; then
  log "Starting database backup..."
  
  # Dump and compress
  if pg_dump "$DB_URL" | gzip > "$BACKUP_FILE"; then
    log "Backup successful: $BACKUP_FILE"
    
    # Optional: Sync to off-site cloud storage (Uncomment and configure if AWS CLI is available)
    # log "Syncing to secure off-site storage (AWS S3)..."
    # aws s3 cp "$BACKUP_FILE" s3://bhu-dr-backups/ --quiet
    
    # Clean up old backups (older than RETENTION_DAYS)
    log "Cleaning up local backups older than $RETENTION_DAYS days..."
    find "$BACKUP_DIR" -name "*.sql.gz" -type f -mtime +$RETENTION_DAYS -exec rm -f {} \;
    
    log "Backup routine completed."
  else
    log "ERROR: Database backup failed!"
    exit 1
  fi

elif [ "$ACTION" == "restore" ]; then
  RESTORE_FILE=$2
  
  if [ -z "$RESTORE_FILE" ]; then
    log "ERROR: You must provide a backup file path to restore."
    echo "Usage: ./backup_and_restore.sh restore /path/to/backup.sql.gz"
    exit 1
  fi

  if [ ! -f "$RESTORE_FILE" ]; then
    log "ERROR: Backup file '$RESTORE_FILE' does not exist."
    exit 1
  fi

  log "WARNING: This will overwrite the current database."
  read -p "Are you sure you want to proceed with restore? (y/N) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    log "Restoring database from $RESTORE_FILE..."
    
    # Decompress and restore
    if gunzip -c "$RESTORE_FILE" | psql "$DB_URL"; then
      log "Restore completed successfully."
    else
      log "ERROR: Database restore encountered errors."
      exit 1
    fi
  else
    log "Restore aborted by user."
    exit 0
  fi

else
  echo "=========================================="
  echo " BHU Email Portal Backup Utility"
  echo "=========================================="
  echo "Usage:"
  echo "  ./backup_and_restore.sh backup"
  echo "  ./backup_and_restore.sh restore <file_path.sql.gz>"
  echo "=========================================="
fi
