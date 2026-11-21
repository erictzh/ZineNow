// Export selection as SVG (io/svgExport.js): vectorized images, shapes and pen strokes as vectors, cropped to the layers.
import { MAIN_SCALE } from "../apps/ZEditor/src/constants.js";
import { escapeXml, layersToSvg, svgColor } from "../apps/ZEditor/src/io/svgExport.js";
let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log("FAIL:", msg); } else console.log("ok  :", msg); };

const trace = {
  id: 1, type: "trace", x: 100, y: 50, width: 200, height: 100, traceW: 400, traceH: 200,
  trace: { preset: "color3" },
  paths: [{ color: "#ffffff", d: "M0 0L400 0L400 200L0 200Z" }, { color: "#ff0000", d: "M10 10L50 10L50 50Z" }, { color: "#0000ff", d: "M60 60L90 60L90 90Z" }],
  recolor: { "#ff0000": "#00aa00", "#0000ff": "none" },
};

(async () => {
  const one = await layersToSvg([trace]);
  ok(one && one.svg.startsWith("<?xml") && one.svg.includes('xmlns="http://www.w3.org/2000/svg"'), "a vectorized layer gives a standalone SVG file");
  ok(one.svg.includes('viewBox="99 49 202 102"'), "cropped to the layer (plus 1 px), not the whole page");
  ok(one.svg.includes(`width="${Math.round(202 / MAIN_SCALE * 100) / 100}pt"`), "sized in points, so it keeps its size on the page");
  ok(one.svg.includes("translate(100 50) scale(0.5 0.5)") && one.svg.includes('d="M10 10L50 10L50 50Z" fill="#00aa00"'), "paths in place and scaled, recoloured colours used");
  ok(!one.svg.includes("M60 60") && one.pictures === 0 && one.fonts.length === 0, "a hidden colour is left out; nothing went in as a picture");

  const logo = await layersToSvg([{ ...trace, recolor: { ...trace.recolor, "#ffffff": "none" } }]);
  ok(logo.svg.includes('viewBox="104 54 22 22"'), "with white hidden, the file is cropped to the visible shapes only (no empty margin)");

  const outlined = await layersToSvg([{ ...trace, trace: { preset: "color3", fills: "off", strokes: "on", strokeWidth: 3 } }]);
  ok(outlined.svg.includes('fill="none" stroke="#00aa00" stroke-width="3"'), "Create → Strokes only gives outlined paths");

  const turned = await layersToSvg([{ ...trace, angle: 90, opacity: 50, blend: "multiply" }]);
  ok(turned.svg.includes('rotate(90 200 100)') && turned.svg.includes('opacity="0.5"') && turned.svg.includes("mix-blend-mode:multiply"), "rotation, opacity and blend carry over");
  ok(turned.svg.includes('viewBox="149 -1 102 202"'), "a turned layer is cropped to its turned outline");

  const rect = { id: 2, type: "rect", x: 0, y: 0, width: 40, height: 20, fillColor: "#336699", fillAlpha: 50 };
  const ellipse = { id: 3, type: "rect", shape: "ellipse", x: 50, y: 0, width: 30, height: 30, fillType: "linear", fillColor: "#ff0000", gradientColor: "#0000ff", gradientAngle: 90 };
  const pen = { id: 4, type: "stroke", tool: "pen", points: [[0, 40], [20, 50], [40, 40]], color: "#111111", strokeWidth: 3 };
  const many = await layersToSvg([rect, ellipse, pen]);
  ok(many.svg.includes('<rect width="40" height="20" fill="rgb(51,102,153)" fill-opacity="0.5"/>'), "a rectangle stays a rectangle, with its fill opacity");
  ok(many.svg.includes('<linearGradient id="grad1"') && many.svg.includes('fill="url(#grad1)"') && /<path d="M[^"]*A/.test(many.svg), "an ellipse with a gradient: its outline, filled with an SVG gradient");
  ok(many.svg.includes('stroke="#111111" stroke-width="3" stroke-linecap="round"'), "a pen stroke stays a stroked path");
  ok(many.svg.includes("<defs>") && many.svg.indexOf("<rect") < many.svg.indexOf('stroke="#111111"'), "layers keep their order, bottom first");

  ok((await layersToSvg([])) === null, "nothing selected → nothing to save");
  ok(escapeXml('a<b & "c">') === "a&lt;b &amp; &quot;c&quot;&gt;", "text is escaped for XML");
  const c = svgColor("rgba(10,20,30,0.25)");
  ok(c.color === "rgb(10,20,30)" && c.opacity === 0.25, "rgba colours become colour + opacity (for editors that ignore rgba)");

  if (fails) { console.log(`${fails} failed`); process.exit(1); }
  console.log("all svg export checks passed");
})();
