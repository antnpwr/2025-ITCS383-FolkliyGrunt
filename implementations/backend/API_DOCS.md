# FolkliyGrunt (Pro Badminton) — Backend API Documentation

> **Base URL:** `http://localhost:8080/api`  
> **Auth:** Supabase JWT via `Authorization: Bearer <token>` header  
> **Content-Type:** `application/json`

---

## Table of Contents

1. [Authentication](#authentication)
2. [Auth & User Management](#auth--user-management)
3. [Courts](#courts)
4. [Bookings](#bookings)
5. [Payments](#payments)
6. [Reviews](#reviews)
7. [Waitlist](#waitlist)
8. [Community / Parties](#community--parties)
9. [Internationalization](#internationalization-i18n)
10. [Data Models / Schema](#data-models--schema)
11. [Error Handling](#error-handling)
12. [Quick Reference Table](#quick-reference-table)

---

## Authentication

All protected endpoints require a valid Supabase JWT token in the `Authorization` header.

### How to Get a Token

1. **Register** via `POST /api/auth/register` — creates a user in Supabase Auth
2. **Login** via `POST /api/auth/login` — returns a `session` object containing `access_token`
3. Use the `access_token` in subsequent requests

### Header Format

```
Authorization: Bearer <access_token>
```

### Roles

| Role       | Description                                                       |
| ---------- | ----------------------------------------------------------------- |
| `CUSTOMER` | Default role — can book courts, leave reviews, join parties, etc. |
| `ADMIN`    | Can manage courts, disable users, view all users                  |

### Auth Middleware Behavior

- **`authMiddleware`** — Validates the JWT, populates `req.user` with `{ id, email, role, profile }`
- **`adminOnly`** — Must be used after `authMiddleware`. Rejects non-ADMIN users with `403`

---

## Auth & User Management

Base path: `/api/auth`

### POST /api/auth/register

Register a new user account.

**Auth:** None (public)

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "yourpassword",
  "full_name": "John Doe",
  "address": "123 Main St, Bangkok",
  "role": "CUSTOMER"
}
```

| Field       | Type   | Required | Description                                          |
| ----------- | ------ | -------- | ---------------------------------------------------- |
| `email`     | string | ✅       | Valid email address                                  |
| `password`  | string | ✅       | Password (min 6 chars)                               |
| `full_name` | string | ✅       | User's full name                                     |
| `address`   | string | ✅       | User's address                                       |
| `role`      | string | ❌       | `"ADMIN"` or `"CUSTOMER"` (defaults to `"CUSTOMER"`) |

**Success Response (201):**

```json
{
  "message": "User registered successfully",
  "user": {
    "id": "uuid",
    "auth_id": "uuid",
    "full_name": "John Doe",
    "address": "123 Main St, Bangkok",
    "role": "CUSTOMER",
    ...
  }
}
```

**Error Responses:**

| Status | Body                                                       |
| ------ | ---------------------------------------------------------- |
| 400    | `{ "error": "<Supabase auth error message>" }`             |
| 500    | `{ "error": "Internal server error during registration" }` |

---

### POST /api/auth/login

Authenticate and receive a session token.

**Auth:** None (public)

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "yourpassword"
}
```

**Success Response (200):**

```json
{
  "message": "Login successful",
  "session": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "...",
    "token_type": "bearer",
    "expires_in": 3600,
    "expires_at": 1234567890,
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      ...
    }
  }
}
```

> ⚠️ Save `session.access_token` — use it as `Bearer` token in all authenticated requests.

**Error Responses:**

| Status | Body                                                          |
| ------ | ------------------------------------------------------------- |
| 400    | `{ "error": "<Supabase auth error message>" }`                |
| 403    | `{ "error": "Account is disabled. Please contact support." }` |
| 500    | `{ "error": "Internal server error during login" }`           |

---

### GET /api/auth/profile

Get the current user's full profile including membership info.

**Auth:** ✅ Required

**Success Response (200):**

```json
{
  "profile": {
    "id": "uuid",
    "auth_id": "uuid",
    "full_name": "John Doe",
    "address": "123 Main St, Bangkok",
    "role": "CUSTOMER",
    "is_disabled": false,
    "email": "user@example.com",
    "membership": {
      "is_member": true,
      "membership_started_at": "2025-01-15T10:00:00Z",
      "membership_expires_at": "2025-02-15T10:00:00Z",
      "is_active": true
    }
  }
}
```

**Error Responses:**

| Status | Body                                                    |
| ------ | ------------------------------------------------------- |
| 401    | `{ "error": "Unauthorized" }` (missing/invalid token)   |
| 500    | `{ "error": "Internal server error fetching profile" }` |

---

### GET /api/auth/membership/status

Get detailed membership status and pricing info for the current user.

**Auth:** ✅ Required

**Success Response (200):**

```json
{
  "monthly_fee_thb": 199,
  "member_rate_thb_per_hour": 150,
  "membership": {
    "is_member": true,
    "membership_started_at": "2025-01-15T10:00:00Z",
    "membership_expires_at": "2025-02-15T10:00:00Z",
    "is_active": true
  }
}
```

**Error Responses:**

| Status | Body                                                              |
| ------ | ----------------------------------------------------------------- |
| 401    | Unauthorized                                                      |
| 404    | `{ "error": "Profile not found" }`                                |
| 500    | `{ "error": "Internal server error fetching membership status" }` |

---

### POST /api/auth/membership/subscribe

Subscribe to a monthly membership (฿199/month). Members get discounted court rates (฿150/hr vs ฿200/hr standard).

**Auth:** ✅ Required

**Request Body:**

```json
{
  "payment_method": "PROMPTPAY",
  "transfer_reference": "TXN123456"
}
```

| Field                | Type   | Required | Description                        |
| -------------------- | ------ | -------- | ---------------------------------- |
| `payment_method`     | string | ✅       | `"BANK_TRANSFER"` or `"PROMPTPAY"` |
| `transfer_reference` | string | ❌       | Payment reference/transaction ID   |

**Success Response (200):**

```json
{
  "message": "Membership activated successfully",
  "charged_amount_thb": 199,
  "member_rate_thb_per_hour": 150,
  "transaction_id": "TXN-...",
  "membership": {
    "is_member": true,
    "membership_started_at": "2025-01-15T10:00:00Z",
    "membership_expires_at": "2025-02-15T10:00:00Z",
    "is_active": true
  }
}
```

**Error Responses:**

| Status | Body                                                          |
| ------ | ------------------------------------------------------------- |
| 400    | `{ "error": "Invalid payment method" }`                       |
| 404    | `{ "error": "Profile not found" }`                            |
| 500    | `{ "error": "Internal server error subscribing membership" }` |

---

### GET /api/auth/users

Get all registered users. **Admin only.**

**Auth:** ✅ Admin

**Success Response (200):**

```json
{
  "users": [
    {
      "id": "uuid",
      "auth_id": "uuid",
      "full_name": "John Doe",
      "address": "...",
      "role": "CUSTOMER",
      "is_disabled": false,
      "is_member": true,
      ...
    }
  ]
}
```

**Error Responses:**

| Status | Body                                   |
| ------ | -------------------------------------- |
| 401    | Unauthorized                           |
| 403    | `{ "error": "Admin access required" }` |

---

### PUT /api/auth/users/:id/disable

Disable a user account. **Admin only.**

**Auth:** ✅ Admin

**URL Parameters:**

| Param | Type | Description          |
| ----- | ---- | -------------------- |
| `id`  | UUID | The user's `auth_id` |

**Success Response (200):**

```json
{
  "message": "User disabled successfully",
  "profile": { ... }
}
```

**Error Responses:**

| Status | Body                                                  |
| ------ | ----------------------------------------------------- |
| 401    | Unauthorized                                          |
| 403    | Admin access required                                 |
| 404    | `{ "error": "User not found" }`                       |
| 500    | `{ "error": "Internal server error disabling user" }` |

---

## Courts

Base path: `/api/courts`

### GET /api/courts

List all active (available) courts.

**Auth:** None (public)

**Success Response (200):**

```json
[
  {
    "id": "uuid",
    "name": "Court A",
    "location_lat": 13.7563,
    "location_lng": 100.5018,
    "price_per_hour": 200.0,
    "allowed_shoes": "Non-marking shoes",
    "current_status": "AVAILABLE",
    "opening_time": "08:00:00",
    "closing_time": "22:00:00",
    "average_rating": 4.5,
    "total_reviews": 12,
    "created_at": "2025-01-01T00:00:00Z"
  }
]
```

---

### GET /api/courts/search

Search/filter courts with various criteria.

**Auth:** None (public)

**Query Parameters:**

| Param      | Type   | Required | Description                                                       |
| ---------- | ------ | -------- | ----------------------------------------------------------------- |
| `name`     | string | ❌       | Search by court name (partial match)                              |
| `lat`      | float  | ❌       | Latitude for distance-based search (requires `lng` and `radius`)  |
| `lng`      | float  | ❌       | Longitude for distance-based search (requires `lat` and `radius`) |
| `radius`   | float  | ❌       | Search radius in km (requires `lat` and `lng`)                    |
| `maxPrice` | float  | ❌       | Maximum price per hour filter                                     |

**Examples:**

```
GET /api/courts/search?name=badminton
GET /api/courts/search?lat=13.7563&lng=100.5018&radius=10
GET /api/courts/search?maxPrice=200
```

**Success Response (200):** Array of court objects (same structure as `GET /api/courts`)

> If no query params are provided, returns all courts including inactive ones.

---

### GET /api/courts/:id

Get a single court by ID.

**Auth:** None (public)

**URL Parameters:**

| Param | Type | Description |
| ----- | ---- | ----------- |
| `id`  | UUID | Court ID    |

**Success Response (200):** Single court object

**Error Responses:**

| Status | Body                             |
| ------ | -------------------------------- |
| 404    | `{ "error": "Court not found" }` |

---

### GET /api/courts/:id/availability

Get booked time slots for a specific court on a given date.

**Auth:** None (public)

**URL Parameters:**

| Param | Type | Description |
| ----- | ---- | ----------- |
| `id`  | UUID | Court ID    |

**Query Parameters:**

| Param  | Type   | Required | Description                 |
| ------ | ------ | -------- | --------------------------- |
| `date` | string | ✅       | Date in `YYYY-MM-DD` format |

**Example:** `GET /api/courts/123e4567-e89b/availability?date=2025-06-15`

**Success Response (200):** Array of booked time slots

```json
[
  {
    "id": "uuid",
    "start_time": "2025-06-15T10:00:00Z",
    "end_time": "2025-06-15T12:00:00Z",
    "booking_status": "CONFIRMED"
  }
]
```

**Error Responses:**

| Status | Body                              |
| ------ | --------------------------------- |
| 400    | `{ "error": "Date is required" }` |

---

### POST /api/courts

Create a new court. **Admin only.**

**Auth:** ✅ Admin

**Request Body:**

```json
{
  "name": "Court A",
  "address": "123 Sukhumvit, Bangkok",
  "location_lat": 13.7563,
  "location_lng": 100.5018,
  "price_per_hour": 200.0,
  "allowed_shoes": "Non-marking shoes",
  "opening_time": "08:00",
  "closing_time": "22:00",
  "image_url": "https://example.com/court.jpg"
}
```

| Field            | Type    | Required | Description                                                                         |
| ---------------- | ------- | -------- | ----------------------------------------------------------------------------------- |
| `name`           | string  | ✅       | Court name                                                                          |
| `address`        | string  | ❌\*     | Physical address (used for geocoding if `location_lat`/`location_lng` not provided) |
| `location_lat`   | float   | ❌\*     | Latitude (required if no `address`)                                                 |
| `location_lng`   | float   | ❌\*     | Longitude (required if no `address`)                                                |
| `price_per_hour` | decimal | ✅       | Price per hour in THB                                                               |
| `allowed_shoes`  | string  | ❌       | Allowed shoe types                                                                  |
| `opening_time`   | string  | ✅       | Opening time (HH:MM format)                                                         |
| `closing_time`   | string  | ✅       | Closing time (HH:MM format)                                                         |
| `image_url`      | string  | ❌       | URL to court image                                                                  |

> \*If `address` is provided without coordinates, the server will geocode the address automatically.

**Success Response (201):**

```json
{
  "message": "Court created successfully",
  "court": { ... }
}
```

**Error Responses:**

| Status | Body                                          |
| ------ | --------------------------------------------- |
| 400    | `{ "error": "Missing required fields: ..." }` |
| 401    | Unauthorized                                  |
| 403    | Admin access required                         |

---

### PUT /api/courts/:id

Update a court's details. **Admin only.**

**Auth:** ✅ Admin

**URL Parameters:**

| Param | Type | Description |
| ----- | ---- | ----------- |
| `id`  | UUID | Court ID    |

**Request Body:** (all fields optional — only included fields will be updated)

```json
{
  "name": "Court A Updated",
  "location_lat": 13.7563,
  "location_lng": 100.5018,
  "price_per_hour": 250.0,
  "allowed_shoes": "Non-marking only",
  "opening_time": "07:00",
  "closing_time": "23:00",
  "image_url": "https://example.com/new-image.jpg"
}
```

**Success Response (200):**

```json
{
  "message": "Court updated successfully",
  "court": { ... }
}
```

**Error Responses:**

| Status | Body                             |
| ------ | -------------------------------- |
| 401    | Unauthorized                     |
| 403    | Admin access required            |
| 404    | `{ "error": "Court not found" }` |

---

### PUT /api/courts/:id/status

Update a court's status. **Admin only.**

**Auth:** ✅ Admin

**URL Parameters:**

| Param | Type | Description |
| ----- | ---- | ----------- |
| `id`  | UUID | Court ID    |

**Request Body:**

```json
{
  "status": "RENOVATE"
}
```

| Field    | Type   | Required | Values                                   |
| -------- | ------ | -------- | ---------------------------------------- |
| `status` | string | ✅       | `"AVAILABLE"`, `"RENOVATE"`, `"DAMAGED"` |

**Success Response (200):**

```json
{
  "message": "Court status updated successfully",
  "court": { ... }
}
```

**Error Responses:**

| Status | Body                                                                 |
| ------ | -------------------------------------------------------------------- |
| 400    | `{ "error": "Status must be one of: AVAILABLE, RENOVATE, DAMAGED" }` |
| 404    | `{ "error": "Court not found" }`                                     |

---

## Bookings

Base path: `/api/bookings`  
**All booking routes require authentication.**

### POST /api/bookings

Create a new court booking with optional equipment rental.

**Auth:** ✅ Required

**Request Body:**

```json
{
  "court_id": "uuid",
  "start_time": "2025-06-15T10:00:00Z",
  "duration_hours": 2,
  "payment_method": "PROMPTPAY",
  "transfer_reference": "TXN123",
  "equipment": [
    {
      "equipment_type": "RACKET",
      "quantity": 2
    },
    {
      "equipment_type": "SHUTTLECOCK",
      "quantity": 3
    }
  ]
}
```

| Field                | Type   | Required | Description                                          |
| -------------------- | ------ | -------- | ---------------------------------------------------- |
| `court_id`           | UUID   | ✅       | ID of the court to book                              |
| `start_time`         | string | ✅       | ISO 8601 datetime string                             |
| `duration_hours`     | number | ✅       | Duration in hours                                    |
| `payment_method`     | string | ✅       | `"CREDIT_CARD"`, `"BANK_TRANSFER"`, or `"PROMPTPAY"` |
| `transfer_reference` | string | ❌       | Payment reference (for BANK_TRANSFER/PROMPTPAY)      |
| `equipment`          | array  | ❌       | Array of equipment rental items                      |

**Equipment Types & Pricing:**

| Type          | Price per unit (฿) |
| ------------- | ------------------ |
| `RACKET`      | 50                 |
| `SHUTTLECOCK` | 20                 |
| `BALL`        | 30                 |
| `BAG`         | 20                 |

**Court Rate Logic:**

| Membership Status | Rate (฿/hour) |
| ----------------- | ------------- |
| Active member     | 150           |
| Non-member        | 200           |

**Success Response (201):**

For **PROMPTPAY / BANK_TRANSFER**:

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "court_id": "uuid",
  "start_time": "2025-06-15T10:00:00Z",
  "end_time": "2025-06-15T12:00:00Z",
  "total_amount": 400.0,
  "booking_status": "CONFIRMED",
  "payment_method": "PROMPTPAY",
  "transaction_id": "TXN-...",
  "created_at": "2025-06-01T00:00:00Z",
  "pricing": {
    "standard_rate": 200,
    "applied_rate": 200,
    "member_rate": 150,
    "membership_applied": false,
    "member_savings": 0,
    "court_fee": 400,
    "equipment_fee": 0,
    "total_amount": 400
  }
}
```

For **CREDIT_CARD** (Stripe Bypass Mode — when `STRIPE_SECRET_KEY` is not set):

> Same response format as PROMPTPAY/BANK*TRANSFER. Transaction ID prefixed with `CC*`.

```json
{
  "id": "uuid",
  "transaction_id": "CC_ABC123DEF",
  "pricing": {
    "standard_rate": 200,
    "applied_rate": 200,
    "member_rate": 150,
    "membership_applied": false,
    "member_savings": 0,
    "court_fee": 400,
    "equipment_fee": 0,
    "total_amount": 400
  }
}
```

**Error Responses:**

| Status | Body                                         |
| ------ | -------------------------------------------- |
| 409    | `{ "error": "Time slot is already booked" }` |
| 500    | `{ "error": "<error message>" }`             |

---

### GET /api/bookings/my

Get all bookings for the current user.

**Auth:** ✅ Required

**Success Response (200):**

```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "court_id": "uuid",
    "court_name": "Court A",
    "start_time": "2025-06-15T10:00:00Z",
    "end_time": "2025-06-15T12:00:00Z",
    "total_amount": 400.0,
    "booking_status": "CONFIRMED",
    "payment_method": "PROMPTPAY",
    "transaction_id": "TXN-...",
    "created_at": "2025-06-01T00:00:00Z"
  }
]
```

---

### DELETE /api/bookings/:id

Cancel a booking. Only works if the booking hasn't started yet (start_time > now). Processes a refund automatically and notifies users on the waitlist.

**Auth:** ✅ Required (can only cancel own bookings)

**URL Parameters:**

| Param | Type | Description |
| ----- | ---- | ----------- |
| `id`  | UUID | Booking ID  |

**Success Response (200):**

```json
{
  "message": "Booking cancelled, refund processed",
  "booking": { ... }
}
```

**Error Responses:**

| Status | Body                                                                            |
| ------ | ------------------------------------------------------------------------------- |
| 400    | `{ "error": "Cannot cancel - booking not found or play time already started" }` |
| 500    | `{ "error": "<error message>" }`                                                |

---

### GET /api/bookings/:id/equipment

Get all equipment rentals for a specific booking.

**Auth:** ✅ Required

**URL Parameters:**

| Param | Type | Description |
| ----- | ---- | ----------- |
| `id`  | UUID | Booking ID  |

**Success Response (200):**

```json
[
  {
    "id": "uuid",
    "booking_id": "uuid",
    "equipment_type": "RACKET",
    "quantity": 2,
    "unit_price": 50.0
  }
]
```

---

### POST /api/bookings/:id/equipment

Add equipment rentals to an existing booking.

**Auth:** ✅ Required

**URL Parameters:**

| Param | Type | Description |
| ----- | ---- | ----------- |
| `id`  | UUID | Booking ID  |

**Request Body:**

```json
[
  {
    "equipment_type": "RACKET",
    "quantity": 2
  },
  {
    "equipment_type": "SHUTTLECOCK",
    "quantity": 1
  }
]
```

**Success Response (201):**

```json
{
  "message": "Equipment rented successfully",
  "equipment": [ ... ]
}
```

**Error Responses:**

| Status | Body                                                                          |
| ------ | ----------------------------------------------------------------------------- |
| 400    | `{ "error": "Missing or invalid rental data. Expecting an array of items." }` |
| 500    | `{ "error": "Failed to rent equipment." }`                                    |

---

## Payments

Base path: `/api/payments`  
**All payment routes require authentication.**

### GET /api/payments/config

Get the Stripe publishable key for client-side Stripe.js integration.

**Auth:** ✅ Required

**Success Response (200):**

```json
{
  "publishableKey": "pk_test_..."
}
```

---

### POST /api/payments/create-customer

Create or retrieve a Stripe Customer record for the authenticated user.

**Auth:** ✅ Required

**Request Body:** None

**Success Response (200):**

```json
{
  "customerId": "cus_..."
}
```

---

### GET /api/payments/saved-cards

Retrieve all saved credit cards for the authenticated user.

**Auth:** ✅ Required

**Success Response (200):**

```json
{
  "cards": [
    {
      "id": "pm_...",
      "brand": "visa",
      "last4": "4242",
      "exp_month": 12,
      "exp_year": 2026
    }
  ]
}
```

---

### POST /api/payments/setup-intent

Create a Stripe Setup Intent to securely save a new card (returns a `client_secret` for Stripe.js).

**Auth:** ✅ Required

**Request Body:** None

**Success Response (200):**

```json
{
  "clientSecret": "seti_..._secret_..."
}
```

---

### DELETE /api/payments/cards/:id

Delete a saved payment method (card).

**Auth:** ✅ Required

**URL Parameters:**

| Param | Type   | Description                         |
| ----- | ------ | ----------------------------------- |
| `id`  | string | Stripe Payment Method ID (`pm_...`) |

**Success Response (200):**

```json
{
  "message": "Card removed successfully"
}
```

**Error Responses:**

| Status | Body                             |
| ------ | -------------------------------- |
| 500    | `{ "error": "<error message>" }` |

---

### POST /api/payments/create-intent

Create a Stripe Payment Intent for charging a booking payment.

**Auth:** ✅ Required

**Request Body:**

```json
{
  "amount": 400,
  "booking_id": "uuid",
  "payment_method_id": "pm_..."
}
```

| Field               | Type   | Required | Description               |
| ------------------- | ------ | -------- | ------------------------- |
| `amount`            | number | ✅       | Amount in THB             |
| `booking_id`        | string | ✅       | The booking ID to pay for |
| `payment_method_id` | string | ✅       | Stripe Payment Method ID  |

**Success Response (200):** Stripe Payment Intent result

```json
{
  "clientSecret": "pi_..._secret_...",
  ...
}
```

**Error Responses:**

| Status | Body                             |
| ------ | -------------------------------- |
| 500    | `{ "error": "<error message>" }` |

---

## Reviews

Base path: `/api/reviews`

### GET /api/reviews/court/:courtId

Get all reviews for a specific court.

**Auth:** None (public)

**URL Parameters:**

| Param     | Type | Description |
| --------- | ---- | ----------- |
| `courtId` | UUID | Court ID    |

**Success Response (200):**

```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "court_id": "uuid",
    "rating": 5,
    "comment_text": "Great court!",
    "created_at": "2025-06-01T00:00:00Z",
    "full_name": "John Doe"
  }
]
```

---

### GET /api/reviews/court/:courtId/rating

Get the average rating for a specific court.

**Auth:** None (public)

**URL Parameters:**

| Param     | Type | Description |
| --------- | ---- | ----------- |
| `courtId` | UUID | Court ID    |

**Success Response (200):**

```json
{
  "court_id": "uuid",
  "average_rating": 4.5,
  "total_reviews": 12
}
```

---

### POST /api/reviews

Create a new review for a court.

**Auth:** ✅ Required

**Request Body:**

```json
{
  "court_id": "uuid",
  "rating": 5,
  "comment_text": "Excellent court! Very well maintained."
}
```

| Field          | Type    | Required | Description        |
| -------------- | ------- | -------- | ------------------ |
| `court_id`     | UUID    | ✅       | Court ID to review |
| `rating`       | integer | ✅       | Rating 1–5         |
| `comment_text` | string  | ❌       | Review comment     |

**Success Response (201):**

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "court_id": "uuid",
  "rating": 5,
  "comment_text": "Excellent court! Very well maintained.",
  "created_at": "2025-06-01T00:00:00Z"
}
```

**Error Responses:**

| Status | Body                                                  |
| ------ | ----------------------------------------------------- |
| 400    | `{ "error": "Rating must be between 1 and 5" }`       |
| 409    | `{ "error": "User has already reviewed this court" }` |
| 500    | `{ "error": "<error message>" }`                      |

---

### GET /api/reviews/my

Get all reviews written by the current user.

**Auth:** ✅ Required

**Success Response (200):**

```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "court_id": "uuid",
    "rating": 5,
    "comment_text": "Great court!",
    "created_at": "2025-06-01T00:00:00Z"
  }
]
```

---

## Waitlist

Base path: `/api/waitlist`  
**All waitlist routes require authentication.**

### POST /api/waitlist

Add the current user to a waitlist for a court.

**Auth:** ✅ Required

**Request Body:**

```json
{
  "court_id": "uuid",
  "requested_date": "2025-06-15",
  "preferred_time_slot": "10:00-12:00"
}
```

| Field                 | Type   | Required | Description                        |
| --------------------- | ------ | -------- | ---------------------------------- |
| `court_id`            | UUID   | ✅       | Court ID                           |
| `requested_date`      | string | ✅       | Date in `YYYY-MM-DD` format        |
| `preferred_time_slot` | string | ✅       | Time range in `HH:MM-HH:MM` format |

**Success Response (201):**

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "court_id": "uuid",
  "requested_date": "2025-06-15",
  "preferred_time_slot": "10:00-12:00",
  "status": "PENDING",
  "created_at": "2025-06-01T00:00:00Z"
}
```

**Error Responses:**

| Status | Body                             |
| ------ | -------------------------------- |
| 500    | `{ "error": "<error message>" }` |

---

### GET /api/waitlist/my

Get all waitlist entries for the current user.

**Auth:** ✅ Required

**Success Response (200):**

```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "court_id": "uuid",
    "requested_date": "2025-06-15",
    "preferred_time_slot": "10:00-12:00",
    "status": "PENDING",
    "created_at": "2025-06-01T00:00:00Z"
  }
]
```

**Waitlist Status Values:**

| Status      | Description                                           |
| ----------- | ----------------------------------------------------- |
| `PENDING`   | Waiting for a slot to open                            |
| `NOTIFIED`  | A slot opened; user has been notified and can confirm |
| `EXPIRED`   | Notification expired without confirmation             |
| `CONFIRMED` | User confirmed and booking was created                |

---

### POST /api/waitlist/:id/confirm

Confirm a waitlist entry after being notified. This creates an actual booking and processes payment.

**Auth:** ✅ Required

**URL Parameters:**

| Param | Type | Description                                     |
| ----- | ---- | ----------------------------------------------- |
| `id`  | UUID | Waitlist entry ID (must have status `NOTIFIED`) |

**Request Body:**

```json
{
  "payment_method": "CREDIT_CARD",
  "transfer_reference": "TXN123"
}
```

| Field                | Type   | Required | Description                                                                      |
| -------------------- | ------ | -------- | -------------------------------------------------------------------------------- |
| `payment_method`     | string | ❌       | `"CREDIT_CARD"`, `"BANK_TRANSFER"`, or `"PROMPTPAY"` (defaults to `CREDIT_CARD`) |
| `transfer_reference` | string | ❌       | Payment reference                                                                |

**Success Response (201):**

```json
{
  "message": "Payment Successful! Booking confirmed.",
  "booking": {
    "id": "uuid",
    "user_id": "uuid",
    "court_id": "uuid",
    "start_time": "2025-06-15T10:00:00Z",
    "end_time": "2025-06-15T12:00:00Z",
    "total_amount": 400.00,
    "booking_status": "CONFIRMED",
    ...
  }
}
```

**Error Responses:**

| Status | Body                                                     |
| ------ | -------------------------------------------------------- |
| 400    | `{ "error": "Valid notified waitlist entry not found" }` |
| 500    | `{ "error": "<error message>" }`                         |

---

### DELETE /api/waitlist/:id

Remove the current user from the waitlist.

**Auth:** ✅ Required

**URL Parameters:**

| Param | Type | Description       |
| ----- | ---- | ----------------- |
| `id`  | UUID | Waitlist entry ID |

**Success Response (200):**

```json
{
  "message": "Removed from waitlist"
}
```

**Error Responses:**

| Status | Body                             |
| ------ | -------------------------------- |
| 500    | `{ "error": "<error message>" }` |

---

## Community / Parties

Base path: `/api/community`

### GET /api/community

Get the community feed — list of all parties.

**Auth:** None (public)

**Success Response (200):**

```json
[
  {
    "id": "uuid",
    "host_id": "uuid",
    "title": "Friday Night Badminton",
    "game_name": "Badminton",
    "game_date_time": "2025-06-20T18:00:00Z",
    "location": "Court A, Sukhumvit",
    "capacity": 4,
    "description": "Looking for players!",
    "status": "OPEN",
    "created_at": "2025-06-01T00:00:00Z",
    "host_name": "John Doe",
    "participant_count": 2
  }
]
```

**Party Status Values:**

| Status      | Description                |
| ----------- | -------------------------- |
| `OPEN`      | Accepting new participants |
| `FULL`      | Maximum capacity reached   |
| `CANCELLED` | Party has been cancelled   |

---

### GET /api/community/:id

Get details of a single party.

**Auth:** None (public)

**URL Parameters:**

| Param | Type | Description |
| ----- | ---- | ----------- |
| `id`  | UUID | Party ID    |

**Success Response (200):** Single party object with details

**Error Responses:**

| Status | Body                             |
| ------ | -------------------------------- |
| 404    | `{ "error": "Party not found" }` |

---

### POST /api/community

Create a new party/game session.

**Auth:** ✅ Required

**Request Body:**

```json
{
  "title": "Friday Night Badminton",
  "game_name": "Badminton",
  "game_date_time": "2025-06-20T18:00:00Z",
  "location": "Court A, Sukhumvit",
  "capacity": 4,
  "description": "Looking for players to join!"
}
```

| Field            | Type    | Required | Description                    |
| ---------------- | ------- | -------- | ------------------------------ |
| `title`          | string  | ✅       | Party title                    |
| `game_name`      | string  | ✅       | Name of the game/sport         |
| `game_date_time` | string  | ✅       | ISO 8601 datetime              |
| `location`       | string  | ✅       | Location description           |
| `capacity`       | integer | ✅       | Max participants (must be ≥ 1) |
| `description`    | string  | ❌       | Additional details             |

**Success Response (201):**

```json
{
  "message": "Party published successfully",
  "party": {
    "id": "uuid",
    "host_id": "uuid",
    "title": "Friday Night Badminton",
    "game_name": "Badminton",
    "game_date_time": "2025-06-20T18:00:00Z",
    "location": "Court A, Sukhumvit",
    "capacity": 4,
    "description": "Looking for players to join!",
    "status": "OPEN",
    "created_at": "2025-06-01T00:00:00Z"
  }
}
```

**Error Responses:**

| Status | Body                                                                                                       |
| ------ | ---------------------------------------------------------------------------------------------------------- |
| 400    | `{ "error": "Missing required fields: ..." }` or `{ "error": "game_date_time must be a valid date/time" }` |
| 500    | `{ "error": "<error message>" }`                                                                           |

---

### POST /api/community/:id/join

Join a party.

**Auth:** ✅ Required

**URL Parameters:**

| Param | Type | Description |
| ----- | ---- | ----------- |
| `id`  | UUID | Party ID    |

**Request Body:** None

**Success Response (201):**

```json
{
  "message": "Joined successfully",
  "party": { ... },
  "participant": { ... }
}
```

> Message will be `"Joined successfully. Party is now full."` if the party reaches capacity.

**Error Responses:**

| Status | Body                                                                              |
| ------ | --------------------------------------------------------------------------------- |
| 400    | `{ "error": "Party is not open for joins" }`                                      |
| 404    | `{ "error": "Party not found" }`                                                  |
| 409    | `{ "error": "Party is full" }` or `{ "error": "User already joined this party" }` |
| 500    | `{ "error": "<error message>" }`                                                  |

---

### GET /api/community/mine

Get all parties the current user has joined (as participant).

**Auth:** ✅ Required

**Success Response (200):** Array of party objects the user has joined

---

## Internationalization (i18n)

The API supports returning localized error messages and responses.

### Language Detection Priority

1. **Query parameter:** `?lang=th` (highest priority)
2. **Header:** `Accept-Language: th`
3. **User profile preference:** `language_preference` field in profiles
4. **Default:** `en` (English)

### Supported Languages

| Code | Language          |
| ---- | ----------------- |
| `en` | English (default) |
| `th` | Thai              |
| `zh` | Chinese           |

### Example

```
GET /api/courts?lang=th
```

---

## Data Models / Schema

### Profile

| Column                           | Type         | Description                               |
| -------------------------------- | ------------ | ----------------------------------------- |
| `id`                             | UUID         | Primary key                               |
| `auth_id`                        | UUID         | Links to Supabase auth.users.id           |
| `full_name`                      | VARCHAR(255) | User's full name                          |
| `address`                        | TEXT         | User's address                            |
| `role`                           | VARCHAR(20)  | `"CUSTOMER"` or `"ADMIN"`                 |
| `is_disabled`                    | BOOLEAN      | Whether the account is disabled           |
| `is_member`                      | BOOLEAN      | Whether the user has an active membership |
| `membership_started_at`          | TIMESTAMP    | When membership started                   |
| `membership_expires_at`          | TIMESTAMP    | When membership expires                   |
| `membership_fee_last_paid`       | DECIMAL      | Last paid membership fee                  |
| `membership_last_payment_method` | VARCHAR(20)  | Last used payment method                  |
| `membership_last_transaction_id` | VARCHAR(255) | Last transaction reference                |
| `credit_card_token`              | VARCHAR(255) | Saved Stripe card token                   |
| `language_preference`            | VARCHAR(5)   | `"TH"`, `"EN"`, or `"ZH"`                 |
| `created_at`                     | TIMESTAMP    | Account creation time                     |

### Court

| Column           | Type          | Description                                 |
| ---------------- | ------------- | ------------------------------------------- |
| `id`             | UUID          | Primary key                                 |
| `name`           | VARCHAR(255)  | Court name                                  |
| `location_lat`   | DECIMAL(10,8) | Latitude                                    |
| `location_lng`   | DECIMAL(11,8) | Longitude                                   |
| `price_per_hour` | DECIMAL(10,2) | Price per hour in THB                       |
| `allowed_shoes`  | VARCHAR(255)  | Allowed shoe types                          |
| `current_status` | VARCHAR(20)   | `"AVAILABLE"`, `"RENOVATE"`, or `"DAMAGED"` |
| `opening_time`   | TIME          | Opening time                                |
| `closing_time`   | TIME          | Closing time                                |
| `average_rating` | DECIMAL(3,2)  | Average review rating                       |
| `total_reviews`  | INTEGER       | Number of reviews                           |
| `created_at`     | TIMESTAMP     | Creation time                               |

### Booking

| Column           | Type          | Description                                          |
| ---------------- | ------------- | ---------------------------------------------------- |
| `id`             | UUID          | Primary key                                          |
| `user_id`        | UUID          | References auth.users.id                             |
| `court_id`       | UUID          | References courts.id                                 |
| `start_time`     | TIMESTAMP     | Booking start time                                   |
| `end_time`       | TIMESTAMP     | Booking end time                                     |
| `total_amount`   | DECIMAL(10,2) | Total amount in THB                                  |
| `booking_status` | VARCHAR(20)   | `"CONFIRMED"`, `"CANCELLED"`, or `"WAITLIST"`        |
| `payment_method` | VARCHAR(20)   | `"CREDIT_CARD"`, `"BANK_TRANSFER"`, or `"PROMPTPAY"` |
| `transaction_id` | VARCHAR(255)  | Payment transaction reference                        |
| `created_at`     | TIMESTAMP     | Booking creation time                                |

### Equipment Rental

| Column           | Type          | Description                 |
| ---------------- | ------------- | --------------------------- |
| `id`             | UUID          | Primary key                 |
| `booking_id`     | UUID          | References bookings.id      |
| `equipment_type` | VARCHAR(50)   | `"RACKET"`, `"SHUTTLECOCK"` |
| `quantity`       | INTEGER       | Number of items             |
| `unit_price`     | DECIMAL(10,2) | Price per unit              |

### Waitlist

| Column                | Type        | Description                                              |
| --------------------- | ----------- | -------------------------------------------------------- |
| `id`                  | UUID        | Primary key                                              |
| `user_id`             | UUID        | References auth.users.id                                 |
| `court_id`            | UUID        | References courts.id                                     |
| `requested_date`      | DATE        | Requested booking date                                   |
| `preferred_time_slot` | VARCHAR(20) | Time range (e.g., `"10:00-12:00"`)                       |
| `status`              | VARCHAR(20) | `"PENDING"`, `"NOTIFIED"`, `"EXPIRED"`, or `"CONFIRMED"` |
| `created_at`          | TIMESTAMP   | Entry creation time                                      |

### Review

| Column         | Type      | Description              |
| -------------- | --------- | ------------------------ |
| `id`           | UUID      | Primary key              |
| `user_id`      | UUID      | References auth.users.id |
| `court_id`     | UUID      | References courts.id     |
| `rating`       | INTEGER   | Rating 1–5               |
| `comment_text` | TEXT      | Review comment           |
| `created_at`   | TIMESTAMP | Review creation time     |

### Party

| Column           | Type         | Description                          |
| ---------------- | ------------ | ------------------------------------ |
| `id`             | UUID         | Primary key                          |
| `host_id`        | UUID         | References auth.users.id             |
| `title`          | VARCHAR(255) | Party title                          |
| `game_name`      | VARCHAR(255) | Sport/game name                      |
| `game_date_time` | TIMESTAMP    | Scheduled date/time                  |
| `location`       | TEXT         | Location description                 |
| `capacity`       | INTEGER      | Max participants                     |
| `description`    | TEXT         | Additional details                   |
| `status`         | VARCHAR(20)  | `"OPEN"`, `"FULL"`, or `"CANCELLED"` |
| `created_at`     | TIMESTAMP    | Creation time                        |

### Party Participant

| Column      | Type      | Description              |
| ----------- | --------- | ------------------------ |
| `id`        | UUID      | Primary key              |
| `party_id`  | UUID      | References parties.id    |
| `user_id`   | UUID      | References auth.users.id |
| `joined_at` | TIMESTAMP | Join time                |

---

## Error Handling

All errors follow a consistent JSON format:

```json
{
  "error": "Human-readable error message"
}
```

### Common HTTP Status Codes

| Status | Meaning                                                                                        |
| ------ | ---------------------------------------------------------------------------------------------- |
| 200    | Success                                                                                        |
| 201    | Created successfully                                                                           |
| 400    | Bad request — invalid or missing parameters                                                    |
| 401    | Unauthorized — missing or invalid token                                                        |
| 403    | Forbidden — insufficient permissions (non-admin trying admin endpoint, or disabled account)    |
| 404    | Resource not found                                                                             |
| 409    | Conflict — duplicate resource or state conflict (double booking, already reviewed, party full) |
| 500    | Internal server error                                                                          |

---

## Quick Reference Table

| Method   | Endpoint                             | Auth | Role   | Description                |
| -------- | ------------------------------------ | ---- | ------ | -------------------------- |
| `POST`   | `/api/auth/register`                 | ❌   | Public | Register new user          |
| `POST`   | `/api/auth/login`                    | ❌   | Public | Login & get token          |
| `GET`    | `/api/auth/profile`                  | ✅   | Any    | Get user profile           |
| `GET`    | `/api/auth/membership/status`        | ✅   | Any    | Get membership status      |
| `POST`   | `/api/auth/membership/subscribe`     | ✅   | Any    | Subscribe to membership    |
| `GET`    | `/api/auth/users`                    | ✅   | Admin  | List all users             |
| `PUT`    | `/api/auth/users/:id/disable`        | ✅   | Admin  | Disable a user             |
| `GET`    | `/api/courts`                        | ❌   | Public | List all courts            |
| `GET`    | `/api/courts/search`                 | ❌   | Public | Search/filter courts       |
| `GET`    | `/api/courts/:id`                    | ❌   | Public | Get court details          |
| `GET`    | `/api/courts/:id/availability`       | ❌   | Public | Get court availability     |
| `POST`   | `/api/courts`                        | ✅   | Admin  | Create a court             |
| `PUT`    | `/api/courts/:id`                    | ✅   | Admin  | Update a court             |
| `PUT`    | `/api/courts/:id/status`             | ✅   | Admin  | Update court status        |
| `POST`   | `/api/bookings`                      | ✅   | Any    | Create a booking           |
| `GET`    | `/api/bookings/my`                   | ✅   | Any    | Get my bookings            |
| `DELETE` | `/api/bookings/:id`                  | ✅   | Any    | Cancel a booking           |
| `GET`    | `/api/bookings/:id/equipment`        | ✅   | Any    | Get booking equipment      |
| `POST`   | `/api/bookings/:id/equipment`        | ✅   | Any    | Rent equipment             |
| `GET`    | `/api/payments/config`               | ✅   | Any    | Get Stripe publishable key |
| `POST`   | `/api/payments/create-customer`      | ✅   | Any    | Create Stripe customer     |
| `GET`    | `/api/payments/saved-cards`          | ✅   | Any    | Get saved cards            |
| `POST`   | `/api/payments/setup-intent`         | ✅   | Any    | Create setup intent        |
| `DELETE` | `/api/payments/cards/:id`            | ✅   | Any    | Delete a saved card        |
| `POST`   | `/api/payments/create-intent`        | ✅   | Any    | Create payment intent      |
| `GET`    | `/api/reviews/court/:courtId`        | ❌   | Public | Get court reviews          |
| `GET`    | `/api/reviews/court/:courtId/rating` | ❌   | Public | Get average rating         |
| `POST`   | `/api/reviews`                       | ✅   | Any    | Create a review            |
| `GET`    | `/api/reviews/my`                    | ✅   | Any    | Get my reviews             |
| `POST`   | `/api/waitlist`                      | ✅   | Any    | Join waitlist              |
| `GET`    | `/api/waitlist/my`                   | ✅   | Any    | Get my waitlist entries    |
| `POST`   | `/api/waitlist/:id/confirm`          | ✅   | Any    | Confirm waitlist entry     |
| `DELETE` | `/api/waitlist/:id`                  | ✅   | Any    | Leave waitlist             |
| `GET`    | `/api/community`                     | ❌   | Public | Get community feed         |
| `GET`    | `/api/community/:id`                 | ❌   | Public | Get party details          |
| `POST`   | `/api/community`                     | ✅   | Any    | Create a party             |
| `POST`   | `/api/community/:id/join`            | ✅   | Any    | Join a party               |
| `GET`    | `/api/community/mine`                | ✅   | Any    | Get my joined parties      |

---

## Feature Implementation Guide for Clients

### Authentication Flow

```
1. POST /api/auth/register  →  Create account
2. POST /api/auth/login     →  Get access_token
3. Store token in localStorage or secure storage
4. Send token as: Authorization: Bearer <access_token>
```

### Court Browsing & Booking Flow

```
1. GET  /api/courts/search           →  Find courts
2. GET  /api/courts/:id              →  View court details
3. GET  /api/courts/:id/availability →  Check available slots
4. POST /api/bookings                →  Book a court (+ optional equipment)
5. GET  /api/bookings/my             →  View my bookings
6. DELETE /api/bookings/:id          →  Cancel if needed
```

### Membership Flow

```
1. GET  /api/auth/membership/status   →  Check membership status
2. POST /api/auth/membership/subscribe →  Subscribe (฿199/month)
3. Bookings now use member rate (฿150/hr instead of ฿200/hr)
```

### Review Flow

```
1. GET  /api/reviews/court/:courtId/rating  →  See average rating
2. GET  /api/reviews/court/:courtId         →  Read all reviews
3. POST /api/reviews                        →  Write a review (once per court)
4. GET  /api/reviews/my                     →  View my reviews
```

### Waitlist Flow

```
1. POST /api/waitlist               →  Join waitlist when court is booked
2. GET  /api/waitlist/my            →  Check waitlist status
3. (Backend notifies when slot opens → status becomes NOTIFIED)
4. POST /api/waitlist/:id/confirm   →  Confirm & pay → creates booking
5. DELETE /api/waitlist/:id         →  Or remove from waitlist
```

### Community / Party Flow

```
1. GET  /api/community              →  Browse all parties
2. POST /api/community              →  Create a new party
3. POST /api/community/:id/join     →  Join an existing party
4. GET  /api/community/mine         →  View parties I've joined
```

### Payment (Credit Card) Flow

```
1. GET  /api/payments/config            →  Get Stripe publishable key
2. POST /api/payments/create-customer   →  Create Stripe customer
3. POST /api/payments/setup-intent      →  Get client_secret to save card
4. GET  /api/payments/saved-cards       →  List saved cards
5. POST /api/payments/create-intent     →  Charge for a booking
6. DELETE /api/payments/cards/:id       →  Remove a saved card
```

### Admin Flow

```
1. GET  /api/auth/users              →  List all users
2. PUT  /api/auth/users/:id/disable  →  Disable a user
3. POST /api/courts                  →  Create a court
4. PUT  /api/courts/:id              →  Update court details
5. PUT  /api/courts/:id/status       →  Change court status
```
