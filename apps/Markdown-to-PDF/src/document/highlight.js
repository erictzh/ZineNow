// Syntax colours for fenced code blocks: runs Prism (loaded from a CDN in index.html) over marked's
// <pre><code class="language-…"> blocks, and the token colours that go with it.

// marked escapes these five in code; Prism wants the plain text back (it escapes its own output).
function unescapeHtml(s) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

// Colours every code block whose language Prism knows; any other block (plain, an unknown tag, or
// Prism not loaded at all) is left exactly as marked wrote it.
export function highlightCodeBlocks(html) {
  const Prism = typeof window !== "undefined" ? window.Prism : null;
  if (!Prism || typeof Prism.highlight !== "function" || !Prism.languages) return html;
  return html.replace(/<pre><code class="language-([^"\s]+)">([\s\S]*?)<\/code><\/pre>/g, (all, lang, body) => {
    const key = lang.toLowerCase();
    const grammar = Prism.languages[key];
    if (!grammar || typeof grammar !== "object") return all;
    try {
      const out = Prism.highlight(unescapeHtml(body), grammar, key);
      return '<pre class="md2ebook-code-hl"><code class="language-' + lang + '">' + out + "</code></pre>";
    } catch (e) {
      return all;
    }
  });
}

// Token colours, picked for the code block's dark background (styleBlock.js) and kept in print.
export function highlightCss() {
  return (
    "    .page pre.md2ebook-code-hl .token.comment, .page pre.md2ebook-code-hl .token.prolog, .page pre.md2ebook-code-hl .token.doctype, .page pre.md2ebook-code-hl .token.cdata { color: #94a3b8; font-style: italic; }\n" +
    "    .page pre.md2ebook-code-hl .token.punctuation { color: #cbd5e1; }\n" +
    "    .page pre.md2ebook-code-hl .token.property, .page pre.md2ebook-code-hl .token.tag, .page pre.md2ebook-code-hl .token.selector, .page pre.md2ebook-code-hl .token.cell, .page pre.md2ebook-code-hl .token.range, .page pre.md2ebook-code-hl .token.reference { color: #7dd3fc; }\n" +
    "    .page pre.md2ebook-code-hl .token.string, .page pre.md2ebook-code-hl .token.char, .page pre.md2ebook-code-hl .token.attr-value, .page pre.md2ebook-code-hl .token.inserted { color: #86efac; }\n" +
    "    .page pre.md2ebook-code-hl .token.number, .page pre.md2ebook-code-hl .token.boolean, .page pre.md2ebook-code-hl .token.constant, .page pre.md2ebook-code-hl .token.symbol { color: #fdba74; }\n" +
    "    .page pre.md2ebook-code-hl .token.keyword, .page pre.md2ebook-code-hl .token.atrule, .page pre.md2ebook-code-hl .token.important, .page pre.md2ebook-code-hl .token.builtin { color: #c4b5fd; }\n" +
    "    .page pre.md2ebook-code-hl .token.function, .page pre.md2ebook-code-hl .token.function-name, .page pre.md2ebook-code-hl .token.class-name, .page pre.md2ebook-code-hl .token.attr-name { color: #fde68a; }\n" +
    "    .page pre.md2ebook-code-hl .token.operator, .page pre.md2ebook-code-hl .token.entity, .page pre.md2ebook-code-hl .token.url, .page pre.md2ebook-code-hl .token.delimiter, .page pre.md2ebook-code-hl .token.filter { color: #f0abfc; }\n" +
    "    .page pre.md2ebook-code-hl .token.variable, .page pre.md2ebook-code-hl .token.regex, .page pre.md2ebook-code-hl .token.deleted { color: #fca5a5; }\n" +
    "    .page pre.md2ebook-code-hl .token.bold { font-weight: bold; }\n" +
    "    .page pre.md2ebook-code-hl .token.italic { font-style: italic; }\n" +
    "    .page pre.md2ebook-code-hl { -webkit-print-color-adjust: exact; print-color-adjust: exact; }\n"
  );
}
