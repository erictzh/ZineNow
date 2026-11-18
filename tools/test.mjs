// Runs the pure-logic tests in tests/*.test.js under Node (the text composer, caret geometry, text styles, hyphenation).
//
//   npm test
//
// Each test file is bundled with esbuild first, so it can import the editor's own source files directly
// (and the `hyphen` package). Nothing here needs a browser: layout that depends on a real canvas is
// checked by hand in the browser instead (see HANDOFF.md).

import * as esbuild from "esbuild";
import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const testsDir = join(root, "tests");
const outDir = join(tmpdir(), "zinenow-tests");
mkdirSync(outDir, { recursive: true });

const files = readdirSync(testsDir).filter((f) => f.endsWith(".test.js")).sort();
let failed = 0;
for (const file of files) {
  const outfile = join(outDir, file.replace(/\.js$/, ".cjs"));
  await esbuild.build({ entryPoints: [join(testsDir, file)], outfile, bundle: true, platform: "node", format: "cjs", logLevel: "warning" });
  console.log(`\n── ${file}`);
  const result = spawnSync(process.execPath, [outfile], { stdio: "inherit" });
  if (result.status !== 0) failed++;
}
console.log(failed ? `\n${failed} of ${files.length} test files FAILED` : `\nall ${files.length} test files passed`);
process.exit(failed ? 1 : 0);
