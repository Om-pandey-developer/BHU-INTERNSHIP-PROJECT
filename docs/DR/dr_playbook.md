# BHU Email Portal - Disaster Recovery (DR) Playbook

This document outlines the standard operating procedures for Disaster Recovery.

## 1. Objectives
- **RPO (Recovery Point Objective):** 1 Hour. The maximum acceptable data loss is 1 hour of user applications.
- **RTO (Recovery Time Objective):** 4 Hours. The system must be back online within 4 hours of a total catastrophic failure.

## 2. Backup Strategy
- **Database:** PostgreSQL is backed up via `pg_dump` every hour using `cron`. Backups are stored in an encrypted AWS S3 bucket.
- **Uploaded Files (Photos/Signatures):** Synchronized to a separate storage bucket (e.g., S3/GCS) in real-time.
- **Code & Configuration:** Stored in GitHub/GitLab. Infrastructure configuration is managed via Docker/Kubernetes files.

## 3. Disaster Scenarios and Responses

### Scenario A: Database Corruption or Accidental Deletion
**Response:**
1. Stop the application servers to prevent further invalid writes.
2. Run the `restore-backup.sh` script to pull the latest good backup from S3.
3. Import the backup into the PostgreSQL instance.
4. Restart application servers and verify integrity via `/api/v1/applications/admin/quota-stats`.

### Scenario B: Full Data Center Outage (Hardware Failure)
**Response:**
1. Provision a new server instance in a secondary region.
2. Clone the repository and run `docker compose up -d` to build the blank environment.
3. Fetch the latest DB backup and file uploads from the secondary cloud storage.
4. Update DNS records (Cloudflare/Route53) to point `email-portal.bhu.ac.in` to the new server's IP address.

## 4. DR Testing Drill (Quarterly)
Every 3 months, the IT admin must:
1. Spin up a local staging server.
2. Run the restore script using the latest production backup.
3. Document the time taken (RTO) and verify the portal is functional.
