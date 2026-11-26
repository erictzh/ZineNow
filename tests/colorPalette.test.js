// The colour palette grid (model/colorPalette.js).
import { buildPalette } from "../apps/ZEditor/src/model/colorPalette.js";
let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log("FAIL:", msg); } else console.log("ok  :", msg); };
const rows = buildPalette(), all = rows.flat();
ok(rows.length === 8 && rows.every((r) => r.length === 10), "8 rows of 10");
ok(rows[0][0].hex === "#000000" && rows[0][9].hex === "#ffffff" && rows[0][0].name === "Black" && rows[0][9].name === "White", "the first row runs from black to white");
ok(rows[1].map((c) => c.name).join() === "Berry,Red,Orange,Yellow,Green,Cyan,Cornflower blue,Blue,Purple,Magenta", "the second row is the ten vivid colours");
ok(all.every((c) => /^#[0-9a-f]{6}$/.test(c.hex)) && all.every((c) => c.name.length > 2), "every cell has a colour and a name");
ok(new Set(all.map((c) => c.name)).size === all.length, "every name is different");
ok(rows[2][1].name === "Light red 3" && rows[4][1].name === "Light red 1" && rows[5][1].name === "Dark red 1" && rows[7][1].name === "Dark red 3", "names count up toward the vivid colour from both sides");
const lum = (h) => parseInt(h.slice(1, 3), 16) + parseInt(h.slice(3, 5), 16) + parseInt(h.slice(5, 7), 16);
ok(lum(rows[2][3].hex) > lum(rows[4][3].hex) && lum(rows[4][3].hex) > lum(rows[1][3].hex) && lum(rows[1][3].hex) > lum(rows[7][3].hex), "light rows are paler than vivid, dark rows darker (checked on yellow)");
if (fails) { console.log(fails + " failed"); process.exit(1); }
