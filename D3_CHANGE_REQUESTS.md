# D3: Change Request Analysis

Code: ITCS383  
Name: Software Construction and Evolution  
Updated date: 27 April 2026  
Doc: Project Phase 2 Description  
Version: 1.0.0

## Requested Feature Set

1. Community Matchmaking (Matchmaking First, Book Later)
2. Membership Discount System (199 THB/month, member court rate 150 THB/hour)

## Change Requests

### CR-01

| Attribute           | Description                                                                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Associated Feature  | Community Matchmaking                                                                                                                                        |
| Description         | Users can exceed Party capacity when multiple Join requests arrive at the same time. Add transaction-safe seat claiming so capacity can never be overbooked. |
| Maintenance Type    | Corrective                                                                                                                                                   |
| Priority            | High                                                                                                                                                         |
| Severity            | Critical                                                                                                                                                     |
| Time to Implement   | 2 person-days                                                                                                                                                |
| Verification Method | Concurrency testing, code inspection, API integration testing                                                                                                |

### CR-02

| Attribute           | Description                                                                                                                                                                                                                             |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Associated Feature  | Membership Discount System                                                                                                                                                                                                              |
| Description         | Booking checkout can compute incorrect totals for members when discount rate logic is not applied consistently to duration and equipment totals. Fix pricing calculation path to apply member court rate only to court-hours component. |
| Maintenance Type    | Corrective                                                                                                                                                                                                                              |
| Priority            | High                                                                                                                                                                                                                                    |
| Severity            | Major                                                                                                                                                                                                                                   |
| Time to Implement   | 2 person-days                                                                                                                                                                                                                           |
| Verification Method | Unit tests on pricing logic, checkout API tests, manual checkout scenarios                                                                                                                                                              |

### CR-03

| Attribute           | Description                                                                                                                                              |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Associated Feature  | Community Matchmaking                                                                                                                                    |
| Description         | Introduce Party domain, Party join records, Community Feed API endpoints, and a feed page where hosts create Party announcements and joiners click Join. |
| Maintenance Type    | Adaptive                                                                                                                                                 |
| Priority            | High                                                                                                                                                     |
| Severity            | Major                                                                                                                                                    |
| Time to Implement   | 1.5 person-weeks                                                                                                                                         |
| Verification Method | End-to-end feature testing, API contract testing, UI acceptance testing                                                                                  |

### CR-04

| Attribute           | Description                                                                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Associated Feature  | Membership Discount System                                                                                                                              |
| Description         | Add membership lifecycle support (subscribe, active status, renewal date, expiration handling) and integrate status verification into booking checkout. |
| Maintenance Type    | Adaptive                                                                                                                                                |
| Priority            | High                                                                                                                                                    |
| Severity            | Major                                                                                                                                                   |
| Time to Implement   | 1 person-week                                                                                                                                           |
| Verification Method | API tests for membership status transitions, database verification, checkout integration tests                                                          |

### CR-05

| Attribute           | Description                                                                                                                               |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Associated Feature  | Community Matchmaking                                                                                                                     |
| Description         | Improve Community Feed usability with filters (date/location/status), seat counter, and automatic Full badge updates without page reload. |
| Maintenance Type    | Perfective                                                                                                                                |
| Priority            | Medium                                                                                                                                    |
| Severity            | Moderate                                                                                                                                  |
| Time to Implement   | 4 person-days                                                                                                                             |
| Verification Method | UI/UX testing, front-end regression tests, manual exploratory testing                                                                     |

### CR-06

| Attribute           | Description                                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Associated Feature  | Membership Discount System                                                                                                           |
| Description         | Improve checkout transparency by showing standard rate, member rate, savings amount, and final payable total in the booking summary. |
| Maintenance Type    | Perfective                                                                                                                           |
| Priority            | Medium                                                                                                                               |
| Severity            | Moderate                                                                                                                             |
| Time to Implement   | 3 person-days                                                                                                                        |
| Verification Method | Front-end unit tests, snapshot/manual UI checks, API payload validation                                                              |

### CR-07

| Attribute           | Description                                                                                                                                   |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Associated Feature  | Community Matchmaking                                                                                                                         |
| Description         | Add preventive safeguards: DB constraints/indexes for Party capacity/status integrity, and idempotency protection for repeated Join requests. |
| Maintenance Type    | Preventive                                                                                                                                    |
| Priority            | High                                                                                                                                          |
| Severity            | Major                                                                                                                                         |
| Time to Implement   | 3 person-days                                                                                                                                 |
| Verification Method | Schema migration review, duplicate request tests, load testing                                                                                |

### CR-08

| Attribute           | Description                                                                                                                                                             |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Associated Feature  | Membership Discount System                                                                                                                                              |
| Description         | Add preventive quality controls: targeted regression tests for member pricing and membership expiry edge-cases, plus logging/metrics for discount application failures. |
| Maintenance Type    | Preventive                                                                                                                                                              |
| Priority            | Medium                                                                                                                                                                  |
| Severity            | Major                                                                                                                                                                   |
| Time to Implement   | 3 person-days                                                                                                                                                           |
| Verification Method | Automated test suite, log inspection, fault-injection test scenarios                                                                                                    |

## Type Coverage Check

| Type of change | Number of change requests |
| -------------- | ------------------------- |
| Corrective     | 2 (CR-01, CR-02)          |
| Adaptive       | 2 (CR-03, CR-04)          |
| Perfective     | 2 (CR-05, CR-06)          |
| Preventive     | 2 (CR-07, CR-08)          |

Feature request: Community Matchmaking (Matchmaking First, Book Later)

This feature request breaks into three related capability slices:

- Community Feed: hosts publish Party announcements and users browse them.
- Auto-Join: joiners can click Join on a Party post.
- Auto-Full: the Party status changes to Full when capacity is reached.

## CR-01

| Attribute           | Description                                                                                                                                        |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Associated Feature  | Community Feed                                                                                                                                     |
| Code                | ITCS383                                                                                                                                            |
| Name                | Software Construction and Evolution                                                                                                                |
| Updated date        | 27 April 2026                                                                                                                                      |
| Doc                 | Project Phase 2 Description                                                                                                                        |
| Version             | 1.0.1                                                                                                                                              |
| Description         | Validate Party creation so hosts must provide game, date/time, location, and a positive capacity before the announcement is published to the feed. |
| Maintenance Type    | Corrective                                                                                                                                         |
| Priority            | High                                                                                                                                               |
| Severity            | Critical                                                                                                                                           |
| Time to Implement   | 1 person-week                                                                                                                                      |
| Verification Method | Testing and inspection                                                                                                                             |

## CR-02

| Attribute           | Description                                                                                                                      |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Associated Feature  | Auto-Join                                                                                                                        |
| Code                | ITCS383                                                                                                                          |
| Name                | Software Construction and Evolution                                                                                              |
| Updated date        | 27 April 2026                                                                                                                    |
| Doc                 | Project Phase 2 Description                                                                                                      |
| Version             | 1.0.1                                                                                                                            |
| Description         | Make the join operation atomic so two users cannot overfill the same Party at the same time and the same user cannot join twice. |
| Maintenance Type    | Corrective                                                                                                                       |
| Priority            | High                                                                                                                             |
| Severity            | Critical                                                                                                                         |
| Time to Implement   | 1.5 person-weeks                                                                                                                 |
| Verification Method | Testing and inspection                                                                                                           |

## CR-03

| Attribute           | Description                                                                                                                                   |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Associated Feature  | Community Feed                                                                                                                                |
| Code                | ITCS383                                                                                                                                       |
| Name                | Software Construction and Evolution                                                                                                           |
| Updated date        | 27 April 2026                                                                                                                                 |
| Doc                 | Project Phase 2 Description                                                                                                                   |
| Version             | 1.0.1                                                                                                                                         |
| Description         | Add database support for Party posts and Party participants, including keys, status fields, and indexes for fast feed and membership lookups. |
| Maintenance Type    | Adaptive                                                                                                                                      |
| Priority            | High                                                                                                                                          |
| Severity            | Major                                                                                                                                         |
| Time to Implement   | 2 person-weeks                                                                                                                                |
| Verification Method | Testing and inspection                                                                                                                        |

## CR-04

| Attribute           | Description                                                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Associated Feature  | Auto-Join                                                                                                                                   |
| Code                | ITCS383                                                                                                                                     |
| Name                | Software Construction and Evolution                                                                                                         |
| Updated date        | 27 April 2026                                                                                                                               |
| Doc                 | Project Phase 2 Description                                                                                                                 |
| Version             | 1.0.1                                                                                                                                       |
| Description         | Add backend routes, controller actions, and service logic for creating Party posts, loading the community feed, and handling Join requests. |
| Maintenance Type    | Adaptive                                                                                                                                    |
| Priority            | High                                                                                                                                        |
| Severity            | Major                                                                                                                                       |
| Time to Implement   | 2 person-weeks                                                                                                                              |
| Verification Method | Testing and inspection                                                                                                                      |

## CR-05

| Attribute           | Description                                                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Associated Feature  | Community Feed                                                                                                                        |
| Code                | ITCS383                                                                                                                               |
| Name                | Software Construction and Evolution                                                                                                   |
| Updated date        | 27 April 2026                                                                                                                         |
| Doc                 | Project Phase 2 Description                                                                                                           |
| Version             | 1.0.1                                                                                                                                 |
| Description         | Improve the feed with search, filter, and sort controls so users can quickly find Parties by date, location, capacity, and game type. |
| Maintenance Type    | Perfective                                                                                                                            |
| Priority            | Medium                                                                                                                                |
| Severity            | Moderate                                                                                                                              |
| Time to Implement   | 1 person-week                                                                                                                         |
| Verification Method | Testing and inspection                                                                                                                |

## CR-06

| Attribute           | Description                                                                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Associated Feature  | Auto-Full                                                                                                                                  |
| Code                | ITCS383                                                                                                                                    |
| Name                | Software Construction and Evolution                                                                                                        |
| Updated date        | 27 April 2026                                                                                                                              |
| Doc                 | Project Phase 2 Description                                                                                                                |
| Version             | 1.0.1                                                                                                                                      |
| Description         | Add live participant counters and status badges so the Party card automatically switches from Open to Full as soon as capacity is reached. |
| Maintenance Type    | Perfective                                                                                                                                 |
| Priority            | Medium                                                                                                                                     |
| Severity            | Moderate                                                                                                                                   |
| Time to Implement   | 1 person-week                                                                                                                              |
| Verification Method | Testing and inspection                                                                                                                     |

## CR-07

| Attribute           | Description                                                                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Associated Feature  | Auto-Join                                                                                                                                         |
| Code                | ITCS383                                                                                                                                           |
| Name                | Software Construction and Evolution                                                                                                               |
| Updated date        | 27 April 2026                                                                                                                                     |
| Doc                 | Project Phase 2 Description                                                                                                                       |
| Version             | 1.0.1                                                                                                                                             |
| Description         | Add automated tests for join collisions, capacity boundaries, and feed status transitions so the Party lifecycle stays stable after future edits. |
| Maintenance Type    | Preventive                                                                                                                                        |
| Priority            | High                                                                                                                                              |
| Severity            | Major                                                                                                                                             |
| Time to Implement   | 1 person-week                                                                                                                                     |
| Verification Method | Testing                                                                                                                                           |

## CR-08

| Attribute           | Description                                                                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Associated Feature  | Community Feed                                                                                                                                                      |
| Code                | ITCS383                                                                                                                                                             |
| Name                | Software Construction and Evolution                                                                                                                                 |
| Updated date        | 27 April 2026                                                                                                                                                       |
| Doc                 | Project Phase 2 Description                                                                                                                                         |
| Version             | 1.0.1                                                                                                                                                               |
| Description         | Refactor the Party lifecycle into a reusable transaction-safe service with explicit uniqueness rules and clear state transitions to reduce future maintenance risk. |
| Maintenance Type    | Preventive                                                                                                                                                          |
| Priority            | Medium                                                                                                                                                              |
| Severity            | Moderate                                                                                                                                                            |
| Time to Implement   | 1.5 person-weeks                                                                                                                                                    |
| Verification Method | Testing and inspection                                                                                                                                              |
