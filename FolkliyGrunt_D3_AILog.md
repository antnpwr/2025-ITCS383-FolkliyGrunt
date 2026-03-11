# 📝 D3: AI Usage Log

Every team member MUST log their AI usage in their respective section below.

---

## Person 1: Project Lead + Auth + Frontend

### Entry 1 — Project Scaffold & Dependency Configuration
- **Date:** 2026-03-11
- **Person:** Person 1
- **AI Tool:** Gemini (Antigravity Agent)
- **Task:** Initializing Node.js project, formatting `package.json`, and configuring `.env.example`.

**Prompt:**
> Please generate the package.json with dependencies for Express, pg, Supabase, CORS, NodeMailer, and Stripe. Also, create a template .env.example file for the environment variables.

**AI Output (Summary):**
> Generated `package.json` with the required dependencies (Express, pg, Supabase, CORS, NodeMailer, Stripe, etc.) and created `.env.example` mapping to Supabase and other services.

**Decision:**
- [x] ✅ Accepted as-is

**Verification Method:**
> Ran `npm install` and manually checked `package.json` against the instructions.

### Entry 2 — Database and Auth Middleware Setup
- **Date:** 2026-03-11
- **Person:** Person 1
- **AI Tool:** Gemini (Antigravity Agent)
- **Task:** Setting up Supabase instances and API authentication middleware.

**Prompt:**
> I need to set up the PostgreSQL database connection using the pg library and initialize the Supabase client for authentication. Can you also create an Express middleware to verify Supabase JWT tokens and fetch the user profile?

**AI Output (Summary):**
> Generated `config/db.js` for PostgreSQL connection pooling and `config/supabase.js` to export both anon and admin clients. Also generated `middleware/authMiddleware.js` for intercepting JWT tokens.

**Decision:**
- [x] ✅ Accepted as-is

**Verification Method:**
> Reviewed the code format. Matches the required interface `req.user = { id, email, role, profile }` required by the rest of the team.

### Entry 3 — Auth APIs and System Schema
- **Date:** 2026-03-11
- **Person:** Person 1
- **AI Tool:** Gemini (Antigravity Agent)
- **Task:** Implementing Auth Controllers, REST routes, and translating ER diagram into PostgreSQL schema.

**Prompt:**
> Could you implement the Express routes and controllers for user registration, login, fetching the profile, and an admin endpoint to disable users? Also, please write the SQL schema to create tables for profiles, courts, bookings, waitlist, and reviews.

**AI Output (Summary):**
> Wrote `routes/auth.js` and `controllers/authController.js` for signup, login, profile, and admin account suspension. Built `schema.sql` encompassing all application tables with optimal query indexes. Design system CSS was also built.

**Decision:**
- [x] ✅ Accepted as-is

**Verification Method:**
> Examined code visually to ensure SQL relations were sound (cascading deletes, unique fields) and Supabase methods used correctly. Design uses variables for simple theming.

### Entry 4 — Connection Debugging and Dashboard Implementation
- **Date:** 2026-03-11
- **Person:** Person 1
- **AI Tool:** Gemini (Antigravity Agent)
- **Task:** Resolving `ENOTFOUND` connection errors, fixing data mapping bugs, and building the dashboard.

**Prompt:**
> Resolve the "ENOTFOUND base" error occurring during registration. Fix the profile creation crash where full_name was null. Then, implement a central dashboard that greets the user and handles session redirection.

**AI Output (Summary):**
> Identified hidden characters in `.env` causing DNS errors; refactored to individual host/user variables. Fixed frontend `fullName` to backend `full_name` mapping mismatch. Created `index.html` and updated `app.js` with session-aware routing and profile fetching.

**Decision:**
- [x] ✅ Accepted as-is

**Verification Method:**
> Ran `npm test`—all 6 suite tests passed. Manually verified end-to-end registration and dashboard redirection in the browser.
### Entry 5 — SonarCloud Remediation & Test Coverage Optimization
- **Date:** 2026-03-11
- **Person:** Person 1
- **AI Tool:** Gemini (Antigravity Agent)
- **Task:** Resolving Reliability and Maintainability issues, reducing Cognitive Complexity, and boosting test coverage to 80%+.

**Prompt:**
> Address the SonarCloud issues: fix the parseInt calls in db.js, use optional chaining in authController.js, and refactor the monolithic DOM content logic in app.js to reduce cognitive complexity. Also, create a unit test for the Profile model and auth endpoints to ensure we hit the 80% coverage target.

**AI Output (Summary):**
> Updated `db.js` with `Number.parseInt`. Refactored `app.js` into modular functions (`updateAuthUI`, `fetchAndSyncProfile`). Implemented `profile.test.js` and updated `auth.test.js` with comprehensive mocks.

**Decision:**
- [x] ✅ Accepted as-is

**Verification Method:**
> Ran `npm run test -- --coverage`. Verified an overall statement coverage of **83.8%** and confirmed all 11 tests pass.

---

## Person 2: Court Search
*Log your AI interactions here...*

---

## Person 3: Bookings & Equipment
*Log your AI interactions here...*

---

## Person 4: Waitlist & Payments
*Log your AI interactions here...*

---

## Person 5: Reviews & Localization

### Entry 1 — Implementation of Review Module & i18n
- **Date:** 2026-03-11
- **Person:** [Wimonwan/ Person 5]
- **AI Tool:** Gemini (Antigravity Agent)
- **Task:** Creating Review Models, Controllers, Routes, i18n Middleware, Locales, and Tests.

**Prompt:**
> Read the file PERSON5_REVIEWS_I18N.md and create code it exactly to build the Review Module + i18n based on the prompt instructions.

**AI Output (Summary):**
> Read the instruction file and created the exact files for the database models, Express routes, controllers, i18n localization JSONs, and test suites as provided in the instructions.

**Decision:**
- [x] ✅ Accepted as-is
- [ ] ✏️ Accepted with modifications (describe changes below)
- [ ] ❌ Rejected (describe why below)

**Modifications / Rejection Reason:**
> N/A

**Verification Method:**
> Verified that the exact required implementation files matched the code provided in PERSON5_REVIEWS_I18N.md. Tests are created as instructed.
