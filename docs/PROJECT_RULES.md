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
