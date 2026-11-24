// The wiki converter (apps/Wiki/wikiLib.mjs): code checking, callouts, links, the four parts.
import { renderMarkdown, snippetInFile, highlight, PARTS } from "../apps/Wiki/wikiLib.mjs";
let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log("FAIL:", msg); } else console.log("ok  :", msg); };

const file = "function a() {\n  return 1;\n}\n\nfunction b() {\n  return 2;\n}\n";
ok(snippetInFile("function a() {\n return 1;\n}", file), "a snippet found in the file (spacing ignored)");
ok(!snippetInFile("function a() { return 3; }", file), "a snippet that is not in the file is rejected");
ok(snippetInFile("function a() {\n// …\n  return 2;\n}", file) && !snippetInFile("function a() {\n// …\n  return 5;", file), "a … line splits a snippet into pieces found separately (each must exist)");

const ctx = () => ({ key: "x/y", readFile: (p) => (p === "f.js" ? file : null), problems: [] });
let c = ctx();
renderMarkdown("```js file=f.js\nfunction a() {\n  return 9;\n}\n```", c);
ok(c.problems.length === 1 && /not in f.js/.test(c.problems[0]), "a wrong quoted snippet is reported");
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
console.log(fails ? "\n" + fails + " FAILED" : "\nall passed");
process.exit(fails ? 1 : 0);
