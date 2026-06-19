# BHU Email Portal 🎓✉️

Welcome to the **BHU Email Portal**, a comprehensive full-stack application developed during the BHU Internship Program. This portal digitizes and streamlines the process of requesting and approving official university email addresses for various university members (Teaching Staff, Non-Teaching Staff, Group A Employees, and PhD/PG Students).

---

## 🚀 Tech Stack

### Frontend
- **Framework**: [Next.js](https://nextjs.org/) (React)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Language**: TypeScript
- **Testing**: Jest (Unit) & Playwright (E2E)

### Backend
- **Framework**: [NestJS](https://nestjs.com/)
- **Database ORM**: [Prisma](https://www.prisma.io/)
- **Language**: TypeScript
- **Testing**: Jest (Unit/E2E)
- **File Uploads**: Multer (Local Disk Storage)

---

## ✨ Key Features

- **Role-Based Workflows**: Tailored application forms for Teaching Staff, Non-Teaching (NT) Staff, Group A, and PhD/PG Students.
- **HOD Dashboard**: Dedicated dashboard for Head of Departments to review, approve, or reject pending applications.
- **Computer Centre (CC) Admin Panel**: Centralized control panel for admins to manage final email provisioning and oversee the system.
- **Automated PDF Generation**: Automatically generates downloadable PDF copies of submitted applications for record-keeping.
- **Secure File Uploads**: Safe handling of user photographs and signatures with strict validation.
- **Responsive Design**: Modern, mobile-friendly interface ensuring accessibility across all devices.

---

## 🛠️ Installation & Setup

### Prerequisites
Before you begin, ensure you have the following installed:
- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **PostgreSQL** or your preferred SQL database supported by Prisma

### 1. Clone the Repository
```bash
git clone https://github.com/Om-pandey-developer/BHU-INTERNSHIP-PROJECT.git
cd BHU-INTERNSHIP-PROJECT
```

### 2. Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Configure Environment Variables
# Create a .env file in the backend directory and add your database connection string and JWT secret
# Example: DATABASE_URL="postgresql://user:password@localhost:5432/bhudb"

# Run database migrations
npx prisma migrate dev

# Start the backend development server
npm run start:dev
```
*The backend will typically run on http://localhost:4000.*

### 3. Frontend Setup
Open a new terminal window:
```bash
cd frontend

# Install dependencies
npm install

# Start the frontend development server
npm run dev
```
*The frontend will typically run on http://localhost:3000.*

---

## 🧪 Testing

This project uses **Jest** for unit testing and **Playwright** for End-to-End (E2E) testing.

**Run Backend Tests:**
```bash
cd backend
npm run test
```

**Run Frontend Unit Tests:**
```bash
cd frontend
npm run test
```

**Run Frontend E2E Tests (Playwright):**
```bash
cd frontend
npx playwright test
```

---

## 📁 Directory Structure
- `/backend`: NestJS application, Prisma schema, API routes, and business logic.
- `/frontend`: Next.js application, React components, pages, and Tailwind styling.
- `/project_docs`: Contains all detailed design documents, workflow diagrams, feature plans, and security audits.

---

## 🤝 Contributing
If you'd like to contribute or report any issues, please open an issue or submit a pull request with a detailed description of your changes.

---

*Developed as part of the BHU Internship Project.*
