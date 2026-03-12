# Design Models and Design Rationale (Deliverable D1)

This document describes the software architecture of the **Badminton Court Management System** based on the project requirements. It includes C4 Model diagrams (Context, Container, Component), a Sequence Diagram for a core demo case, and an Entity Relationship (ER) Diagram to illustrate the system structure.

---

## 1. C4 Diagrams

### Level 1: System Context Diagram
An overview showing the relationship between the main system, the two types of users (Customer & Administrator), and the external third-party systems required to fulfill all functional and non-functional requirements.

```mermaid
C4Context
    title Level 1: System Context Diagram — Badminton Court Management System

    Person(customer, "Customer", "Registers, searches for courts (by name/price/distance), books timeslots, rents equipment, pays, joins waitlists, and writes reviews.")
    Person(admin, "Court Administrator", "Registers court details, updates court status, and manages user accounts (register/block admin or staff).")

    System(bms, "Badminton Court Management System", "A responsive web application for booking and managing badminton courts. Supported by Redis for fast searches.")

    System_Ext(supabase_sys, "Supabase (Database & Auth)", "Managed service providing authentication and a PostgreSQL database. Handled via Supabase JS SDK.")
    System_Ext(payment_sys, "Payment Gateway", "Processes credit card and bank transfer payments, triggering upon booking confirmation.")
    System_Ext(notification_sys, "Notification Service", "Sends notifications to users when a waitlisted court becomes available.")

    Rel(customer, bms, "Searches, books, pays, cancels, rents equipment, reviews", "HTTPS / Web Browser")
    Rel(admin, bms, "Manages courts, statuses, and user accounts", "HTTPS / Web Browser")

    Rel(bms, supabase_sys, "Authenticates users, Reads/Writes data, executes RPC actions", "Supabase JS SDK (HTTPS)")
    Rel(bms, payment_sys, "Processes payments and refunds", "API")
    Rel(bms, notification_sys, "Sends waitlist availability alerts", "API / SMTP")
```

**Design Rationale:**

| Requirement | How the Context Diagram Addresses It |
|---|---|
| **Concurrency (1,000 users)** | Handled by a single, well-optimized backend on Node.js using its non-blocking I/O event loop, further supported by **Redis Cache** for lightning-fast search indexing. |
| **Security (Encryption)** | All personal data (including credit cards) is encrypted using Node's `crypto` module AES-256 before being stored in the database. Authentication is offloaded securely to **Supabase Auth**. |
| **Search (Name/Distance/Price)** | Handled by the Court Search API and heavily optimized using **Redis Cache Support** ensuring response times of under 2 seconds. |
| **Waitlist & Notification** | Triggered upon booking cancellation, scanning the waitlist and using the **Notification Service** to dispatch alerts to the appropriate users on the waitlist. |
| **Payment & Cancellation** | The booking transaction checks availability and triggers a **Payment Gateway**. Full refund processes are triggered when a booking is correctly canceled within the allowed timeframe. |
| **Localization (TH/EN/ZH)** | Frontend web UI is designed to accommodate dynamic i18n translation switches seamlessly without reloading the server. |
| **Equipment Rental** | Included in the Customer's relationship label ("rents equipment"). Managed as part of the booking flow within the system. |
| **Review System (1-5 stars)** | Included in the Customer's relationship label ("reviews"). Average ratings are displayed alongside court search results. |

---

### Level 2: Container Diagram
The container-level view shows the simplified, monolithic technology stack designed for easy local deployment and high performance.

```mermaid
C4Container
    title Level 2: Container Diagram — Badminton Court Management System

    Person(customer, "Customer", "Books courts, pays, reviews")
    Person(admin, "Court Administrator", "Manages courts and users")

    System_Boundary(bms, "Badminton Court Management System") {
        Container(web_app, "Responsive Web UI", "HTML/CSS/JS", "Single web application for both customers and admins. Supports TH, EN, ZH localization.")
        Container(api_server, "API Server", "Node.js / Express", "Monolith backend handling all business logic: auth, booking, payment, and reviews.")
        ContainerDb(redis_cache, "Redis Cache", "Redis", "High-performance in-memory cache for fast search queries (< 2s).")
    }

    System_Ext(supabase_sys, "Supabase", "Provides Managed PostgreSQL, Row-Level Security, and Auth services used directly by the API Server.")
    System_Ext(payment_sys, "Payment Service", "Handles payment completion and refunds.")
    System_Ext(notification_sys, "Notification Service", "Sends email alerts for waitlist availability.")

    Rel(customer, web_app, "Searches, books, pays, reviews", "HTTPS")
    Rel(admin, web_app, "Manages courts, statuses, users", "HTTPS")
    
    Rel(web_app, api_server, "Makes API calls", "REST/JSON")
    
    Rel(api_server, redis_cache, "Reads/Writes cached court search data", "TCP")
    Rel(api_server, supabase_sys, "Authenticates users & queries database models via Supabase JS", "HTTPS / REST")
    Rel(api_server, payment_sys, "Processes payments and refunds", "API")
    Rel(api_server, notification_sys, "Sends waitlist alerts", "API")
```

**Design Rationale:**
*   **Monolith API with Cache:** The main architecture uses Node.js/Express but offloads read-heavy operations (court searching) to **Redis**, achieving response times under 2 seconds.
*   **Single Responsive Web UI:** One web application serves both customers and administrators, fully eliminating the need for separate codebases while retaining responsive behavior across all mobile platforms.
*   **Supabase Database & Auth Integration:** The previous raw raw-SQL `pg` connection pool was phased out in favor of the full **Supabase JS Client SDK**. Queries, inserts, and authentications natively use Supabase, offloading backend complexity to the managed cloud ecosystem.
*   **Data Security:** Credit card endpoints parse info using Node.js `crypto` (AES-256) inside the Controller before sending encrypted tokens securely to the database.

---

### Level 3: Component Diagram (API Server)
The internal component structure of the monolith API Server, showing how business logic is organized into focused modules.

```mermaid
C4Component
    title Level 3: Component Diagram — API Server (Node.js/Express)

    Container_Boundary(api_container, "API Server") {
        Component(router, "Express Router", "Middleware", "Routes incoming requests to the appropriate controller.")
        Component(auth_controller, "Auth Controller", "Controller", "Handles user registration, login, and credit card encryption (CryptoAES-256).")
        Component(court_controller, "Court Controller", "Controller", "Manages court CRUD for admins.")
        Component(search_controller, "Search Controller", "Controller", "Handles search by name, distance, and price utilizing Redis.")
        Component(booking_controller, "Booking Controller", "Controller", "Manages reservations, transactions, waitlist flow, and equipment.")
        Component(review_controller, "Review Controller", "Controller", "Handles star ratings and comment submissions.")
        Component(payment_service, "Payment Service", "Service", "Processes payments tracking transaction IDs.")
        Component(notification_service, "Notification Service", "Service", "Triggers alerts when a waitlisted court becomes available.")
        Component(supabase_client, "Supabase Client Models", "Supabase SDK / DB Models", "Interact with the Supabase PostgREST API for entity data operations.")
    }

    ContainerDb(redis_cache, "Redis", "In-Memory Cache")
    System_Ext(supabase_sys, "Supabase (DB + Auth)", "Backend as a Service")
    System_Ext(payment_ext, "Payment Gateway", "External API")

    Rel(router, auth_controller, "/api/auth/*")
    Rel(router, court_controller, "/api/courts/*")
    Rel(router, search_controller, "/api/courts/search")
    Rel(router, booking_controller, "/api/bookings/*")
    Rel(router, review_controller, "/api/reviews/*")

    Rel(auth_controller, supabase_client, "Auth API + Profile Data & Encrypted CC")
    Rel(search_controller, redis_cache, "Cache misses fetch from DB, then store in Redis. Cache hits return instantly.")
    Rel(court_controller, supabase_client, "Court CRUD")
    Rel(booking_controller, supabase_client, "Row-Level Booking Locks + Transaction Logic")
    Rel(booking_controller, payment_service, "Process payment, record transaction ID")
    Rel(booking_controller, notification_service, "Notify waitlist users upon cancellation")
    Rel(review_controller, supabase_client, "Store feedback & calculate averages")
    
    Rel(payment_service, payment_ext, "Handles Gateway transaction APIs")
    Rel(supabase_client, supabase_sys, "Supabase JS Client Requests")
```

**Design Rationale:**
*   **Separation of Search from Standard Court Operations:** A dedicated **Search Controller** focuses purely on high-performance filtering. It integrates natively with **Redis** to intercept incoming search requests, bypassing database load on cache hits.
*   **Supabase over Raw Database Connectors:** The traditional `pg` driver component was purged completely in favor of the **Supabase JS Client** Models. This allows offloading auth and leveraging Supabase's managed SDK features internally.
*   **In-Memory Crypto:** The **Auth Controller** directly uses the Node.js `crypto` module (AES-256) to symmetrically encrypt user credit cards on registration ensuring PCI-DSS conceptual requirements without plain-text storage.
*   **Booking Transaction Flow:** The Booking Controller locks the available slot on the database level, fires off the Payment Service returning a `transaction_id`, and gracefully commits the result or aborts the slot reservation if payment fails.

---

### Level 4: Code Diagram (Data Access Layer)
The code-level view zooms into the **Data Access Layer** component from Level 3, showing the class structure and relationships between data models that map directly to the database tables.

```mermaid
classDiagram
    direction LR

    class UserModel {
        +UUID id
        +String fullName
        +String address
        +String encryptedPassword
        +String role : CUSTOMER | ADMIN
        +Boolean isDisabled
        +String creditCardToken
        +String languagePreference : TH | EN | ZH
        +register(data) User
        +login(email, password) Token
        +updateProfile(data) User
        +setDisabled(userId, flag) void
    }

    class CourtModel {
        +UUID id
        +String name
        +Decimal locationLat
        +Decimal locationLng
        +Decimal pricePerHour
        +String allowedShoes
        +String status : AVAILABLE | RENOVATE | DAMAGED
        +Time openingTime
        +Time closingTime
        +create(data) Court
        +updateStatus(courtId, status) Court
        +searchByFilters(name, lat, lng, radius, maxPrice) Court[]
    }

    class BookingModel {
        +UUID id
        +UUID userId
        +UUID courtId
        +DateTime startTime
        +DateTime endTime
        +Decimal totalAmount
        +String status : CONFIRMED | CANCELLED | WAITLIST
        +String paymentMethod : CREDIT_CARD | BANK_TRANSFER
        +create(data) Booking
        +cancel(bookingId) Refund
        +getByUser(userId) Booking[]
        +checkAvailability(courtId, startTime, endTime) Boolean
    }

    class EquipmentRentalModel {
        +UUID id
        +UUID bookingId
        +String type : RACKET | SHUTTLECOCK
        +Int quantity
        +Decimal unitPrice
        +addToBooking(bookingId, items) EquipmentRental[]
    }

    class ReviewModel {
        +UUID id
        +UUID userId
        +UUID courtId
        +Int rating : 1-5
        +String commentText
        +DateTime createdAt
        +create(userId, courtId, data) Review
        +getByCourtId(courtId) Review[]
        +getAverageRating(courtId) Decimal
    }

    class WaitlistModel {
        +UUID id
        +UUID userId
        +UUID courtId
        +DateTime requestedDate
        +String preferredTimeSlot
        +String status : PENDING | NOTIFIED | EXPIRED
        +addToWaitlist(data) Waitlist
        +notifyNextInQueue(courtId) void
        +getByUser(userId) Waitlist[]
    }

    UserModel "1" --> "*" BookingModel : places
    UserModel "1" --> "*" ReviewModel : writes
    UserModel "1" --> "*" WaitlistModel : joins
    CourtModel "1" --> "*" BookingModel : booked for
    CourtModel "1" --> "*" ReviewModel : receives
    CourtModel "1" --> "*" WaitlistModel : waited for
    BookingModel "1" --> "*" EquipmentRentalModel : includes
```

**Design Rationale:**
*   **Model-per-Table Pattern:** Each model class maps 1:1 to a PostgreSQL table, making the codebase predictable. Methods on each model represent the actual database operations (CRUD + business queries).
*   **Waitlist as a Dedicated Model:** Separating the waitlist from bookings allows independent lifecycle management. A waitlisted entry can be `PENDING → NOTIFIED → EXPIRED`, while a booking follows `CONFIRMED → CANCELLED`.
*   **Security by Design:** `encryptedPassword` and `creditCardToken` fields are never stored in plain text. The `UserModel.login()` method compares against bcrypt hashes, and credit card tokens are generated by the external Payment Gateway.
*   **Language Preference:** Stored per-user to persist their TH/EN/ZH selection across sessions, fulfilling the localization requirement.

---

## 2. Sequence Diagrams

### 2.1 Search and Booking Flow (Happy Path)

A demonstration workflow when a customer searches for a court, selects a timeslot, adds equipment, and successfully completes a payment.

```mermaid
sequenceDiagram
    autonumber
    actor User as Customer
    participant UI as Web Browser
    participant API as API Server (Express)
    participant Cache as Redis
    participant DB as Supabase DB
    participant Pay as Payment Service

    User->>UI: Types search query, adjusts filters
    UI->>API: GET /api/courts/search?...
    API->>Cache: Check for cached search results
    
    alt Cache Hit
        Cache-->>API: Returns cached court data
    else Cache Miss
        API->>DB: Fetch matching courts using SDK
        DB-->>API: Returns courts
        API->>Cache: Set cache with expiration
    end
    
    API-->>UI: JSON response (court list)
    UI-->>User: Displays highly responsive courts (< 2s)

    User->>UI: Select court, datetime, adds equipment → Clicks "Pay Now"
    UI->>API: POST /api/bookings {...data}
    API->>DB: Check slot (Pessimistic Row-Level Lock or Availability Logic)
    DB-->>API: Slot is reserved/available
    API->>Pay: Process payment with method/cc_token
    Pay-->>API: Returns transaction_id
    API->>DB: INSERT booking & equipment rentals including transaction_id
    DB-->>API: Saved
    API-->>UI: 201 Created — Booking confirmed
    UI-->>User: UI updates to show success and reroutes to My Bookings
```

### 2.2 Cancellation and Waitlist Notification Flow

Demonstrates what happens when a user cancels a booking that has people waiting in the queue.

```mermaid
sequenceDiagram
    autonumber
    actor User as Booked Customer
    actor Waiter as Waitlisted Customer
    participant UI as Web Browser
    participant API as API Server (Express)
    participant DB as PostgreSQL
    participant Pay as Stripe
    participant Notif as Nodemailer (SMTP)

    User->>UI: Clicks "Cancel Booking" (before play time)
    UI->>API: DELETE /api/bookings/{id}
    API->>DB: Verify booking exists and play time hasn't started
    DB-->>API: Booking found, cancellation eligible

    API->>Pay: stripe.refunds.create({ charge: 'ch_xxx' })
    Pay-->>API: Refund succeeded (re_xxx)
    API->>DB: UPDATE booking SET status = 'CANCELLED'
    DB-->>API: Updated

    API->>DB: SELECT next waitlisted user for this court + timeslot
    DB-->>API: Returns waitlisted customer data

    alt Waitlist has users
        API->>DB: UPDATE waitlist SET status = 'NOTIFIED'
        API->>Notif: nodemailer.sendMail({ to: waitlisted_email, subject: 'Court Available!' })
        Notif-->>Waiter: Email: "A court is now available! Book now."
    end

    API-->>UI: 200 OK — Booking cancelled, refund processed
    UI-->>User: Shows cancellation confirmation with refund details
```

**Design Rationale:**
*   **Performance (< 2s Search):** The search flow uses PostgreSQL indexed queries combined with the external Map Service for distance calculations. Database indexes on `location`, `name`, and `price` fields ensure fast filtering without the need for a separate cache layer.
*   **Concurrency Safety (SELECT FOR UPDATE):** The booking flow uses database-level row locking (`SELECT FOR UPDATE`) to prevent double-booking race conditions when multiple users try to book the same timeslot simultaneously.
*   **Atomic Transactions:** The payment must succeed before the booking is committed to the database. If the payment fails, the slot remains available. This is wrapped in a single database transaction to ensure data integrity.
*   **Waitlist-to-Notification Pipeline:** When a booking is cancelled, the system automatically checks the waitlist and notifies the next user via the external Notification Service, ensuring no manual intervention is needed.

---

## 3. Entity Relationship Diagram (ER Diagram)

The database schema design for the Badminton Court Management System using a Relational Database.

```mermaid
erDiagram
    USERS {
        UUID id PK
        string full_name
        string email "Unique login identifier"
        string address
        string encrypted_password "Security: bcrypt hash"
        string role "CUSTOMER / ADMIN"
        boolean is_disabled "Admin can block accounts"
        string credit_card_token "Tokenized by Payment Gateway"
        string language_preference "TH / EN / ZH"
        datetime created_at
    }

    COURTS {
        UUID id PK
        string name "Searchable (indexed)"
        decimal location_lat "GPS latitude (indexed)"
        decimal location_lng "GPS longitude (indexed)"
        decimal price_per_hour "Hourly rate (indexed)"
        string allowed_shoes "Permitted footwear rules"
        string current_status "AVAILABLE / RENOVATE / DAMAGED"
        time opening_time "Daily opening hour"
        time closing_time "Daily closing hour"
        datetime created_at
    }

    BOOKINGS {
        UUID id PK
        UUID user_id FK
        UUID court_id FK
        datetime start_time "Play start time"
        datetime end_time "Play end time"
        decimal total_amount "Court + equipment total"
        string booking_status "CONFIRMED / CANCELLED / WAITLIST"
        string payment_method "CREDIT_CARD / BANK_TRANSFER"
        datetime created_at
    }

    EQUIPMENT_RENTAL {
        UUID id PK
        UUID booking_id FK
        string equipment_type "RACKET / SHUTTLECOCK"
        int quantity
        decimal unit_price
    }

    REVIEWS {
        UUID id PK
        UUID user_id FK
        UUID court_id FK
        int rating "1 to 5 stars"
        string comment_text
        datetime created_at
    }

    WAITLIST {
        UUID id PK
        UUID user_id FK
        UUID court_id FK
        datetime requested_date "Desired play date"
        string preferred_time_slot "e.g. 18:00-20:00"
        string status "PENDING / NOTIFIED / EXPIRED"
        datetime created_at
    }

    USERS ||--o{ BOOKINGS : "makes"
    USERS ||--o{ REVIEWS : "writes"
    USERS ||--o{ WAITLIST : "joins"
    COURTS ||--o{ BOOKINGS : "is booked for"
    COURTS ||--o{ REVIEWS : "receives"
    COURTS ||--o{ WAITLIST : "is waited for"
    BOOKINGS ||--o{ EQUIPMENT_RENTAL : "includes"
```

**Design Rationale:**
*   **`is_disabled` in USERS:** Fulfills the requirement giving Administrators the authority to block inappropriate customers from logging into the platform.
*   **`current_status` in COURTS:** Meets the requirement for real-time status updates (e.g., renovations or equipment damage) by admins. This status is actively read by the search service to prevent users from booking unavailable courts.
*   **`opening_time` / `closing_time` in COURTS:** Required by the admin court registration feature to specify operating hours.
*   **`language_preference` in USERS:** Persists the user's chosen language (TH/EN/ZH) for the localization requirement.
*   **`payment_method` in BOOKINGS:** Tracks whether payment was via credit card or bank transfer, as both methods are required.
*   **Dedicated WAITLIST table:** Separated from BOOKINGS to allow independent lifecycle management (PENDING → NOTIFIED → EXPIRED), enabling the notification system to efficiently query and alert waitlisted users.
*   **Normalized EQUIPMENT_RENTAL & REVIEWS tables:** Decoupling optional information keeps the core `BOOKINGS` table as small and performant as possible, benefiting read queries under 1,000 concurrent users.
*   **Database Indexes:** Fields marked "indexed" (court name, coordinates, price) are optimized for the < 2s search performance requirement.

