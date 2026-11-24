// The wiki's converter: Markdown -> HTML, with the little extras the wiki needs. Pure (no file access), so tests can import it.
//  - code blocks tagged `js file=apps/..` are CHECKED against that file: the snippet must really be there (lines of
//    just "…" or "// …" split a snippet into pieces that may be far apart in the file)
//  - callouts: a quote starting with **Note**, **Tip**, **Why** or **Warning**
//  - links like [x](ai-tools/ocr) or (ai-tools/ocr:how-it-works) become in-wiki links
import { Marked } from "marked";

export const PARTS = ["Intro", "How to use", "How it works", "Code"];
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export const slugify = (s) => s.toLowerCase().replace(/<[^>]*>/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const JS_WORDS = "import|export|const|let|var|function|return|if|else|for|of|in|while|new|await|async|class|true|false|null|undefined|this|typeof|throw|try|catch|break|continue|default";
const RULES = {
  js: new RegExp(`(\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/)|("(?:[^"\\\\\\n]|\\\\.)*"|'(?:[^'\\\\\\n]|\\\\.)*'|\`(?:[^\`\\\\]|\\\\.)*\`)|\\b(${JS_WORDS})\\b|(\\b\\d+(?:\\.\\d+)?\\b)`, "g"),
  css: /(\/\*[\s\S]*?\*\/)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')|(\b(?:var|calc|rgba?)\b)|(-?\b\d+(?:\.\d+)?(?:px|em|rem|%|s|ms)?\b)/g,
  json: /()("(?:[^"\\\n]|\\.)*")|\b(true|false|null)\b|(-?\b\d+(?:\.\d+)?\b)/g,
  bash: /(#[^\n]*)|("(?:[^"\\\n]|\\.)*"|'[^'\n]*')|\b(npm|node|git|cd)\b|(\b\d+\b)/g,
  html: /(<!--[\s\S]*?-->)|("(?:[^"\n])*")|(<\/?[a-zA-Z][\w-]*|\/?>)|()/g,
};
RULES.jsx = RULES.js; RULES.mjs = RULES.js; RULES.sh = RULES.bash;
const CLASSES = ["", "c", "s", "k", "n"]; // match groups 1..4 -> comment, string, keyword, number

// One pass: the matched pieces get a <span>, everything else is just escaped.
export function highlight(code, lang) {
  const re = RULES[lang];
  if (!re) return esc(code);
  re.lastIndex = 0;
  let out = "", last = 0, m;
  while ((m = re.exec(code))) {
    if (m[0] === "") { re.lastIndex++; continue; }
    out += esc(code.slice(last, m.index));
    const g = [1, 2, 3, 4].find((i) => m[i]);
    out += g ? `<span class="t-${CLASSES[g]}">${esc(m[0])}</span>` : esc(m[0]);
    last = m.index + m[0].length;
  }
  return out + esc(code.slice(last));
}

// ---- Code taken from the repo, with line numbers ----------------------------------------------------------------
// A code block in a page is written ```js file=path fn=name (a whole function: found and cut out by name) or
// ```js file=path with a few real lines inside (found line by line; a line of just "…" starts a new piece).
// Either way the block SHOWS THE FILE'S OWN LINES, with their real line numbers, so it can never be invented or stale.

// How much deeper the brackets get on one line: ( [ { count up, ) ] } count down. Strings and // comments are skipped.
function bracketDelta(line) {
  let d = 0, quote = "", prev = "";
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quote) { if (c === "\\") i++; else if (c === quote) quote = ""; continue; }
    if (c === "/" && line[i + 1] === "/") break;
    // a regular expression literal (a / where a value is expected): skip to its closing /, mind [...] classes
    if (c === "/" && (prev === "" || "(,=:[!&|?{};>+-*%~^".includes(prev))) {
      let inClass = false;
      for (i++; i < line.length; i++) {
        if (line[i] === "\\") i++;
        else if (line[i] === "[") inClass = true;
        else if (line[i] === "]") inClass = false;
        else if (line[i] === "/" && !inClass) break;
      }
      prev = "/";
      continue;
    }
    if ((c === '"' || c === "`" || (c === "'" && !/\w/.test(line[i - 1] || "")))) { quote = c; continue; }
    if ("([{".includes(c)) d++; else if (")]}".includes(c)) d--;
    if (c !== " " && c !== "\t") prev = c;
  }
  return d;
}

// The 0-based first and last line of function `name` (function name(), async function, export function, or const name = ...).
export function findFunction(lines, name, nth = 1) {
  const re = new RegExp(`^\\s*(?:export\\s+)?(?:default\\s+)?(?:async\\s+)?(?:function\\*?\\s+${name}\\b|(?:const|let|var)\\s+${name}\\s*=)`);
  let start = -1;
  for (let i = 0, seen = 0; i < lines.length; i++) if (re.test(lines[i]) && ++seen === nth) { start = i; break; }
  if (start < 0) return null;
  let depth = 0;
  for (let i = start; i < lines.length; i++) {
    depth += bracketDelta(lines[i]);
    const t = lines[i].trim();
    const next = (lines[i + 1] || "").trim();
    // a statement may carry on in the next line (an arrow body, or a line starting && || ? : + .)
    if (depth <= 0 && !t.endsWith("=>") && !t.endsWith("=") && !/^(&&|\|\||\?|:|\+|\.[a-zA-Z])/.test(next)) return [start, i];
  }
  return null;
}

// Where the real lines matching the typed piece `chunk` (an array of trimmed non-empty lines) are: [first, last] or null.
function findLines(lines, chunk) {
  const blank = (l) => l.trim() === "";
  for (let s = 0; s < lines.length; s++) {
    let k = s, j = 0;
    while (j < chunk.length && k < lines.length) {
      if (blank(lines[k])) { k++; continue; }
      if (lines[k].trim() !== chunk[j]) break;
      j++; k++;
    }
    if (j === chunk.length) return [s, k - 1];
  }
  return null;
}

// The pieces to show: [{ from, to }] (0-based, inclusive) for a block, or { error }.
export function locateCode(code, attrs, fileText) {
  const lines = fileText.split("\n");
  const pieces = [];
  const fns = (attrs.fn || "").split(",").filter(Boolean);
  for (const entry of fns) {
    const [name, nth] = entry.split("#");
    const r = findFunction(lines, name, nth ? Number(nth) : 1);
    if (!r) return { error: `there is no function ${entry}` };
    pieces.push({ from: r[0], to: r[1], label: name });
  }
  if (!fns.length) {
    const chunks = code.split(/^[ \t]*(?:\/\/[ \t]*|\/\*[ \t]*|#[ \t]*)?…[ \t]*(?:\*\/)?[ \t]*$/m)
      .map((c) => c.split("\n").map((l) => l.trim()).filter(Boolean)).filter((c) => c.length);
    for (const chunk of chunks) {
      const r = findLines(lines, chunk);
      if (!r) return { error: `these lines are not in the file: ${chunk[0]}` };
      pieces.push({ from: r[0], to: r[1] });
    }
  }
  return { lines, pieces };
}

// Syntax-coloured HTML, cut into one string per line (a colour that spans lines is closed and reopened).
function htmlLines(code, lang) {
  const out = [];
  let cur = "", open = "";
  for (const part of highlight(code, lang).split(/(<span class="t-[a-z]">|<\/span>|\n)/)) {
    if (part === "\n") { out.push(cur + (open ? "</span>" : "")); cur = open; }
    else { if (part.startsWith("<span")) open = part; else if (part === "</span>") open = ""; cur += part; }
  }
  out.push(cur);
  return out;
}

// The block's HTML: each piece with a line-number gutter, pieces separated by a "⋮" row.
function renderLines(lines, pieces, lang) {
  return pieces.map((pc) => {
    const raw = lines.slice(pc.from, pc.to + 1);
    const indent = Math.min(...raw.filter((l) => l.trim()).map((l) => l.match(/^\s*/)[0].length));
    const h = htmlLines(raw.map((l) => l.slice(indent)).join("\n"), lang);
    return h.map((line, i) => `<span class="line"><span class="ln">${pc.from + i + 1}</span><span class="src">${line}</span>\n</span>`).join("");
  }).join('<span class="line gap"><span class="ln">⋮</span></span>');
}

const rangeText = (pieces) => "line" + (pieces.length > 1 || pieces[0].to > pieces[0].from ? "s " : " ") + pieces.map((p) => (p.to > p.from ? `${p.from + 1}–${p.to + 1}` : `${p.from + 1}`)).join(", ");

// "How it works" and "Code" (everything from the first of them to the end of the page) go in one folded-away box, closed by default.
export function behindTheScene(html) {
  const at = html.search(/<h2 id="h-(how-it-works|code)">/);
  if (at < 0) return html;
  return html.slice(0, at) + `<details class="wk-bts"><summary><span class="wk-bts-code">&lt;/&gt;</span> <span class="wk-bts-title">Behind the Scene</span></summary>\n` + html.slice(at) + "</details>\n";
}

// ctx: { key: "chapter/page", readFile(path) -> string|null, problems: [] }
export function renderMarkdown(md, ctx) {
  const marked = new Marked();
  const headings = [];
  marked.use({
    renderer: {
      heading(text, level, raw) {
        const id = slugify(raw);
        if (level === 2) headings.push(raw);
        return `<h${level} id="h-${id}"><a class="anchor" href="#${ctx.key}:${id}">${text}</a></h${level}>\n`;
      },
      link(href, title, text) {
        const external = /^(https?:|mailto:)/.test(href);
        const to = external ? href : href.startsWith("#") ? href : "#" + href;
        return `<a href="${to}"${external ? ' target="_blank" rel="noopener"' : ""}>${text}</a>`;
      },
      blockquote(quote) {
        const m = /^<p><strong>(Note|Tip|Why|Warning)<\/strong>/.exec(quote);
        return `<blockquote class="callout${m ? " " + m[1].toLowerCase() : ""}">${quote}</blockquote>\n`;
      },
      code(code, info) {
        const [lang = "", ...parts] = (info || "").split(/\s+/);
        const attrs = Object.fromEntries(parts.filter((x) => x.includes("=")).map((x) => [x.slice(0, x.indexOf("=")), x.slice(x.indexOf("=") + 1)]));
        if (attrs.file) {
          const text = ctx.readFile(attrs.file);
          if (text == null) { ctx.problems.push(`${ctx.key}: the file ${attrs.file} does not exist`); return ""; }
          const found = locateCode(code, attrs, text);
          if (found.error) { ctx.problems.push(`${ctx.key}: in ${attrs.file}, ${found.error}`); return ""; }
          const caption = `<figcaption><span>${esc(attrs.file)}</span><span>${rangeText(found.pieces)}</span></figcaption>`;
          return `<figure class="code">${caption}<pre><code>${renderLines(found.lines, found.pieces, lang)}</code></pre></figure>\n`;
        }
        return `<figure class="code"><pre><code>${highlight(code, lang)}</code></pre></figure>\n`;
      },
    },
  });
  const html = behindTheScene(marked.parse(md));
  const warnings = [];
  if (!/<!--\s*no-parts\s*-->/.test(md)) {
    const missing = PARTS.filter((p) => !headings.includes(p));
    if (missing.length) warnings.push(`${ctx.key}: missing part(s): ${missing.join(", ")}`);
  }
  const text = html.replace(/<[^>]*>/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
  return { html, text, warnings };
}
