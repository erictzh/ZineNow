// Emacs Muse (.muse) -> Markdown.

/* ------------------------------------------------------------------
 * convertMuseToMarkdown(museText)
 * ------------------------------------------------------------------
 * Hand-written, line-based translation from Muse (the lightweight
 * markup language from Emacs Muse / Text::Amuse) to Markdown — there
 * is no maintained JS library for Muse, unlike docx/epub below.
 * Covers the constructs in common everyday use: headings (1-5 `*` at
 * the start of a line), bold/italic (already valid Markdown syntax,
 * left as-is), underline (`_x_`, converted to `<u>x</u>` since
 * Markdown has no native underline, but marked.js — this app's
 * renderer — passes raw inline HTML straight through), inline
 * teletype (`=x=` -> `` `x` ``), `[[url][description]]` / `[[url]]`
 * links, unordered/ordered lists, horizontal rules, blockquotes
 * (indented text), and <example>/<verbatim> blocks (-> fenced code).
 * Directives this doesn't recognize (footnotes, tables, definition
 * lists, `#title`/`#author` headers) are passed through unchanged
 * rather than mangled, so at worst they need manual cleanup after
 * import instead of silently losing content.
 * ------------------------------------------------------------------ */
function convertMuseInline(s) {
  var result = String(s);

  // Links: [[url][description]] or [[url]] -> Markdown [text](url).
  result = result.replace(/\[\[([^\]\[]+)\]\[([^\]\[]+)\]\]/g, '[$2]($1)');
  result = result.replace(/\[\[([^\]\[]+)\]\]/g, '[$1]($1)');

  // Underline has no Markdown equivalent — kept as real underline via
  // raw HTML rather than silently becoming italic or disappearing.
  result = result.replace(/_([^_]+)_/g, '<u>$1</u>');

  // Inline teletype/fixed-width -> Markdown inline code.
  result = result.replace(/=([^=]+)=/g, '`$1`');

  // *emphasis*, **strong**, ***both*** are already valid Markdown
  // syntax as-is — no conversion needed for those.
  return result;
}

export function convertMuseToMarkdown(museText) {
  var text = String(museText || '').replace(/\r\n?/g, '\n');
  var lines = text.split('\n');
  var out = [];
  var inBlock = false; // inside <example>...</example> or <verbatim>...</verbatim>

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];

    if (/^\s*<(example|verbatim)>\s*$/i.test(line)) {
      inBlock = true;
      out.push('```');
      continue;
    }
    if (/^\s*<\/(example|verbatim)>\s*$/i.test(line)) {
      inBlock = false;
      out.push('```');
      continue;
    }
    if (inBlock) {
      out.push(line);
      continue;
    }

    // Directive lines (#title, #author, ...) and blank lines pass
    // through untouched.
    if (line.trim() === '' || /^#\w+\s/.test(line)) {
      out.push(line);
      continue;
    }

    // Horizontal rule: 4+ hyphens alone on a line.
    if (/^-{4,}\s*$/.test(line)) {
      out.push('---');
      continue;
    }

    // Headings: 1-5 leading asterisks + a space, at column 0.
    var headingMatch = line.match(/^(\*{1,5})\s+(.*)$/);
    if (headingMatch) {
      var level = Math.min(headingMatch[1].length, 6);
      out.push(new Array(level + 1).join('#') + ' ' + convertMuseInline(headingMatch[2]));
      continue;
    }

    // Unordered list item: optionally-indented "- ".
    var ulMatch = line.match(/^(\s*)-\s+(.*)$/);
    if (ulMatch) {
      out.push(ulMatch[1] + '- ' + convertMuseInline(ulMatch[2]));
      continue;
    }

    // Ordered list item: optionally-indented "1. ", "2. ", etc.
    var olMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
    if (olMatch) {
      out.push(olMatch[1] + olMatch[2] + '. ' + convertMuseInline(olMatch[3]));
      continue;
    }

    // Blockquote: text indented two or more spaces (and not one of
    // the list forms just checked) reads as quoted in Muse.
    if (/^ {2,}\S/.test(line)) {
      out.push('> ' + convertMuseInline(line.trim()));
      continue;
    }

    out.push(convertMuseInline(line));
  }

  return out.join('\n');
}
