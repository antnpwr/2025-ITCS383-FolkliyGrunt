# 📝 D3: AI Usage Log

Every team member MUST log their AI usage here.

### Entry 1 — Project Scaffold & Dependency Configuration
- **Date:** 2026-03-11
- **Person:** Person 1 (Project Lead)
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
- **Person:** Person 1 (Project Lead)
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

### Entry 3 — Auth APIs and System Schema Schema
- **Date:** 2026-03-11
- **Person:** Person 1 (Project Lead)
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

### Entry 4 — Booking Model with Double-Booking Prevention
- **Date:** 2026-03-11
- **Person:** Person 3
- **AI Tool:** Gemini (Antigravity Agent)
- **Task:** Creating the `models/Booking.js` data access layer with concurrency-safe court booking.

**Prompt:**
> Create the Booking model with methods for creating a booking (using SELECT FOR UPDATE to prevent double-booking), cancelling a booking (only if play time hasn't started), fetching bookings for a user joined with court name, and checking timeslot availability.

**AI Output (Summary):**
> Generated `models/Booking.js` with four static methods: `create()` using a transaction with `SELECT FOR UPDATE` to lock the timeslot before inserting, `cancel()` that only updates status to CANCELLED if `start_time > NOW()`, `findByUser()` with a JOIN on the courts table, and `checkAvailability()` returning a boolean.

**Decision:**
- [x] ✅ Accepted as-is

**Verification Method:**
> Reviewed the SQL queries for correctness (overlap detection logic: `start_time < $3 AND end_time > $2`). Verified transaction handling with BEGIN/COMMIT/ROLLBACK and proper client release in the finally block. Ran unit tests to confirm.

### Entry 5 — Equipment Rental Model
- **Date:** 2026-03-11
- **Person:** Person 3
- **AI Tool:** Gemini (Antigravity Agent)
- **Task:** Creating the `models/EquipmentRental.js` model for managing equipment linked to bookings.

**Prompt:**
> Create the EquipmentRental model with methods to add equipment items to a booking and retrieve equipment for a given booking ID.

**AI Output (Summary):**
> Generated `models/EquipmentRental.js` with `addToBooking()` that loops through an array of items and inserts each into `equipment_rental`, and `findByBooking()` that queries all equipment for a booking ID.

**Decision:**
- [x] ✅ Accepted as-is

**Verification Method:**
> Code review confirmed correct parameterized queries and proper use of the shared `pool` from `config/db`. Verified the INSERT returns `RETURNING *` for each item.

### Entry 6 — Booking Routes and Controller
- **Date:** 2026-03-11
- **Person:** Person 3
- **AI Tool:** Gemini (Antigravity Agent)
- **Task:** Creating `routes/bookings.js` and `controllers/bookingController.js` for the booking REST API endpoints.

**Prompt:**
> Create the Express router for bookings with POST /, GET /my, DELETE /:id, and GET /:id/equipment endpoints, all behind authMiddleware. Create the controller with create (calculate end time, handle equipment, return 409 on conflict), cancel (return 400 if ineligible), getMyBookings, and getEquipment handlers. Include TODO comments for Person 4's payment and notification services.

**AI Output (Summary):**
> Generated `routes/bookings.js` applying `authMiddleware` via `router.use()` and mapping four endpoints to controller methods. Generated `bookingController.js` with `create` (calculates end time from duration_hours, creates booking, adds equipment), `cancel` (returns 400 if not cancellable), `getMyBookings`, and `getEquipment`. Includes commented-out imports and calls for Person 4's paymentService and notificationService.

**Decision:**
- [x] ✅ Accepted as-is

**Verification Method:**
> Verified the route was registered in `server.js` by uncommenting line 19. Confirmed the controller correctly uses `req.user.id` from authMiddleware. Ran the dev server with `npm run dev` — server started successfully on port 8080 without errors.

### Entry 7 — Booking Unit Tests
- **Date:** 2026-03-11
- **Person:** Person 3
- **AI Tool:** Gemini (Antigravity Agent)
- **Task:** Creating `tests/bookings.test.js` with mocked database tests for the Booking model.

**Prompt:**
> Write Jest unit tests for the Booking model: test that checkAvailability returns true for an open slot and false for a taken slot, and that cancel returns undefined when the booking is not eligible for cancellation. Mock the config/db module with a mock pool and mock client.

**AI Output (Summary):**
> Generated `tests/bookings.test.js` that mocks `config/db` with `query` and `connect` (returning a mock client). Contains 3 tests: availability returns true when no rows, availability returns false when rows exist, and cancel returns undefined when no matching booking found.

**Decision:**
- [x] ✅ Accepted as-is

**Verification Method:**
> Ran `npx jest tests/bookings.test.js --forceExit --detectOpenHandles` — all 3 tests passed. Also ran `npm test` to confirm no regressions: all 9 tests passed (6 auth + 3 bookings).

### Entry 8 — Booking and My Bookings HTML Pages
- **Date:** 2026-03-11
- **Person:** Person 3
- **AI Tool:** Gemini (Antigravity Agent)
- **Task:** Creating `public/pages/booking.html` and `public/pages/my-bookings.html` frontend pages.

**Prompt:**
> Create a booking form page (booking.html) with court selection dropdown, datetime picker, duration selector, payment method, total amount input, and dynamic equipment rental section with add/remove functionality. Create a my-bookings page (my-bookings.html) that lists the user's bookings with cancel buttons and an equipment viewer modal. Both pages should use the auth token from localStorage and redirect to login if not authenticated.

**AI Output (Summary):**
> Generated `booking.html` with a form that dynamically loads courts from Person 2's API, allows adding multiple equipment items, and submits to POST /api/bookings. Generated `my-bookings.html` that fetches GET /api/bookings/my, displays booking cards with status, and provides cancel (DELETE) and view equipment (GET) functionality.

**Decision:**
- [x] ✏️ Accepted with modifications (describe changes below)

**Modifications / Rejection Reason:**
> Fixed the CSS stylesheet path in both HTML files. The AI generated `href="/css/styles.css"` (absolute path) but the correct relative path from `pages/` is `href="../css/styles.css"`. Updated both files accordingly.

**Verification Method:**
> Started the dev server with `npm run dev` and verified both pages load correctly at `http://localhost:8080/pages/booking.html` and `http://localhost:8080/pages/my-bookings.html`. Confirmed the stylesheet loads properly with the corrected relative path.
