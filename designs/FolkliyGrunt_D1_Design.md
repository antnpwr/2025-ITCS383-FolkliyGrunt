# Person 1: Project Lead + Auth + Frontend + DevOps

> **Role:** You own the project skeleton, authentication, frontend layout, and CI/CD pipeline.
> **Branch:** `feat/auth`

---

## Architecture Overview

This is a **Monolith Node.js/Express** app with **PostgreSQL** (Supabase cloud). The project structure lives in `implementations/`.

```
implementations/
├── server.js              ← YOU OWN THIS (Express entry point)
├── package.json           ← YOU OWN THIS
├── .env.example           ← YOU OWN THIS
├── middleware/
│   └── authMiddleware.js  ← YOU OWN THIS (Supabase Auth token verification)
├── routes/
│   └── auth.js            ← YOU OWN THIS
├── controllers/
│   └── authController.js  ← YOU OWN THIS
├── models/
│   └── Profile.js         ← YOU OWN THIS (user profile data, linked to Supabase auth.users)
├── public/
│   ├── css/
│   │   └── styles.css     ← YOU OWN THIS (design system)
│   ├── js/
│   │   └── app.js         ← YOU OWN THIS (client-side routing)
│   └── pages/
│       ├── login.html     ← YOU OWN THIS
│       └── register.html  ← YOU OWN THIS
├── database/
│   └── schema.sql         ← YOU OWN THIS
├── config/
│   ├── db.js              ← YOU OWN THIS (PostgreSQL connection)
│   └── supabase.js        ← YOU OWN THIS (Supabase Auth client)
└── tests/
    └── auth.test.js       ← YOU OWN THIS
```

---

## Step 1: Initialize Project

```bash
cd implementations
npm init -y
```

### package.json

```json
{
  "name": "badminton-court-management-system",
  "version": "1.0.0",
  "description": "Badminton Court Management System - ITCS383",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest --forceExit --detectOpenHandles"
  },
  "jest": {
    "testEnvironment": "node",
    "collectCoverage": true,
    "coverageReporters": ["lcov", "text"],
    "coverageDirectory": "coverage"
  },
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.3",
    "@supabase/supabase-js": "^2.39.0",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "helmet": "^7.1.0",
    "stripe": "^14.14.0",
    "nodemailer": "^6.9.8",
    "node-fetch": "^2.7.0"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "supertest": "^6.3.3",
    "nodemon": "^3.0.2"
  }
}
```

### Install dependencies

```bash
npm install
```

> ⚠️ **IMPORTANT: Use Node.js v20 LTS (NOT v22)**
>
> Jest 29 has a known bug with Node.js v22 that causes `SecurityError: Cannot initialize local storage`.
>
> **Fix:** Install and use Node.js v20:
> ```bash
> # If you have nvm (Node Version Manager):
> nvm install 20
> nvm use 20
>
> # Verify:
> node -v   # Should show v20.x.x
> ```
>
> If you can't switch Node versions, add this to `jest.config.js` in `implementations/`:
> ```javascript
> module.exports = {
>   testEnvironment: 'node',
>   testEnvironmentOptions: { customExportConditions: [''] },
>   collectCoverage: true,
>   coverageReporters: ['lcov', 'text'],
>   coverageDirectory: 'coverage'
> };
> ```

---

## Step 2: Environment Variables

Create `.env.example` (commit this) and `.env` (DO NOT commit):

```env
# .env.example
DATABASE_URL=postgresql://postgres:password@db.zmmakfbvjgmtyubgntvs.supabase.co:5432/postgres
PORT=8080

# Supabase Auth (used by authController.js and authMiddleware.js)
SUPABASE_URL=https://zmmakfbvjgmtyubgntvs.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOi... (copy from Supabase Dashboard → Settings → API)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi... (for admin operations like disabling users)

# Stripe (Person 4 uses this in paymentService.js)
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxx

# OpenStreetMap — Nominatim API (Person 2 uses this in courtController.js)
# No API key needed! Free to use. See: https://nominatim.org/release-docs/develop/api/Overview/

# Email / Nodemailer (Person 4 uses this in notificationService.js)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### How to Get Supabase Keys:
1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings → API**
4. Copy **Project URL** → `SUPABASE_URL`
5. Copy **anon public** key → `SUPABASE_ANON_KEY`
6. Copy **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

---

## Step 3: Database Connection + Supabase Client

### `config/db.js` (PostgreSQL connection — used by all team members)

```javascript
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

module.exports = pool;
```

### `config/supabase.js` (Supabase Auth client — used by auth module)

```javascript
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Public client (for login/signup — uses anon key)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Admin client (for admin operations like disabling users — uses service_role key)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = { supabase, supabaseAdmin };
```

---

## Step 4: Server Entry Point (`server.js`)

```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes — each person registers their own route file here
app.use('/api/auth', require('./routes/auth'));
// app.use('/api/courts', require('./routes/courts'));     // Person 2
// app.use('/api/bookings', require('./routes/bookings')); // Person 3
// app.use('/api/waitlist', require('./routes/waitlist')); // Person 4
// app.use('/api/reviews', require('./routes/reviews'));   // Person 5

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server (only if not in test mode)
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

module.exports = app;
```

> **IMPORTANT:** When other team members finish their routes, you uncomment the relevant `app.use()` line and merge their PR.

---

## Step 5: Auth Middleware (`middleware/authMiddleware.js`)

```javascript
const { supabase } = require('../config/supabase');
const pool = require('../config/db');

const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    // Verify token with Supabase Auth
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: 'Invalid token' });

    // Get user profile from our profiles table
    const profile = await pool.query('SELECT * FROM profiles WHERE auth_id = $1', [user.id]);
    
    req.user = {
      id: user.id,
      email: user.email,
      role: profile.rows[0]?.role || 'CUSTOMER',
      profile: profile.rows[0] || null
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

module.exports = { authMiddleware, adminOnly };
```

> **IMPORTANT:** This middleware sets `req.user = { id, email, role }` — the same interface used by ALL other team members. Persons 2-5 don't need to change anything.

---

## Step 6: Your APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register new user (name, email, address, password via Supabase Auth, then create profile) |
| `POST` | `/api/auth/login` | Login via Supabase Auth → returns access token |
| `GET` | `/api/auth/profile` | Get current user profile (requires auth) |
| `PUT` | `/api/auth/users/:id/disable` | Admin blocks/disables a user (requires admin) |

---

## Step 7: Database Schema (`database/schema.sql`)

Create ALL tables for the entire team (from the ER Diagram):

```sql
-- Profiles table (extends Supabase auth.users with app-specific data)
-- Supabase Auth handles: email, password, sessions, JWT tokens
-- This table stores EXTRA fields that Supabase doesn't manage
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID UNIQUE NOT NULL,  -- links to Supabase auth.users.id
  full_name VARCHAR(255) NOT NULL,
  address TEXT,
  role VARCHAR(20) DEFAULT 'CUSTOMER' CHECK (role IN ('CUSTOMER', 'ADMIN')),
  is_disabled BOOLEAN DEFAULT FALSE,
  credit_card_token VARCHAR(255),
  language_preference VARCHAR(5) DEFAULT 'EN' CHECK (language_preference IN ('TH', 'EN', 'ZH')),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_profiles_auth_id ON profiles(auth_id);

-- Courts table (Person 2 will use this)
CREATE TABLE courts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  location_lat DECIMAL(10, 8) NOT NULL,
  location_lng DECIMAL(11, 8) NOT NULL,
  price_per_hour DECIMAL(10, 2) NOT NULL,
  allowed_shoes VARCHAR(255),
  current_status VARCHAR(20) DEFAULT 'AVAILABLE' CHECK (current_status IN ('AVAILABLE', 'RENOVATE', 'DAMAGED')),
  opening_time TIME NOT NULL,
  closing_time TIME NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Bookings table (Person 3 will use this)
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,  -- references Supabase auth.users.id
  court_id UUID REFERENCES courts(id) ON DELETE CASCADE,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  booking_status VARCHAR(20) DEFAULT 'CONFIRMED' CHECK (booking_status IN ('CONFIRMED', 'CANCELLED', 'WAITLIST')),
  payment_method VARCHAR(20) CHECK (payment_method IN ('CREDIT_CARD', 'BANK_TRANSFER')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Equipment Rental table (Person 3 will use this)
CREATE TABLE equipment_rental (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  equipment_type VARCHAR(50) NOT NULL CHECK (equipment_type IN ('RACKET', 'SHUTTLECOCK')),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL
);

-- Waitlist table (Person 4 will use this)
CREATE TABLE waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,  -- references Supabase auth.users.id
  court_id UUID REFERENCES courts(id) ON DELETE CASCADE,
  requested_date DATE NOT NULL,
  preferred_time_slot VARCHAR(20),
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'NOTIFIED', 'EXPIRED')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Reviews table (Person 5 will use this)
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,  -- references Supabase auth.users.id
  court_id UUID REFERENCES courts(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment_text TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Performance indexes for < 2s search
CREATE INDEX idx_courts_name ON courts(name);
CREATE INDEX idx_courts_location ON courts(location_lat, location_lng);
CREATE INDEX idx_courts_price ON courts(price_per_hour);
CREATE INDEX idx_courts_status ON courts(current_status);
CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_court_time ON bookings(court_id, start_time, end_time);
CREATE INDEX idx_reviews_court ON reviews(court_id);
CREATE INDEX idx_waitlist_court ON waitlist(court_id, status);
```

---

## Step 8: Frontend Design System

Create `public/css/styles.css` with a consistent design system that all team members' HTML pages will use. Include:
- CSS variables for colors, spacing, typography
- Responsive breakpoints
- Button styles, card components, form inputs
- Navigation bar
- Dark/light mode support

---

## DO NOT TOUCH (Other people's files)

| Person | Files you must NOT edit |
|--------|------------------------|
| Person 2 | `routes/courts.js`, `controllers/courtController.js`, `models/Court.js` |
| Person 3 | `routes/bookings.js`, `controllers/bookingController.js`, `models/Booking.js`, `models/EquipmentRental.js` |
| Person 4 | `routes/waitlist.js`, `controllers/waitlistController.js`, `models/Waitlist.js`, `services/paymentService.js`, `services/notificationService.js` |
| Person 5 | `routes/reviews.js`, `controllers/reviewController.js`, `models/Review.js`, `locales/*.json`, `middleware/i18n.js` |

---

## Git Workflow

```bash
git checkout -b feat/auth
# ... code ...
git add .
git commit -m "feat(auth): add register and login endpoints"
git push origin feat/auth
# Create PR on GitHub → wait for CI to pass → merge
```

---

## External APIs Used in This Project

| Platform | npm Package | Used By | Purpose |
|----------|-------------|---------|--------|
| **Stripe** | `stripe` | Person 4 (Payment Service) | Credit card charges, bank transfers, refunds |
| **OpenStreetMap (Nominatim)** | `node-fetch` (built-in HTTP) | Person 2 (Court Search) | Free geocoding API — no API key needed. Distance uses Haversine SQL formula |
| **Nodemailer (SMTP)** | `nodemailer` | Person 4 (Notification Service) | Email alerts for waitlist availability |

> All three packages are already included in `package.json`. Team members just need to configure the `.env` file with their API keys.

---

## 📝 D3: AI Usage Log

**Every team member MUST log their AI usage** in `FolkliyGrunt_D3_AILog.md` at the project root.

Every time you use an AI tool (ChatGPT, Gemini, Copilot, Claude, etc.), log it in this format:

```markdown
### Entry [number] — [Short Description]
- **Date:** YYYY-MM-DD
- **Person:** [Your name / Person number]
- **AI Tool:** [ChatGPT / Gemini / GitHub Copilot / Claude / etc.]
- **Task:** [What you were working on]

**Prompt:**
> [Exact prompt or summary of what you asked the AI]

**AI Output (Summary):**
> [Brief summary of the AI's response — do NOT paste entire responses]

**Decision:**
- [ ] ✅ Accepted as-is
- [ ] ✏️ Accepted with modifications (describe changes below)
- [ ] ❌ Rejected (describe why below)

**Modifications / Rejection Reason:**
> [What you changed and why, OR why you rejected the output]

**Verification Method:**
> [How you verified the code works: ran tests, manual testing, code review, etc.]
```

### Example Entry:

```markdown
### Entry 1 — Auth Controller Login Endpoint
- **Date:** 2026-03-11
- **Person:** Person 1 (Project Lead)
- **AI Tool:** Gemini (Antigravity Agent)
- **Task:** Implementing POST /api/auth/login with Supabase Auth

**Prompt:**
> Create a login endpoint using Express.js that uses Supabase Auth SDK (supabase.auth.signInWithPassword) and returns the session token.

**AI Output (Summary):**
> Generated a complete login controller using supabase.auth.signInWithPassword(), with error handling for invalid credentials and disabled accounts via the profiles table.

**Decision:**
- [x] ✏️ Accepted with modifications

**Modifications / Rejection Reason:**
> Changed JWT expiry from 24h to 8h for better security. Added check for `is_disabled` field to block suspended users.

**Verification Method:**
> Ran `npm test` — all auth.test.js tests pass. Manually tested with Postman.
```

> **IMPORTANT:** Log EVERY AI interaction, even small ones. The professor grades this deliverable (D3 = 7% of total grade).
