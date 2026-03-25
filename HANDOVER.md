# Features

## Authentication & Profiles  
- Secure user management powered by Supabase Auth.  
- Users can register as either **customers** or **staff**.  
- During registration, users must provide their full name, email, password, and address.  
- After completing the required fields, users can choose their account type (customer or staff).  
- For login, users must enter a valid email and password.  


## Search  
- Dynamic search functionality based on **court name**, **distance** (using Haversine formula and OpenStreetMap Geocoding), and **maximum price**.  
- It provide a **Explore on Map** that allow users to find courts near their location.
- Search results display a list of available badminton courts, along with a **“Show All”** option.  
- Each court listing includes:
  - Court name  
  - Opening and closing hours  
  - Shoe requirements  
  - Star rating  
  - Price (THB per hour)  
- Each court also provides a **“View Details”** option, which displays:
  - Location with an embedded map  
  - User reviews  
  - A **“Book This Court”** button  


## Court Booking  
- Supports secure and concurrent time-slot reservations with optional equipment rentals (rackets, shuttlecocks, shoes).  
- Users can:
  - Select a court  
  - Choose a time slot  
  - Add equipment rentals  
- Booking form includes:
  - Court (pre-selected when booking from the court page)  
  - Time slot (MM/DD/YYYY HH:MM)  
  - Duration (1–3 hours)  
  - Payment method (credit card, bank transfer, PromptPay)  
  - Equipment rental options  
- The system displays a cost breakdown:
  - Court fee  
  - Equipment rental cost  
  - Total amount  
- Users can proceed with **“Pay Now”** to confirm the booking.  
- Users can access their reservations via the **“My Bookings”** page.  


## Equipment Rentals
- User can rent for badminton equipments such as racket (฿50), shuttlecock pack (฿30), and shoes (฿40) in advanced.
- User can aslo put in the amount for each equipment.
- There is a "Add Equipment" button to add more than one equipment rental.


## Waitlists  
- Automated FIFO (First-In, First-Out) waitlist system.  
- Email notifications (via Nodemailer) are sent when a slot becomes available due to cancellations.  


## Reviews  
- Verified review system to ensure authenticity.  
- Court ratings are dynamically recalculated upon new review submissions.  


## Language Support
- The system support multiple langauges, inlcuding Thai, English, and Chinese language.

---  

# Design Verification Results  

## Updated C4 Diagram  

### Level 3: Component Diagram (API Server)
The internal component structure of the monolith API Server, showing how business logic is organized into focused modules.

```mermaid
C4Component
    title Level 3: Component Diagram — API Server (Node.js/Express)

    Container_Boundary(api_container, "API Server") {
        Component(router, "Express Router", "Middleware", "Routes incoming HTTP requests to the appropriate controller based on URL path.")
        Component(auth_controller, "Auth Controller", "Controller", "Handles user registration and login via Supabase Auth SDK. Manages admin user blocking/disabling.")
        Component(court_controller, "Court & Search Controller", "Controller", "Manages court CRUD for admins. Handles search by name, distance, and price for customers.")
        Component(booking_controller, "Booking Controller", "Controller", "Manages reservations, cancellations, and equipment rentals.")
        Component(waitlist_controller, "Waitlist Controller", "Controller", "Manages waitlist entries, notifications, and confirming waitlist bookings with payment.")
        Component(review_controller, "Review Controller", "Controller", "Handles star ratings (1-5) and comment submissions. Computes average ratings.")
        Component(payment_service, "Payment Service", "Stripe SDK", "Processes credit card Checkout Sessions, Intents, and refunds. Simulates bank transfers.")
        Component(notification_service, "Notification Service", "Nodemailer", "Triggers email alerts via SMTP when a waitlisted court becomes available.")
        Component(data_access, "Data Access Layer", "pg", "Centralized database interaction using the pg package.")
    }

    ContainerDb(db, "PostgreSQL Database", "Persistent storage for all entities")
    System_Ext(payment_ext, "Stripe API", "stripe.com")
    System_Ext(notification_ext, "SMTP Server", "Gmail / Mailtrap")
    System_Ext(map_ext, "OpenStreetMap Nominatim", "nominatim.openstreetmap.org")
    System_Ext(auth_ext, "Supabase Auth", "supabase.co/auth")

    Rel(router, auth_controller, "Routes authentication requests")
    Rel(router, court_controller, "Routes court search and management requests")
    Rel(router, booking_controller, "Routes booking operations")
    Rel(router, waitlist_controller, "Routes waitlist operations")
    Rel(router, review_controller, "Routes review operations")

    Rel(auth_controller, auth_ext, "supabase.auth.signUp() / signInWithPassword()")
    Rel(auth_controller, data_access, "User profile CRUD (address, language, credit card)")
    Rel(court_controller, data_access, "Court CRUD + indexed search")
    Rel(court_controller, map_ext, "Nominatim geocoding API call")
    Rel(booking_controller, data_access, "Booking + waitlist + equipment")
    Rel(booking_controller, payment_service, "Payment/refund flow")
    Rel(booking_controller, notification_service, "Waitlist alerts")
    Rel(review_controller, data_access, "Review CRUD")
    Rel(payment_service, payment_ext, "stripe.charges.create() / stripe.refunds.create()")
    Rel(notification_service, notification_ext, "nodemailer.sendMail()")
    Rel(data_access, db, "SQL queries")
```

### Level 4: Code Diagram (Data Access Layer)
The code-level view zooms into the **Data Access Layer** component from Level 3, showing the class structure and relationships between data models that map directly to the database tables.

```mermaid
classDiagram
    direction LR

    class UserModel {
        +UUID id
        +UUID auth_id
        +String full_name
        +String address
        +String role
        +Boolean is_disabled
        +String credit_card_token
        +String language_preference
        +DateTime created_at

        +register(data) User
        +login(email, password) Token
        +getProfile(authId) User
        +updateDisabledStatus(authId, isDisabled) User
        +findAll() User[]

        -validateUserData(data)
    }

    class CourtModel {
        +UUID id
        +String name
        +Decimal location_lat
        +Decimal location_lng
        +Decimal price_per_hour
        +String allowed_shoes
        +String current_status
        +Time opening_time
        +Time closing_time
        +Decimal average_rating
        +Int total_reviews
        +DateTime created_at

        +create(data) Court
        +findAll() Court[]
        +findAllIncludingInactive() Court[]
        +findById(courtId) Court
        +searchByName(name) Court[]
        +searchByDistance(lat, lng, radiusKm) Court[]
        +searchByPrice(maxPrice) Court[]
        +update(courtId, data) Court
        +updateStatus(courtId, status) Court

        -validateCourtData(data)
        -calculateDistance(lat, lng)
    }

    class BookingModel {
        +UUID id
        +UUID user_id
        +UUID court_id
        +DateTime start_time
        +DateTime end_time
        +Decimal total_amount
        +String booking_status
        +String payment_method
        +String transaction_id
        +DateTime created_at

        +create(data) Booking
        +cancel(bookingId, userId) Booking
        +findByUser(userId) Booking[]
        +checkAvailability(courtId, startTime, endTime) Boolean
        +updateTransactionId(bookingId, transactionId) Booking
        +findByCourtAndDate(courtId, date) DateTime[]

        -lockTimeslot()
        -validateTimeRange(start_time, end_time)
    }

    class EquipmentRentalModel {
        +UUID id
        +UUID booking_id
        +String equipment_type
        +Int quantity
        +Decimal unit_price

        +addToBooking(bookingId, items) EquipmentRental[]
        +findByBooking(bookingId) EquipmentRental[]

        -validateItems(items)
        -calculateTotal(items)
    }

    class ReviewModel {
        +UUID id
        +UUID user_id
        +UUID court_id
        +Int rating
        +String comment_text
        +DateTime created_at

        +create(data) Review
        +findByCourtId(courtId) Review[]
        +getAverageRating(courtId) Object
        +findByUser(userId) Review[]

        -validateRating(rating)
        -checkDuplicateReview(user_id, court_id)
        -checkUserEligibility(user_id, court_id)
    }

    class WaitlistModel {
        +UUID id
        +UUID user_id
        +UUID court_id
        +Date requested_date
        +String preferred_time_slot
        +String status
        +DateTime created_at

        +add(data) Waitlist
        +getNextInQueue(courtId) Waitlist
        +updateStatus(id, status) Waitlist
        +markNotified(waitlistId) Waitlist
        +findByUser(userId) Waitlist[]
        +expireOldEntries() Waitlist[]
        +remove(id, userId) Waitlist

        -validateWaitlistData(data)
        -parseTimeSlot(slot)
    }

    UserModel "1" --> "*" BookingModel : places
    UserModel "1" --> "*" ReviewModel : writes
    UserModel "1" --> "*" WaitlistModel : joins
    CourtModel "1" --> "*" BookingModel : booked_for
    CourtModel "1" --> "*" ReviewModel : receives
    CourtModel "1" --> "*" WaitlistModel : waited_for
    BookingModel "1" --> "*" EquipmentRentalModel : includes
```

---

# Reflection Report  

## Technologies Used  

| Layer              | Technology                                                        |
|--------------------|-------------------------------------------------------------------|
| Frontend           | HTML, CSS, JavaScript (served via Express)               |
| Backend            | Node.js with Express.js (Monolithic Architecture)                |
| Database           | PostgreSQL (hosted on Supabase) with `pg`                        |
| Authentication     | Supabase Auth                                                    |
| API & Server       | REST API via Express.js                                          |
| Search & Geolocation | Haversine Formula + OpenStreetMap Geocoding                   |
| Payment            | Stripe                                                           |
| Email/Notifications| Nodemailer (SMTP via Mailtrap)                                   |
| Testing            | Jest, Supertest                                                  |
| Security           | Helmet, CORS                                                     |

---

## Required Information  

### Setup Requirements  
- **Node.js**: v20 LTS recommended  
- **npm**: Node package manager  
- **Supabase Account**: Use the provided remote project configuration  

---

### Environment Variables  
Create a `.env` file in the `implementations` directory and configure it with your Supabase and external API credentials:

```env
PORT=8080

DB_USER=...
DB_HOST=...
DB_NAME=postgres
DB_PASS=...
DB_PORT=5432

SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
```

### Build Instructions  

1. Navigate to the implementation folder:
```bash
cd implementations
```

2. Install dependencies:
```bash
npm install
```

---

### Run Commands  

- **Development Mode** (with hot reload):
```bash
npm run dev
```

- **Production Mode**:
```bash
npm start
```

- **Run Tests**:
```bash
npm test
```

---

## Code Quality  
![alt text](picture/image.png)
![alt text](picture/image2.png)

### Code quality analysis 
Comparing our new SonarQube analysis, we noticed that the project has no blocker issues but there are a few high severity issues.  
The analysis shows the distribution of issues based on severity levels:
- Blocker: 0
- High: 14
- Medium: 61
- Low: 53
- Info: 0  
  
The overall code have:
- Security issues: 0
- Reliability issues: 50
- Maintainability issues: 81
- Accepted issues: 0
- Coverage: 56.6%
- Duplication: 0.9%
- Security hotspots: 32
