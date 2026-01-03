
## Research

Check these before web searching (load with Read tool as needed):
- @docs/build-process.md - Details on Bun build and SolidJS integration

## Project Operations
- When writing to JSON files, use bash instead of the write tool.
- When using find/glob/grep, respect .gitignore - avoid searching in `reference-repo/` and other ignored paths
- Package manager: `bun` (not npm)
- Build: `bun run build` (runs `build.ts` with SolidJS plugin)
- Tests: `bun test` from repo root
- Lint must pass before commit: `bun run lint` (if available)
- When committing, never do `git add .`, always list unstaged changes so you get a chance to think about them in case you need to add anything into .gitignore first (e.g: node_modules/)
- When searching for the next task to execute, only look in `PLAN.md`. Do not search the entire codebase for `[ ]` as it may yield false positives from tests, examples, or documentation.
