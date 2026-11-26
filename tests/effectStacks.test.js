// Stacked strokes and shadows (model/effectStacks.js).
import { gradientLine, strokeIsGradient, strokeStops, DEFAULT_SHADOW, DEFAULT_STROKE, shadowLayers, shadowOffsetOf, shadowReach, shadowsPatch, strokeLayers, strokeReach, strokesPatch } from "../apps/ZEditor/src/model/effectStacks.js";
let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log("FAIL:", msg); } else console.log("ok  :", msg); };

ok(strokeLayers({}).length === 0 && shadowLayers({}).length === 0, "nothing set, no layers");
const old = strokeLayers({ stroke: true, strokeColor: "#ff0000", strokeThickness: 7 });
ok(old.length === 1 && old[0].color === "#ff0000" && old[0].thickness === 7 && old[0].position === "center", "an old single stroke reads as one centred layer");
ok(strokeLayers({ stroke: true })[0].color === DEFAULT_STROKE.color && strokeLayers({ stroke: true })[0].thickness === DEFAULT_STROKE.thickness, "with no settings the defaults are used");
const oldShadow = shadowLayers({ shadow: true, shadowColor: "#222222", shadowThickness: 9, shadowDirection: 90, shadowBlur: 3 });
ok(oldShadow.length === 1 && oldShadow[0].thickness === 9 && oldShadow[0].direction === 90 && oldShadow[0].blur === 3, "an old shadow reads as one layer");
ok(shadowLayers({ shadow: true })[0].thickness === DEFAULT_SHADOW.thickness, "shadow defaults");

const stacked = strokeLayers({ strokes: [{ color: "#fff", thickness: 99, position: "outside" }, { color: "#00ff00", thickness: -4, position: "nope" }], stroke: true });
ok(stacked.length === 2 && stacked[0].color === DEFAULT_STROKE.color && stacked[0].thickness === 40 && stacked[0].position === "outside" && stacked[1].thickness === 0.5 && stacked[1].position === "center", "a stored list is used, and bad values are made safe");
ok(strokeLayers({ strokes: [{}] }).length === 0 && shadowLayers({ shadows: [{}] }).length === 0, "with the flag off the list is ignored");
ok(strokeLayers({ stroke: true, strokes: Array.from({ length: 20 }, () => ({})) }).length === 8, "at most 8 layers");

const textOld = strokeLayers({ type: "text", stroke: true, strokeColor: "#112233", strokeThickness: 6 });
ok(textOld.length === 1 && textOld[0].position === "outside" && textOld[0].thickness === 3 && textOld[0].color === "#112233", "an old text stroke (drawn under the letters) reads as an outside stroke half as thick: it looks the same");
ok(strokeLayers({ type: "text", stroke: true, strokeThickness: 1 })[0].thickness === 0.5, "down to half a pixel");

const p = strokesPatch([{ color: "#000000", thickness: 5, position: "inside" }]);
ok(p.stroke === true && p.strokes.length === 1 && "strokeColor" in p && p.strokeColor === undefined && p.feather === false, "storing a stroke list sets the flag, clears the old props and turns Feather off");
const none = strokesPatch([]);
ok(none.stroke === false && none.strokes.length === 0 && !("feather" in none), "an empty list turns the flag off");
const sp = shadowsPatch([{ color: "#000000", thickness: 4, direction: 180, blur: 2 }]);
ok(sp.shadow === true && sp.shadows.length === 1 && sp.shadowBlur === undefined, "the same for shadows");

ok(strokeReach([{ position: "inside", thickness: 10 }]) === 0, "an inside stroke reaches nothing outside");
ok(strokeReach([{ position: "center", thickness: 10 }]) === 20 && strokeReach([{ position: "outside", thickness: 10 }]) === 40, "centre reaches half, outside the full width (times the miter limit)");
ok(strokeReach([{ position: "center", thickness: 2 }, { position: "outside", thickness: 5 }]) === 20, "the largest layer counts");
ok(shadowReach([{ thickness: 5, blur: 4 }, { thickness: 10, blur: 0 }]) === 13, "shadow reach is distance plus blur, the largest wins");
const o = shadowOffsetOf({ thickness: 10, direction: 90, blur: 0, color: "#000000" }), d = shadowOffsetOf({ thickness: 10, direction: 180, blur: 0, color: "#000000" });
ok(Math.abs(o.x - 10) < 1e-9 && Math.abs(o.y) < 1e-9 && Math.abs(d.y - 10) < 1e-9, "direction 90° is right and 180° is down");
const gs = strokeLayers({ stroke: true, strokes: [{ color: "#112233", color2: "#445566", fill: "gradient", angle: 45 }, { color: "#000000" }] });
ok(strokeIsGradient(gs[0]) && !strokeIsGradient(gs[1]) && gs[0].angle === 45 && gs[0].color2 === "#445566", "a stroke can be a gradient; the default is solid");
ok(strokeStops(gs[0]).map((s) => s.percent + s.color).join() === "0#112233,100#445566", "a gradient stroke runs from colour 1 to colour 2");
ok(strokeLayers({ stroke: true, strokes: [{ fill: "wavy", color2: "x", angle: 999 }] })[0].fill === "solid" && strokeLayers({ stroke: true, strokes: [{ angle: 999 }] })[0].angle === 360, "bad gradient settings are made safe");
const gl = gradientLine(90, 0, 0, 100, 40), gu = gradientLine(0, 0, 0, 100, 40);
ok(Math.abs(gl.x1) < 1e-9 && Math.abs(gl.x2 - 100) < 1e-9 && Math.abs(gl.y1 - 20) < 1e-9, "angle 90° runs left to right through the middle");
ok(Math.abs(gu.y1 - 40) < 1e-9 && Math.abs(gu.y2) < 1e-9, "angle 0° runs from the bottom to the top");
if (fails) { console.log(fails + " failed"); process.exit(1); }
