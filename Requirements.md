# Project Phase 1 Description & Full Requirements

---

**Course:** ITCS383 Software Construction and Evolution
**Theme:** Construction, Quality, and DevOps Automation
**Due:** March 11, 2026, 23:55 (based on the commit time on GitHub)
**Presentation:** March 12, 2026, in class

## 1. Executive Summary

Phase 1 (Building the Foundation) aims for the development team to build a working software system from scratch and deliver version v1.0. This phase focuses on transforming requirements into a functional system with integrated quality control and DevOps automation.

For this project, the team will develop a **Badminton Court Management System mobile application**. It is a platform that connects general users with court administrators. The system covers searching for courts, booking timeslots, making payments, and providing evaluations. It prioritizes high-quality code, concurrency support for a large number of users, data security, and a standardized project structure.

---

## 2. Detailed Analysis of Key Themes & Full Requirements

To align with software engineering principles, the team has analyzed the requirements and divided the system into the following sections:

### Functional Requirements

#### 2.1 Administrative Management

*   **Court Registration:** Administrators can record location details, operating hours, hourly rental rates (categorized by court type), and specify the types of shoes allowed on the court.
*   **Status Updates:** Ability to update court status in real-time, such as marking a court as under renovation or indicating damaged courts/equipment.
*   **User Management:** Administrators have the authority to manage user accounts. If inappropriate behavior is detected, they can block or disable that customer's login access.

#### 2.2 User Experience & Functionality

*   **Membership and Login:** Users must register with their name and address, and they can save credit card information in the system. Login processes must enforce strong passwords.
*   **Advanced Search and Filtering:**
    *   Search by **court name**.
    *   Search by **distance** (e.g., within a 1km, 2km, or 10km radius from the user's GPS location).
    *   Search by **price range** (e.g., 100 or 200 THB per hour).
*   **Booking and Waitlist (Notifications):**
    *   Users can select a court and **specify the desired playing duration** (e.g., 1 hour, 2 hours).
    *   If the desired court is occupied, users can submit a request (waitlist). When a timeslot becomes available, the system will instantly send a mobile notification to the user.
*   **Equipment Booking:** Users can pre-book or rent **badminton rackets** or **shuttlecocks**.

#### 2.3 Financial Transactions

*   **Payment Methods:** The system must support payments via credit card and banking transfers.
*   **Cancellation Policy:** Users can cancel their booking and receive a full refund, provided the playing time has not yet started.

#### 2.4 Feedback & Social Proof

*   **Rating and Review System:** After completing their session, users can leave a rating (1-5 stars) and write comments/reviews.
*   **Viewing Reviews:** Other users can view the average rating of the courts and read reviews to aid in their decision-making before booking.

### 2.5 Non-Functional Requirements (Technical & Quality Requirements)

*   **Concurrency:** The system must support up to 1,000 concurrent users at the same time.
*   **Performance:** Processing and displaying search results must take **no longer than 2 seconds**.
*   **Security:** Personal data data (name, address, credit card info) must be encrypted and transmitted securely.
*   **Localization:** Must support 3 languages: Thai, English, and Chinese.
*   **UI/UX:** The user interface must be aesthetically pleasing, intuitive, and provide a seamless user experience.

---

## 3. Deliverables & Grading Criteria

The team must develop the system and push the source code to the team's GitHub Repository. There are 4 deliverables required:

*   **D1: Design Models and Design Rationale (13%)**
    *   Must create C4 Diagrams (must include Context, Container, and Component diagrams at a minimum).
    *   Can include other diagrams such as Use Case, DFD, or Class Diagram where appropriate.
    *   Must include a design justification explaining how the models fulfill the requirements.
    *   *Storage location:* `designs/<groupname>_D1_Design.md`
*   **D2: Functional Service v1.0 (50%)**
    *   Working source code and project structure, stored in the `implementations/` folder.
    *   A `README.md` file located at the project root must clearly document the Setup instructions, Build commands, Run commands, and usage examples.
*   **D3: AI Usage Log (7%)**
    *   A transparent log of AI usage (including Prompts used, accepted/rejected outputs, and methods used to verify code correctness).
    *   *Storage location:* `<groupname>_D3_AILog.md` at the project root.
*   **D4: Quality Evidence Report (22% including DevOps and Testing)**
    *   Evidence from SonarQube/SonarCloud demonstrating that the project passes the Quality Gate.
    *   There must be no Critical or Blocker issues, low Code Duplication, and Unit Tests covering core application logic.
    *   Integration of GitHub Actions for Automated Build and Testing.
    *   *Storage location:* `<groupname>_D4_QualityReport.md` at the project root.
