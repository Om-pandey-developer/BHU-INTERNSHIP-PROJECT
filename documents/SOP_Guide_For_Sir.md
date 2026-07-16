# BHU Email Registration & Auto-Provisioning Portal - Setup Guide

This project contains both a Frontend (Next.js) and a Backend (NestJS). 
Below are step-by-step instructions to run this project on a new system.

## Option 1: Run via Docker (Recommended & Easiest)
If you have Docker Desktop installed, running the project takes only one command.

### Steps:
1. Extract the `BHU_Complete_Project.zip` folder on your machine.
2. Open a terminal (or command prompt) inside the extracted project folder (where `docker-compose.yml` is located).
3. Run the following command:
   ```bash
   docker compose up --build -d
   ```
4. The system will automatically download all dependencies, build the frontend/backend, and set up the PostgreSQL database.
5. Once it is running:
   - **Frontend UI:** Open your browser and go to `http://localhost:3000`
   - **Backend API:** The API is available at `http://localhost:4000/api/v1`
   
*(To stop the server, run `docker compose down`)*

---

## Option 2: Manual Setup (If Docker is not installed)
If Docker is not available, you must manually install Node.js and have a PostgreSQL database running.

### Prerequisites:
- Node.js (v18 or above) installed.
- PostgreSQL running locally.

### Step 1: Database Setup
1. Open PostgreSQL (pgAdmin or terminal) and create a database named `bhu_db`.
2. Ensure the credentials in `backend/.env` match your local PostgreSQL setup (User, Password, Port).
   *Example: `DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/bhu_db?schema=public"`*

### Step 2: Backend Setup
1. Open a terminal and navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Install all dependencies:
   ```bash
   npm install
   ```
3. Push the database schema using Prisma:
   ```bash
   npx prisma db push
   ```
4. Start the backend development server:
   ```bash
   npm run start:dev
   ```
   *(Backend is now running on http://localhost:4000)*

### Step 3: Frontend Setup
1. Open a **new** terminal and navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Install all dependencies:
   ```bash
   npm install
   ```
3. Start the frontend development server:
   ```bash
   npm run dev
   ```
   *(Frontend is now running on http://localhost:3000)*

## Notes on `.env` and Keys
- All necessary environment files (`.env` for both frontend and backend) and the RSA keys (`backend/keys/`) are already included in this folder. You do not need to generate them again.
- If there is any issue with Database connection, please check the `DATABASE_URL` in `backend/.env`.

---

## Initial Login Credentials (Dummy Data)
These credentials are created automatically when the database is seeded. You can use them to test different dashboards.

| Role | Email | Password |
|---|---|---|
| **CC Admin** | `admin@bhu.ac.in` | `password123` |
| **Dean** | `dean@bhu.ac.in` | `password123` |
| **HOD** | `hod@bhu.ac.in` | `password123` |
| **Student / Applicant** | `student@bhu.ac.in` | `password123` |

---

## How to View, Change, or Delete Users in Database

If you want to manually modify, delete, or check passwords for these users in the database, you have two simple ways:

### Method 1: Using Prisma Studio (Easiest - GUI)
If you have Node.js installed, open a terminal in the `backend` folder and run:
```bash
npx prisma studio
```
This will open a visual database editor in your browser (at `http://localhost:5555`). From there, you can click on the **User** table to delete or edit any user easily without writing SQL.

### Method 2: Using Command Line (SQL)
If you are running the database via Docker, you can directly execute SQL commands.

**For Windows (CMD / PowerShell) OR Linux / Mac Terminal:**
1. Connect to the database container:
   ```bash
   docker exec -it bhu_db psql -U bhu_user -d bhu_db
   ```
2. Once connected, you will see the `bhu_db=#` prompt. You can now run SQL commands:

   - **To view all users:**
     ```sql
     SELECT id, "firstName", "lastName", role, "alternateEmail" FROM "User";
     ```
   - **To delete a specific user:**
     ```sql
     DELETE FROM "User" WHERE "alternateEmail" = 'student@bhu.ac.in';
     ```
   - **To delete ALL users (Warning):**
     ```sql
     DELETE FROM "User";
     ```
3. Type `\q` and press Enter to exit the database terminal.
