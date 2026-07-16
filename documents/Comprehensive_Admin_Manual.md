# BHU Email Registration & Auto-Provisioning Portal
## Comprehensive Admin & Deployment Manual

This document provides step-by-step instructions for running, managing, and backing up the portal, specifically tailored for deployment via a pendrive (offline/local context) and later migrating to a Live network.

---

## 1. How to Run the Project (From Pendrive via Docker)

This is the easiest way to launch the entire system (Frontend, Backend, and Database) in one go without installing Node.js or Postgres manually.

### Prerequisites:
- Docker Desktop must be installed and running on the target machine.

### Steps:
1. Extract the provided ZIP folder from the pendrive onto the computer.
2. Open **PowerShell** or **Command Prompt** inside the extracted folder.
3. Run the following command:
   ```bash
   docker compose up --build -d
   ```
4. The system will start automatically.
   - **Frontend (UI):** Open `http://localhost:3000`
   - **Backend (API):** Available at `http://localhost:4000/api/v1`
5. To shut down the system, run:
   ```bash
   docker compose down
   ```

---

## 2. Cloudflare Turnstile (Bot Protection) Configuration

Currently, the project uses a custom **SVG CAPTCHA** because the portal is being tested locally. However, when the portal is ready to go Live or you want to use the highly secure Cloudflare Turnstile, follow these steps to reactivate it.

### How it Works (Intranet vs Live)
- **Intranet (Campus Network):** As long as the user accessing the portal has internet on their device, Turnstile will load perfectly and show the green tick. The local server will verify the token with Cloudflare's servers. Outside users won't be able to access the portal itself.
- **Live (Internet via NAT/Firewall):** When the firewall is configured to allow outside traffic (netting), the code will work exactly the same without any changes.

### Reactivation Steps:
1. Open the Cloudflare Dashboard and add your new Live domain (or Public IP) to the Turnstile widget settings.
2. Open `docker-compose.yml` and uncomment (remove `#`) from this line under the `frontend` args:
   ```yaml
   NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_site_key_here
   ```
3. Open `frontend/src/app/login/page.tsx` and `frontend/src/app/register/page.tsx`. Search for the `<SvgCaptcha />` component and replace/comment it out in favor of the `<Turnstile />` component block (which is currently commented out just below it).
4. Open `backend/src/modules/auth/auth.controller.ts` and uncomment the Turnstile verification lines (`this.turnstileService.verify(...)`), and comment out the SVG Captcha lines.
5. Rebuild the Docker containers: `docker compose up --build -d`

---

## 3. Database Backup & 0-Data Loss Strategies

### A. Manual Backup (pg_dump)
We have included automated scripts to back up the database manually or via Windows Task Scheduler.
- **Windows:** Double click `backup.bat`
- **Linux:** Run `./backup.sh`

These scripts will generate a time-stamped `.sql` file in the `backups/` folder.

### B. Synchronous WAL Archiving (1-Second Data Safety)
The `docker-compose.yml` is already pre-configured to write Write-Ahead Logs (WAL).
- As soon as a transaction commits, Postgres pushes it to the `backups/archive/` folder every 60 seconds (`archive_timeout = 60`).
- If the server experiences total hardware failure, you only lose a maximum of 60 seconds of data.

### C. Streaming Replication (Absolute Best - Real-time Mirroring)
If you require **0-second data loss**, you should set up a Standby (Slave) Server.
1. The primary database (configured in this project) will stream data over the network to the secondary server.
2. If the main server crashes at 12:03:00, the data from 12:02:59 is already present on the Standby Server. 
3. You simply promote the Standby Server to Primary and bring the network back up. 
*(Requires a secondary machine and advanced PostgreSQL pg_hba.conf network setup).*

---

## 4. Essential Commands for Future Use

- **View Logs (Frontend & Backend):**
  ```bash
  docker compose logs -f
  ```
- **Access Database Directly (SQL Terminal):**
  ```bash
  docker exec -it bhu_db psql -U bhu_user -d bhu_db
  ```
- **Wipe Database entirely (Reset):**
  ```bash
  docker compose down -v
  ```
- **Rebuild after making code changes:**
  ```bash
  docker compose up --build -d
  ```
