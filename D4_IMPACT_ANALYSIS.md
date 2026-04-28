# D4: Impact Analysis

Code: ITCS383  
Name: Software Construction and Evolution  
Updated date: 27 April 2026  
Doc: Project Phase 2 Description  
Version: 1.0.0

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
    C2[frontend/js/app.js]
    C3[backend/routes/community.js NEW]
    C4[backend/controllers/communityController.js NEW]
    C5[backend/models/Party.js NEW]
    C6[backend/models/PartyJoin.js NEW]
    C7[backend/routes/bookings.js]
    C8[backend/controllers/bookingController.js]
    C9[backend/models/Booking.js]
    C10[backend/models/Profile.js]
    C11[backend/services/paymentService.js]
    C12[backend/middleware/authMiddleware.js]
    C13[backend/database/schema.sql]
    C14[backend/server.js]
    C15[backend/routes/payments.js]
  end

  subgraph T[Test Sets]
    T1[backend/tests/community.test.js NEW]
    T2[backend/tests/communityController.test.js NEW]
    T3[backend/tests/bookings.test.js]
    T4[backend/tests/bookingController.test.js]
    T5[backend/tests/payments.test.js]
    T6[backend/tests/paymentService.test.js]
    T7[backend/tests/auth.test.js]
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

  D2 --> C3
  D2 --> C4
  D2 --> C7
  D2 --> C8
  D2 --> C11
  D2 --> C12
  D2 --> C14
  D2 --> C15

  D3 --> C5
  D3 --> C6
  D3 --> C9
  D3 --> C10
  D3 --> C13

  C3 --> T1
  C4 --> T2
  C8 --> T4
  C9 --> T3
  C11 --> T6
  C15 --> T5
  C12 --> T7
```

## 2) Affected-Only Traceability Graph

This version shows only the artifacts impacted by CR-01 to CR-08.

```mermaid
flowchart LR
  CR1[CR-01] --> A1[communityController seat-claim logic NEW]
  CR1 --> A2[PartyJoin model NEW]
  CR1 --> A3[schema.sql: party_join uniqueness/constraints]

  CR2[CR-02] --> B1[bookingController pricing path]
  CR2 --> B2[paymentService amount handling]
  CR2 --> B3[bookings tests]

  CR3[CR-03] --> C1[community route/controller/models NEW]
  CR3 --> C2[community.html NEW]

  CR4[CR-04] --> D1[Profile model membership fields]
  CR4 --> D2[auth/profile retrieval path]
  CR4 --> D3[schema.sql: membership columns]

  CR5[CR-05] --> E1[community feed UI filters]
  CR5 --> E2[frontend app integration]

  CR6[CR-06] --> F1[booking checkout UI]
  CR6 --> F2[bookingController response payload]

  CR7[CR-07] --> G1[schema indexes and checks]
  CR7 --> G2[idempotent join API behavior]

  CR8[CR-08] --> H1[pricing regression tests]
  CR8 --> H2[controller/service logging]

  A1 --> T1[community tests NEW]
  B1 --> T2[bookingController tests]
  B2 --> T3[paymentService tests]
  D1 --> T4[auth/profile tests]
```

## 3) SLO Directed Graph (Code Modules Only)

Each node below is an SLO (software lifecycle object) at the module level.

```mermaid
flowchart LR
  J[frontend community/checkout UI]
  A[routes/community.js NEW]
  I[middleware/authMiddleware.js]
  B[controllers/communityController.js NEW]
  C[models/Party.js NEW]
  D[models/PartyJoin.js NEW]
  E[controllers/bookingController.js]
  F[models/Booking.js]
  G[models/Profile.js]
  H[services/paymentService.js]

  J --> A
  J --> E
  A --> I
  A --> B
  B --> C
  B --> D
  E --> F
  E --> G
  E --> H
```

## 4) Connectivity Matrix with Distances

Distance meaning:

- 0 = same node
- positive integer = shortest directed path length
- INF = no directed path

Node legend:

- J: frontend community/checkout UI
- A: routes/community.js NEW
- I: middleware/authMiddleware.js
- B: controllers/communityController.js NEW
- C: models/Party.js NEW
- D: models/PartyJoin.js NEW
- E: controllers/bookingController.js
- F: models/Booking.js
- G: models/Profile.js
- H: services/paymentService.js

| From\\To |   J |   A |   I |   B |   C |   D |   E |   F |   G |   H |
| -------- | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: |
| J        |   0 |   1 |   2 |   2 |   3 |   3 |   1 |   2 |   2 |   2 |
| A        | INF |   0 |   1 |   1 |   2 |   2 | INF | INF | INF | INF |
| I        | INF | INF |   0 | INF | INF | INF | INF | INF | INF | INF |
| B        | INF | INF | INF |   0 |   1 |   1 | INF | INF | INF | INF |
| C        | INF | INF | INF | INF |   0 | INF | INF | INF | INF | INF |
| D        | INF | INF | INF | INF | INF |   0 | INF | INF | INF | INF |
| E        | INF | INF | INF | INF | INF | INF |   0 |   1 |   1 |   1 |
| F        | INF | INF | INF | INF | INF | INF | INF |   0 | INF | INF |
| G        | INF | INF | INF | INF | INF | INF | INF | INF |   0 | INF |
| H        | INF | INF | INF | INF | INF | INF | INF | INF | INF |   0 |

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
   Community Matchmaking is best analyzed as three linked changes:

- Community Feed: publish Party announcements for browsing.
- Auto-Join: allow users to join a Party from the feed.
- Auto-Full: automatically mark a Party as Full when the capacity limit is reached.

The change requests in [D3_CHANGE_REQUESTS.md](D3_CHANGE_REQUESTS.md) map onto the existing application layers and the new Party lifecycle modules that the feature needs.

## 1. Full Traceability Graph

```mermaid
graph LR
  F1[Feature: Community Feed]
  F2[Feature: Auto-Join]
  F3[Feature: Auto-Full]

  CR1[CR-01 Validate Party creation]
  CR2[CR-02 Atomic join + duplicate protection]
  CR3[CR-03 Party and participant schema]
  CR4[CR-04 Community API and service flow]
  CR5[CR-05 Feed search and sort]
  CR6[CR-06 Live capacity badge updates]
  CR7[CR-07 Boundary and concurrency tests]
  CR8[CR-08 Transaction-safe lifecycle refactor]

  subgraph C1[Current backend containers]
    A1[backend/server.js]
    A2[backend/routes/auth.js]
    A3[backend/routes/waitlist.js]
    A4[backend/controllers/waitlistController.js]
    A5[backend/models/Waitlist.js]
    A6[backend/services/notificationService.js]
    A7[backend/middleware/authMiddleware.js]
  end

  subgraph C2[Proposed community containers]
    B1[backend/routes/community.js]
    B2[backend/controllers/communityController.js]
    B3[backend/services/communityService.js]
    B4[backend/models/Party.js]
    B5[backend/models/PartyParticipant.js]
    B6[frontend/pages/community.html]
    B7[frontend/js/community.js]
  end

  subgraph T[Tests]
    T1[tests/communityController.test.js]
    T2[tests/communityService.test.js]
    T3[tests/partyModel.test.js]
    T4[tests/partyParticipant.test.js]
    T5[tests/communityFeed.test.js]
  end

  F1 --> CR1
  F1 --> CR3
  F1 --> CR4
  F1 --> CR5
  F2 --> CR2
  F2 --> CR4
  F2 --> CR7
  F3 --> CR2
  F3 --> CR6
  F3 --> CR8

  CR1 --> B2
  CR1 --> B4
  CR2 --> B2
  CR2 --> B3
  CR2 --> B5
  CR3 --> B4
  CR3 --> B5
  CR4 --> B1
  CR4 --> B2
  CR4 --> B3
  CR5 --> B7
  CR5 --> B6
  CR6 --> B7
  CR6 --> B3
  CR7 --> T1
  CR7 --> T2
  CR7 --> T3
  CR7 --> T4
  CR8 --> B3
  CR8 --> B4
  CR8 --> B5
  CR8 --> A6

  A1 --> A2
  A1 --> A3
  A3 --> A4
  A4 --> A5
  A4 --> A6
  A2 --> A7
  B1 --> B2
  B2 --> B3
  B3 --> B4
  B3 --> B5
  B3 --> A6
  B6 --> B7
  B7 --> B1

  B2 --> T1
  B3 --> T2
  B4 --> T3
  B5 --> T4
  B7 --> T5
```

## 2. Affected-Only Traceability Graph

```mermaid
graph LR
  F1[Community Feed]
  F2[Auto-Join]
  F3[Auto-Full]

  CR1[CR-01]
  CR2[CR-02]
  CR3[CR-03]
  CR4[CR-04]
  CR5[CR-05]
  CR6[CR-06]
  CR7[CR-07]
  CR8[CR-08]

  U1[frontend/pages/community.html]
  U2[frontend/js/community.js]
  U3[routes/community.js]
  U4[controllers/communityController.js]
  U5[services/communityService.js]
  U6[models/Party.js]
  U7[models/PartyParticipant.js]
  U8[services/notificationService.js]

  F1 --> CR1 --> U4
  F1 --> CR3 --> U6
  F1 --> CR4 --> U3
  F1 --> CR5 --> U1
  F2 --> CR2 --> U5
  F2 --> CR4 --> U4
  F2 --> CR7 --> U2
  F3 --> CR2 --> U5
  F3 --> CR6 --> U2
  F3 --> CR8 --> U6

  U1 --> U2 --> U3 --> U4 --> U5
  U5 --> U6
  U5 --> U7
  U5 --> U8
```

## 3. SLO Directed Graph

For the code-level impact view, the relevant SLOs are:

- S1: frontend/pages/community.html
- S2: frontend/js/community.js
- S3: routes/community.js
- S4: controllers/communityController.js
- S5: services/communityService.js
- S6: models/Party.js
- S7: models/PartyParticipant.js
- S8: services/notificationService.js

```mermaid
graph LR
  S1[Community page]
  S2[Community JS]
  S3[Community route]
  S4[Community controller]
  S5[Community service]
  S6[Party model]
  S7[PartyParticipant model]
  S8[Notification service]

  S1 --> S2 --> S3 --> S4 --> S5
  S5 --> S6
  S5 --> S7
  S5 --> S8
```

## 4. Connectivity Matrix With Distances

Distances are measured as directed hop counts in the SLO graph. `∞` means there is no forward path from the row SLO to the column SLO.

| From / To | S1  | S2  | S3  | S4  | S5  | S6  | S7  | S8  |
| --------- | --- | --- | --- | --- | --- | --- | --- | --- |
| S1        | 0   | 1   | 2   | 3   | 4   | 5   | 5   | 5   |
| S2        | ∞   | 0   | 1   | 2   | 3   | 4   | 4   | 4   |
| S3        | ∞   | ∞   | 0   | 1   | 2   | 3   | 3   | 3   |
| S4        | ∞   | ∞   | ∞   | 0   | 1   | 2   | 2   | 2   |
| S5        | ∞   | ∞   | ∞   | ∞   | 0   | 1   | 1   | 1   |
| S6        | ∞   | ∞   | ∞   | ∞   | ∞   | 0   | ∞   | ∞   |
| S7        | ∞   | ∞   | ∞   | ∞   | ∞   | ∞   | 0   | ∞   |
| S8        | ∞   | ∞   | ∞   | ∞   | ∞   | ∞   | ∞   | 0   |

## 5. Maintenance Assessment

### Easy change requests

- CR-05 and CR-06 are the easiest because they mostly affect presentation logic in the community feed and do not change core data integrity rules.
- CR-07 is also straightforward because it adds tests around the new behavior rather than changing production logic.

### Difficult change requests

- CR-02 is the hardest because join operations must be atomic; otherwise two users can overfill the same Party at the same time.
- CR-03 and CR-04 are also difficult because they require schema changes, new persistence paths, and new API contracts to stay consistent across host and joiner workflows.

### What previous developers should have provided

- Clear ownership boundaries between feed rendering, join processing, and status transitions.
- Transaction-safe data access patterns with uniqueness constraints and documented invariants.
- A reusable notification and lifecycle service so the new feature can reuse existing patterns instead of duplicating logic.
- Focused unit tests around concurrency, capacity limits, and status updates.
