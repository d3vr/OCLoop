
## Project Operations
- When writing to JSON files, don't give the write tool an object, give it the JSON as plain text
- When using find/glob/grep, respect .gitignore - avoid searching in `reference-repo/` and other ignored paths
- Package manager: `bun` (not npm)
- Build: `bun run build`
- Tests: `bun test` from repo root
