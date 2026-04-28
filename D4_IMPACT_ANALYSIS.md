# D4: Impact Analysis

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
