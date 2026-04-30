# D5: AI-Usage Report

This report summarizes how AI coding assistance was used during the FolkliyGrunt project.

## AI Tool Used

- Tool: GitHub Copilot (GPT-5.3-Codex) / GLM5.1
- Usage Scope: Planning, implementation support, refactoring, documentation updates, and validation workflow.

## Activities Where AI Was Used

1. Backend/Frontend Separation

- Activity: Restructured the project into separate backend and frontend folders.
- AI Help: Suggested safe folder structure, moved path-sensitive files, and updated server static paths.
- Output Files: implementations/backend/*, implementations/frontend/*, README.md.
- Verification: Ran backend test suite after migration.

2. API Mobile-Readiness Enhancements

- Activity: Prepared backend APIs for mobile app consumption.
- AI Help: Added configurable API behavior for CORS, API metadata endpoint, JSON 404 for unknown API routes, and API-focused error handling.
- Output Files: implementations/backend/server.js.
- Verification: Confirmed existing tests still pass.

3. Frontend + Mobile Coexistence Setup

- Activity: Enabled combined web+mobile usage and optional split deployment.
- AI Help: Implemented optional frontend serving in backend and documented both one-server and two-server run modes.
- Output Files: implementations/backend/server.js, README.md.
- Verification: Checked runtime configuration and validated no syntax/lint issues.

4. Dedicated Frontend Server Implementation

- Activity: Added a separate frontend server to serve static pages and proxy API calls to backend.
- AI Help: Created frontend proxy server with support for /api and /locales forwarding, and fallback error response when backend is unreachable.
- Output Files: implementations/frontend/server.js, implementations/backend/package.json.
- Verification: Syntax check (`node --check`) and backend regression tests.

5. Build/Run Documentation Improvement

- Activity: Updated project documentation for new architecture and run commands.
- AI Help: Added clear setup instructions for backend-only mode, one-server mode, and two-server mode with environment variables.
- Output Files: README.md.
- Verification: Manual review of command paths and environment variable references.

6. Regression Testing and Quality Checks

- Activity: Validated changes after each major update.
- AI Help: Suggested and executed test runs and quick checks to detect regressions early.
- Output Files: No direct source file changes (quality gate process).
- Verification: Jest results remained passing (14 suites, 171 tests).

## How AI Output Was Controlled

- Human review was performed before accepting architectural and runtime changes.
- Existing project conventions and folder naming were preserved.
- Every major code update was followed by tests or syntax checks.
- AI-generated suggestions were adjusted when needed to fit project requirements.

## Notes

- AI was used as a development assistant, not as an autonomous decision-maker.
- Final implementation decisions and acceptance remained with the project team.

## Phase 2 Deliverable Activities (Community Matchmaking + Membership Discount)

7. Community Matchmaking Implementation

- Activity: Implemented the full Community Matchmaking feature (Matchmaking First, Book Later) including Party domain model, participant tracking, atomic join with concurrency protection, and community feed UI.
- AI Help: Generated the Party and PartyParticipant models with transaction-safe join logic (SELECT FOR UPDATE), communityController with validation and error handling, community route, community.html feed page with inline JS, and database schema with uniqueness constraints and performance indexes.
- Output Files: implementations/backend/models/Party.js, implementations/backend/models/PartyParticipant.js, implementations/backend/controllers/communityController.js, implementations/backend/routes/community.js, implementations/frontend/pages/community.html, implementations/backend/database/schema.sql (parties, party_participants tables and indexes).
- Verification: Unit tests for Party model join logic, communityController tests, manual UI testing of feed and join flow.

8. Membership Discount System Implementation

- Activity: Implemented the Membership Discount System (199 THB/month subscription, 150 THB/hour member court rate) including membership lifecycle, pricing integration in booking checkout, and member savings display.
- AI Help: Added membership fields to Profile model and schema, created subscribe/status endpoints in authController, integrated member rate detection into bookingController pricing logic (separating court fee from equipment fee), generated booking response with standard_rate/applied_rate/member_savings breakdown, and built membership.html page with subscription UI and savings calculator.
- Output Files: implementations/backend/controllers/authController.js (subscribe, status endpoints), implementations/backend/controllers/bookingController.js (member pricing logic), implementations/backend/models/Profile.js (membership methods), implementations/backend/services/paymentService.js, implementations/frontend/pages/membership.html, implementations/frontend/pages/booking.html (member discount UI), implementations/backend/database/schema.sql (membership columns).
- Verification: membership.test.js, bookingController.test.js, paymentService.test.js, manual checkout with active/inactive membership scenarios.

9. Change Request Analysis Authoring (D3)

- Activity: Broke requested features into maintenance-oriented change requests using the lecture schema.
- AI Help: Drafted 8 CR entries with required distribution (2 corrective, 2 adaptive, 2 perfective, 2 preventive), including priority/severity/time/verification fields. Each CR maps to one of the two feature requests.
- Output Files: D3_CHANGE_REQUESTS.md.
- Verification: Manual check against assignment constraints and type-count requirements.

10. Impact Analysis and Traceability Modeling (D4)

- Activity: Produced impact analysis artifacts and traceability for feature-to-design-to-code-to-test relationships.
- AI Help: Generated full traceability graph, affected-only graph, SLO directed dependency graph, and connectivity matrix with shortest-path distances for both features.
- Output Files: D4_IMPACT_ANALYSIS.md.
- Verification: Manual cross-check with existing modules in implementations/backend and implementations/frontend.

11. Maintenance Risk Categorization

- Activity: Classified easy vs difficult changes and identified maintainability expectations from previous developers.
- AI Help: Proposed risk rationale based on coupling points (booking, profile, payment, and new community modules) and concurrency-sensitive paths.
- Output Files: D4_IMPACT_ANALYSIS.md.
- Verification: Reviewed impact against actual current architecture (server routes, controllers, models, tests).

12. Impact Analysis Diagram Generation (D4)

- Activity: Generated actual image files for D4 impact analysis diagrams (traceability graphs, SLO directed graph, connectivity matrix) to complement the Mermaid source diagrams.
- AI Help: Created four diagram images using AI image generation: (1) full traceability graph connecting Requirements → Design → Code → Test, (2) affected-only traceability graph highlighting CR-01 to CR-08 impacts, (3) SLO directed dependency graph showing module-level relationships, and (4) connectivity matrix with shortest-path distances. Also added SonarQube before/after screenshots to D2 and enriched all tables with detailed explanations.
- Output Files: picture/traceability_full.png, picture/traceability_affected.png, picture/slo_directed_graph.png, picture/connectivity_matrix.png, D4_IMPACT_ANALYSIS.md (updated), D2_CODE_QUALITY.md (updated).
- Verification: Cross-checked diagram content against actual codebase modules in implementations/backend and implementations/frontend.

13. Deliverable Document Polish and Completion

- Activity: Reviewed and enhanced all deliverable documents (D2, D3, D4, D5) for completeness and assignment compliance.
- AI Help: Added SonarQube quality rating comparison table to D2, embedded before/after SonarQube dashboard screenshots, added detailed node legends and connection tables to D4 graphs, and updated D5 with all AI-assisted activities.
- Output Files: D2_CODE_QUALITY.md, D4_IMPACT_ANALYSIS.md, D5_AI-USAGE.md.
- Verification: Manual review against assignment rubric requirements.
