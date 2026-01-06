---
description: Execute loop
---

Execute the next task from {{PLAN_FILE}}.

Before starting:
1. Check `git status` for uncommitted changes - a previous iteration may have been interrupted
   - If changes exist, assess whether they complete a task (commit and mark done) or need to be continued
2. Read {{PLAN_FILE}} fully
3. Before web searching or consulting reference repos, check if AGENTS.md ## Research has relevant @ references and load them with Read tool

Task selection (CRITICAL):
- Work through phases IN ORDER - complete Phase N before starting Phase N+1
- Pick the FIRST uncompleted task in the earliest incomplete phase
- Skip [MANUAL] and [BLOCKED] items
- NEVER batch tasks across different phases - each phase is a commit boundary
- Within a SINGLE phase, you may batch tasks ONLY if they are in the same file AND logically coupled

Execute:
1. Make the code changes
2. Glob for test files (*test*, *spec*, *.test.*). If relevant tests exist, run them.
3. Commit with a descriptive message. NEVER push.

After completion:
1. Update {{PLAN_FILE}} marking completed items with [x]

2. If you discovered external knowledge (API behavior, library quirks, external repo details):
   - Create docs/ directory if missing
   - Create or update docs/<topic>.md with your findings
   - Update AGENTS.md ## Research section (create file/section if missing), e.g:
     ```markdown
     ## Research
     
     Check these before web searching (load with Read tool as needed):
     - @docs/browser-commands-api.md - Firefox/Chrome commands API behavior
     - @docs/pcm-audio-streaming.md - Web Audio API streaming patterns
     ```

3. If you learned something about THIS PROJECT through trial/error:
   - Update AGENTS.md ## Project Operations section (create file/section if missing), e.g:
     ```markdown
     ## Project Operations
     
     - Package manager: `bun` (not npm)
     - Build: `bun run build`
     - Tests: `bun test` from repo root
     - Lint must pass before commit: `bun run lint`
     ```

4. If you cannot complete a task (permissions, external service, needs human input):
   - Add [BLOCKED: reason] to that task line in {{PLAN_FILE}}
   - Continue with other tasks

Completion check:
- If all non-[MANUAL] tasks are either [x] or [BLOCKED]:
  - Append `<plan-complete>SUMMARY_OF_WORK_DONE_AND_REMAINING_MANUAL_TASKS</plan-complete>` to the end of {{PLAN_FILE}}
  - Exit the session
- Do NOT skip automatable tasks - if a task seems hard but doable, attempt it
