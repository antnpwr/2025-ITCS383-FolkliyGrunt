# FolkliyGrunt 🏸

## Project Overview

FolkliyGrunt is a comprehensive Badminton Court Management System built with a monolithic Node.js/Express architecture and a Vanilla HTML/CSS/JS frontend.
The system provides robust features for managing and reserving courts:

- **Authentication & Profiles**: Secure user management powered by Supabase Auth.
- **Court Discovery**: Dynamic search by name, distance (via Haversine & OpenStreetMap Geocoding), and maximum price.
- **Bookings & Rentals**: Safe, concurrent time-slot reservations with optional equipment rental combinations (rackets, shuttlecocks).
- **Waitlists**: Automated FIFO waitlist system combined with Nodemailer email alerts when cancellation slots open up.
- **Reviews**: Verified review system that recalculates dynamic court ratings upon submission.

## Setup Requirements

To run this project locally, ensure you have the following installed:

- **Node.js**: v20 LTS recommended.
- **npm**: Node package manager.
- **Supabase Account**: Specifically the provided remote project configuration.

## Project Structure

The implementation is now separated into two folders:

- `implementations/backend`: Express API server, database models, routes, services, tests, and environment configuration.
- `implementations/frontend`: Static HTML/CSS/JS client files served by the backend server.

## Environment Variables

Before running the project, you must configure the environment keys.
Create a file named `.env` in the `implementations/backend` directory and include the following variables according to your Supabase and external API configurations:

```env
PORT=8080

DB_USER=postgres.yqeujznwxphavvdwjkii
DB_HOST=aws-1-ap-southeast-1.pooler.supabase.com
DB_NAME=postgres
DB_PASS=0656515941gG
DB_PORT=5432

SUPABASE_URL=https://yqeujznwxphavvdwjkii.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxZXVqem53eHBoYXZ2ZHdqa2lpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMTAwMjQsImV4cCI6MjA4ODc4NjAyNH0.O6VFh8JiIKLbA-kfDh05oJv_ye-_4H1c3-SCHlxyyvc
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxZXVqem53eHBoYXZ2ZHdqa2lpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzIxMDAyNCwiZXhwIjoyMDg4Nzg2MDI0fQ.0t2heiEtn2I-zzfKaV9im2OZJhAkePKlOMR7jgVDmHg

SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=587
SMTP_USER=e00dd2fa5bb311
SMTP_PASS=54420b98172a55
```

## Build Commands

1. Navigate to the backend folder:
   ```bash
   cd implementations/backend
   ```
2. Install the application dependencies:
   ```bash
   npm install
   ```

## Run Commands

**Development Mode:**
Starts the local Express server using Nodemon for hot-reloading:

```bash
npm run dev
```

**Production Mode:**
Starts the local Express server appropriately:

```bash
npm start
```

**Testing Suite:**
Runs the robust Jest coverage suite (mocks external APIs heavily):

```bash
npm test
```

## Frontend

- Frontend source files are in `implementations/frontend`.
- The backend serves the frontend at `http://localhost:8080/`.

### Mode A: One Server (Recommended Default)

Use backend only. It serves both frontend pages and API.

```env
ENABLE_FRONTEND=true
```

Run:

```bash
cd implementations/backend
npm run dev
```

This gives:

- Web frontend at `http://localhost:8080/`
- API for mobile at `http://localhost:8080/api/*`

### Mode B: Two Servers (Dedicated Frontend Server)

Use backend for API and a separate frontend server that proxies `/api` and `/locales` to backend.

1. Start backend in API mode:

```env
ENABLE_FRONTEND=false
```

```bash
cd implementations/backend
npm run dev
```

2. Start frontend server (new file: `implementations/frontend/server.js`):

```bash
cd implementations/backend
npm run frontend
```

Optional frontend env vars:

- `FRONTEND_PORT` (default `3000`)
- `BACKEND_URL` (default `http://localhost:8080`)

This gives:

- Web frontend at `http://localhost:3000/`
- API still available for mobile at `http://localhost:8080/api/*`

## Mobile Application

A native Android mobile application has been developed as a companion client for this system. It replicates all user-facing functionalities of the web application.

**Mobile App Repository:** [https://github.com/antnpwr/2025-ITCS383-FolkliyGrunt-Mobile](https://github.com/antnpwr/2025-ITCS383-FolkliyGrunt-Mobile)

The mobile app implementation guide for AI assistants is available in [`MOBILE_APP_AI_PROMPT.md`](./MOBILE_APP_AI_PROMPT.md).

## Mobile App Backend Mode

For mobile app integration, you can run the backend in API-only mode (without serving web pages):

```env
ENABLE_FRONTEND=false
```

You can also restrict browser origins for API calls (comma-separated):

```env
CORS_ORIGINS=http://localhost:3000,https://your-mobile-web-preview.example
```

Useful backend endpoints for mobile clients:

- `GET /api/health` - health check
- `GET /api/meta` - API metadata and compatibility info

## Example Usage

- **Default Port & Local URL:** The web service listens on port 8080 by default. Access the application at **[http://localhost:8080](http://localhost:8080)**.
- **Frontend Dashboard**: Open `http://localhost:8080/` in your browser to view the client dashboard.
- **Authentication Routes**: Access `http://localhost:8080/pages/login.html` and `http://localhost:8080/pages/register.html` to authenticate users securely.
- **API Interactions**:
  - _Health Check_: `GET /api/health`
  - _Search Courts_: `GET /api/courts?search=Bangkok&maxPrice=300`
