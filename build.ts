import solidTransformPlugin from "@opentui/solid/bun-plugin";

const result = await Bun.build({
  entrypoints: ["./src/index.tsx"],
  outdir: "./dist",
  target: "bun",
  plugins: [solidTransformPlugin],
});

if (!result.success) {
  console.error("Build failed");
  for (const message of result.logs) {
    console.error(message);
  }
  process.exit(1);
}

console.log("Build successful");
