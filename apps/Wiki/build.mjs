// Builds the wiki: content/toc.txt (the menu) + content/<slugs>/<page>.md  ->  content.js (one plain script the page loads, so it opens from file://).
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

// content/toc.txt -> a tree of { key, title, desc, num, children }. A page's key is its slugs joined by "/".
function parseToc(text) {
  const root = { children: [] }, stack = [{ depth: -1, node: root }];
  for (const raw of text.split("\n")) {
    if (!raw.trim() || raw.trim().startsWith("#")) continue;
    const depth = (raw.length - raw.trimStart().length) / 2;
    const [slug, title, desc] = raw.trim().split("|").map((x) => x.trim());
    while (stack[stack.length - 1].depth >= depth) stack.pop();
    const parent = stack[stack.length - 1].node;
    const node = { key: parent.key ? `${parent.key}/${slug}` : slug, title, children: [] };
    if (desc) node.desc = desc;
    // numbers: chapters 0, 1, 2… and their sections 2.1, 2.2… (deeper pages have none)
    if (depth === 0) node.num = String(parent.children.length);
    else if (depth === 1) node.num = `${parent.num}.${parent.children.length + 1}`;
    parent.children.push(node);
    stack.push({ depth, node });
  }
  return root.children;
}

const tree = parseToc(readFileSync(join(here, "content", "toc.txt"), "utf8"));
const problems = [], warnings = [];
const readFile = (p) => { const f = join(root, p); return existsSync(f) ? readFileSync(f, "utf8") : null; };

const pages = {};
let written = 0, total = 0;
(function walk(nodes) {
  for (const n of nodes) {
    const leaf = !n.children.length;
    if (leaf) total++;
    const file = join(here, "content", ...(leaf ? [n.key + ".md"] : [n.key, "index.md"]));
    if (existsSync(file)) {
      if (leaf) written++;
      let r; try { r = renderMarkdown(lf(readFileSync(file, "utf8")), { key: n.key, readFile, problems }); } catch (e) { console.error("FAILED PAGE", n.key); throw e; }
      if (leaf) warnings.push(...r.warnings); // overview pages are free-form
      pages[n.key] = { html: r.html, text: r.text };
    }
    walk(n.children);
  }
})(tree);
const data = { toc: tree, pages };
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
