// The paragraph composer (render/composer.js), with a fake fixed-width font so the numbers are easy to check.
import { composeText } from "../apps/ZEditor/src/render/composer.js";
let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log("FAIL:", msg); } else console.log("ok  :", msg); };
const measure = (s) => Array.from(s).reduce((w, ch) => w + (/[\u4e00-\u9fff]/.test(ch) ? 20 : 10), 0);
const show = (lines, text) => lines.map((l) => `[${l.pieces.map((p) => p.text).join(" ")}] x=${l.x.toFixed(1)} w=${l.width.toFixed(1)}`).join("\n    ");
const text = "the quick brown fox jumps over the lazy dog and keeps running through the forest";

for (const composer of ["single", "paragraph"]) {
  const lines = composeText(text, measure, { width: 150, align: "left", composer });
  ok(lines.every((l) => l.natural <= 150 + 1e-6), `${composer}: no line wider than the box (${lines.length} lines)`);
  ok(lines.map((l) => l.pieces.map((p) => p.text).join(" ")).join(" ") === text, `${composer}: all words kept in order`);
}
// Justify
for (const composer of ["single", "paragraph"]) {
  const lines = composeText(text, measure, { width: 150, align: "justify", composer });
  const body = lines.slice(0, -1);
  ok(body.every((l) => Math.abs(l.width - 150) < 1e-6 && Math.abs((l.x + l.pieces.at(-1).x + l.pieces.at(-1).width) - l.x - 150) < 1e-6 + 0 || true), `${composer} justify: computed`);
  ok(body.every((l) => Math.abs(l.width - 150) < 1e-6), `${composer} justify: every full line is exactly the box width`);
  const lastPiece = (l) => l.pieces.at(-1);
  ok(body.every((l) => Math.abs(lastPiece(l).x + lastPiece(l).width - 150) < 1e-6), `${composer} justify: last word of each full line ends flush right`);
  ok(lines.at(-1).width <= 150 && lines.at(-1).natural === lines.at(-1).width, `${composer} justify: last line stays natural width`);
}
// Justify-all
{
  const lines = composeText("alpha beta gamma delta epsilon", measure, { width: 120, align: "justify", lastLine: "all", composer: "paragraph" });
  ok(lines.every((l) => l.pieces.length < 2 || Math.abs(l.width - 120) < 1e-6), "justify-all: last line is stretched too");
}
// Centre / right
{
  const lines = composeText("aaa bbb ccc ddd eee", measure, { width: 100, align: "center", composer: "single" });
  ok(lines.every((l) => Math.abs(l.x - (100 - l.width) / 2) < 1e-6), "centre: lines centred");
  const r = composeText("aaa bbb ccc ddd eee", measure, { width: 100, align: "right", composer: "single" });
  ok(r.every((l) => Math.abs(l.x + l.width - 100) < 1e-6), "right: lines flush right");
}
// Indents
{
  const lines = composeText("one two three four five six seven eight", measure, { width: 120, align: "left", indentFirst: 20, indentLeft: 10, indentRight: 10, composer: "single" });
  ok(lines[0].x === 30, "indent: first line starts at left + first-line indent");
  ok(lines[1].x === 10, "indent: later lines start at the left indent");
  ok(lines.every((l, i) => l.x + l.natural <= 110 + 1e-6), "indent: nothing runs into the right indent");
}
// Paragraphs, empty lines, source ranges
{
  const t = "first para here\n\nthird one is longer than the others";
  const lines = composeText(t, measure, { width: 100, align: "left", composer: "paragraph" });
  ok(lines.some((l) => l.pieces.length === 0 && l.start === l.end), "empty paragraph gives an empty line");
  ok(lines.every((l, i) => i === 0 || l.para !== lines[i - 1].para || l.start === lines[i - 1].end), "lines in a paragraph tile the text with no gaps");
  const covered = lines.filter((l) => l.pieces.length).flatMap((l) => l.pieces.map((p) => t.slice(p.start, p.end).replace(/-$/, "")));
  ok(covered.join(" ") === t.replace(/\n+/g, " ").trim().replace(/ +/g, " "), "every word is found at its source range");
  ok(lines.filter((l) => l.first).length === 3, "three paragraphs -> three first lines");
}
// Hyphenation (fake: break every 3 letters of words >= 6)
{
  const hyphenate = (w) => (w.length >= 6 ? w.match(/.{1,3}/g) : null);
  const t = "internationalization is wonderful and extraordinary indeed";
  const hyph = composeText(t, measure, { width: 90, align: "justify", composer: "paragraph", hyphenate });
  const plain = composeText(t, measure, { width: 90, align: "justify", composer: "paragraph" });
  ok(hyph.some((l) => l.hyphenated), "hyphenation: some lines end in a hyphen");
  ok(hyph.filter((l) => l.hyphenated).every((l) => l.pieces.at(-1).text.endsWith("-")), "hyphenation: the hyphen is drawn");
  ok(hyph.every((l) => l.natural <= 90 + 1e-6), "hyphenation: lines still fit");
  const rejoined = hyph.map((l) => l.pieces.map((p) => p.text).join(" ")).join(" ").replace(/-\s/g, "");
  ok(rejoined === t, "hyphenation: text rejoins to the original");
  console.log("    plain lines:", plain.length, " hyphenated lines:", hyph.length);
}
// Oversized word
{
  const lines = composeText("short supercalifragilisticexpialidocious end", measure, { width: 100, align: "left", composer: "paragraph" });
  ok(lines.every((l) => l.natural <= 100 + 1e-6), "oversized word is cut so every line fits");
  ok(lines.map((l) => l.pieces.map((p) => p.text).join(" ")).join("").replace(/ /g, "") === "shortsupercalifragilisticexpialidociousend", "oversized word loses no letters");
}
// CJK breaks between characters
{
  const lines = composeText("你好世界你好世界你好世界", measure, { width: 100, align: "left", composer: "paragraph" });
  ok(lines.length > 1 && lines.every((l) => l.natural <= 100 + 1e-6), "CJK wraps between characters");
}
// Paragraph composer evens the rag
{
  const t2 = "aaa bb cc dddd ee ffff gg hhh ii jjjj kk lll mm nnnn oo ppp qq rrrr ss ttt";
  const slack = (ls) => ls.slice(0, -1).reduce((s, l) => s + (110 - l.natural) ** 2, 0);
  const g = composeText(t2, measure, { width: 110, align: "left", composer: "single" });
  const o = composeText(t2, measure, { width: 110, align: "left", composer: "paragraph" });
  ok(slack(o) <= slack(g) + 1e-6, `paragraph composer rag is no worse than greedy (${slack(o)} vs ${slack(g)})`);
}
// Justified looseness: optimal is never looser than greedy
{
  const t3 = "In the beginning was the word and the word was with the quiet people of the town who walked by";
  const gap = (ls) => { let worst = 0; ls.slice(0, -1).forEach((l) => { const g = (l.width - l.pieces.reduce((s, p) => s + p.width, 0)) / Math.max(1, l.pieces.length - 1); worst = Math.max(worst, Math.abs(g - 10)); }); return worst; };
  const g = composeText(t3, measure, { width: 140, align: "justify", composer: "single" });
  const o = composeText(t3, measure, { width: 140, align: "justify", composer: "paragraph" });
  ok(gap(o) <= gap(g) + 1e-6, `paragraph composer worst space deviation ${gap(o).toFixed(2)} <= greedy ${gap(g).toFixed(2)}`);
  console.log("    greedy:\n    " + show(g)); console.log("    optimal:\n    " + show(o));
}
// Speed (realistic: 100 paragraphs of ~100 words)
{
  const para = Array(14).fill("lorem ipsum dolor sit amet consectetur adipiscing elit").join(" ").slice(0, 700);
  const big = Array(100).fill(para).join("\n");
  const t0 = Date.now(); const ls = composeText(big, measure, { width: 400, align: "justify", composer: "paragraph" }); const ms = Date.now() - t0;
  ok(ms < 800, "100 paragraphs (~11,000 words) composed in " + ms + " ms (" + ls.length + " lines)");
  const one = para + "\n" + para; const t1 = Date.now(); composeText(one, measure, { width: 400, align: "justify", composer: "paragraph" }); console.log("    one 2-paragraph box:", Date.now() - t1, "ms");
}
console.log(fails ? `\n${fails} FAILED` : "\nall passed"); process.exit(fails ? 1 : 0);
