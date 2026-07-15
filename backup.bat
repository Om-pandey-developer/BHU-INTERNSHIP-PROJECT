@echo off
setlocal

:: Format date and time for the backup filename
set TIMESTAMP=%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%
set TIMESTAMP=%TIMESTAMP: =0%

set BACKUP_DIR=C:\Users\harid\OneDrive\Desktop\BHU-INTERNSHIP-PROJECT\backups
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

set BACKUP_FILE=%BACKUP_DIR%\bhu_db_backup_%TIMESTAMP%.sql

echo Starting database backup...
docker exec bhu_db pg_dump -U bhu_user -d bhu_db > "%BACKUP_FILE%"

if %ERRORLEVEL% equ 0 (
    echo Backup successful: %BACKUP_FILE%
) else (
    echo Backup failed!
)
