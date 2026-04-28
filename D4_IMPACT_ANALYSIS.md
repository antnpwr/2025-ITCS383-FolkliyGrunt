# D4: Impact Analysis

Code: ITCS383  
Name: Software Construction and Evolution  
Updated date: 28 April 2026  
Doc: Project Phase 2 Description  
Version: 1.1.0

## Scope

This impact analysis covers the two requested enhancements:

1. Community Matchmaking (Community Feed + Auto-Join until full)
2. Membership Discount System (199 THB subscription and 150 THB/hour member court rate)

The assignment text mentions three new features. In this deliverable, the third scope is treated as cross-cutting quality hardening from preventive CRs (data integrity, idempotency, regression guards), because those changes are required for stable rollout of both requested features.

## 1) Full Traceability Graph

The graph below connects Features -> Design Containers -> Code Modules -> Test Sets.

```mermaid
flowchart LR
  subgraph F[Features]
    F1[Feature 1: Community Matchmaking]
    F2[Feature 2: Membership Discount]
    F3[Feature 3: Cross-cutting Quality Hardening]
  end

  subgraph D[Design Containers]
    D1[Web UI Container]
    D2[API Server Container]
    D3[PostgreSQL Database Container]
  end

  subgraph C[Code Modules]
    C1[frontend/pages/community.html NEW]
    C2[frontend/pages/membership.html NEW]
    C3[frontend/js/app.js]
    C4[backend/routes/community.js NEW]
    C5[backend/controllers/communityController.js NEW]
    C6[backend/models/Party.js NEW]
    C7[backend/models/PartyParticipant.js NEW]
    C8[backend/routes/bookings.js]
    C9[backend/controllers/bookingController.js]
    C10[backend/models/Booking.js]
    C11[backend/models/Profile.js]
    C12[backend/services/paymentService.js]
    C13[backend/middleware/authMiddleware.js]
    C14[backend/database/schema.sql]
    C15[backend/server.js]
    C16[backend/routes/payments.js]
  end

  subgraph T[Test Sets]
    T1[backend/tests/communityController.test.js NEW]
    T2[backend/tests/party.test.js NEW]
    T3[backend/tests/bookings.test.js]
    T4[backend/tests/bookingController.test.js]
    T5[backend/tests/payments.test.js]
    T6[backend/tests/paymentService.test.js]
    T7[backend/tests/membership.test.js]
    T8[backend/tests/auth.test.js]
  end

  F1 --> D1
  F1 --> D2
  F1 --> D3

  F2 --> D1
  F2 --> D2
  F2 --> D3

  F3 --> D2
  F3 --> D3

  D1 --> C1
  D1 --> C2
  D1 --> C3

  D2 --> C4
  D2 --> C5
  D2 --> C8
  D2 --> C9
  D2 --> C12
  D2 --> C13
  D2 --> C15
  D2 --> C16

  D3 --> C6
  D3 --> C7
  D3 --> C10
  D3 --> C11
  D3 --> C14

  C4 --> T1
  C5 --> T1
  C6 --> T2
  C7 --> T2
  C9 --> T4
  C10 --> T3
  C12 --> T6
  C16 --> T5
  C11 --> T7
  C13 --> T8
```

## 2) Affected-Only Traceability Graph

This version shows only the artifacts impacted by CR-01 to CR-08.

```mermaid
flowchart LR
  CR1[CR-01] --> A1[communityController join logic NEW]
  CR1 --> A2[PartyParticipant model NEW]
  CR1 --> A3[schema.sql: party_participants uniqueness/constraints]

  CR2[CR-02] --> B1[bookingController pricing path]
  CR2 --> B2[paymentService amount handling]
  CR2 --> B3[bookings tests]

  CR3[CR-03] --> C1[community route/controller/models NEW]
  CR3 --> C2[community.html NEW]

  CR4[CR-04] --> D1[Profile model membership fields]
  CR4 --> D2[authController subscribe/status endpoints]
  CR4 --> D3[schema.sql: membership columns]
  CR4 --> D4[membership.html NEW]

  CR5[CR-05] --> E1[community feed UI filters]
  CR5 --> E2[frontend app integration]

  CR6[CR-06] --> F1[booking checkout UI]
  CR6 --> F2[bookingController pricing response payload]

  CR7[CR-07] --> G1[schema indexes and checks]
  CR7 --> G2[idempotent join API behavior]

  CR8[CR-08] --> H1[membership and pricing regression tests]
  CR8 --> H2[controller/service logging]

  A1 --> T1[communityController tests NEW]
  A2 --> T2[party tests NEW]
  B1 --> T3[bookingController tests]
  B2 --> T4[paymentService tests]
  D1 --> T5[membership tests]
```

## 3) SLO Directed Graph (Code Modules Only)

Each node below is an SLO (software lifecycle object) at the module level.

```mermaid
flowchart LR
  J[frontend community/membership/checkout UI]
  A[routes/community.js NEW]
  I[middleware/authMiddleware.js]
  B[controllers/communityController.js NEW]
  C[models/Party.js NEW]
  D[models/PartyParticipant.js NEW]
  E[controllers/bookingController.js]
  F[models/Booking.js]
  G[models/Profile.js]
  H[services/paymentService.js]
  K[controllers/authController.js]

  J --> A
  J --> E
  J --> K
  A --> I
  A --> B
  B --> C
  B --> D
  E --> F
  E --> G
  E --> H
  K --> G
  K --> H
```

## 4) Connectivity Matrix with Distances

Distance meaning:

- 0 = same node
- positive integer = shortest directed path length
- INF = no directed path

Node legend:

- J: frontend community/membership/checkout UI
- A: routes/community.js NEW
- I: middleware/authMiddleware.js
- B: controllers/communityController.js NEW
- C: models/Party.js NEW
- D: models/PartyParticipant.js NEW
- E: controllers/bookingController.js
- F: models/Booking.js
- G: models/Profile.js
- H: services/paymentService.js
- K: controllers/authController.js

| From\To |   J |   A |   I |   B |   C |   D |   E |   F |   G |   H |   K |
| -------- | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: |
| J        |   0 |   1 |   2 |   2 |   3 |   3 |   1 |   2 |   2 |   2 |   1 |
| A        | INF |   0 |   1 |   1 |   2 |   2 | INF | INF | INF | INF | INF |
| I        | INF | INF |   0 | INF | INF | INF | INF | INF | INF | INF | INF |
| B        | INF | INF | INF |   0 |   1 |   1 | INF | INF | INF | INF | INF |
| C        | INF | INF | INF | INF |   0 | INF | INF | INF | INF | INF | INF |
| D        | INF | INF | INF | INF | INF |   0 | INF | INF | INF | INF | INF |
| E        | INF | INF | INF | INF | INF | INF |   0 |   1 |   1 |   1 | INF |
| F        | INF | INF | INF | INF | INF | INF | INF |   0 | INF | INF | INF |
| G        | INF | INF | INF | INF | INF | INF | INF | INF |   0 | INF | INF |
| H        | INF | INF | INF | INF | INF | INF | INF | INF | INF |   0 | INF |
| K        | INF | INF | INF | INF | INF | INF | INF | INF |   1 |   1 |   0 |

## 5) Change Difficulty Assessment

### Which change requests are easy to apply and why?

1. CR-06 (Perfective checkout transparency): Mostly presentation-level updates in booking response and frontend summary rendering, low architectural risk.
2. CR-05 (Perfective feed usability): Primarily frontend enhancements (filters, badges, counters) after base feed API exists.
3. CR-08 (Preventive tests and logging): Incremental extension of existing test and log patterns in the codebase.

### Which change requests are difficult to apply and why?

1. CR-03 (Adaptive Community Matchmaking foundation): Introduces new domain entities and API surface, requiring schema, route, controller, and UI integration.
2. CR-04 (Adaptive membership lifecycle): Requires precise status semantics (active/expired/renewal) and consistency across authentication/profile/booking boundaries.
3. CR-01 (Corrective concurrency safety): Race conditions require transactional logic and robust concurrency test design.
4. CR-07 (Preventive data integrity and idempotency): Must align DB constraints with API behavior and avoid false positives during retries.

### To make maintenance easier, what is expected from previous developers?

1. Stable module contracts: clear request/response schemas for booking, payment, and profile endpoints.
2. Schema migration history: versioned SQL migrations instead of only a single schema snapshot.
3. Explicit business rule documentation: pricing rules, membership edge cases, and seat allocation semantics.
4. Better observability baseline: structured logs and consistent error codes across controllers.
5. Seed and test data fixtures: deterministic datasets for concurrency and pricing regression tests.
6. Cross-module ownership notes: identify maintainers and integration boundaries for each package.
