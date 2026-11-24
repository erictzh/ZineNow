// The wiki's converter: Markdown -> HTML, with the little extras the wiki needs. Pure (no file access), so tests can import it.
//  - code blocks tagged `js file=apps/..` are CHECKED against that file: the snippet must really be there (lines of
//    just "…" or "// …" split a snippet into pieces that may be far apart in the file)
//  - callouts: a quote starting with **Note**, **Tip**, **Why** or **Warning**
//  - links like [x](ai-tools/ocr) or (ai-tools/ocr:how-it-works) become in-wiki links
import { Marked } from "marked";

export const PARTS = ["Intro", "How to use", "How it works", "Code"];
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export const slugify = (s) => s.toLowerCase().replace(/<[^>]*>/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const JS_WORDS = "import|export|from|const|let|var|function|return|if|else|for|of|in|while|new|await|async|class|true|false|null|undefined|this|typeof|throw|try|catch|break|continue|default";
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

// Is `code` really in `fileText`? Whitespace is ignored; "…" lines split it into pieces that must each be found.
export function snippetInFile(code, fileText) {
  const norm = (s) => s.replace(/\s+/g, " ").trim();
  const hay = norm(fileText);
  return code.split(/^[ \t]*(?:\/\/[ \t]*|\/\*[ \t]*|#[ \t]*)?…[ \t]*(?:\*\/)?[ \t]*$/m).map(norm).filter(Boolean).every((c) => hay.includes(c));
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
        const [lang = "", ...attrs] = (info || "").split(/\s+/);
        const file = (attrs.find((a) => a.startsWith("file=")) || "").slice(5);
        let caption = "";
        if (file) {
          const text = ctx.readFile(file);
          if (text == null) ctx.problems.push(`${ctx.key}: the file ${file} does not exist`);
          else if (!snippetInFile(code, text)) ctx.problems.push(`${ctx.key}: this snippet is not in ${file}:\n${code.split("\n").slice(0, 3).join("\n")} …`);
          caption = `<figcaption>${esc(file)}</figcaption>`;
        }
        return `<figure class="code">${caption}<pre><code>${highlight(code, lang)}</code></pre></figure>\n`;
      },
    },
  });
  const html = marked.parse(md);
  const warnings = [];
  if (!/<!--\s*no-parts\s*-->/.test(md)) {
    const missing = PARTS.filter((p) => !headings.includes(p));
    if (missing.length) warnings.push(`${ctx.key}: missing part(s): ${missing.join(", ")}`);
  }
  const text = html.replace(/<[^>]*>/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
  return { html, text, warnings };
}
