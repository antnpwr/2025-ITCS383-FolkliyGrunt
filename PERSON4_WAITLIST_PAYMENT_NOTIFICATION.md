# Person 4: Waitlist + Payment Service + Notification Service

> **Role:** You own the waitlist feature, the payment service (**Stripe**), and the notification service (**Nodemailer/SMTP**). These are service-layer modules that Person 3 (Booking) will import and use.
> **Branch:** `feat/waitlist-payment`

---

## Architecture Context

We are building a **Monolith Node.js/Express** backend in `implementations/`. You are responsible for the **service layer** — shared business services that other controllers call.

### Your position in the system (from C4 Level 3):
```
Booking Controller (Person 3) ──imports──→ Payment Service (YOU)
                               ──imports──→ Notification Service (YOU)
Express Router → /api/waitlist/* → Waitlist Controller (YOU) → PostgreSQL
```

---

## Your Files (ONLY touch these)

```
implementations/
├── routes/
│   └── waitlist.js                ← YOU OWN THIS
├── controllers/
│   └── waitlistController.js      ← YOU OWN THIS
├── models/
│   └── Waitlist.js                ← YOU OWN THIS
├── services/
│   ├── paymentService.js          ← YOU OWN THIS
│   └── notificationService.js     ← YOU OWN THIS
├── public/pages/
│   └── waitlist.html              ← YOU OWN THIS
└── tests/
    ├── waitlist.test.js           ← YOU OWN THIS
    ├── paymentService.test.js     ← YOU OWN THIS
    └── notificationService.test.js ← YOU OWN THIS
```

### DO NOT TOUCH:
- `server.js`, `package.json`, `public/css/` — Person 1
- `routes/auth.js`, `models/User.js` — Person 1
- `routes/courts.js`, `models/Court.js` — Person 2
- `routes/bookings.js`, `models/Booking.js`, `models/EquipmentRental.js` — Person 3
- `routes/reviews.js`, `models/Review.js`, `locales/` — Person 5

---

## Step 1: Setup

```bash
git pull origin master
git checkout -b feat/waitlist-payment
cd implementations
npm install  # all dependencies already in package.json
```

**Dependencies needed** (already installed by Person 1):
- `express`, `pg`, `jsonwebtoken` — all pre-installed
- `stripe` — Stripe SDK for payment processing (**already in package.json**)
- `nodemailer` — Email sending via SMTP (**already in package.json**)

### Environment Variables (in `.env`)
```env
# Stripe
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxx

# Email / Nodemailer
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```
> Ask Person 1 for the actual `.env` values, or use [Mailtrap](https://mailtrap.io) for dev testing (free SMTP inbox).

---

## Step 2: Database Table (Already Created by Person 1)

```sql
CREATE TABLE waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  court_id UUID REFERENCES courts(id),
  requested_date DATE NOT NULL,
  preferred_time_slot VARCHAR(20),
  status VARCHAR(20) DEFAULT 'PENDING',  -- PENDING / NOTIFIED / EXPIRED
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_waitlist_court ON waitlist(court_id, status);
```

---

## Step 3: Model (`models/Waitlist.js`)

```javascript
const pool = require('../config/db');

class Waitlist {
  // Add user to waitlist for a specific court + date
  static async add({ user_id, court_id, requested_date, preferred_time_slot }) {
    const result = await pool.query(
      `INSERT INTO waitlist (user_id, court_id, requested_date, preferred_time_slot)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [user_id, court_id, requested_date, preferred_time_slot]
    );
    return result.rows[0];
  }

  // Get next user in queue for a specific court (FIFO — oldest first)
  static async getNextInQueue(courtId) {
    const result = await pool.query(
      `SELECT w.*, u.email, u.full_name
       FROM waitlist w
       JOIN users u ON w.user_id = u.id
       WHERE w.court_id = $1 AND w.status = 'PENDING'
       ORDER BY w.created_at ASC
       LIMIT 1`,
      [courtId]
    );
    return result.rows[0]; // null if no one is waiting
  }

  // Mark waitlist entry as notified
  static async markNotified(waitlistId) {
    const result = await pool.query(
      `UPDATE waitlist SET status = 'NOTIFIED' WHERE id = $1 RETURNING *`,
      [waitlistId]
    );
    return result.rows[0];
  }

  // Get waitlist entries for a user
  static async findByUser(userId) {
    const result = await pool.query(
      `SELECT w.*, c.name as court_name
       FROM waitlist w
       JOIN courts c ON w.court_id = c.id
       WHERE w.user_id = $1
       ORDER BY w.created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  // Expire old waitlist entries (optional: run periodically)
  static async expireOldEntries() {
    const result = await pool.query(
      `UPDATE waitlist SET status = 'EXPIRED'
       WHERE status = 'PENDING' AND requested_date < CURRENT_DATE
       RETURNING *`
    );
    return result.rows;
  }
}

module.exports = Waitlist;
```

---

## Step 4: Payment Service (`services/paymentService.js`)

This uses the **Stripe Node.js SDK** (`stripe` npm package). In test mode, use `sk_test_...` key — no real charges are made.

```javascript
/**
 * Payment Service — Stripe Integration
 * Uses Stripe Charges API for payments and Stripe Refunds API for cancellations.
 *
 * Person 3 (Booking) will import this:
 *   const paymentService = require('../services/paymentService');
 *   await paymentService.processPayment({ ... });
 */
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const paymentService = {
  /**
   * Process a payment via Stripe
   * @param {Object} params
   * @param {string} params.booking_id - Booking UUID (stored as metadata)
   * @param {number} params.amount - Amount in THB (smallest unit = satang, so 500 THB = 50000)
   * @param {string} params.method - 'CREDIT_CARD' or 'BANK_TRANSFER'
   * @param {string} params.credit_card_token - Stripe token from frontend (tok_xxx)
   * @returns {Object} { success, transaction_id, amount, method }
   */
  processPayment: async ({ booking_id, amount, method, credit_card_token }) => {
    try {
      const charge = await stripe.charges.create({
        amount: Math.round(amount * 100), // Convert THB to satang
        currency: 'thb',
        source: credit_card_token, // tok_visa for testing
        description: `Booking ${booking_id}`,
        metadata: { booking_id, method }
      });

      return {
        success: true,
        transaction_id: charge.id, // ch_xxx
        amount,
        method,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Payment failed: ${error.message}`);
    }
  },

  /**
   * Process a full refund via Stripe Refunds API
   * @param {string} chargeId - Stripe charge ID (ch_xxx) from original payment
   * @returns {Object} { success, refund_id }
   */
  processRefund: async (chargeId) => {
    try {
      const refund = await stripe.refunds.create({
        charge: chargeId
      });

      return {
        success: true,
        refund_id: refund.id, // re_xxx
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Refund failed: ${error.message}`);
    }
  }
};

module.exports = paymentService;
```

> **Testing Tip:** Use Stripe test tokens: `tok_visa` (success), `tok_chargeDeclined` (declined). No real money is charged in test mode.

---

## Step 5: Notification Service (`services/notificationService.js`)

Uses **Nodemailer** to send real emails via SMTP (Gmail, Mailtrap, or any SMTP server).

```javascript
/**
 * Notification Service — Nodemailer (SMTP Email)
 * Sends email alerts when a waitlisted court becomes available.
 *
 * Person 3 (Booking) will call this when a booking is cancelled:
 *   const notificationService = require('../services/notificationService');
 *   await notificationService.notifyWaitlist(courtId, startTime, endTime);
 */
require('dotenv').config();
const nodemailer = require('nodemailer');
const Waitlist = require('../models/Waitlist');

// Create reusable SMTP transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false, // true for port 465, false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const notificationService = {
  /**
   * Notify the next user in the waitlist when a court becomes available
   * @param {string} courtId - Court UUID
   * @param {Date} startTime - Available start time
   * @param {Date} endTime - Available end time
   * @returns {Object|null} Notified user or null if no one waiting
   */
  notifyWaitlist: async (courtId, startTime, endTime) => {
    const nextUser = await Waitlist.getNextInQueue(courtId);

    if (!nextUser) {
      return null; // No one in the queue
    }

    // Mark as notified in DB
    await Waitlist.markNotified(nextUser.id);

    // Send email via Nodemailer
    try {
      await transporter.sendMail({
        from: `"Badminton Court System" <${process.env.SMTP_USER}>`,
        to: nextUser.email,
        subject: '🏸 Court is Now Available! Book Now',
        html: `
          <h2>Good news, ${nextUser.full_name}!</h2>
          <p>A court you were waiting for is now available.</p>
          <p><strong>Time slot:</strong> ${startTime} - ${endTime}</p>
          <p>Log in to book before someone else does!</p>
        `
      });
    } catch (emailError) {
      console.error(`[NOTIFICATION] Email failed: ${emailError.message}`);
      // Don't throw — notification failure shouldn't block cancellation
    }

    return {
      notified: true,
      user_email: nextUser.email,
      user_name: nextUser.full_name,
      court_id: courtId,
      message: `A court is now available! Book now for ${startTime} - ${endTime}.`
    };
  },

  /**
   * Send a generic notification to a user
   * @param {string} userEmail - User email
   * @param {string} subject - Email subject
   * @param {string} message - Message content (HTML)
   */
  sendNotification: async (userEmail, subject, message) => {
    try {
      await transporter.sendMail({
        from: `"Badminton Court System" <${process.env.SMTP_USER}>`,
        to: userEmail,
        subject: subject,
        html: message
      });
      return { sent: true, email: userEmail };
    } catch (error) {
      console.error(`[NOTIFICATION] Email failed: ${error.message}`);
      return { sent: false, email: userEmail, error: error.message };
    }
  }
};

module.exports = notificationService;
```

> **Dev Testing Tip:** Use [Mailtrap.io](https://mailtrap.io) — free fake SMTP inbox. Set `SMTP_HOST=sandbox.smtp.mailtrap.io` and use Mailtrap credentials.

---

## Step 6: Routes (`routes/waitlist.js`)

```javascript
const express = require('express');
const router = express.Router();
const waitlistController = require('../controllers/waitlistController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.post('/', waitlistController.addToWaitlist);
router.get('/my', waitlistController.getMyWaitlist);
router.delete('/:id', waitlistController.removeFromWaitlist);

module.exports = router;
```

---

## Step 7: Controller (`controllers/waitlistController.js`)

```javascript
const Waitlist = require('../models/Waitlist');

const waitlistController = {
  addToWaitlist: async (req, res) => {
    try {
      const { court_id, requested_date, preferred_time_slot } = req.body;
      const entry = await Waitlist.add({
        user_id: req.user.id,
        court_id,
        requested_date,
        preferred_time_slot
      });
      res.status(201).json(entry);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getMyWaitlist: async (req, res) => {
    try {
      const entries = await Waitlist.findByUser(req.user.id);
      res.json(entries);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  removeFromWaitlist: async (req, res) => {
    // TODO: implement removal
    res.json({ message: 'Removed from waitlist' });
  }
};

module.exports = waitlistController;
```

---

## Step 8: Unit Tests

### `tests/paymentService.test.js`
```javascript
const paymentService = require('../services/paymentService');

describe('Payment Service', () => {
  test('processPayment returns transaction_id on success', async () => {
    const result = await paymentService.processPayment({
      booking_id: 'test-booking-123',
      amount: 500,
      method: 'CREDIT_CARD',
      credit_card_token: 'tok_test_123'
    });
    expect(result.success).toBe(true);
    expect(result.transaction_id).toBeDefined();
    expect(result.amount).toBe(500);
  });

  test('processRefund returns refund_id', async () => {
    const result = await paymentService.processRefund('test-booking-123');
    expect(result.success).toBe(true);
    expect(result.refund_id).toBeDefined();
  });
});
```

### `tests/notificationService.test.js`
```javascript
const notificationService = require('../services/notificationService');

jest.mock('../models/Waitlist', () => ({
  getNextInQueue: jest.fn(),
  markNotified: jest.fn()
}));
const Waitlist = require('../models/Waitlist');

describe('Notification Service', () => {
  test('notifyWaitlist notifies next user in queue', async () => {
    Waitlist.getNextInQueue.mockResolvedValue({
      id: 'w1', email: 'test@test.com', full_name: 'Test User'
    });
    Waitlist.markNotified.mockResolvedValue({});

    const result = await notificationService.notifyWaitlist('court-1', '10:00', '12:00');
    expect(result.notified).toBe(true);
    expect(result.user_email).toBe('test@test.com');
    expect(Waitlist.markNotified).toHaveBeenCalledWith('w1');
  });

  test('notifyWaitlist returns null when queue is empty', async () => {
    Waitlist.getNextInQueue.mockResolvedValue(null);
    const result = await notificationService.notifyWaitlist('court-1', '10:00', '12:00');
    expect(result).toBeNull();
  });
});
```

---

## Interface Points — How Other People Use Your Services

| Who calls your code | What they import | Function signature |
|---------------------|------------------|--------------------|
| **Person 3** (Booking) | `services/paymentService.js` | `processPayment({ booking_id, amount, method, credit_card_token })` |
| **Person 3** (Booking) | `services/paymentService.js` | `processRefund(bookingId)` |
| **Person 3** (Booking) | `services/notificationService.js` | `notifyWaitlist(courtId, startTime, endTime)` |

> **IMPORTANT:** Do NOT change the function signatures above after Person 3 starts using them. If you need to change the API, coordinate with Person 3 first.

---

## Your APIs Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/waitlist` | User | Join waitlist for a court + date |
| `GET` | `/api/waitlist/my` | User | View my waitlist entries |
| `DELETE` | `/api/waitlist/:id` | User | Remove from waitlist |

---

## 📝 D3: AI Usage Log

**You MUST log every AI interaction** in `FolkliyGrunt_D3_AILog.md` at the project root.

Use this format for every entry:

```markdown
### Entry [number] — [Short Description]
- **Date:** YYYY-MM-DD
- **Person:** [Your name / Person 4]
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

> **IMPORTANT:** Log EVERY AI interaction, even small ones. The professor grades D3 (7% of total grade).
