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
