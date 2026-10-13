PRD: Student Roommate Matching App (v1 MVP) 
Instructions for the building agent: Build exactly what is described in this document. Scope for v1 is 
limited to Section 5 ("In Scope"). Do not build anything listed in Section 6 ("Out of Scope"). Where a 
decision is marked [DEFAULT], use the default unless told otherwise. Follow the build order in 
Section 15. 
# 1. Overview 
Working name: RoomieMatch (placeholder, configurable) 
One-line pitch: A web app where students moving to a new city for college or an internship create a 
lifestyle profile, submit what they want in a roommate, and receive their top 3 AI-ranked compatible 
roommates, each with a short explanation of why they match. 
Problem: Students who move to a new city struggle to find compatible, trustworthy roommates. 
Today they rely on random WhatsApp groups and Facebook pages with no filtering, no trust signal, 
and no way to express lifestyle preferences. This causes wasted time, stress, and poor living 
situations. 
Solution: Verified student profiles, structured lifestyle data, hard-filter + LLM-based matching, and a 
consent-based in-app chat that protects contact details. 
# 2. Goals and Success Metric 
Primary goal (v1): Help a student in the launch city get 3 genuinely compatible roommate 
suggestions within minutes of signing up. 
North-star metric: Number of pairs who confirm they became roommates (both users press "We 
became roommates"). 
Supporting metrics (track via simple DB counts, no analytics platform needed): 
• Signups and verified accounts 
• Completed profiles and submitted requirements 
• Match requests created per requirement 
• Chats started 
• Contact-share agreements 
• Roommate confirmations 
# 3. Target Users 
Primary persona (v1): A student or early-career intern (age ~17 to 26) moving to a new city who 
needs a room and wants to share it with a compatible roommate. They have a college or company 
email address. 
Not targeted in v1: Landlords, PG owners, and brokers (listings are Phase 3). 
Launch geography: One city or a few colleges (e.g., Bhopal). City is a free field but validated against a 
configurable list of supported cities [DEFAULT: seed with "Bhopal"]. 
# 4. User Flow (Happy Path) 
# 1. User signs up with a college/company email and password. 
# 2. User verifies email through a 6-digit OTP or link sent to that email. 
# 3. User completes their Profile (who they are, lifestyle habits). 
# 4. User submits a Requirement form (what they want in a roommate: city, budget, gender 
preference, lifestyle preferences, deal-breakers). 
# 5. System runs hard filters in MySQL, then an LLM ranks and explains the top 3. 
# 6. User sees 3 match cards with a compatibility score and "why you match" text. 
# 7. User taps "Start chat" on a match. A conversation is created (the other user is notified). 
# 8. In chat, either user can tap "Share my contact". Contact details are revealed to the other 
person only when both have agreed. 
# 9. When they decide to live together, each taps "We became roommates". When both confirm, 
it counts toward the north-star metric. 
# 5. In Scope (v1 MVP) 
# 1. Authentication with email verification 
# 2. Profile creation and editing 
# 3. Requirement form (create, edit, resubmit) 
# 4. Matching engine (hard filters + LLM ranking and explanation) 
# 5. Top-3 results page 
# 6. In-app chat with mutual-consent contact sharing 
# 7. "We became roommates" confirmation 
# 8. Report and block users 
# 9. Minimal admin page to review reports and see core counts 
# 6. Out of Scope (do NOT build in v1) 
• Room, flat, or PG listings, and pair-to-listing matching 
• Owner, landlord, or broker accounts and verification 
• Payments, subscriptions, featured listings 
• Reviews or ratings between roommates 
• Mobile app (web only, but responsive) 
• Social login, phone OTP, ID upload 
• Push notifications (in-app and email notifications only) 
• Multi-language support 
• Advanced analytics dashboard 
# 7 . Functional Requirements 
# 7.1 Authentication and Verification 
• Register with: full name, email, password. 
• Email must belong to an allowed domain. [DEFAULT] Reject common free providers 
(gmail.com, yahoo.com, outlook.com, hotmail.com, proton.me, etc.) and accept any other 
domain. Keep this as a configurable blocklist in config so it can be switched to an allowlist 
(e.g., .ac.in, .edu, .edu.in) later. 
• Send a 6-digit OTP to the email; expires in 10 minutes; max 5 attempts; resend allowed after 
60 seconds. 
• Password rules: minimum 8 characters. Store with bcrypt. 
• Login returns a JWT (access token, 7-day expiry [DEFAULT]) stored in an httpOnly cookie. 
• Unverified users cannot create a profile, submit requirements, view matches, or chat. 
• Acceptance criteria: A user with a blocked-domain email gets a clear error; a user cannot 
reach protected pages until verified; OTP expiry and attempt limits are enforced. 
# 7.2 Profile (who I am) 
One profile per user. All fields editable. Profile is visible only to verified, logged-in users and only to 
people the user is matched with or chatting with (never public). 
Field 
display_name 
age 
gender 
city 
Type 
text 
int 
enum 
text/enum 
college_or_company text 
student_status 
bio 
enum 
text 
Options / Notes 
Required; defaults to first name 
17 to 40 
male, female, non_binary, prefer_not_to_say 
Required; from supported cities 
Required 
college_student, intern, working_professional 
Free text, max 600 chars: hobbies, personality, deal-breakers 
Field 
Type 
Options / Notes 
sleep_schedule 
cleanliness 
noise_level 
food_habit 
smoking 
drinking 
enum 
early_bird, flexible, night_owl 
enum (1 to 5) 1 = relaxed, 5 = very tidy 
enum 
enum 
enum 
enum 
study_work_routine enum 
guests_frequency 
social_style 
enum 
enum 
quiet, moderate, lively 
vegetarian, eggetarian, non_vegetarian, vegan, no_preference 
never, occasionally, regularly 
never, occasionally, regularly 
mostly_home, mix, mostly_out 
rarely, sometimes, often 
introvert, ambivert, extrovert 
• Acceptance criteria: Profile completeness is calculated; a user must have 100% of required 
fields before submitting a requirement. 
# 7.3 Requirement Form (what I want) 
A user can have one active requirement at a time (older ones are archived on resubmit). 
Field 
city 
budget_min 
budget_max 
move_in_date 
gender_preference 
Type 
Notes 
text/enum Defaults to profile city 
int 
int 
date 
enum 
preferred_sleep_schedule enum 
Monthly budget in INR 
Must be >= budget_min 
Optional 
same_gender_only, any 
same_as_me, any, or specific value 
preferred_cleanliness_min int (1 to 5) Minimum acceptable roommate cleanliness 
smoking_ok 
drinking_ok 
food_preference 
guests_ok 
noise_tolerance 
deal_breakers 
boolean  
boolean  
enum 
enum 
enum 
text 
any, same_as_me, vegetarian_only 
rarely, sometimes, often 
quiet, moderate, lively, any 
Free text, max 400 chars 
Field 
Type 
Notes 
importance_weights 
JSON 
Optional: user rates importance (1 to 3) for cleanliness, sleep, 
smoking, drinking, food, guests, noise, social 
• On submit, the system immediately runs matching and redirects to the results page. 
• Acceptance criteria: Validation errors are shown inline; submitting creates exactly one active 
requirement and archives the previous one. 
# 7.4 Matching Engine 
Step 1: Hard filters (SQL). A candidate must satisfy ALL: 
• Verified account, profile complete, not the requester 
• Same city 
• Budget ranges overlap (candidate's active requirement range overlaps requester's range). If 
the candidate has no active requirement, they are not eligible [DEFAULT] 
• Gender compatibility is mutual: if either side chose same_gender_only, genders must be 
equal 
• Not blocked by or blocking the requester 
• Smoking/drinking: if requester smoking_ok = false, exclude candidates with smoking != never 
(same for drinking) 
• Candidate's cleanliness >= requester's preferred_cleanliness_min 
Step 2: Pre-score (code). Compute a simple rule-based compatibility score (0 to 100) across lifestyle 
dimensions using the requester's importance weights (default weight 1). Sort descending and take 
the top 15 as the shortlist. If fewer than 3 candidates survive the filters, return what exists and show 
an "Not enough matches yet in your city" message with a prompt to check back. 
Step 3: LLM ranking and explanation. Send the requester's profile, requirement, and the shortlist 
(anonymized: use candidate IDs, never emails or contact info) to the LLM. The model returns the top 
3 with a 0 to 100 score and a short explanation each. 
• LLM provider is behind an interface LLMService.rankMatches(). [DEFAULT] Use the Anthropic 
Claude API, model name from env var LLM_MODEL, API key from LLM_API_KEY. 
• Request strict JSON output and validate it with a schema; retry once on malformed output. 
• Fallback: If the LLM call fails or times out (15 seconds), return the top 3 from the rule-based 
pre-score with a generic explanation generated from the highest-scoring matching 
dimensions. 
• Cache the result in match_results so refreshing the page does not re-call the LLM. Re-run 
only when the requirement is resubmitted or the user taps "Refresh matches" (limit: 5 per 
day per user). 
LLM prompt contract (system prompt, store in /server/prompts/matching.txt): 
You are a roommate compatibility expert for students. You receive a seeker's 
profile and requirements, and a shortlist of candidate profiles that already 
passed hard filters (city, budget, gender, smoking/drinking, cleanliness). 
Pick the 3 most compatible candidates and rank them best first. 
Judge on lifestyle fit (sleep schedule, cleanliness, noise, food, guests, 
social style), the seeker's stated importance weights and deal-breakers, and 
the candidates' bios. 
Rules: - Use only the information provided. Do not invent facts. - Never mention or infer personal contact details. - Be honest: if there is a possible friction point, mention it briefly. - Write the explanation in 2 to 3 friendly sentences addressed to the seeker. 
Return ONLY valid JSON, no markdown, in this exact shape: 
{ 
} 
"matches": [ 
{ 
} 
] 
"candidate_id": <number>, 
"score": <integer 0-100>, 
"explanation": "<2-3 sentences>", 
"highlights": ["<short strength>", "<short strength>"], 
"watch_out": "<short possible friction or empty string>" 
Acceptance criteria: Results always contain at most 3 candidates; none violate a hard filter; no PII 
beyond display profile fields is sent to the LLM; failure of the LLM never blocks the user from seeing 
matches. 
# 7.5 Match Results Page 
• Shows up to 3 match cards, ranked. Each card: display name, age, college/company, 
compatibility score (badge), "Why you match" text, 2 highlight chips, "Watch out" note if 
present, a compact lifestyle summary, and a "Start chat" button. 
• Contact details (email/phone) are never shown on cards. 
• Empty state and "Refresh matches" button. 
# 7.6 In-App Chat and Contact Sharing 
• Tapping "Start chat" creates a conversation between the two users (one per pair; reuse if 
exists). The other user sees it in their inbox with an unread indicator and receives an email 
notification (rate-limited to 1 per conversation per hour). 
• Real-time messaging with Socket.io; messages persisted in MySQL; load history on open with 
pagination (50 per page). 
• Text only, max 1000 characters per message. No file uploads in v1. 
• Contact sharing: each user has a "Share my contact" toggle per conversation. The contact 
detail shared is the user's email by default, plus an optional phone number they can add in 
settings. Contact is revealed to the other side only when both toggles are on. Either user can 
turn theirs off, which hides it again. 
• "We became roommates": a button available inside a conversation. When both users press 
it, mark the pair as confirmed_roommates and increment the metric. Show a congratulations 
state and then stop showing match suggestions between them. 
• Acceptance criteria: A user cannot see the other's contact until both consent; blocked users 
cannot message; messages arrive in real time and persist after refresh. 
# 7.7 Safety: Report and Block 
• Any user can block another from the chat or match card. Blocking removes them from each 
other's matches and disables the conversation. 
• Any user can report a user with a reason (enum: harassment, fake_profile, 
inappropriate_content, spam, other) and optional details. 
• Reports go to the admin review queue. 
# 7.8 Admin (minimal) 
• Admin role flag on the user record; seed one admin through an env/seed script. 
• Admin page (/admin) shows: list of open reports with reporter, reported user, reason, and 
details; actions: dismiss, warn (store note), suspend user (suspended users cannot log in). 
• Also shows counts: total users, verified users, completed profiles, active requirements, 
conversations, contact-share agreements, confirmed roommate pairs. 
# 8. Data Model (MySQL) 
Use UTF8MB4. Use migrations. Suggested schema (adjust types as needed): 
CREATE TABLE users ( 
id BIGINT PRIMARY KEY AUTO_INCREMENT, 
full_name VARCHAR(120) NOT NULL, 
email VARCHAR(190) NOT NULL UNIQUE, 
password_hash VARCHAR(255) NOT NULL, 
email_verified TINYINT(1) NOT NULL DEFAULT 0, 
role ENUM('user','admin') NOT NULL DEFAULT 'user', 
status ENUM('active','suspended') NOT NULL DEFAULT 'active', 
phone VARCHAR(20) NULL, 
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
); 
CREATE TABLE email_otps ( 
id BIGINT PRIMARY KEY AUTO_INCREMENT, 
user_id BIGINT NOT NULL, 
otp_hash VARCHAR(255) NOT NULL, 
attempts INT NOT NULL DEFAULT 0, 
expires_at DATETIME NOT NULL, 
used TINYINT(1) NOT NULL DEFAULT 0, 
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
FOREIGN KEY (user_id) REFERENCES users(id) 
); 
CREATE TABLE profiles ( 
user_id BIGINT PRIMARY KEY, 
display_name VARCHAR(80) NOT NULL, 
age TINYINT NOT NULL, 
gender ENUM('male','female','non_binary','prefer_not_to_say') NOT NULL, 
city VARCHAR(80) NOT NULL, 
college_or_company VARCHAR(160) NOT NULL, 
student_status ENUM('college_student','intern','working_professional') NOT NULL, 
bio VARCHAR(600), 
sleep_schedule ENUM('early_bird','flexible','night_owl') NOT NULL, 
cleanliness TINYINT NOT NULL, 
noise_level ENUM('quiet','moderate','lively') NOT NULL, 
food_habit ENUM('vegetarian','eggetarian','non_vegetarian','vegan','no_preference') NOT NULL, 
smoking ENUM('never','occasionally','regularly') NOT NULL, 
drinking ENUM('never','occasionally','regularly') NOT NULL, 
study_work_routine ENUM('mostly_home','mix','mostly_out') NOT NULL, 
guests_frequency ENUM('rarely','sometimes','often') NOT NULL, 
social_style ENUM('introvert','ambivert','extrovert') NOT NULL, 
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, 
FOREIGN KEY (user_id) REFERENCES users(id) 
); 
CREATE TABLE requirements ( 
id BIGINT PRIMARY KEY AUTO_INCREMENT, 
user_id BIGINT NOT NULL, 
city VARCHAR(80) NOT NULL, 
budget_min INT NOT NULL, 
budget_max INT NOT NULL, 
move_in_date DATE NULL, 
gender_preference ENUM('same_gender_only','any') NOT NULL, 
preferred_sleep_schedule VARCHAR(30) NOT NULL DEFAULT 'any', 
preferred_cleanliness_min TINYINT NOT NULL DEFAULT 1, 
smoking_ok TINYINT(1) NOT NULL, 
drinking_ok TINYINT(1) NOT NULL, 
food_preference VARCHAR(30) NOT NULL DEFAULT 'any', 
guests_ok ENUM('rarely','sometimes','often') NOT NULL, 
noise_tolerance VARCHAR(20) NOT NULL DEFAULT 'any', 
deal_breakers VARCHAR(400), 
importance_weights JSON NULL, 
is_active TINYINT(1) NOT NULL DEFAULT 1, 
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
INDEX idx_city_active (city, is_active), 
FOREIGN KEY (user_id) REFERENCES users(id) 
); 
CREATE TABLE match_results ( 
id BIGINT PRIMARY KEY AUTO_INCREMENT, 
requirement_id BIGINT NOT NULL, 
candidate_user_id BIGINT NOT NULL, 
rank_position TINYINT NOT NULL, 
score TINYINT NOT NULL, 
explanation TEXT NOT NULL, 
highlights JSON, 
watch_out VARCHAR(300), 
source ENUM('llm','fallback') NOT NULL, 
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
FOREIGN KEY (requirement_id) REFERENCES requirements(id), 
FOREIGN KEY (candidate_user_id) REFERENCES users(id) 
); 
CREATE TABLE conversations ( 
id BIGINT PRIMARY KEY AUTO_INCREMENT, 
user_a_id BIGINT NOT NULL, 
user_b_id BIGINT NOT NULL, 
a_shares_contact TINYINT(1) NOT NULL DEFAULT 0, 
b_shares_contact TINYINT(1) NOT NULL DEFAULT 0, 
a_confirmed_roommates TINYINT(1) NOT NULL DEFAULT 0, 
b_confirmed_roommates TINYINT(1) NOT NULL DEFAULT 0, 
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
UNIQUE KEY uniq_pair (user_a_id, user_b_id), 
FOREIGN KEY (user_a_id) REFERENCES users(id), 
FOREIGN KEY (user_b_id) REFERENCES users(id) 
); -- Store pairs with user_a_id < user_b_id to guarantee uniqueness. 
CREATE TABLE messages ( 
id BIGINT PRIMARY KEY AUTO_INCREMENT, 
conversation_id BIGINT NOT NULL, 
sender_id BIGINT NOT NULL, 
body VARCHAR(1000) NOT NULL, 
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
INDEX idx_conv_created (conversation_id, created_at), 
FOREIGN KEY (conversation_id) REFERENCES conversations(id), 
FOREIGN KEY (sender_id) REFERENCES users(id) 
); 
CREATE TABLE blocks ( 
blocker_id BIGINT NOT NULL, 
blocked_id BIGINT NOT NULL, 
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
PRIMARY KEY (blocker_id, blocked_id) 
); 
CREATE TABLE reports ( 
id BIGINT PRIMARY KEY AUTO_INCREMENT, 
reporter_id BIGINT NOT NULL, 
reported_id BIGINT NOT NULL, 
reason ENUM('harassment','fake_profile','inappropriate_content','spam','other') NOT NULL, 
details VARCHAR(500), 
status ENUM('open','dismissed','warned','suspended') NOT NULL DEFAULT 'open', 
admin_note VARCHAR(500), 
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
); 
# 9. API Endpoints (REST + Socket.io) 
All JSON. Auth via httpOnly JWT cookie unless marked public. Return consistent errors: { "error": { 
"code": "...", "message": "..." } }. 
Auth 
• POST /api/auth/register (public) 
• POST /api/auth/verify-otp (public) 
• POST /api/auth/resend-otp (public) 
• POST /api/auth/login (public) 
• POST /api/auth/logout 
• GET /api/auth/me 
Profile 
• GET /api/profile/me 
• PUT /api/profile/me 
• PUT /api/account/phone (optional phone for contact sharing) 
Requirement and matches 
• POST /api/requirements (creates active requirement, archives old, triggers matching) 
• GET /api/requirements/active 
• GET /api/matches (returns cached top 3 for the active requirement) 
• POST /api/matches/refresh (rate limited: 5 per day) 
Chat 
• POST /api/conversations (body: candidate_user_id; creates or returns the existing one) 
• GET /api/conversations (inbox with last message and unread count) 
• GET /api/conversations/:id/messages?before=<id>&limit=50 
• POST /api/conversations/:id/share-contact (body: { "share": true|false }) 
• GET /api/conversations/:id/contact (returns the other user's contact only if both share flags 
are on) 
• POST /api/conversations/:id/confirm-roommates 
• Socket.io events: join_conversation, send_message, new_message, contact_status_changed 
Safety 
• POST /api/blocks / DELETE /api/blocks/:userId 
• POST /api/reports 
Admin (role = admin) 
• GET /api/admin/reports?status=open 
• PATCH /api/admin/reports/:id (action: dismiss | warn | suspend, with note) 
• GET /api/admin/stats 
# 10. Frontend (React) 
Use React with a component library or Tailwind CSS [DEFAULT: Tailwind]. Mobile-first and 
responsive. Use React Router. 
Pages 
# 1. / Landing page: value proposition, how it works (3 steps), CTA to sign up 
# 2. /register, /login, /verify-email 
# 3. /onboarding/profile Multi-step profile form with progress indicator 
# 4. /requirement Requirement form 
# 5. /matches Top-3 match cards (loading state while matching runs, with friendly skeletons) 
# 6. /chats Inbox, and /chats/:id conversation view with contact-share and roommate-confirm 
controls 
# 7. /settings Edit profile, add phone, blocked users, logout 
# 8. /admin (admins only) 
UX requirements 
• Clear loading, empty, and error states on every page 
• Friendly microcopy and a clean, trustworthy visual style (calm blues/greens) 
• Accessible forms (labels, keyboard navigation, contrast) 
• Show a short privacy note on the profile form: "Only verified students you match with can 
see your profile." 
# 11. Non-Functional Requirements 
• Security: bcrypt passwords; JWT in httpOnly, secure, sameSite cookies; input validation (e.g., 
Zod/Joi) on every endpoint; parameterized queries only; CORS locked to the frontend origin; 
helmet; rate limiting on auth, OTP, matching refresh, and messaging. 
• Privacy: Never expose email, phone, or password hash in any API response except via the 
consented contact endpoint. Never send contact details to the LLM. Profiles are not 
accessible by public URL. 
• Performance: Match results returned in under 10 seconds in normal conditions (LLM call is 
the bottleneck); chat message latency under 1 second. 
• Reliability: LLM fallback as described in 7.4; graceful error messages. 
• Secrets: All secrets (DB, JWT secret, LLM key, SMTP credentials) via .env; provide 
.env.example. Never commit secrets. 
• Compliance basics: Terms of Use and Privacy Policy placeholder pages; consent checkbox on 
signup. 
• Code quality: Clear folder structure, ESLint/Prettier, README with setup steps. 
# 12. Tech Stack 
• Frontend: React (Vite), React Router, Tailwind CSS 
• Backend: Node.js with Express 
• Database: MySQL 8 (use mysql2 and a migration tool such as Knex or Sequelize) 
• Realtime: Socket.io 
• Email: Nodemailer (SMTP configurable; use a console logger in development) 
• Auth: JWT + bcrypt 
• LLM: Anthropic Claude API behind a provider-agnostic service interface 
• Hosting target (suggestion): Frontend on Vercel/Netlify; backend and MySQL on Railway 
[DEFAULT] 
Suggested folder structure 
/client           
/server 
/src 
/config        
/routes 
 React app 
env, constants, blocked domains, supported cities 
/controllers 
/services     
 matching.service.js, llm.service.js, mail.service.js 
/middleware    auth, validate, rateLimit, error 
/db           
/sockets 
 migrations, seeds, queries 
/prompts        
 matching.txt 
server.js 
README.md 
.env.example 
# 13. Edge Cases to Handle 
• User edits profile after matches were generated: matches stay cached until requirement is 
resubmitted or refreshed 
• Candidate pool smaller than 3: show available matches and a clear message 
• LLM returns a candidate ID not in the shortlist: discard that entry and fill from the rule-based 
ranking 
• Duplicate conversation attempts: return the existing conversation 
• User blocks someone mid-conversation: chat disabled, contact hidden 
• Suspended user with active sessions: all requests rejected 
• User deletes account: soft-delete or anonymize; remove from matching (include a basic 
"Delete my account" action in settings) 
# 14. Seed and Test Data 
• Provide a seed script that creates 40 realistic fake users with varied profiles and active 
requirements in "Bhopal" so matching can be demoed immediately. Use obviously fake 
emails (e.g., student01@example-college.test). 
• Include unit tests for: hard-filter logic, pre-score function, JSON validation of LLM output, and 
contact-sharing consent logic. 
# 15. Build Order (follow this sequence) 
# 1. Project scaffolding, env config, DB connection, migrations for all tables 
# 2. Auth: register, OTP verify, login, protected routes, domain blocklist 
# 3. Profile API and onboarding UI 
# 4. Requirement API and form UI 
# 5. Matching service: hard filters, pre-score, seed script, rule-based fallback (works end to end 
without LLM) 
# 6. LLM service with JSON validation and fallback; cache results; refresh limit 
# 7. Match results page 
# 8. Chat: conversations, messages, Socket.io, inbox 
# 9. Contact-sharing consent and "We became roommates" confirmation 
# 10. Block and report; admin page and stats 
# 11. Landing page, settings, empty/error states, polish 
# 12. Tests, README, deployment notes 
# 16. Definition of Done for v1 
• A new user can sign up with a college email, verify it, complete a profile, submit a 
requirement, and see 3 ranked matches with explanations. 
• Matches never violate hard filters. 
• Two users can chat in real time, and contact details are revealed only after both consent. 
• Both users can confirm "We became roommates" and the admin stats reflect it. 
• Users can block and report; admin can review reports and suspend users. 
• App works with the LLM disabled (fallback) and with it enabled. 
• Seed data lets a reviewer demo the full flow in under 5 minutes. 
• README explains local setup, env variables, and how to run seed and tests. 
# 17. Future Phases (for context only, do not build now) 
• Phase 3: Room/flat/PG listings, owner verification (phone OTP + listing proof, "owner-verified 
(basic)" label), pair-to-listing matching 
• Phase 4: Women-only matching options and stronger gender controls, reviews, metrics 
dashboard, monetization (featured listings)