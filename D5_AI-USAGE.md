# D5: AI-Usage Report

This report summarizes how AI coding assistance was used during the FolkliyGrunt project.

## AI Tool Used

- Tool: GitHub Copilot (GPT-5.3-Codex)
- Usage Scope: Planning, implementation support, refactoring, documentation updates, and validation workflow.

## Activities Where AI Was Used

1. Backend/Frontend Separation

- Activity: Restructured the project into separate backend and frontend folders.
- AI Help: Suggested safe folder structure, moved path-sensitive files, and updated server static paths.
- Output Files: implementations/backend/_, implementations/frontend/_, README.md.
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
