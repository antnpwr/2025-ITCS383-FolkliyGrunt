# Design Models and Design Rationale (Deliverable D1)

This document describes the software architecture of the **Badminton Court Management System** based on the project requirements. It includes C4 Model diagrams (Context, Container, Component), a Sequence Diagram for a core demo case, and an Entity Relationship (ER) Diagram to illustrate the system structure.

---

## 1. C4 Diagrams

### Level 1: System Context Diagram
An overview showing the relationship between the main system, users (Customer & Admin), and external systems.

```mermaid
C4Context
    title Level 1: System Context Diagram for Badminton Court Management System

    Person(customer, "Customer / User", "General user who searches for courts, makes bookings, and processes payments.")
    Person(admin, "Court Administrator", "System administrator managing courts and users.")
    
    System(bms, "Badminton Court Management System", "The core system for booking and managing badminton courts.")
    
    System_Ext(payment_sys, "Payment Gateway", "External service for processing payments (Credit Card, Bank Transfer).")
    System_Ext(notification_sys, "Notification System", "External service for sending notifications (SMS/Push Notification).")
    System_Ext(map_sys, "Map / Location Service", "External service (GPS) for calculating user-to-court distances.")

    Rel(customer, bms, "Searches courts, books timeslots, pays, and leaves reviews", "Mobile App / Web")
    Rel(admin, bms, "Manages court information, statuses, and user accounts", "Web Dashboard")
    
    Rel(bms, payment_sys, "Sends payment information and refund requests", "API")
    Rel(bms, notification_sys, "Triggers waitlist availability notifications to users", "API")
    Rel(bms, map_sys, "Sends GPS coordinates to calculate distances", "API")
```

**Design Rationale:**
*   **Separation of External Systems (Third-Party Services):** Map Services (for calculating 1km, 2km, and 10km radii), Notification Systems (for the waitlist feature), and the Payment Gateway are all integrated via external APIs. This reduces the load on the core system and avoids the liabilities of directly storing sensitive credit card information, satisfying the system's strict Security Requirements.

---

### Level 2: Container Diagram
The container-level architecture shows the high-level technology stack and components designed to support up to 1,000 concurrent users.

```mermaid
C4Container
    title Level 2: Container Diagram for Badminton Court Management System

    Person(customer, "Customer", "General User")
    Person(admin, "Court Administrator", "System Admin")

    System_Boundary(bms, "Badminton Court Management System") {
        Container(mobile_app, "Mobile Application", "Flutter / React Native", "Mobile app for customers (supports EN, TH, ZH).")
        Container(web_admin, "Web Dashboard", "React / Vue", "Web application for administrators to manage the system.")
        
        Container(load_balancer, "Load Balancer & API Gateway", "Nginx / Spring Cloud Gateway", "Distributes incoming traffic to support 1,000 concurrent users.")
        
        Container(user_service, "User Service", "Spring Boot", "Manages customer and admin accounts, and handles data encryption.")
        Container(court_service, "Court Service", "Spring Boot", "Manages venue data, operating hours, and search functionalities.")
        Container(booking_service, "Booking Service", "Spring Boot", "Handles reservations, waitlists, and equipment rentals.")
        
        ContainerDb(db, "Primary Database", "PostgreSQL", "Securely stores Users, Courts, Bookings, and Reviews data.")
        ContainerDb(cache, "Cache System", "Redis", "Caches court search results to ensure response times are under 2 seconds.")
    }

    System_Ext(payment_sys, "Payment Gateway", "Stripe / Omise")
    System_Ext(map_sys, "Map Service", "Google Maps API")
    System_Ext(notification_sys, "Notification System", "Firebase Cloud Messaging")

    Rel(customer, mobile_app, "Searches, books, pays, and reviews", "HTTPS")
    Rel(admin, web_admin, "Updates courts, changes statuses, manages users", "HTTPS")
    
    Rel(mobile_app, load_balancer, "Makes API calls")
    Rel(web_admin, load_balancer, "Makes API calls")
    
    Rel(load_balancer, user_service, "Routes user-related requests")
    Rel(load_balancer, court_service, "Routes court-related and search requests")
    Rel(load_balancer, booking_service, "Routes booking-related requests")
    
    Rel(court_service, map_sys, "Requests distance/coordinate calculations")
    Rel(booking_service, payment_sys, "Processes payments and refunds")
    Rel(booking_service, notification_sys, "Sends waitlist notifications")
    
    Rel(user_service, db, "Reads/Writes user data")
    Rel(court_service, db, "Reads/Writes court data")
    Rel(booking_service, db, "Reads/Writes booking and review data")
    
    Rel(court_service, cache, "Fetches cached data for search functionalities")
```

**Design Rationale:**
*   **Microservices-lite Architecture & Load Balancing:** Decomposing the backend into 3 main services (User, Court, Booking) behind a Load Balancer ensures the system can handle massive peaks in traffic. This fulfills the Non-Functional Requirement of supporting 1,000 concurrent users.
*   **Redis Caching:** For the advanced search features (name, distance, price range), repeatedly querying the database is slow. Implementing Redis Cache between the services guarantees that search processing and displaying results take **no longer than 2 seconds** (Performance Requirement).
*   **Localization Support:** The Mobile App container is structurally planned to support 3 languages (TH, EN, ZH) as per the requirements.

---

### Level 3: Component Diagram (Booking Service)
The internal component structure of the core Booking Service.

```mermaid
C4Component
    title Level 3: Component Diagram for Booking Service

    Container_Boundary(booking_service_container, "Booking Service") {
        Component(booking_controller, "Booking Controller", "REST Controller", "Receives HTTP requests for creating or canceling bookings.")
        Component(waitlist_controller, "Waitlist Controller", "REST Controller", "Receives HTTP requests for waitlist submissions.")
        
        Component(booking_manager, "Booking Manager", "Business Logic Service", "Validates availability, books slots/equipment, and calculates totals.")
        Component(waitlist_manager, "Waitlist Manager", "Business Logic Service", "Monitors queues and triggers the Notification System upon availability.")
        Component(payment_handler, "Payment Handler", "Service", "Manages payment sessions and the Cancellation (refund) policy.")
        
        Component(booking_repo, "Booking Repository", "Data Access", "Connects to and executes queries against the database.")
    }

    ContainerDb(db, "Primary Database", "PostgreSQL", "Bookings and Equipment tables")
    Container(load_balancer, "API Gateway", "Nginx", "Entry point to the subsystem")
    System_Ext(payment_sys, "Payment Gateway", "Stripe API")
    System_Ext(notification_sys, "Notification System", "FCM")

    Rel(load_balancer, booking_controller, "POST /bookings, DELETE /bookings")
    Rel(load_balancer, waitlist_controller, "POST /waitlist")
    
    Rel(booking_controller, booking_manager, "Initiates the booking flow")
    Rel(waitlist_controller, waitlist_manager, "Initiates the waitlist queue request")
    
    Rel(booking_manager, payment_handler, "Requests financial transaction processing")
    Rel(payment_handler, payment_sys, "Sends payment details or full refund requests")
    
    Rel(waitlist_manager, notification_sys, "Sends push notifications directly to the user's mobile app")
    
    Rel(booking_manager, booking_repo, "Saves and updates booking statuses")
    Rel(waitlist_manager, booking_repo, "Checks current booking statuses")
    Rel(booking_repo, db, "Reads / Writes to storage")
```

**Design Rationale:**
*   **Decoupled Waitlist & Payment Modules:** The Waitlist is managed by its own dedicated component that monitors court availability. When a reserved court is canceled, this manager immediately triggers a notification through the External Notification System, strictly following the waitlist requirement.
*   **Cancellation Flow:** The Payment Handler specifically accommodates full refunds directly via the external gateway if a user cancels before the play session begins.
*   **Component Boundaries:** Dividing logic into specialized modules makes the code highly modular and maintainable. This also allows modifying the financial calculation component without impacting the core reservation flow.

---

## 2. Sequence Diagram (Demo Case)

A demonstration workflow when a customer searches for a court, selects a timeslot, adds equipment, and successfully completes a credit card payment.

```mermaid
sequenceDiagram
    autonumber
    actor User as Customer
    participant App as Mobile App
    participant GW as API Gateway
    participant CourtS as Court Service
    participant Cache as Redis Cache
    participant BookS as Booking Service
    participant PayS as Payment Gateway
    participant DB as PostgreSQL Database

    User->>App: Provides GPS location and searches courts (Radius/Price)
    App->>GW: GET /api/courts/search?lat=...&lng=...&radius=10km
    GW->>CourtS: Routes search request
    CourtS->>Cache: Checks for cached search results (Ensures < 2s response)
    
    alt Cache Hit
        Cache-->>CourtS: Returns matching court list
    else Cache Miss
        CourtS->>DB: Queries courts and calculates distances (SQL)
        DB-->>CourtS: Returns query results
        CourtS->>Cache: Stores results in Cache for subsequent speed-up
    end
    
    CourtS-->>GW: Returns HTTP 200 OK (Court List)
    GW-->>App: Sends data for presentation
    App-->>User: Displays available courts with average ratings (UI)
    
    User->>App: Selects court, sets 2h duration, adds shuttlecocks -> Clicks 'Book & Pay'
    App->>GW: POST /api/bookings {court_id, duration: 2h, equipment: shuttlecock...}
    GW->>BookS: Initiates new booking creation
    BookS->>PayS: Sends token to process saved credit card payment
    PayS-->>BookS: Returns 'Payment Success' status
    
    BookS->>DB: Commits the booking record to the permanent database
    DB-->>BookS: Saved successfully
    BookS-->>GW: Confirms booking is complete
    GW-->>App: Shows "Booking Confirmed" notification
    App-->>User: User sees the upcoming reservation in their history
```

**Design Rationale:**
*   **Guaranteed Response Time (Performance Limit):** The workflow prioritizes retrieving search results from the Redis cache. This prevents database bottlenecks, ensuring that even with massive concurrent usage, the search returns results extremely quickly.
*   **Atomic Transactions for Bookings:** The system requires the external payment to succeed before committing the reservation to its own database. This prevents "race conditions" where an unpaid cart permanently blocks an available timeslot.

---

## 3. Entity Relationship Diagram (ER Diagram)

The database schema design for the Badminton Court Management System using a Relational Database.

```mermaid
erDiagram
    USERS {
        UUID id PK
        string full_name
        string address
        string encrypted_password "Security Requirement: Strong encrypted pwd"
        string role "CUSTOMER / ADMIN"
        boolean is_disabled "Admin can flag/block accounts"
        string credit_card_token "Tokenized standard for saved credit cards"
    }

    COURTS {
        UUID id PK
        string name
        decimal location_lat
        decimal location_lng
        decimal price_per_hour "Hourly rate (Supports multiple categories)"
        string condition_allowed_shoes "Permitted footwear rules"
        string current_status "AVAILABLE, RENOVATE, DAMAGED (Real-time updates)"
    }

    BOOKINGS {
        UUID id PK
        UUID user_id FK
        UUID court_id FK
        datetime start_time "Play start time"
        datetime end_time "Play end time (Based on 1h/2h duration)"
        decimal total_amount
        string booking_status "CONFIRMED, CANCELLED, WAITLIST"
    }

    EQUIPMENT_RENTAL {
        UUID id PK
        UUID booking_id FK
        string equipment_type "RACKET, SHUTTLECOCK"
        int quantity
    }

    REVIEWS {
        UUID id PK
        UUID user_id FK
        UUID court_id FK
        int rating "1 to 5 (Star rating)"
        string comment_text
    }

    USERS ||--o{ BOOKINGS : "makes multiple"
    USERS ||--o{ REVIEWS : "writes"
    COURTS ||--o{ BOOKINGS : "is booked for"
    COURTS ||--o{ REVIEWS : "receives"
    BOOKINGS ||--o{ EQUIPMENT_RENTAL : "includes"
```

**Design Rationale:**
*   **`is_disabled` in USERS:** Fulfills the requirement giving Administrators the authority to block inappropriate customers from logging into the platform.
*   **`current_status` in COURTS:** Meets the requirement for real-time status updates (e.g., renovations or equipment damage) by admins. This status is actively read by the search service to prevent users from booking unavailable courts.
*   **Normalized EQUIPMENT_RENTAL & REVIEWS tables:** Decoupling optional information keeps the core `BOOKINGS` table as small and performant as possible. This optimization heavily benefits read queries when serving large numbers of concurrent users, while saving storage space.
