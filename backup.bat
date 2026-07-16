@echo off
set PGPASSWORD=securepassword
set BACKUP_DIR=C:\Users\Lenovo\OneDrive\Desktop\BHU INTERNSHIP PROJECT\backups

echo Creating backup directory if it doesn't exist...
mkdir "%BACKUP_DIR%" 2>nul

echo Starting database backup...
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c-%%a-%%b)
for /f "tokens=1-2 delims=/:" %%a in ('time /t') do (set mytime=%%a%%b)
set BACKUP_FILE=%BACKUP_DIR%\bhu_db_backup_%mydate%_%mytime%.sql

docker exec -i bhu_db pg_dump -U bhu_user bhu_db > "%BACKUP_FILE%"

echo Backup completed successfully: %BACKUP_FILE%
echo.
echo For 1-second interval WAL archiving, refer to the documents/Comprehensive_Admin_Manual.md.
pause
