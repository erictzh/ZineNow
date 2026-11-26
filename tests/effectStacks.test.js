// Stacked strokes and shadows (model/effectStacks.js).
import { DEFAULT_SHADOW, DEFAULT_STROKE, shadowLayers, shadowOffsetOf, shadowReach, shadowsPatch, strokeLayers, strokeReach, strokesPatch } from "../apps/ZEditor/src/model/effectStacks.js";
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
ok(stacked.length === 2 && stacked[0].color === DEFAULT_STROKE.color && stacked[0].thickness === 40 && stacked[0].position === "outside" && stacked[1].thickness === 1 && stacked[1].position === "center", "a stored list is used, and bad values are made safe");
ok(strokeLayers({ strokes: [{}] }).length === 0 && shadowLayers({ shadows: [{}] }).length === 0, "with the flag off the list is ignored");
ok(strokeLayers({ stroke: true, strokes: Array.from({ length: 20 }, () => ({})) }).length === 8, "at most 8 layers");

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
if (fails) { console.log(fails + " failed"); process.exit(1); }
