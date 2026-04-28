# D3: Change Request Analysis

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
