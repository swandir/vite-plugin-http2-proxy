import { build } from "esbuild";

await Promise.all([
  build({
    entryPoints: ["index.ts"],
    outfile: "index.mjs",
    format: "esm",
  }),
  build({
    entryPoints: ["index.ts"],
    outfile: "index.cjs",
    format: "cjs",
  }),
]);
