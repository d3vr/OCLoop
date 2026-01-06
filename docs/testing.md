# Testing Notes

## TUI Components and Bun Test

We use `bun test` for running tests. However, testing components that use `@opentui/solid` (specifically `useKeyboard` and other hooks/components) presents challenges with `jsxImportSource`.

### Known Issues

- **Mocking `@opentui/solid`**: Attempting to mock `@opentui/solid` using `mock.module` causes `jsx-runtime` resolution errors (`SyntaxError: Export named 'jsxDEV' not found`). This is because the `tsconfig.json` defines `"jsxImportSource": "@opentui/solid"`, and mocking the module root seems to interfere with the JSX transformation's access to `jsx-runtime`.

### Recommendation

- For logic that is purely state-based (reducers, helpers), write unit tests (e.g., `src/hooks/useLoopState.test.ts`).
- For TUI components, rely on manual verification or try to abstract logic into testable hooks/functions that don't depend on `@opentui` imports directly.
- If mocking is absolutely necessary, strict investigation into partial mocking or overriding `jsxImportSource` for tests is required.
