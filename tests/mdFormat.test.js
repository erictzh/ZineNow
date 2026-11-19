// Markdown-to-PDF's editor toolbar edits (Markdown-to-PDF/src/editor/format.js).
import { applyEdit, blockAt, clampSpaceLines, insertBlockLine, insertLink, setBlock, toggleInline } from "../apps/Markdown-to-PDF/src/editor/format.js";
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

if (fails) { console.log(`${fails} failed`); process.exit(1); }
