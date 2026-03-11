# Person 5: Review Module + i18n (Localization)

> **Role:** You own the review/rating system and the multi-language (TH/EN/ZH) localization system.
> **Branch:** `feat/reviews-i18n`

---

## Architecture Context

We are building a **Monolith Node.js/Express** backend in `implementations/`. Person 1 has set up the skeleton. You just `git pull` and code.

### Your position in the system (from C4 Level 3):
```
Express Router → /api/reviews/* → Review Controller → Data Access Layer → PostgreSQL

i18n Middleware → reads locales/xx.json → attaches translations to every response
```

---

## Your Files (ONLY touch these)

```
implementations/
├── routes/
│   └── reviews.js             ← YOU OWN THIS
├── controllers/
│   └── reviewController.js    ← YOU OWN THIS
├── models/
│   └── Review.js              ← YOU OWN THIS
├── middleware/
│   └── i18n.js                ← YOU OWN THIS
├── locales/
│   ├── en.json                ← YOU OWN THIS
│   ├── th.json                ← YOU OWN THIS
│   └── zh.json                ← YOU OWN THIS
├── public/pages/
│   └── reviews.html           ← YOU OWN THIS
└── tests/
    ├── reviews.test.js        ← YOU OWN THIS
    └── i18n.test.js           ← YOU OWN THIS
```

### DO NOT TOUCH:
- `server.js`, `package.json`, `public/css/` — Person 1
- `routes/auth.js`, `models/Profile.js` — Person 1
- `routes/courts.js`, `models/Court.js` — Person 2
- `routes/bookings.js`, `models/Booking.js`, `models/EquipmentRental.js` — Person 3
- `routes/waitlist.js`, `services/paymentService.js`, `services/notificationService.js` — Person 4

---

## Step 1: Setup

```bash
git pull origin master
git checkout -b feat/reviews-i18n
cd implementations
npm install  # dependencies already in package.json
```

> ⚠️ **Use Node.js v20 LTS** — Jest 29 crashes with Node.js v22 (`SecurityError: Cannot initialize local storage`). Run `nvm use 20` or `nvm install 20` first. See Person 1's guide for full fix details.

**Dependencies needed** (already installed by Person 1):
- `express`, `pg`, `@supabase/supabase-js` — pre-installed
- No additional packages needed for i18n (we use a simple JSON approach)

---

## Step 2: Database Table (Already Created by Person 1)

```sql
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,  -- references Supabase auth.users.id
  court_id UUID REFERENCES courts(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment_text TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_reviews_court ON reviews(court_id);
```

---

## Step 3: Model (`models/Review.js`)

```javascript
const pool = require('../config/db');

class Review {
  // Create a new review
  static async create({ user_id, court_id, rating, comment_text }) {
    // Validate rating range
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    // Check if user already reviewed this court (one review per user per court)
    const existing = await pool.query(
      `SELECT id FROM reviews WHERE user_id = $1 AND court_id = $2`,
      [user_id, court_id]
    );
    if (existing.rows.length > 0) {
      throw new Error('You have already reviewed this court');
    }

    const result = await pool.query(
      `INSERT INTO reviews (user_id, court_id, rating, comment_text)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [user_id, court_id, rating, comment_text]
    );
    return result.rows[0];
  }

  // Get all reviews for a court
  static async findByCourtId(courtId) {
    const result = await pool.query(
      `SELECT r.*, p.full_name as reviewer_name
       FROM reviews r
       LEFT JOIN profiles p ON r.user_id = p.auth_id
       WHERE r.court_id = $1
       ORDER BY r.created_at DESC`,
      [courtId]
    );
    return result.rows;
  }

  // Get average rating for a court
  static async getAverageRating(courtId) {
    const result = await pool.query(
      `SELECT
         COALESCE(AVG(rating), 0) as average_rating,
         COUNT(id) as total_reviews
       FROM reviews
       WHERE court_id = $1`,
      [courtId]
    );
    return {
      average_rating: parseFloat(result.rows[0].average_rating).toFixed(1),
      total_reviews: parseInt(result.rows[0].total_reviews)
    };
  }

  // Get reviews by a specific user
  static async findByUser(userId) {
    const result = await pool.query(
      `SELECT r.*, c.name as court_name
       FROM reviews r
       JOIN courts c ON r.court_id = c.id
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC`,
      [userId]
    );
    return result.rows;
  }
}

module.exports = Review;
```

---

## Step 4: Routes (`routes/reviews.js`)

```javascript
const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { authMiddleware } = require('../middleware/authMiddleware');

// Public routes
router.get('/court/:courtId', reviewController.getByCourtId);
router.get('/court/:courtId/rating', reviewController.getAverageRating);

// Protected routes (requires login)
router.post('/', authMiddleware, reviewController.create);
router.get('/my', authMiddleware, reviewController.getMyReviews);

module.exports = router;
```

---

## Step 5: Controller (`controllers/reviewController.js`)

```javascript
const Review = require('../models/Review');

const reviewController = {
  create: async (req, res) => {
    try {
      const { court_id, rating, comment_text } = req.body;
      const review = await Review.create({
        user_id: req.user.id,
        court_id,
        rating,
        comment_text
      });
      res.status(201).json(review);
    } catch (error) {
      if (error.message.includes('already reviewed')) {
        return res.status(409).json({ error: error.message });
      }
      if (error.message.includes('Rating must be')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  },

  getByCourtId: async (req, res) => {
    try {
      const reviews = await Review.findByCourtId(req.params.courtId);
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getAverageRating: async (req, res) => {
    try {
      const rating = await Review.getAverageRating(req.params.courtId);
      res.json(rating);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getMyReviews: async (req, res) => {
    try {
      const reviews = await Review.findByUser(req.user.id);
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = reviewController;
```

---

## Step 6: i18n Localization System

### `locales/en.json`
```json
{
  "app_name": "Badminton Court Management System",
  "nav": {
    "home": "Home",
    "search": "Search Courts",
    "my_bookings": "My Bookings",
    "my_waitlist": "My Waitlist",
    "login": "Login",
    "register": "Register",
    "logout": "Logout",
    "profile": "Profile"
  },
  "search": {
    "title": "Find a Court",
    "by_name": "Search by name",
    "by_distance": "Search by distance",
    "by_price": "Max price per hour",
    "radius": "Radius (km)",
    "results": "Search Results",
    "no_results": "No courts found"
  },
  "booking": {
    "title": "Book a Court",
    "select_time": "Select time slot",
    "duration": "Duration (hours)",
    "equipment": "Equipment Rental",
    "racket": "Badminton Racket",
    "shuttlecock": "Shuttlecock",
    "total": "Total Amount",
    "pay_now": "Pay Now",
    "cancel": "Cancel Booking",
    "cancel_confirm": "Are you sure? You will receive a full refund.",
    "cancelled": "Booking cancelled, refund processed"
  },
  "review": {
    "title": "Reviews",
    "write_review": "Write a Review",
    "rating": "Rating",
    "comment": "Your comment",
    "submit": "Submit Review",
    "avg_rating": "Average Rating",
    "stars": "stars"
  },
  "auth": {
    "login_title": "Login",
    "register_title": "Create Account",
    "email": "Email",
    "password": "Password",
    "name": "Full Name",
    "address": "Address",
    "login_button": "Log In",
    "register_button": "Create Account"
  },
  "common": {
    "loading": "Loading...",
    "error": "Something went wrong",
    "success": "Success",
    "save": "Save",
    "back": "Back",
    "per_hour": "per hour",
    "available": "Available",
    "renovating": "Under Renovation",
    "damaged": "Damaged"
  }
}
```

### `locales/th.json`
```json
{
  "app_name": "ระบบจัดการสนามแบดมินตัน",
  "nav": {
    "home": "หน้าแรก",
    "search": "ค้นหาสนาม",
    "my_bookings": "การจองของฉัน",
    "my_waitlist": "รายการรอคิว",
    "login": "เข้าสู่ระบบ",
    "register": "สมัครสมาชิก",
    "logout": "ออกจากระบบ",
    "profile": "โปรไฟล์"
  },
  "search": {
    "title": "ค้นหาสนาม",
    "by_name": "ค้นหาตามชื่อ",
    "by_distance": "ค้นหาตามระยะทาง",
    "by_price": "ราคาสูงสุดต่อชั่วโมง",
    "radius": "รัศมี (กม.)",
    "results": "ผลการค้นหา",
    "no_results": "ไม่พบสนาม"
  },
  "booking": {
    "title": "จองสนาม",
    "select_time": "เลือกช่วงเวลา",
    "duration": "ระยะเวลา (ชั่วโมง)",
    "equipment": "เช่าอุปกรณ์",
    "racket": "ไม้แบดมินตัน",
    "shuttlecock": "ลูกขนไก่",
    "total": "ยอดรวม",
    "pay_now": "ชำระเงิน",
    "cancel": "ยกเลิกการจอง",
    "cancel_confirm": "คุณแน่ใจหรือไม่? คุณจะได้รับเงินคืนเต็มจำนวน",
    "cancelled": "ยกเลิกการจองแล้ว คืนเงินเรียบร้อย"
  },
  "review": {
    "title": "รีวิว",
    "write_review": "เขียนรีวิว",
    "rating": "คะแนน",
    "comment": "ความคิดเห็นของคุณ",
    "submit": "ส่งรีวิว",
    "avg_rating": "คะแนนเฉลี่ย",
    "stars": "ดาว"
  },
  "auth": {
    "login_title": "เข้าสู่ระบบ",
    "register_title": "สร้างบัญชี",
    "email": "อีเมล",
    "password": "รหัสผ่าน",
    "name": "ชื่อ-นามสกุล",
    "address": "ที่อยู่",
    "login_button": "เข้าสู่ระบบ",
    "register_button": "สร้างบัญชี"
  },
  "common": {
    "loading": "กำลังโหลด...",
    "error": "เกิดข้อผิดพลาด",
    "success": "สำเร็จ",
    "save": "บันทึก",
    "back": "กลับ",
    "per_hour": "ต่อชั่วโมง",
    "available": "ว่าง",
    "renovating": "ปิดปรับปรุง",
    "damaged": "อุปกรณ์เสียหาย"
  }
}
```

### `locales/zh.json`
```json
{
  "app_name": "羽毛球场管理系统",
  "nav": {
    "home": "首页",
    "search": "搜索球场",
    "my_bookings": "我的预订",
    "my_waitlist": "我的等候列表",
    "login": "登录",
    "register": "注册",
    "logout": "退出",
    "profile": "个人资料"
  },
  "search": {
    "title": "搜索球场",
    "by_name": "按名称搜索",
    "by_distance": "按距离搜索",
    "by_price": "每小时最高价格",
    "radius": "半径（公里）",
    "results": "搜索结果",
    "no_results": "未找到球场"
  },
  "booking": {
    "title": "预订球场",
    "select_time": "选择时间段",
    "duration": "时长（小时）",
    "equipment": "租赁设备",
    "racket": "羽毛球拍",
    "shuttlecock": "羽毛球",
    "total": "总金额",
    "pay_now": "立即支付",
    "cancel": "取消预订",
    "cancel_confirm": "确定取消吗？您将获得全额退款。",
    "cancelled": "预订已取消，退款已处理"
  },
  "review": {
    "title": "评价",
    "write_review": "撰写评价",
    "rating": "评分",
    "comment": "您的评价",
    "submit": "提交评价",
    "avg_rating": "平均评分",
    "stars": "星"
  },
  "auth": {
    "login_title": "登录",
    "register_title": "创建账户",
    "email": "电子邮箱",
    "password": "密码",
    "name": "姓名",
    "address": "地址",
    "login_button": "登录",
    "register_button": "创建账户"
  },
  "common": {
    "loading": "加载中...",
    "error": "出了点问题",
    "success": "成功",
    "save": "保存",
    "back": "返回",
    "per_hour": "每小时",
    "available": "可用",
    "renovating": "装修中",
    "damaged": "设备损坏"
  }
}
```

---

### i18n Middleware (`middleware/i18n.js`)

```javascript
const fs = require('fs');
const path = require('path');

// Load all translation files at startup
const locales = {};
['en', 'th', 'zh'].forEach(lang => {
  const filePath = path.join(__dirname, '..', 'locales', `${lang}.json`);
  locales[lang] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
});

/**
 * i18n Middleware
 * Detects language from:
 * 1. Query param: ?lang=th
 * 2. Header: Accept-Language
 * 3. Default: 'en'
 *
 * Attaches `req.t` (translations) and `req.lang` to the request.
 *
 * Usage in controller:
 *   res.json({ message: req.t.common.success });
 */
const i18n = (req, res, next) => {
  // Priority: query param > header > default
  let lang = req.query.lang
    || req.headers['accept-language']?.split(',')[0]?.split('-')[0]
    || 'en';

  // Validate language
  if (!locales[lang]) lang = 'en';

  req.lang = lang;
  req.t = locales[lang];
  next();
};

module.exports = i18n;
```

> **Tell Person 1:** After you're done, ask Person 1 to add `app.use(require('./middleware/i18n'));` in `server.js` (before the route registrations).

---

## Step 7: Unit Tests

### `tests/reviews.test.js`
```javascript
const Review = require('../models/Review');

jest.mock('../config/db', () => ({
  query: jest.fn()
}));
const pool = require('../config/db');

describe('Review Model', () => {
  afterEach(() => jest.clearAllMocks());

  test('create should insert a review with valid rating', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] }) // no existing review
      .mockResolvedValueOnce({ rows: [{ id: '1', rating: 4, comment_text: 'Great!' }] });

    const review = await Review.create({
      user_id: 'u1', court_id: 'c1', rating: 4, comment_text: 'Great!'
    });
    expect(review.rating).toBe(4);
  });

  test('create should reject invalid rating', async () => {
    await expect(
      Review.create({ user_id: 'u1', court_id: 'c1', rating: 6, comment_text: 'Too high' })
    ).rejects.toThrow('Rating must be between 1 and 5');
  });

  test('create should reject duplicate review', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'existing' }] });
    await expect(
      Review.create({ user_id: 'u1', court_id: 'c1', rating: 3, comment_text: 'Again' })
    ).rejects.toThrow('already reviewed');
  });

  test('getAverageRating should return formatted average', async () => {
    pool.query.mockResolvedValue({ rows: [{ average_rating: '4.3333', total_reviews: '3' }] });
    const result = await Review.getAverageRating('c1');
    expect(result.average_rating).toBe('4.3');
    expect(result.total_reviews).toBe(3);
  });
});
```

### `tests/i18n.test.js`
```javascript
const i18n = require('../middleware/i18n');

describe('i18n Middleware', () => {
  const mockRes = {};
  const mockNext = jest.fn();

  test('defaults to English', () => {
    const req = { query: {}, headers: {} };
    i18n(req, mockRes, mockNext);
    expect(req.lang).toBe('en');
    expect(req.t.app_name).toBe('Badminton Court Management System');
    expect(mockNext).toHaveBeenCalled();
  });

  test('reads language from query param', () => {
    const req = { query: { lang: 'th' }, headers: {} };
    i18n(req, mockRes, mockNext);
    expect(req.lang).toBe('th');
    expect(req.t.app_name).toBe('ระบบจัดการสนามแบดมินตัน');
  });

  test('falls back to English for unknown language', () => {
    const req = { query: { lang: 'jp' }, headers: {} };
    i18n(req, mockRes, mockNext);
    expect(req.lang).toBe('en');
  });
});
```

---

## Interface Points

| Who | What they need from you | How |
|-----|-------------------------|-----|
| **Person 2** (Courts) | Average rating shown in search results | Person 2's `Court.findAll()` query already JOINs with the reviews table. No action needed from you. |
| **All** (i18n middleware) | Translation strings in HTML pages | They use the CSS classes from Person 1 and can access `req.t` for translated strings in API responses. |
| **Person 1** (Lead) | Register your middleware | Tell Person 1 to add `app.use(require('./middleware/i18n'));` to `server.js`. |

---

## Your APIs Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/reviews` | User | Create review (1-5 stars + comment) |
| `GET` | `/api/reviews/court/:courtId` | No | Get all reviews for a court |
| `GET` | `/api/reviews/court/:courtId/rating` | No | Get average rating |
| `GET` | `/api/reviews/my` | User | View my reviews |

---

## 📝 D3: AI Usage Log

**You MUST log every AI interaction** in `FolkliyGrunt_D3_AILog.md` at the project root.

Use this format for every entry:

```markdown
### Entry [number] — [Short Description]
- **Date:** YYYY-MM-DD
- **Person:** [Your name / Person 5]
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
