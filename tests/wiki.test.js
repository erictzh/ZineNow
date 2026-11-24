// The wiki converter (apps/Wiki/wikiLib.mjs): code checking, callouts, links, the four parts.
import { behindTheScene, renderMarkdown, locateCode, findFunction, highlight, PARTS } from "../apps/Wiki/wikiLib.mjs";
let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log("FAIL:", msg); } else console.log("ok  :", msg); };

const file = "function a() {\n  return 1;\n}\n\nfunction b() {\n  return 2;\n}\n";

ok(findFunction(file.split("\n"), "b") .join() === "4,6", "a whole function is found by its name (first and last line)");
ok(findFunction(["export const f = (a) => {", "  return { a };", "};"], "f").join() === "0,2", "an arrow function assigned to a const is found too");
ok(locateCode("function a() {\n return 1;\n}", {}, file).pieces[0].to === 2 && locateCode("function a() { return 3; }", {}, file).error, "typed lines are found in the file (spacing ignored), others are rejected");
ok(locateCode("function a() {\n// …\n  return 2;", {}, file).error === undefined && locateCode("function a() {\n// …\n  return 5;", {}, file).error, "a … line starts a new piece; every piece must exist");
ok(findFunction(["const place = (a) => {", "  return a;", "};", "const place = (b) => {", "  return b;", "};"], "place", 2).join() === "3,5", "fn=name#2 finds the second function of that name");
ok(findFunction(["export function w(t) {", "  const re = /[\\p{L}'\u2019_-]/u;", "  return re.test(t);", "}"], "w").join() === "0,3", "a regular expression with a quote in it does not confuse the function finder");
ok(findFunction(["export const f = (a) => !(a.x)", "  && Boolean(a.y);", "const g = 1;"], "f").join() === "0,1", "a statement that carries on in the next line (&&) is found whole");
const ctx = () => ({ key: "x/y", readFile: (p) => (p === "f.js" ? file : null), problems: [] });
let c = ctx();
renderMarkdown("```js file=f.js\nfunction a() {\n  return 9;\n}\n```", c);
ok(c.problems.length === 1 && /not in the file/.test(c.problems[0]), "a wrong quoted snippet is reported");
c = ctx();
renderMarkdown("```js file=nope.js\nx\n```", c);
ok(c.problems.length === 1 && /does not exist/.test(c.problems[0]), "a missing file is reported");

c = ctx();
const r = renderMarkdown("> **Tip** hi\n\n[next](ai-tools/ocr) and [web](https://example.com)\n\n## Intro\n", c);
ok(r.html.includes('class="callout tip"'), "a Tip quote becomes a callout");
ok(r.html.includes('href="#ai-tools/ocr"') && r.html.includes('target="_blank"'), "in-wiki links become hash links, web links open a new tab");
ok(r.warnings.length === 1 && PARTS.slice(1).every((p) => r.warnings[0].includes(p)), "missing parts are warned about");
ok(renderMarkdown("<!-- no-parts -->\n\nhello", ctx()).warnings.length === 0, "no-parts switches the warning off");
ok(highlight("const a = '<b>'; // hi", "js").includes("&lt;b&gt;") && highlight("if (x)", "js").includes("t-k"), "highlighting escapes code and marks keywords");

const fnPage = renderMarkdown("```js file=f.js fn=b\n```", ctx());
ok(fnPage.html.includes("lines 5–7") && fnPage.html.includes('<span class="ln">5</span>') && fnPage.html.includes("return"), "a fn= block shows the whole function with the file's real line numbers");
const gapPage = renderMarkdown("```js file=f.js\nfunction a() {\n// …\n  return 2;\n```", ctx());
ok(gapPage.html.includes("lines 1, 6") && gapPage.html.includes('class="line gap"'), "pieces of a block are numbered separately and divided by a ⋮ row");
const bts = renderMarkdown("## Intro\n\nhi\n\n## How to use\n\nx\n\n## How it works\n\ny\n\n## Code\n\nz", ctx()).html;
ok(/<details class="wk-bts">/.test(bts) && !/<details class="wk-bts"[^>]* open/.test(bts), "How it works and Code sit in one folded box, closed by default");
ok(bts.indexOf("h-how-to-use") < bts.indexOf("<details") && bts.indexOf("h-how-it-works") > bts.indexOf("<details") && bts.trim().endsWith("</details>"), "the box starts at How it works and runs to the end; Intro and How to use stay outside");
ok(bts.includes("&lt;/&gt;</span> <span class=\"wk-bts-title\">Behind the Scene") && behindTheScene("<h2 id=\"h-intro\">Intro</h2>") === "<h2 id=\"h-intro\">Intro</h2>", "titled </> Behind the Scene; a page without those parts is left alone");
console.log(fails ? "\n" + fails + " FAILED" : "\nall passed");
process.exit(fails ? 1 : 0);
