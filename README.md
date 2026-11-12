# RoomieMatch 🏠

> Smart, student-first roommate matching platform tailored for college communities.

---

## 📖 Project Overview

RoomieMatch connects college students and interns moving to a new city with genuinely compatible roommates. By combining structured lifestyle profiles, strict SQL hard filters, deterministic compatibility weighting, and Anthropic Claude LLM matchmaking insights, RoomieMatch eliminates the stress, privacy risks, and randomness of finding a college roommate.

### Key Highlights
- **Verified Student Profiles**: Official educational email verification with 6-digit expiring OTP codes.
- **Strict Privacy**: Zero exposure of student contact details (email and phone) until **both** matched students explicitly consent in chat. Profiles are private and never accessible via public URLs.
- **Intelligent Hybrid Matching**:
  - **Step 1**: SQL hard filters (city, budget overlap, mutual gender preferences, smoking/drinking deal-breakers, block exclusion, confirmed roommate exclusion).
  - **Step 2**: Deterministic weighted scoring across cleanliness, sleep routines, study habits, food preferences, and personal importance weights.
  - **Step 3**: LLM enhancement using Claude 3.5 Sonnet to generate personalized "Why you match" summaries, lifestyle highlights, watch-outs, and custom icebreakers.
  - **Step 4**: Automatic fallback to rule-based scoring if the LLM is unconfigured, disabled, or unavailable.
- **Real-Time In-App Chat**: Socket.IO messaging with unread badges, typing indicators, and mutual contact sharing.
- **Safety First**: Bidirectional blocking, user reporting with 10/day rate limits, and an administrative moderation dashboard.
- **North-Star Metric**: Mutual confirmation ("We became roommates") tracking confirmed student pairs.

---

## 🛠️ Prerequisites

- **Node.js**: v20.0.0 or later (v20+ or v22+ LTS recommended)
- **npm**: v9.0.0 or later
- **MySQL**: MySQL 8.0 (via Docker Compose or local installation)

---

## 🚀 One-Command-at-a-Time Local Setup

Follow these sequential steps in your terminal to set up and run RoomieMatch locally:

### 1. Start MySQL Database Container
```bash
docker compose up -d
```
*(If you are running a local MySQL server instead of Docker, ensure it is listening on port `3306` with database `roomiematch` and credentials matching `server/.env`).*

### 2. Configure Environment Files
Copy the sample environment files for both backend and frontend:
```bash
# Server environment
cp server/.env.example server/.env

# Client environment
cp client/.env.example client/.env
```

### 3. Install Backend Dependencies
```bash
npm --prefix server install
```

### 4. Install Frontend Dependencies
```bash
npm --prefix client install
```

### 5. Run Database Migrations
Create all database tables, foreign keys, and indexes:
```bash
npm --prefix server run migrate
```

### 6. Seed the Default Admin Account
Seeds the administrative account (`admin@roomiematch.edu`):
```bash
cd server && npx knex --knexfile knexfile.js seed:run --specific=01_admin_user.js && cd ..
```

### 7. Seed 40 Demo Students (Bhopal)
Seeds 40 realistic student profiles with varied living habits and requirements in Bhopal for instant matching:
```bash
cd server && npx knex --knexfile knexfile.js seed:run --specific=02_demo_students.js && cd ..
```

### 8. Start Backend Server
Starts the Express REST API and Socket.IO server on `http://localhost:5000`:
```bash
npm --prefix server run dev
```

### 9. Start Frontend Client (in a separate terminal)
Starts the Vite React development server on `http://localhost:5173`:
```bash
npm --prefix client run dev
```

### 10. Run Full Automated Test Suites
Run all backend integration tests and frontend component tests:
```bash
# Run server test suite (147 tests)
npm --prefix server test

# Run client test suite (84 tests)
npm --prefix client test -- --run
```

---

## 🔑 Demo Credentials

Once the seed scripts have run, you can immediately log in to test and demo the platform:

| Role | Email | Password | Access / Features |
|---|---|---|---|
| **Platform Admin** | `admin@roomiematch.edu` | `AdminSecurePassword123!` | `/admin` — Moderation dashboard, user reports, suspension actions, and platform statistics (confirmed roommate pairs). |
| **Demo Student 1** | `aarav@manit.ac.in` | `StudentDemo123!` | MANIT Bhopal, CS 2026, Early Bird, Cleanliness 4/5, Vegetarian. |
| **Demo Student 2** | `ananya@aiimsbhopal.edu.in` | `StudentDemo123!` | AIIMS Bhopal, MBBS 2027, Night Owl, Cleanliness 5/5, Cat friendly. |
| **Demo Student 3** | `rohan@manit.ac.in` | `StudentDemo123!` | MANIT Bhopal, Mech 2026, Early Bird, Budget 8k-11k. |
| **Demo Student 4-40** | `student<N>@example-college.test` | `StudentDemo123!` | 40 varied lifestyle profiles across MANIT, AIIMS, and IIIT Bhopal. |

---

## ⚙️ Environment Variables Reference

### Backend (`server/.env`)

| Variable | Default Value | Description |
|---|---|---|
| `PORT` | `5000` | Port the Express server listens on. |
| `NODE_ENV` | `development` | Environment mode (`development`, `test`, `production`). In production, cookies enforce `secure: true`. |
| `CLIENT_URL` | `http://localhost:5173` | Allowed frontend origin for CORS and Socket.IO handshakes. |
| `DB_HOST` | `localhost` | MySQL database hostname. |
| `DB_PORT` | `3306` | MySQL database port. |
| `DB_USER` | `roomie_user` | MySQL database user. |
| `DB_PASSWORD` | `roomie_secret` | MySQL database password. |
| `DB_NAME` | `roomiematch` | MySQL database name. |
| `JWT_SECRET` | `dev_jwt_secret_key_change_in_production_12345` | Secret key used to sign and verify JWT authentication tokens. |
| `JWT_EXPIRES_IN`| `7d` | Lifespan of JWT tokens (defaults to 7 days). |
| `SMTP_HOST` | `sandbox.smtp.mailtrap.io` | SMTP server host for sending verification OTPs and email notifications. In development without SMTP credentials, emails log to console. |
| `SMTP_PORT` | `2525` | SMTP port (e.g. 587, 465, or 2525). |
| `SMTP_USER` | `""` | SMTP username. |
| `SMTP_PASS` | `""` | SMTP password. |
| `MAIL_FROM` | `noreply@roomiematch.edu` | Sender address in outbound emails. |
| `LLM_PROVIDER` | `anthropic` | LLM vendor integration interface. |
| `LLM_API_KEY` | `""` | Anthropic Claude API key. If empty or invalid, matching falls back automatically to the rule-based engine. |
| `LLM_MODEL` | `claude-3-5-sonnet-20241022` | Claude model name for match ranking and explanations. |
| `LLM_ENABLED` | `true` | Toggle for LLM matchmaking (`true` or `false`). |
| `ADMIN_EMAIL` | `admin@roomiematch.edu` | Email for the default administrator account. |
| `ADMIN_PASSWORD`| `AdminSecurePassword123!` | Initial password for the administrator account. |

### Frontend (`client/.env`)

| Variable | Default Value | Description |
|---|---|---|
| `VITE_API_URL` | `/api` | Base path or URL for backend REST API calls (proxied by Vite in development). |

---

## 🧠 How Matching Works

The RoomieMatch matching pipeline operates in four coordinated stages:

```
[Requester Profile & Active Requirement]
                   │
                   ▼
  Stage 1: SQL Hard Filters (Candidate Exclusion)
  - Verified student, profile complete, not self
  - Matching target city (e.g., Bhopal)
  - Budget ranges overlap (candidate max >= requester min AND candidate min <= requester max)
  - Symmetrical gender compatibility (same_gender_only checks)
  - Symmetrical smoking & drinking compatibility
  - Candidate cleanliness >= requester's preferred minimum
  - Bidirectional blocklist check
  - Exclude already confirmed roommate pairs
                   │
                   ▼
  Stage 2: Deterministic Pre-Scoring & Ranking
  - Computes multi-dimensional compatibility score (0-100)
  - Dimensions: Cleanliness difference, sleep routine match, smoking/drinking, food habits
  - Applies user-customized importance weights (1 to 3 multiplier)
  - Sorts descending and takes top 15 shortlist
                   │
                   ▼
  Stage 3: LLM Enhancement (Claude 3.5 Sonnet)
  - Strictly anonymized payload: NO student names, emails, phones, or PII
  - Claude evaluates lifestyle synergy, potential friction points, and schedules
  - Generates top 3 ranked candidates with:
    * Tailored compatibility score
    * "Why you match" explanation
    * Synergy highlights & watch-out notes
    * Conversation icebreakers
                   │
                   ▼
  Stage 4: Automatic Fallback Mode
  - If LLM_ENABLED=false, LLM_API_KEY is unset, rate limit occurs, or JSON parsing fails:
    * System transparently returns the deterministic top 3 matches
    * Populates templated, clean explanations based on lifestyle attributes
    * Stores source='fallback' in match_results
```

---

## 🔒 Switching Email Domain Rule (Blocklist vs Allowlist)

By default, RoomieMatch uses a **domain blocklist** (`BLOCKED_EMAIL_DOMAINS` in `server/src/config/index.js`) to reject free public webmail providers (`gmail.com`, `yahoo.com`, `outlook.com`, etc.) while accepting any university or company email.

### To switch to an explicit domain allowlist:

1. Open `server/src/config/index.js` and define your allowed institution domains:
   ```javascript
   export const ALLOWED_EMAIL_DOMAINS = [
     'manit.ac.in',
     'aiimsbhopal.edu.in',
     'iiitbhopal.ac.in',
     'iitb.ac.in',
     '.ac.in',
     '.edu',
     '.edu.in',
   ];
   ```

2. Open `server/src/services/auth.service.js` and update the domain check in `register()`:
   ```javascript
   // Replace blocked domain check with allowlist verification:
   const isAllowedDomain = ALLOWED_EMAIL_DOMAINS.some((allowed) =>
     normalizedEmail.endsWith(allowed)
   );

   if (!isAllowedDomain) {
     throw new BadRequestError(
       `Registration is restricted to authorized campus email domains. (${domain} is not permitted).`,
       'EMAIL_DOMAIN_NOT_ALLOWED'
     );
   }
   ```

3. Update the frontend registration placeholder in `client/src/pages/RegisterPage.jsx` to reflect the allowed institutional domains.

---

## 📁 Project Structure

```
roommate_application/
├── client/                               # React (Vite, Tailwind CSS v4, Lucide Icons)
│   ├── src/
│   │   ├── components/                   # Navbar, Toast, SafetyDialogs, ContactBar
│   │   ├── context/                      # AuthContext, ToastContext
│   │   ├── pages/                        # Home, Login, Register, VerifyEmail, Profile,
│   │   │                                 # Requirement, Matches, Chats, Settings, Admin, Legal
│   │   ├── services/                     # Axios API client & socket instance
│   │   ├── test/                         # 15 Vitest component test suites (84 tests)
│   │   ├── App.jsx                       # Route configuration & route guards
│   │   └── main.jsx                      # Entrypoint
│   ├── vite.config.js                    # Vite dev server configuration & API proxy
│   └── package.json
├── server/                               # Node.js + Express REST API (ESM) & Socket.IO
│   ├── src/
│   │   ├── config/                       # Zod environment schemas & constants
│   │   ├── controllers/                  # Express route controllers
│   │   ├── db/                           # Knex migrations and seed scripts
│   │   │   ├── migrations/               # Versioned database schema migrations
│   │   │   └── seeds/                    # Admin user & 40 demo student seeds
│   │   ├── middleware/                   # JWT auth, requireAdmin, validation, rate limiting
│   │   ├── routes/                       # Express route declarations & integration tests
│   │   │   └── e2e_happy_path.test.js    # Comprehensive end-to-end happy path test
│   │   ├── services/                     # Matching engine, LLM service, mail, chat, safety
│   │   ├── sockets/                      # Socket.IO real-time chat gateway
│   │   ├── validations/                  # Zod input validation schemas
│   │   ├── app.js                        # Express app setup (helmet, CORS, routes)
│   │   └── server.js                     # HTTP server & socket listener
│   ├── prompts/                          # LLM matchmaking system prompt
│   └── package.json
├── docs/                                 # Architectural documentation
│   ├── PRD.md                            # Complete Product Requirements Document
│   ├── PROJECT_RULES.md                  # Development principles & engineering rules
│   ├── PROGRESS.md                       # 16-step implementation log
│   └── DEPLOYMENT.md                     # Production deployment guide (Vercel, Railway)
├── docker-compose.yml                    # Local MySQL 8.0 container setup
└── README.md                             # Project overview, setup, and documentation
```

---

## 🚀 Production Deployment

Refer to [`docs/DEPLOYMENT.md`](file:///d:/roommate_application/docs/DEPLOYMENT.md) for detailed deployment instructions covering:
- Hosting the React frontend on **Vercel** or **Netlify**
- Hosting the backend and MySQL database on **Railway**
- Production cookie security (`SameSite`, `HttpOnly`, `Secure`)
- Strict CORS origin locks
- Automated deployment migrations (`knex migrate:latest`)
