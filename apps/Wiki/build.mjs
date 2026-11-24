// Builds the wiki: content/toc.json + content/<chapter>/<page>.md  ->  content.js (one plain script the page loads, so it opens from file://).
//
//   node apps/Wiki/build.mjs          write content.js        (npm run build runs this)
//   node apps/Wiki/build.mjs --check  fail if content.js is out of date, or a code snippet is not really in the repo
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderMarkdown } from "./wikiLib.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const check = process.argv.includes("--check");
const lf = (s) => s.replace(/\r\n/g, "\n");

const toc = JSON.parse(readFileSync(join(here, "content", "toc.json"), "utf8"));
const problems = [], warnings = [];
const readFile = (p) => { const f = join(root, p); return existsSync(f) ? readFileSync(f, "utf8") : null; };

const chapters = [], pages = {};
let written = 0, total = 0;
for (const ch of toc) {
  chapters.push({ slug: ch.slug, title: ch.title, pages: ch.pages.map(([slug, title]) => ({ slug, title })) });
  for (const [slug, title] of ch.pages) {
    total++;
    const key = `${ch.slug}/${slug}`;
    const file = join(here, "content", ch.slug, `${slug}.md`);
    if (!existsSync(file)) continue;
    written++;
    const r = renderMarkdown(lf(readFileSync(file, "utf8")), { key, readFile, problems });
    warnings.push(...r.warnings);
    pages[key] = { html: r.html, text: r.text };
  }
}
const data = { toc: chapters, pages };
const body = JSON.stringify(data);
const build = createHash("sha1").update(body).digest("hex").slice(0, 7);
const out = `// Built by apps/Wiki/build.mjs from content/. Do not edit; edit the .md files and run \`npm run build\`.\nwindow.WIKI = ${JSON.stringify({ build, ...data })};\n`;

for (const w of warnings) console.warn("⚠", w);
for (const p of problems) console.error("✗", p);
const target = join(here, "content.js");
if (check) {
  const same = existsSync(target) && lf(readFileSync(target, "utf8")) === out;
  if (!same) problems.push("apps/Wiki/content.js is out of date — run `npm run build`.");
  else console.log("✓ apps/Wiki/content.js is up to date");
} else if (!problems.length) {
  writeFileSync(target, out);
  console.log(`✓ Wiki → apps/Wiki/content.js (${written} of ${total} pages written)`);
}
if (problems.length) { if (check) for (const p of problems.filter((x) => x.includes("out of date"))) console.error("✗", p); process.exit(1); }
