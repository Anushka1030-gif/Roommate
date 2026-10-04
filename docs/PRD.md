# RoomieMatch — Product Requirements Document (PRD)

## 1. Product Overview & Goals
RoomieMatch is a dedicated web platform designed for college students to find compatible roommates based on academic schedules, living habits, budget, lifestyle preferences, and location. It provides algorithmic compatibility scoring and LLM-powered compatibility explanations to reduce roommate friction.

---

## 5. System Architecture & Features
- **Authentication**: Student-only registration requiring verified educational/institutional domains (blocked public email providers like Gmail, Yahoo, Hotmail, Outlook, iCloud, etc.). OTP-based email verification and secure JWT sessions.
- **Student Profile**: Basic details, major, graduation year, sleep schedule, study habits, cleanliness scale, smoking/drinking preferences, food habits, and guest policies.
- **Housing Requirements**: City (starting with Bhopal), target budget, neighborhood preference, move-in timeframe, and whether the student currently has a room or is looking for one.
- **Algorithmic Match Engine**: Deterministic multi-factor weighted scoring across budget alignment, schedule sync, cleanliness, noise level, and dietary compatibility.
- **LLM Compatibility Layer**: Anthropic Claude integration producing personalized match explanations, pros/potential friction points, and conversation starter icebreakers.
- **Direct Messaging**: Real-time 1-on-1 socket communication with message persistence and read receipts.
- **Mutual Contact Sharing & Roommate Confirmation**: Contact details (email/phone) remain private until both parties send and accept a mutual roommate confirmation request.
- **Safety & Moderation**: User blocking, report management, and an administrative moderation panel.

---

## 6. Out of Scope (PRD Boundaries)
The following features are strictly **Out of Scope**:
- Non-student public user registration.
- Direct in-app payment gateway or rent transaction processing.
- Formal legal lease and tenancy contract generation/signing.
- Real-time video/voice calling inside the application.
- Multi-city expansion outside supported launch cities (`["Bhopal"]`).
- Complex multi-roommate group bidding/auction systems.

---

## 11. Security, Privacy & Validation Rules
- All user inputs sanitized and validated with Zod schemas.
- Passwords hashed with bcrypt (salt rounds 10+).
- Rate limiting on authentication and LLM endpoints.
- Contact information protected from public viewing.
- CORS restricted strictly to approved frontend origin (`CLIENT_URL`).
- HTTP-only secure cookies for tokens or standard Bearer authorization headers.

---

## 12. Tech Stack & Implementation Specifications
- **Client**: React (Vite, JavaScript ESM), React Router v7, Axios, Socket.IO Client, Tailwind CSS.
- **Server**: Node.js (ESM), Express.js, MySQL 2, Knex.js query builder, Socket.IO, Helmet, CORS, Nodemailer, @anthropic-ai/sdk.
- **Database**: MySQL 8.0 with Knex migrations and seeders.
- **Testing**: Vitest, Supertest, React Testing Library.
