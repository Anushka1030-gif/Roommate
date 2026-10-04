# RoomieMatch 🏠

> Smart, student-first roommate matching platform tailored for college communities.

---

## 📖 Project Overview
RoomieMatch connects college students with compatible roommates based on academic schedules, living habits, budget constraints, and lifestyle preferences. Powered by algorithmic compatibility scoring and LLM-driven match insights, it takes the guesswork out of finding a great roommate.

---

## 🛠️ Prerequisites
- **Node.js**: v18.0.0 or later (v20+ / v22+ recommended)
- **npm**: v9.0.0 or later
- **MySQL**: MySQL 8.0 (via Docker Compose or local MySQL Server installation)

---

## 🗄️ Database Setup

### Option A: Using Docker (Recommended if Docker is installed)
Start the MySQL container with one command:
```bash
docker compose up -d
```
To stop the database container:
```bash
docker compose down
```

### Option B: Using Local MySQL Server (When Docker is not installed)
If Docker is not installed on your system:
1. Install [MySQL Server 8.0](https://dev.mysql.com/downloads/mysql/) or use an existing local MySQL service.
2. Ensure the MySQL service is running on port `3306`.
3. Create the database and user using MySQL CLI or Workbench:
   ```sql
   CREATE DATABASE roomiematch;
   CREATE USER 'roomie_user'@'localhost' IDENTIFIED BY 'roomie_secret';
   GRANT ALL PRIVILEGES ON roomiematch.* TO 'roomie_user'@'localhost';
   FLUSH PRIVILEGES;
   ```
4. Verify that `server/.env` credentials match your local MySQL configuration:
   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=roomie_user
   DB_PASSWORD=roomie_secret
   DB_NAME=roomiematch
   ```

---

## 🚀 Installation & Running

### 1. Backend Server Setup
```bash
cd server
npm install
npm run dev
```
The server will start on `http://localhost:5000`.
Check health: `curl http://localhost:5000/api/health`

### 2. Frontend Client Setup
```bash
cd client
npm install
npm run dev
```
The client will start on `http://localhost:5173`.

---

## 🧪 Running Tests & Linting

### Server Tests & Linting
```bash
cd server
npm test         # Run Vitest test suite
npm run lint     # Run ESLint checks
```

### Client Tests & Linting
```bash
cd client
npm test         # Run Vitest unit & component tests
npm run lint     # Run ESLint checks
```

---

## 📁 Project Structure
```
roommate_application/
├── client/                     # Vite + React (Tailwind CSS v4)
│   ├── src/
│   │   ├── test/               # Test setup
│   │   ├── App.jsx             # Main application component
│   │   ├── main.jsx            # React root entry
│   │   └── index.css           # Tailwind style entry
│   ├── vite.config.js          # Vite configuration with API proxy
│   └── package.json
├── server/                     # Express.js REST & Socket.IO backend (ESM)
│   ├── src/
│   │   ├── config/             # Zod validated configuration & constants
│   │   ├── controllers/        # Request handlers
│   │   ├── routes/             # API route definitions
│   │   ├── services/           # Business & matching logic
│   │   ├── middleware/         # Auth, validation, & error handling
│   │   ├── db/                 # Migrations & seeds
│   │   ├── sockets/            # Socket.IO event handlers
│   │   ├── app.js              # Express app definition (testable)
│   │   └── server.js           # Server listener & socket attachment
│   ├── prompts/                # LLM system & compatibility prompt templates
│   └── package.json
├── docs/                       # Specifications, rules & progress tracking
│   ├── PRD.md                  # Product Requirements Document
│   ├── PROJECT_RULES.md        # Architecture conventions & standards
│   └── PROGRESS.md             # 16-step implementation checklist
├── docker-compose.yml          # MySQL 8 service container
└── README.md
```

---

## 📋 Roadmap & Implementation Steps
See [PROGRESS.md](file:///d:/roommate_application/docs/PROGRESS.md) for the 16-step implementation roadmap.
