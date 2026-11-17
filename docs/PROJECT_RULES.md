# RoomieMatch — Project Rules & Architecture Conventions

All subsequent steps and implementations in this repository must strictly adhere to the following architecture rules and coding standards.

---

## 1. Core Technology Stack & Language
- **JavaScript Only**: All code must be plain modern JavaScript with ES modules (`import`/`export`), async/await, and Node.js native ESM (`"type": "module"`). **No TypeScript**.
- **React Frontend**: Functional React components with hooks, React Router v7, Axios, Socket.IO client, and Tailwind CSS.
- **Node.js Express Backend**: Express app, Knex query builder, MySQL 2, Socket.IO, Zod for validation, Helmet, CORS, and cookie-parser.

---

## 2. Layered Backend Architecture
Every backend feature must strictly adhere to the layered structure:
1. **Routes (`/routes`)**: Define endpoints, apply route-level middleware (authentication, rate-limiting), attach validation schemas, and delegate to controllers.
2. **Controllers (`/controllers`)**: Handle HTTP request/response lifecycles, parse route params/queries, invoke services, and return standardized JSON responses. **No SQL or direct Knex queries in controllers.**
3. **Services (`/services`)**: Encapsulate all business logic, authorization rules, algorithmic calculations, external LLM calls, and transactional flows.
4. **Data Access / DB Queries (`/db` or data access services)**: All database interactions must use parameterized Knex queries. No raw unsanitized SQL strings.
5. **Middleware (`/middleware`)**: Central authentication checks, request body validation, role-based access control, and error handling.

---

## 3. Request Validation & Error Handling
- **Request Validation**: Every request body, query, or parameter that accepts user input must be validated using **Zod** schemas inside a reusable `validate` middleware. If validation fails, return a 400 response before reaching the controller.
- **Consistent Error Response Format**:
  All API error responses must strictly follow the JSON envelope:
  ```json
  {
    "error": {
      "code": "ERROR_CODE_NAME",
      "message": "Human readable description of the error."
    }
  }
  ```
- **Central Error Handling**: Throw operational errors in services/controllers and let the central error-handling middleware format and send the response.

---

## 4. Privacy, Security & Data Protection
- **Secrets Management**: All secrets, credentials, API keys, and environment-dependent configs must come exclusively from `src/config/index.js`. Never hardcode secrets.
- **Data Protection**:
  - Never return password hashes in any response under any circumstance.
  - Never return sensitive user contact information (emails, phone numbers) in public listings, match discovery, or search queries. Contact info is only exposed when explicit roommate confirmation / contact sharing has occurred in accordance with the PRD.
- **Security Middleware**: Maintain Helmet protection, CORS restricted to `CLIENT_URL`, and rate-limiting on sensitive endpoints (e.g. auth, LLM).

---

## 5. Scope & PRD Compliance
- Follow the PRD specifications strictly.
- **Do NOT implement Out of Scope features** (PRD Section 6) such as general non-student matching, payment gateways, complex apartment leasing contracts, real-time audio/video calls, or unsupported multi-city expansion beyond specified configurations.

---

## 6. Development Workflow & Step Completion
- **Checklist Tracking**: After finishing each development step in the 16-step chain, update `docs/PROGRESS.md`.
- **Quality Gate**: Before finishing any step, run:
  - `npm run lint` in both `/client` and `/server`
  - `npm test` in both `/client` and `/server`
- Verify tests pass with zero lint errors.
- **Stop**: After completing a designated step, summarize the work, provide commands for the user, and stop. Do not automatically proceed to the next step.

---

## 7. Design Tokens & Palette (Soft Peach & Beige Rebrand)
All UI styling must strictly use the soft peach and warm beige palette defined below. Hardcoded blue, teal, emerald, and harsh slate color classes are forbidden.

### Palette Tokens
- **Background (`page`)**: `#FBF5EC` (warm light beige for the full page canvas)
- **Surface (`surface`)**: `#FFFFFF` (cards, navbar, modals, drawers)
- **Surface Border (`surface-border`)**: `#EADFCF` (soft beige border for cards and dividers)
- **Beige (`beige`)**: `#F3E9DA` (secondary surfaces, input background tints, form sections)
- **Peach Soft (`peach-soft`)**: `#FFE3D1` (highlights, category badges, chip hover, user chat bubbles)
- **Peach (`peach`)**: `#F4B393` (primary accent, secondary borders, gradient highlights)
- **Peach Deep (`peach-deep`)**: `#AC5429` (accessible primary buttons, links, active rings, focus states with >= 4.5:1 WCAG AA contrast against white)
- **Peach Deeper (`peach-deeper`)**: `#8E3E19` (button hover, active states)
- **Text Primary (`text-primary`)**: `#3D2C24` (warm dark brown for high-contrast headings and body text)
- **Text Secondary (`text-secondary`)**: `#7A6458` (warm medium brown for subheaders, labels, and muted text)
- **Feedback Semantic Accents**:
  - **Success**: `#5E9C76` (muted warm sage green)
  - **Warning**: `#D9A441` (muted warm golden amber)
  - **Error / Danger**: `#C75146` (muted terracotta red)

### Component Styling Rules
1. **Primary Buttons**: Background `peach-deep` (`#AC5429`) with white text (WCAG AA >= 4.5:1 contrast). Hover: `peach-deeper`.
2. **Secondary Buttons**: Background `beige` (`#F3E9DA`) with dark brown `text-primary` text and `peach` border.
3. **Cards & Containers**: White surface with subtle shadow and `#EADFCF` border (`border-surface-border`).
4. **Form Inputs**: Beige-tinted background (`bg-beige-50/70`), `#EADFCF` border, and `peach-deep` focus ring.
5. **Navbar**: White or light beige background, subtle `#EADFCF` bottom border, active navigation links underlined in `peach-deep`.
6. **Match Cards**: Score badges use progressive peach tints (higher score = deeper peach). "Watch out" alerts use soft warm amber tints (`bg-[#D9A441]/15 text-[#6B4B10] border-[#D9A441]/40`), never harsh red.
7. **Chat Bubbles**: Sender (my) messages in `peach-soft` (`#FFE3D1`) bubbles with dark brown text; recipient (partner) messages in white `surface` bubbles with `#EADFCF` border.
8. **Feedback & Loading**: Skeletons use warm beige pulse, spinners use `peach-deep`, toasts use warm beige/peach styling.
