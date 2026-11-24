## Intro

A document is only as good as its fonts, and a font has to be **available where the document is drawn**. This page shows how Markdown to PDF gets the fonts into the document: the font tables, the Google Fonts links in the document's head, and what happens for fonts that come from your own computer.

## How to use

- Use the **Font Family** box ([Typeface](md2pdf/typography/typeface)). **Inter, Merriweather and JetBrains Mono** are downloaded from Google Fonts when the document is built (you need an internet connection the first time).
- **Georgia, Garamond, Arial, Times New Roman** and fonts loaded with **Load Local System Fonts** are read from your computer. The PDF looks right *on your computer*; it is the print dialog that turns it into a PDF with the font embedded.
- Code blocks and inline code ask for **JetBrains Mono**, then any monospace font on your computer. JetBrains Mono is only downloaded when you pick it as the body or heading font.
- Because the PDF is made from the browser's own print engine, the fonts are embedded in the PDF automatically.

## How it works

### Two kinds of font

1. **Web fonts:** the three in `WEB_SAFE_GOOGLE_FONTS`. The document's `<head>` gets `<link>` tags that fetch them from Google. The code calls them "web-safe" because they are loaded the same way for everyone.
2. **System fonts:** everything else. No download: the name is simply written into the CSS, and the browser finds the font on the computer or, if missing, uses the next name in the stack.

### The stack

The font settings are turned into a **stack** (a prioritised list): `'Merriweather', Georgia, 'Times New Roman', serif`. For a name not in the table, `'Name', ui-sans-serif, system-ui, sans-serif` is used.

### Where the tags end up

Every document is built with the tags in the `<head>`: the **live preview** (a sandboxed frame), the **print window** for PDF export, and the hidden rasterising frame used for Send to ZineArranger ([Print to PDF](md2pdf/export/print-to-pdf)).

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### The font tables

```js file=apps/Markdown-to-PDF/src/settings/defaults.js
export var WEB_SAFE_GOOGLE_FONTS = {
  Inter: "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif",
  Merriweather: "'Merriweather', Georgia, 'Times New Roman', serif",
  'JetBrains Mono': "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
};

// Common system fonts that ship pre-loaded in the font combobox but do
// not need a webfont — they resolve from the OS font stack.
var SYSTEM_FONT_STACKS = {
  Georgia: "Georgia, 'Times New Roman', serif",
  Garamond: "Garamond, 'Apple Garamond', 'Times New Roman', serif",
  Arial: "Arial, Helvetica, sans-serif",
  'Times New Roman': "'Times New Roman', Times, serif",
};

export var FONT_STACKS = Object.assign({}, WEB_SAFE_GOOGLE_FONTS, SYSTEM_FONT_STACKS);
```

**The Logic:** objects used as lookup tables (key to value). `Object.assign({}, a, b)` makes a new object with the entries of `a` then `b`. (`{}` first, so neither source is changed.)

### The tags: `fontLinkTags`

```js file=apps/Markdown-to-PDF/src/document/fonts.js
// Link tags for both the body and (if different) the heading font.
export function fontLinkTags(normalized) {
  var tags = googleFontLinkTag(normalized.fontFamily);
  if (normalized.headingFontFamily !== normalized.fontFamily) {
    tags += googleFontLinkTag(normalized.headingFontFamily, true);
  }
  return tags;
}

function googleFontLinkTag(fontFamily, skipPreconnect) {
  if (WEB_SAFE_GOOGLE_FONTS.hasOwnProperty(fontFamily)) {
    var family = fontFamily.replace(/ /g, '+');
    return (
      (skipPreconnect
        ? ''
        : '<link rel="preconnect" href="https://fonts.googleapis.com">' +
          '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>') +
      '<link href="https://fonts.googleapis.com/css2?family=' +
      family +
      ':wght@400;600;700;800;900&display=swap" rel="stylesheet">'
    );
  }
  return '';
}
```

**The Logic:** the body font always gets a tag (if it is a web font). The heading font gets one **only if different** (`!==`), and with `skipPreconnect` set to true so the two early-connection hints are not written twice. The address ends with `:wght@400;600;700;800;900`: the **weights** to download: 400 regular, 600 semi-bold, 700 bold, 800 extra-bold, 900 black. These match the Body Text weight choices. `display=swap` tells the browser to show text in a backup font at once and swap in the real one when it arrives, rather than leaving a blank gap.

**Worked example.**
| Body | Headings | Tags written |
|---|---|---|
| Inter | same | preconnect ×2 + Inter |
| Inter | Merriweather | preconnect ×2 + Inter + Merriweather |
| Georgia | same | none |
| Georgia | JetBrains Mono | the JetBrains Mono link only: the body call returned `''`, and the heading call has `skipPreconnect` set, so no preconnect hints are written |

For `JetBrains Mono` the address is `…family=JetBrains+Mono:wght@…`.

### Where it is used

```js file=apps/Markdown-to-PDF/src/document/previewDocument.js
  return (
    '<!DOCTYPE html>\n' +
    '<html lang="en">\n' +
    '<head>\n' +
    '  <meta charset="UTF-8">\n' +
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
    '  <title>Md to PDF Converter — Preview</title>\n' +
    '  ' +
    fontLinkTags(parts.normalized) +
    '\n' +
    '  <style>' +
```

**The Logic:** the preview document is assembled as one big string: `<!DOCTYPE html>`, the `<head>` with the character set (`UTF-8`, so accents and symbols work), the page title, **the font tags**, then the style block. That string is handed to an **iframe**, a box that shows a separate web page inside this one.
