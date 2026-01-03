# Example Project Plan

## Overview

This is an example PLAN.md file demonstrating the format OCLoop expects.
Tasks are organized as markdown checkboxes under a "Backlog" or phase headings.

---

## Phase 1: Setup

- [x] **1.1** Initialize project structure
  - Create `src/` directory
  - Set up `package.json` with dependencies
  - Configure `tsconfig.json`

- [x] **1.2** Configure linting and formatting
  - Add ESLint configuration
  - Add Prettier configuration
  - Set up pre-commit hooks

## Phase 2: Core Features

- [ ] **2.1** Implement user authentication
  - Add login/logout endpoints
  - Set up JWT token handling
  - Create auth middleware

- [ ] **2.2** Create database models
  - Define User schema
  - Define Post schema
  - Set up migrations

- [ ] **2.3** Build REST API endpoints
  - Implement CRUD operations for users
  - Implement CRUD operations for posts
  - Add input validation

## Phase 3: Testing

- [ ] **3.1** Write unit tests
  - Test authentication logic
  - Test database models
  - Test utility functions

- [ ] **3.2** Write integration tests
  - Test API endpoints
  - Test database operations
  - Test error handling

- [MANUAL] **3.3** Perform manual UI testing
  - Test responsive design
  - Verify cross-browser compatibility
  - Check accessibility

## Phase 4: Deployment

- [ ] **4.1** Set up CI/CD pipeline
  - Configure GitHub Actions
  - Add test and lint checks
  - Set up deployment workflow

- [BLOCKED: waiting for AWS credentials] **4.2** Configure production environment
  - Set up AWS infrastructure
  - Configure environment variables
  - Set up monitoring

- [MANUAL] **4.3** Verify production deployment
  - Check all endpoints work
  - Verify database connectivity
  - Test with real users

---

## Notes

- Tasks marked with `[x]` are complete
- Tasks marked with `[ ]` are pending (OCLoop will execute these)
- Tasks marked with `[MANUAL]` require human intervention
- Tasks marked with `[BLOCKED: reason]` cannot proceed until blocker is resolved

OCLoop will:
1. Skip completed (`[x]`), manual (`[MANUAL]`), and blocked (`[BLOCKED]`) tasks
2. Pick one pending (`[ ]`) task at a time
3. Execute it in a fresh opencode session
4. Mark it complete and continue to the next task
5. Create `.PLAN_COMPLETE` when all automatable tasks are done
