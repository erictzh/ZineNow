// Builds every app that has a src/ folder into one plain script the page
// loads with <script src="dist/app.js">. Plain classic scripts are what make
// the apps work when opened straight from disk (file://): browsers block
// ES-module imports there, and in-browser Babel can't fetch separate files.
//
//   npm run build   build every app once
//   npm run watch   rebuild an app whenever one of its files changes
//   npm run check   fail if any committed dist/app.js is out of date
//
// An app joins the build by having apps/<App>/src/main.jsx (or main.js).
// React, ReactDOM, pdfjsLib and PDFLib stay globals loaded by the page's own
// <script> tags, so the bundle only contains the app's own code.

import * as esbuild from "esbuild";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const mode = process.argv.includes("--watch") ? "watch" : process.argv.includes("--check") ? "check" : "build";

const BANNER = "// Built by tools/build.mjs from this app's src/ folder. Do not edit; edit src/ and run `npm run build`.";

function findApps() {
  const appsDir = join(root, "apps");
  return readdirSync(appsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const dir = join(appsDir, d.name);
      const entry = ["main.jsx", "main.js"].map((f) => join(dir, "src", f)).find(existsSync);
      return entry && { name: d.name, entry, outfile: join(dir, "dist", "app.js") };
    })
    .filter(Boolean);
}

function optionsFor(app) {
  return {
    entryPoints: [app.entry],
    outfile: app.outfile,
    bundle: true,
    format: "iife",
    target: "es2020",
    jsx: "transform",
    jsxFactory: "React.createElement",
    jsxFragment: "React.Fragment",
    charset: "utf8", // keep non-ASCII (CJK wrapping rules, "…", "✓") readable
    legalComments: "none",
    banner: { js: BANNER },
    logLevel: "warning",
  };
}

const apps = findApps();
if (apps.length === 0) {
  console.log("No app has a src/main.jsx yet — nothing to build.");
  process.exit(0);
}

if (mode === "watch") {
  for (const app of apps) {
    const ctx = await esbuild.context({
      ...optionsFor(app),
      plugins: [{
        name: "report",
        setup(build) {
          build.onEnd((r) => console.log(`${r.errors.length ? "✗" : "✓"} ${app.name} ${new Date().toLocaleTimeString()}`));
        },
      }],
    });
    await ctx.watch();
  }
  console.log(`Watching ${apps.map((a) => a.name).join(", ")} — Ctrl+C to stop.`);
} else {
  let stale = 0;
  for (const app of apps) {
    const write = mode === "build";
    const result = await esbuild.build({ ...optionsFor(app), write });
    const out = relative(root, app.outfile);
    if (write) {
      console.log(`✓ ${app.name} → ${out}`);
    } else {
      const built = result.outputFiles[0].text;
      const committed = existsSync(app.outfile) ? readFileSync(app.outfile, "utf8") : null;
      if (built !== committed) {
        stale++;
        console.error(`✗ ${out} is out of date — run \`npm run build\`.`);
      } else {
        console.log(`✓ ${out} is up to date`);
      }
    }
  }
  if (stale) process.exit(1);
}
