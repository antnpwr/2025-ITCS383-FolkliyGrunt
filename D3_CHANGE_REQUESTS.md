# D3: Change Request Analysis

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
| Description         | Introduce Party domain, Party participant records, Community Feed API endpoints, and a feed page where hosts create Party announcements and joiners click Join. |
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
