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

## Environment Variables
Before running the project, you must configure the environment keys.
Create a file named `.env` in the `implementations` directory and include the following variables according to your Supabase and external API configurations:

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
1. Navigate to the root implementation folder:
   ```bash
   cd implementations
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

## Example Usage
- **Default Port & Local URL:** The web service listens on port 8080 by default. Access the application at **[http://localhost:8080](http://localhost:8080)**.
- **Frontend Dashboard**: Open `http://localhost:8080/` in your browser to view the client dashboard.
- **Authentication Routes**: Access `http://localhost:8080/pages/login.html` and `http://localhost:8080/pages/register.html` to authenticate users securely.
- **API Interactions**: 
  - *Health Check*: `GET /api/health`
  - *Search Courts*: `GET /api/courts?search=Bangkok&maxPrice=300`
