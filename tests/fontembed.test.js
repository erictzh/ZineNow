// Embedding system fonts in a project (apps/ZEditor/src/io/fontEmbed.js, projectFile.js, fontFiles.js).
import { buildEmbeddedFonts, faceKey, faceKind, faceLabel, formatBytes, usedFaces } from "../apps/ZEditor/src/io/fontEmbed.js";
import { customFontStore } from "../apps/ZEditor/src/io/customFonts.js";
import { createFontResolver } from "../apps/ZEditor/src/io/fontFiles.js";
import { serializeProject } from "../apps/ZEditor/src/io/projectFile.js";
import { arrayBufferToBase64 } from "../apps/ZEditor/src/io/base64.js";
let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log("FAIL:", msg); } else console.log("ok  :", msg); };

const text = (id, o) => ({ id, type: "text", x: 0, y: 0, width: 100, height: 30, text: "Hello world", ...o });
const pages = [{ key: 1, annotations: [
  text(1, { fontFamily: "Inter", bold: false }),
  text(2, { fontFamily: "Inter", bold: true }),
  text(3, { fontFamily: "My Upload", colorRuns: [{ start: 0, end: 5, fontFamily: "Spans Only", italic: true }] }),
  text(4, { fontFamily: "sans-serif" }),
  { id: 5, type: "rect", x: 0, y: 0, width: 10, height: 10 },
] }];
const faces = usedFaces(pages);
ok(faces.map((f) => f.key).join(",") === "Inter|,Inter|b,My Upload|,sans-serif|,Spans Only|i", "the faces the text uses, sorted, including a font used only by a restyled stretch of text: " + faces.map((f) => f.key).join(","));
ok(faceLabel({ family: "Inter", bold: true, italic: true }) === "Inter — Bold Italic" && faceLabel({ family: "Inter" }) === "Inter — Regular", "a face's label");

customFontStore.length = 0;
customFontStore.push({ family: "My Upload", data: "AAAA" });
ok(faceKind({ family: "My Upload", bold: false, italic: false }) === "uploaded" && faceKind({ family: "My Upload", bold: true, italic: false }) === "uploaded", "an uploaded font covers every style of its family");
ok(faceKind({ family: "Inter", bold: false, italic: false }) === "system" && faceKind({ family: "sans-serif", bold: false, italic: false }) === "generic", "a font of this computer is 'system', a CSS name is 'generic'");
customFontStore.push({ family: "Inter", data: "BBBB", source: "system" });
ok(faceKind({ family: "Inter", bold: false, italic: false }) === "embedded" && faceKind({ family: "Inter", bold: true, italic: false }) === "system", "a system font embedded earlier: that style is 'embedded', a style it does not carry is still 'system'");
customFontStore.length = 0;

(async () => {
// a pretend resolver that "reads" fonts from this computer
const files = { "Inter|": new Uint8Array([1, 2, 3, 4]), "Inter|b": new Uint8Array([5, 6]) };
const resolver = { find: async (family, bold, italic) => { const f = files[faceKey(family, bold, italic)]; return f ? { key: "k", bytes: f.buffer } : null; } };
customFontStore.push({ family: "My Upload", data: "AAAA" }); // an uploaded font: always inside, never read from this computer
const built = await buildEmbeddedFonts(pages, [], resolver);
ok(built.fonts.length === 2 && built.total === 6 && built.missing.join("|") === "Spans Only — Italic", "system faces are read (Inter Regular and Bold); the one that can't be read is reported: " + built.missing.join("|"));
ok(built.fonts[1].bold === true && built.fonts[1].italic === undefined && built.fonts[0].source === "system" && built.fonts[0].data === arrayBufferToBase64(files["Inter|"].buffer), "the font entries carry the base64 file, the style and where they came from");
const skipped = await buildEmbeddedFonts(pages, ["Inter|b"], resolver);
ok(skipped.fonts.length === 1 && skipped.fonts[0].bold === undefined, "a face left out in the list is not embedded");

// the saved project
customFontStore.push({ family: "Unused", data: "CCCC" }, { family: "Spans Only", data: "DDDD" });
const json = JSON.parse(serializeProject({ title: "t", pdfDocs: {}, pages, textStyles: [], settings: { embedFonts: true }, embeddedFonts: built.fonts }));
const names = json.fonts.map((f) => f.family + (f.bold ? ":b" : "") + (f.source ? ":sys" : ""));
ok(names.join(",") === "My Upload,Spans Only,Inter:sys,Inter:b:sys", "the project carries the used uploaded fonts (also one used only in a restyled stretch), not the unused one, and the embedded system fonts: " + names.join(","));
ok(json.settings.embedFonts === true, "the setting is saved with the project");
customFontStore.length = 0;

// the PDF export looks up the exact face first
customFontStore.push({ family: "Inter", data: arrayBufferToBase64(files["Inter|b"].buffer), bold: true, source: "system" });
const r = createFontResolver();
const hit = await r.find("Inter", true, false);
ok(hit && hit.bytes.byteLength === 2, "an embedded face is found for the export (bold)");
customFontStore.length = 0;
ok(formatBytes(512) === "1 KB" && formatBytes(2 * 1048576) === "2.0 MB", "sizes are shown in KB or MB");
console.log(fails ? "\n" + fails + " FAILED" : "\nall passed");
process.exit(fails ? 1 : 0);
})();
