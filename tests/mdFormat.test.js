// Markdown-to-PDF's editor toolbar edits (Markdown-to-PDF/src/editor/format.js).
import { applyEdit, blockAt, clampSpaceLines, insertBlockLine, insertCodeBlock, insertImageFile, insertImageLink, insertImageUrl, insertLink, nextImageRef, setBlock, toggleCodeBlock, toggleInline } from "../apps/Markdown-to-PDF/src/editor/format.js";
import { cleanLanguageTag, languageForFile } from "../apps/Markdown-to-PDF/src/editor/codeLanguages.js";
let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log("FAIL:", msg); } else console.log("ok  :", msg); };

// Runs an edit on text with the selection marked by [ and ] (or a single | for a caret), and returns
// the result with the new selection marked the same way.
function run(marked, fn, ...args) {
  const caret = marked.indexOf("|");
  let text, start, end;
  if (caret >= 0) { text = marked.replace("|", ""); start = end = caret; }
  else { start = marked.indexOf("["); end = marked.indexOf("]") - 1; text = marked.replace("[", "").replace("]", ""); }
  const edit = fn(text, start, end, ...args);
  const out = applyEdit(text, edit);
  if (edit.selStart === edit.selEnd) return out.slice(0, edit.selStart) + "|" + out.slice(edit.selStart);
  return out.slice(0, edit.selStart) + "[" + out.slice(edit.selStart, edit.selEnd) + "]" + out.slice(edit.selEnd);
}
const eq = (got, want, msg) => ok(got === want, msg + (got === want ? "" : `\n      got:  ${JSON.stringify(got)}\n      want: ${JSON.stringify(want)}`));

// Inline styles
eq(run("say [hello] there", toggleInline, "bold"), "say **[hello]** there", "bold wraps the selection");
eq(run("say **[hello]** there", toggleInline, "bold"), "say [hello] there", "bold again takes it off");
eq(run("say [**hello**] there", toggleInline, "bold"), "say [hello] there", "...also when the stars were selected too");
eq(run("say [hello ]there", toggleInline, "bold"), "say **[hello]** there", "edge spaces stay outside the stars");
eq(run("a |b", toggleInline, "bold"), "a **|**b", "with nothing selected, an empty pair with the caret inside");
eq(run("a **|**b", toggleInline, "bold"), "a |b", "...and pressing it again removes the empty pair");
eq(run("**[x]**", toggleInline, "italic"), "***[x]***", "italic on bold text adds a star rather than undoing bold");
eq(run("***[x]***", toggleInline, "italic"), "**[x]**", "italic off on bold-italic leaves it bold");
eq(run("***[x]***", toggleInline, "bold"), "*[x]*", "bold off on bold-italic leaves it italic");
eq(run("*[x]*", toggleInline, "bold"), "***[x]***", "bold on italic text makes it bold-italic");
eq(run("[x]", toggleInline, "strike"), "~~[x]~~", "strikethrough");
eq(run("`[x]`", toggleInline, "code"), "[x]", "code toggles off");

// Block styles
eq(run("hello|", setBlock, "h2"), "## hello|", "a heading level on a paragraph");
eq(run("# hel|lo", setBlock, "h3"), "### hel|lo", "a different level replaces the old one, caret stays put");
eq(run("## hel|lo", setBlock, "h2"), "hel|lo", "the same level again makes it a paragraph");
eq(run("> quo|ted", setBlock, "p"), "quo|ted", "paragraph takes a quote marker off");
eq(run("[a\nb\n\nc]", setBlock, "ol"), "[1. a\n2. b\n\n3. c]", "numbered list numbers each line, blank lines left alone");
eq(run("[- a\n- b]", setBlock, "ul"), "[a\nb]", "a bulleted list toggles off");
eq(run("[- a\nb]", setBlock, "ol"), "[1. a\n2. b]", "a numbered list replaces bullets");
eq(run("x\n[a\n]b", setBlock, "quote"), "x\n[> a]\nb", "a selection ending at a line start leaves that line alone");
ok(blockAt("# Title\nbody", 3) === "h1" && blockAt("# Title\nbody", 10) === "p" && blockAt("1. one", 0) === "ol", "the caret's line kind");

// Link, divider and markers
eq(run("see [the site] now", insertLink), "see [the site]([url]) now", "a link selects the url to type over");
eq(run("a |b", insertLink), "a [[link text]](url)b", "with nothing selected, the link text is selected");
eq(run("one|two", insertBlockLine, "---"), "one\n\n---\n\n|two", "a divider gets blank lines either side");
eq(run("one\n\n|", insertBlockLine, "\\toc"), "one\n\n\\toc|", "...only the ones that are missing");
ok(clampSpaceLines("-3") === 1 && clampSpaceLines("999") === 200 && clampSpaceLines("x") === 5, "blank-space height stays within 1–200");

// Fenced code blocks
// Images
eq(nextImageRef("no pictures"), "image-1", "first image reference is image-1");
eq(nextImageRef("x\n\n[image-2]: data:a\n[image-7]: data:b\n"), "image-8", "next reference is one past the highest");
eq(run("Intro|\n\nOutro", insertImageFile, "cat", "data:image/png;base64,AAA"),
  "Intro\n\n![cat][image-1]|\n\nOutro\n\n[image-1]: data:image/png;base64,AAA\n",
  "image from a file: a line at the caret, its data at the end");
eq(run("A|\n\n[image-1]: data:x\n", insertImageFile, "dog [2]", "data:y"),
  "A\n\n![dog  2][image-2]|\n\n[image-1]: data:x\n\n[image-2]: data:y\n",
  "...a second one gets the next number; brackets leave the alt text");
eq(run("|", insertImageFile, "", "data:z"), "![image][image-1]|\n\n[image-1]: data:z\n", "...into an empty document, alt defaults to image");
eq(run("See [a map] here", insertImageUrl), "See \n\n![a map]([https://])\n\n here", "image from the web: selected text becomes the alt, https:// selected");
eq(run("|", insertImageUrl), "![image]([https://])", "...with nothing selected");
eq(run("Hi|", insertImageLink, "a [b]", "https://x.test/a b(1).png"), "Hi\n\n![a b](https://x.test/a%20b%281%29.png)|", "linked picture: alt cleaned, address kept safe");
eq(run("|", insertImageLink, "", "https://x.test/p.jpg"), "![image](https://x.test/p.jpg)|", "...empty alt becomes image");

const F = "```";
eq(run("one|", toggleCodeBlock, "json"), "one\n\n" + F + "json\n|\n" + F, "nothing selected: an empty block with the caret inside");
eq(run("intro\n[{\"a\": 1}]\nend", toggleCodeBlock, "json"), "intro\n\n" + F + "json\n[{\"a\": 1}]\n" + F + "\n\nend", "a selection is wrapped, whole lines, and stays selected");
eq(run("[x = `a`]", toggleCodeBlock, ""), F + "\n[x = `a`]\n" + F, "plain text: no language tag");
eq(run(F + "json\n{|}\n" + F, toggleCodeBlock, "json"), "{|}", "the same language again takes the fences off");
eq(run(F + "json\n{|}\n" + F, toggleCodeBlock, "php"), F + "php\n{|}\n" + F, "another language changes the block's tag");
eq(run("[has ``` inside]", toggleCodeBlock, ""), "````\n[has ``` inside]\n````", "backticks inside get a longer fence");
ok(blockAt("a\n" + F + "\nx\n" + F + "\nb", 6) === "code" && blockAt("a\n" + F + "\nx\n" + F + "\nb", 0) === "p", "the caret inside a fenced block reads as code");
eq(run("one|", insertCodeBlock, "{\r\n  \"k\": 1\r\n}\r\n\r\n", "json"), "one\n\n" + F + "json\n{\n  \"k\": 1\n}\n" + F + "|", "a file's text goes in as a block, line endings cleaned");
ok(languageForFile("theme.LIQUID") === "liquid" && languageForFile("a.json") === "json" && languageForFile("notes") === "" && languageForFile("x.zzz") === "", "file extensions pick the language");
ok(cleanLanguageTag("  Excel Formula ") === "excel-formula" && cleanLanguageTag("a`b") === "a-b", "typed tags are cleaned");

if (fails) { console.log(`${fails} failed`); process.exit(1); }
