# Design Models and Design Rationale (Deliverable D1)

This document describes the software architecture of the **Badminton Court Management System** based on the project requirements. It includes C4 Model diagrams (Context, Container, Component), a Sequence Diagram for a core demo case, and an Entity Relationship (ER) Diagram to illustrate the system structure.

---

## 1. C4 Diagrams

### Level 1: System Context Diagram
An overview showing the relationship between the main system, the two types of users (Customer & Administrator), and the external third-party systems required to fulfill all functional and non-functional requirements.

```mermaid
C4Context
    title Level 1: System Context Diagram — Badminton Court Management System

    Person(customer, "Customer", "Registers, searches for courts (by name/distance/price), books timeslots, rents equipment, pays via credit card or bank transfer, joins waitlists, and writes reviews (1-5 stars).")
    Person(admin, "Court Administrator", "Registers court details (location, hours, pricing, shoe rules), updates court status (e.g. renovation), and manages user accounts (block/disable).")

    System(bms, "Badminton Court Management System", "A responsive web application for booking and managing badminton courts. Supports 1,000 concurrent users, localized in TH/EN/ZH, with encrypted personal data storage.")

    System_Ext(payment_sys, "Stripe", "Processes credit card payments (Stripe Charges API) and bank transfers. Handles full refund requests via Stripe Refunds API.")
    System_Ext(notification_sys, "Nodemailer (SMTP)", "Sends email notifications to users when a waitlisted court becomes available. Uses Gmail SMTP or Mailtrap for dev.")
    System_Ext(map_sys, "Google Maps API", "Provides GPS-based distance calculations (1km, 2km, 10km radius) via Distance Matrix API and Geocoding API.")

    Rel(customer, bms, "Searches, books, pays, cancels, rents equipment, reviews", "HTTPS / Web Browser")
    Rel(admin, bms, "Manages courts, statuses, and user accounts", "HTTPS / Web Browser")

    Rel(bms, payment_sys, "Processes payments and refund requests", "Stripe Node.js SDK")
    Rel(bms, notification_sys, "Sends waitlist availability alerts", "SMTP")
    Rel(bms, map_sys, "Requests distance calculations from user GPS location", "Google Maps REST API")
```

**Design Rationale:**

| Requirement | How the Context Diagram Addresses It |
|---|---|
| **Concurrency (1,000 users)** | The system boundary description explicitly states the NFR. A single, well-optimized monolith on Node.js handles this via its non-blocking I/O event loop. |
| **Security (Encryption)** | All relationships use HTTPS. Sensitive data (credit cards, passwords) is stored encrypted within the system, and actual payment processing is delegated to **Stripe** (PCI-DSS Level 1 certified), avoiding direct PCI liability. |
| **Search (Name/Distance/Price)** | **Google Maps API** (Distance Matrix / Geocoding) is identified as the external dependency for GPS-based distance search (1km/2km/10km radius). Name and price filtering are handled internally by PostgreSQL indexes. |
| **Waitlist & Notification** | **Nodemailer** sends email alerts via SMTP (Gmail or Mailtrap for dev) when a waitlisted court becomes available, ensuring reliable delivery decoupled from core booking logic. |
| **Payment & Cancellation** | **Stripe Charges API** handles credit card payments; **Stripe Refunds API** processes full refunds for cancellations (if play time hasn't started). Bank transfers are simulated via Stripe's test mode. |
| **Localization (TH/EN/ZH)** | Stated in the system description. Implemented internally via a JSON-based i18n translation layer. |
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
        Container(api_server, "API Server", "Node.js / Express", "Monolith backend handling all business logic: auth, search, booking, payment, and reviews.")
        ContainerDb(db, "Database", "PostgreSQL", "Stores Users, Courts, Bookings, Equipment Rentals, and Reviews. Runs via Docker locally or Supabase in cloud.")
    }

    System_Ext(payment_sys, "Stripe", "Processes credit card and bank transfer payments via Stripe SDK. Handles refunds.")
    System_Ext(map_sys, "Google Maps API", "GPS-based distance calculations via Distance Matrix API.")
    System_Ext(notification_sys, "Nodemailer (SMTP)", "Sends email alerts for waitlist availability via Gmail/Mailtrap SMTP.")

    Rel(customer, web_app, "Searches, books, pays, reviews", "HTTPS")
    Rel(admin, web_app, "Manages courts, statuses, users", "HTTPS")
    
    Rel(web_app, api_server, "Makes API calls", "REST/JSON")
    
    Rel(api_server, db, "Reads/Writes data", "SQL/TCP")
    Rel(api_server, payment_sys, "Processes payments and refunds", "Stripe Node.js SDK")
    Rel(api_server, map_sys, "Calculates distances (1km/2km/10km)", "Google Maps REST API")
    Rel(api_server, notification_sys, "Sends waitlist alerts", "SMTP")
```

**Design Rationale:**
*   **Monolith Architecture (Node.js/Express):** A single API server simplifies development, testing, and deployment. Node.js's non-blocking event loop efficiently handles 1,000 concurrent connections without the operational overhead of microservices or load balancers.
*   **Single Responsive Web UI:** One web application serves both customers and administrators, eliminating the need for a separate mobile app while still supporting all device types through responsive CSS.
*   **PostgreSQL with DB Indexes:** By creating indexes on frequently searched fields (court name, location coordinates, price), we achieve search response times **under 2 seconds** without the complexity of a Redis cache layer.
*   **Hybrid Database Hosting:** The team develops against a shared Supabase instance (zero setup). For the professor's local review, a `docker-compose.yml` with the same schema is provided.

---

### Level 3: Component Diagram (API Server)
The internal component structure of the monolith API Server, showing how business logic is organized into focused modules.

```mermaid
C4Component
    title Level 3: Component Diagram — API Server (Node.js/Express)

    Container_Boundary(api_container, "API Server") {
        Component(router, "Express Router", "Middleware", "Routes incoming HTTP requests to the appropriate controller based on URL path.")
        Component(auth_controller, "Auth Controller", "Controller", "Handles user registration, login, password encryption, and admin user management (block/disable).")
        Component(court_controller, "Court & Search Controller", "Controller", "Manages court CRUD for admins. Handles search by name, distance, and price for customers.")
        Component(booking_controller, "Booking Controller", "Controller", "Manages reservations, cancellations, equipment rentals, and waitlist logic.")
        Component(review_controller, "Review Controller", "Controller", "Handles star ratings (1-5) and comment submissions. Computes average ratings.")
        Component(payment_service, "Payment Service", "Stripe SDK", "Processes credit card/bank payments via Stripe Charges API and handles full refund requests via Stripe Refunds API.")
        Component(notification_service, "Notification Service", "Nodemailer", "Triggers email alerts via SMTP when a waitlisted court becomes available.")
        Component(data_access, "Data Access Layer", "Prisma / pg", "Centralized database interaction. Enforces encryption for sensitive fields (passwords, credit card tokens).")
    }

    ContainerDb(db, "PostgreSQL Database", "Persistent storage for all entities")
    System_Ext(payment_ext, "Stripe API", "stripe.com")
    System_Ext(notification_ext, "SMTP Server", "Gmail / Mailtrap")
    System_Ext(map_ext, "Google Maps API", "maps.googleapis.com")

    Rel(router, auth_controller, "/api/auth/*")
    Rel(router, court_controller, "/api/courts/*")
    Rel(router, booking_controller, "/api/bookings/*")
    Rel(router, review_controller, "/api/reviews/*")

    Rel(auth_controller, data_access, "User CRUD + encryption")
    Rel(court_controller, data_access, "Court CRUD + indexed search")
    Rel(court_controller, map_ext, "Distance Matrix API call")
    Rel(booking_controller, data_access, "Booking + waitlist + equipment")
    Rel(booking_controller, payment_service, "Payment/refund flow")
    Rel(booking_controller, notification_service, "Waitlist alerts")
    Rel(review_controller, data_access, "Review CRUD")
    Rel(payment_service, payment_ext, "stripe.charges.create() / stripe.refunds.create()")
    Rel(notification_service, notification_ext, "nodemailer.sendMail()")
    Rel(data_access, db, "SQL queries")
```

**Design Rationale:**
*   **Controller-per-Feature:** Each controller maps to a core functional requirement (Auth, Courts/Search, Bookings, Reviews), making the codebase easy to navigate and test independently.
*   **Centralized Data Access Layer:** All database interactions go through a single layer that enforces encryption for sensitive data (passwords via bcrypt, credit card tokens). This satisfies the Security requirement while keeping the code DRY.
*   **Decoupled Payment & Notification Services:** **Stripe SDK** for payments and **Nodemailer** for email notifications are isolated into dedicated service modules. This means the booking logic can be tested without hitting external APIs, and the services can be swapped (e.g., Stripe → Omise, Gmail SMTP → SendGrid) without touching business logic.
*   **Waitlist Flow:** When a booking is cancelled, the Booking Controller checks the waitlist. If users are waiting, it triggers the Notification Service to alert the next user in the queue — fulfilling the waitlist requirement.

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
    participant DB as PostgreSQL
    participant Map as Google Maps API
    participant Pay as Stripe

    User->>UI: Opens search page, enters location and filters
    UI->>API: GET /api/courts/search?lat=13.7&lng=100.5&radius=10km&maxPrice=200
    API->>Map: GET /distancematrix (user GPS → court locations)
    Map-->>API: Returns distance data (km)
    API->>DB: SELECT courts WHERE distance <= 10km AND price <= 200 (Indexed query)
    DB-->>API: Returns matching courts with avg ratings
    API-->>UI: JSON response (court list + ratings)
    UI-->>User: Displays courts with ratings and distances (< 2s)

    User->>UI: Selects court, picks 2h slot, adds shuttlecocks → Clicks "Book & Pay"
    UI->>API: POST /api/bookings {court_id, start, duration: 2h, equipment: ["shuttlecock"]}
    API->>DB: Check slot availability (SELECT FOR UPDATE — prevents double booking)
    DB-->>API: Slot is available
    API->>Pay: stripe.charges.create({ amount, currency: 'thb', source: token })
    Pay-->>API: Charge succeeded (ch_xxx)
    API->>DB: INSERT booking + equipment rental (atomic transaction)
    DB-->>API: Saved
    API-->>UI: 201 Created — Booking confirmed
    UI-->>User: Shows confirmation with booking details
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

