// Linked text styles (model/text/textStyles.js): resolving, based-on, overrides, relinking.
import * as S from "../apps/ZEditor/src/model/text/textStyles.js";
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log("FAIL:", m); } else console.log("ok  :", m); };
const styles = [
  { name: "Body", props: { fontFamily: "Georgia", fontSize: 13, align: "justify", indentFirst: 12, hyphenate: "english" } },
  { name: "Quote", basedOn: "Body", props: { italic: true, indentLeft: 20, hyphenate: null } },
];
const body = S.resolvedStyleProps(styles, "Body"), quote = S.resolvedStyleProps(styles, "Quote");
ok(body.fontSize === 13 && body.hyphenate === "english", "resolved: a plain style is its own props");
ok(quote.fontFamily === "Georgia" && quote.italic === true && quote.indentLeft === 20 && quote.indentFirst === 12, "resolved: based-on style inherits and adds");
ok(!("hyphenate" in quote), "resolved: null removes what the base sets");
ok(Object.keys(S.resolvedStyleProps([{ name: "A", basedOn: "B", props: { x: 1 } }, { name: "B", basedOn: "A", props: { y: 2 } }], "A")).length === 2, "resolved: a cycle doesn't loop forever");
// diff
const d = S.styleDiff({ fontSize: 13, bold: true, color: "#000" }, { fontSize: 13, color: "#f00", italic: true });
ok(JSON.stringify(d) === JSON.stringify({ color: "#f00", italic: true, bold: null }), "diff: changes, additions and removals: " + JSON.stringify(d));
// overrides
const ann = { id: 1, type: "text", text: "hi", styleName: "Body", styleOverrides: ["color"] };
ok(JSON.stringify(S.withStyleOverrides(ann, { fontSize: 20 }).styleOverrides) === '["color","fontSize"]', "a style setting changed on a linked box becomes an override");
ok(S.withStyleOverrides(ann, { text: "new" }) === undefined || !("styleOverrides" in S.withStyleOverrides(ann, { text: "new" })), "changing the words is not an override");
ok(!("styleOverrides" in S.withStyleOverrides({ ...ann, styleName: undefined }, { fontSize: 20 })), "an unlinked box tracks nothing");
// relink
const box = { id: 2, type: "text", text: "hi", styleName: "Quote", styleOverrides: ["fontSize"], fontSize: 99, fontFamily: "Arial", italic: false };
const patch = S.relinkPatch(box, styles);
ok(patch.fontFamily === "Georgia" && patch.italic === true && patch.indentLeft === 20, "relink: restyles the box from its style");
ok(!("fontSize" in patch), "relink: leaves an overridden setting alone");
ok(S.relinkPatch({ type: "text", styleName: "Missing" }, styles) === null && S.relinkPatch({ type: "image" }, styles) === null, "relink: nothing for unlinked, missing or non-text");
console.log(fails ? fails + " FAILED" : "all passed"); process.exit(fails ? 1 : 0);
