
## Project Operations
- When writing to JSON files, use bash instead of the write tool.
- When using find/glob/grep, respect .gitignore - avoid searching in `reference-repo/` and other ignored paths
- Package manager: `bun` (not npm)
- Build: `bun run build`
- Tests: `bun test` from repo root
