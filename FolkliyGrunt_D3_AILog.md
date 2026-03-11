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

## Person 2: Court & Search Module

### Entry 1 — Court Model (Data Access Layer)
- **Date:** 2026-03-11
- **Person:** Vasuphon / Person 2
- **AI Tool:** Claude (Antigravity Agent)
- **Task:** Implementing `models/Court.js` with all database query methods for court management and search.

**Prompt:**
> Read the file `.agent/PERSON2_COURTS_SEARCH.md` and follow it to build the Court & Search Module. Create `models/Court.js` with static methods: `create`, `findAll`, `findById`, `searchByName`, `searchByDistance` (Haversine SQL formula), `searchByPrice`, `update`, and `updateStatus`.

**AI Output (Summary):**
> Generated `models/Court.js` with all 8 static methods. The `searchByDistance` method uses the Haversine formula embedded directly in PostgreSQL SQL (Option A — no external API key needed). The `findAll` and `findById` methods LEFT JOIN with the `reviews` table and return `avg_rating` and `review_count` to support Person 5 (Reviews) integration.

**Decision:**
- [x] ✅ Accepted as-is

**Modifications / Rejection Reason:**
> None. Output matched the spec in `PERSON2_COURTS_SEARCH.md` exactly, including the Haversine SQL formula and parameterized `$1`/`$2`/`$3` queries to prevent SQL injection.

**Verification Method:**
> Ran `npx jest tests/courts.test.js` — all 7 unit tests passed. Reviewed SQL strings to verify correct parameterized placeholder usage.

---

### Entry 2 — Court Routes & Controller
- **Date:** 2026-03-11
- **Person:** Vasuphon / Person 2
- **AI Tool:** Claude (Antigravity Agent)
- **Task:** Implementing `routes/courts.js` and `controllers/courtController.js` with all 8 API endpoints.

**Prompt:**
> Following the spec in `PERSON2_COURTS_SEARCH.md`, create `routes/courts.js` with public GET routes and admin-protected POST/PUT routes using `authMiddleware` and `adminOnly`. Then create `controllers/courtController.js` with full logic for `search`, `getAll`, `getById`, `create`, `update`, and `updateStatus`.

**AI Output (Summary):**
> Generated `routes/courts.js` with 6 route definitions (3 public, 3 admin-protected). Generated `controllers/courtController.js` with complete logic for all endpoints: input validation, proper HTTP status codes (201 for create, 400 for bad input, 404 for not found, 500 for server errors), and status enum validation (`AVAILABLE`, `RENOVATE`, `DAMAGED`).

**Decision:**
- [x] ✏️ Accepted with modifications (describe changes below)

**Modifications / Rejection Reason:**
> Added required-field validation for the `create` endpoint and status enum validation for `updateStatus` — these were not in the original spec stub but were added for robustness and to prevent bad data from reaching the database.

**Verification Method:**
> Manually traced the request flow through `routes/courts.js` → `courtController.js` → `Court` model. Verified the search controller correctly branches by query parameter: `name` → `searchByName`, `lat+lng+radius` → `searchByDistance`, `maxPrice` → `searchByPrice`, else → `findAll`.

---

### Entry 3 — Unit Tests for Court Model
- **Date:** 2026-03-11
- **Person:** Vasuphon / Person 2
- **AI Tool:** Claude (Antigravity Agent)
- **Task:** Writing `tests/courts.test.js` — unit tests for the Court model with a mocked database pool.

**Prompt:**
> Following the test structure in `PERSON2_COURTS_SEARCH.md`, create `tests/courts.test.js`. Include the 3 required tests from the spec (`searchByName`, `searchByPrice`, `updateStatus`) and extend with additional tests for `searchByDistance`, `findById`, `findAll`, and `create`.

**AI Output (Summary):**
> Generated `tests/courts.test.js` with 7 tests total. All tests use `jest.mock('../config/db')` so no real database connection is needed. Tests verify both that correct SQL substrings are used and that return values are shaped correctly.

**Decision:**
- [x] ✅ Accepted as-is

**Modifications / Rejection Reason:**
> None. The 3 required tests from the spec were included verbatim, and 4 additional tests were added to improve coverage.

**Verification Method:**
> Ran `npx jest tests/courts.test.js --forceExit --no-coverage` → **7 passed, 7 total**. Ran the full suite `npx jest --forceExit --no-coverage` → **13 passed, 13 total** (courts + auth). No regressions.

---

### Entry 4 — Frontend Pages: search.html & court-detail.html
- **Date:** 2026-03-11
- **Person:** Vasuphon / Person 2
- **AI Tool:** Claude (Antigravity Agent)
- **Task:** Building `public/pages/search.html` and `public/pages/court-detail.html` for the customer-facing court search and detail views.

**Prompt:**
> Create `public/pages/search.html` with three search modes: by name (text input), by distance (GPS via `navigator.geolocation` + lat/lng inputs), and by max price. Also create `public/pages/court-detail.html` that loads a court by ID from the URL query param and displays all court info including avg rating and an admin status panel. Both pages must use the existing `css/styles.css` design system.

**AI Output (Summary):**
> Generated `search.html` with a tabbed UI (By Name / By Distance / By Price), a GPS auto-detect button using `navigator.geolocation`, a responsive card grid for results, and empty/error states. Generated `court-detail.html` that fetches `/api/courts/:id`, renders all court fields, shows star ratings, links to OpenStreetMap, and shows an admin status-change panel when `localStorage.user_role === 'ADMIN'`.

**Decision:**
- [x] ✅ Accepted as-is

**Modifications / Rejection Reason:**
> None. Both pages use only the CSS variables and class names from `styles.css` as required, and call the correct backend API endpoints from `courtController.js`.

**Verification Method:**
> Reviewed HTML structure for correct API endpoint usage (`/api/courts`, `/api/courts/search`, `/api/courts/:id`). Verified the GPS branch uses `navigator.geolocation.getCurrentPosition()` correctly and passes coordinates to the `lat/lng/radius` search query. Confirmed admin panel is conditionally rendered from `localStorage.user_role`.

---

## Person 3: Bookings & Equipment
*Log your AI interactions here...*

---

## Person 4: Waitlist & Payments
*Log your AI interactions here...*

---

## Person 5: Reviews & Localization
*Log your AI interactions here...*
