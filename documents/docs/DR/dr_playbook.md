# Disaster Recovery (DR) Playbook
**Banaras Hindu University (BHU) — Email Registration & Auto-Provisioning Portal**

## 1. Document Control & Objective
- **System:** BHU Email Portal
- **RPO (Recovery Point Objective):** 1 Hour (Maximum acceptable data loss).
- **RTO (Recovery Time Objective):** 4 Hours (Target time to restore full service).
- **Purpose:** Standard Operating Procedures (SOP) to restore the application and database in the event of hardware failure, data corruption, or catastrophic outages.

## 2. Architecture & Backup Strategy
The portal relies on the following core components:
1. **Application Servers:** Node.js (NestJS Backend) & Next.js (Frontend).
2. **Database:** PostgreSQL.
3. **Storage:** Local disk or Cloud Storage (for uploaded applicant photos and signatures).

### Automated Backups
- **Database:** A cron job runs `backup_and_restore.sh backup` every hour. Backups are stored in `/var/backups/bhu_portal` and synced to a secure off-site location (e.g., AWS S3 or a secondary BHU server).
- **Retention Policy:** Local backups are retained for 7 days. Off-site backups are retained for 30 days.

## 3. Disaster Scenarios & Response Procedures

### Scenario A: Database Corruption or Accidental Data Loss
*Symptom: The application is running, but data is missing, corrupted, or API calls return database errors.*

**Response Protocol:**
1. **Halt Operations:** Immediately stop the backend service to prevent further invalid writes.
   ```bash
   docker compose stop backend
   ```
2. **Locate Latest Good Backup:** Identify the most recent uncorrupted `.sql.gz` backup file in `/var/backups/bhu_portal/`.
3. **Execute Restore:**
   ```bash
   ./backup_and_restore.sh restore /var/backups/bhu_portal/bhu_db_backup_YYYY-MM-DD_HHMM.sql.gz
   ```
4. **Verification:** Restart the backend and verify data integrity via the CC Admin Dashboard.
   ```bash
   docker compose start backend
   ```

### Scenario B: Complete Server / Hardware Failure
*Symptom: The primary server is completely unresponsive, unreachable, or hardware has critically failed.*

**Response Protocol:**
1. **Provision Secondary Environment:** Spin up the designated standby server or provision a new VM.
2. **Clone Repository:**
   ```bash
   git clone <repository_url> /opt/bhu-email-portal
   cd /opt/bhu-email-portal
   ```
3. **Restore Environment Variables:** Copy the `.env` files from the secure password vault to the `/backend` and `/frontend` directories.
4. **Restore Database:**
   - Fetch the latest backup from the off-site storage.
   - Boot the database container: `docker compose up -d db`
   - Run the restore script (as in Scenario A).
5. **Boot Application:**
   ```bash
   docker compose up -d
   ```
6. **DNS Switch:** Update the University's DNS records to point `email-portal.bhu.ac.in` to the new server's IP address.

## 4. Escalation Matrix
If a disaster cannot be resolved within 2 hours, escalate immediately to:
1. **Level 1:** Primary IT Administrator (Email/Phone)
2. **Level 2:** CC Admin / IT Head
3. **Level 3:** University System Administrator

## 5. DR Testing Drill
**Frequency:** Bi-Annually (Every 6 months).
**Procedure:** The IT team must perform a mock restoration on a staging server using the latest production backup. Document the actual time taken and update this playbook if the RTO (4 Hours) is not met.
