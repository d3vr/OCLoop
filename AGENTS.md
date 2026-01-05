
## Research

Check these before web searching (load with Read tool as needed):
- @docs/build-process.md - Details on Bun build and SolidJS integration

## Code Quality Guidelines

- **One logical change per commit** - Don't bundle unrelated changes. If you're doing build setup, npm config, and docs updates, those are separate commits.
- **Verify end-to-end** - If a task says "test X", actually test it. Don't mark complete based on "it should work".
- **Check for consistency across files** - When changing values like package names, API endpoints, or config options, search the codebase for other occurrences and update all of them.
- **Cross-reference documentation** - When adding examples, features, or new files, update README.md to reference them. Orphaned files are undiscoverable.

## Project Operations
- When writing to JSON files, use bash instead of the write tool.
- Package manager: `bun` (not npm)
- Build: `bun run build` (runs `build.ts` with SolidJS plugin)
- Tests: `bun test` from repo root
- When committing, never do `git add .`, always list unstaged changes so you get a chance to think about them in case you need to add anything into .gitignore first (e.g: node_modules/)
- When searching for the next task to execute, only look in `PLAN.md`. Do not search the entire codebase for `[ ]` as it may yield false positives from tests, examples, or documentation.
- Use `src/hooks/useInput` for keyboard handling in components (wraps `@opentui/solid`'s `useRenderer`).
