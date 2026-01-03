# Build Process

## Bun Build and SolidJS

When using `@opentui/solid`, standard `bun build` from the CLI may fail because it tries to use the default React JSX transform instead of the SolidJS transform. 

To build correctly, use a build script (`build.ts`) that explicitly includes the `solidTransformPlugin`:

```typescript
import solidTransformPlugin from "@opentui/solid/bun-plugin";

await Bun.build({
  entrypoints: ["./src/index.tsx"],
  outdir: "./dist",
  target: "bun",
  plugins: [solidTransformPlugin],
});
```

Execute this with `bun run build.ts`.

## CLI Shebang

The entry point `src/index.tsx` should start with `#!/usr/bin/env bun`. `Bun.build` preserves this shebang in the output file if it's present in the entry point.

## Global Installation

For development, use `bun link` to make the `ocloop` command available globally based on the `bin` entry in `package.json`.
