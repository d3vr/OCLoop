Create a detailed implementation plan in PLAN.md with the following structure:

## Overview
Brief description of what we're implementing and why.

## Backlog
Chronological tasks as checkboxes. Guidelines:
- Tasks should be atomic (one logical change = one commit)
- Group related work that touches the same file/function area into ONE task
  - BAD: 4 separate tasks to create 4 related functions in the same file
  - GOOD: 1 task to create the function group, with sub-bullets for each
- Include file paths and specific locations where changes go
- For tasks involving external dependencies/APIs, include a verification step
- Prefix tasks requiring manual/human action with [MANUAL] (device testing, UI verification, external service setup)

## Testing Notes
Describe how to verify the implementation works (manual steps, existing test commands, etc.)

## File Change Summary
Table of files that will be modified/created.

Make it specific enough for a new engineer to implement immediately without additional context.
