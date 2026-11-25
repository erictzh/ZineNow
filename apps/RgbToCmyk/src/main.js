// RGB to CMYK: pick a PDF, choose what to convert, download the result. The work is in shared/js/pdfCmyk.js.

import { convertPdfToCmyk, describeConversion } from "../../../shared/js/pdfCmyk.js";
import { downloadBlob } from "../../../shared/js/download.js";

const $ = (id) => document.getElementById(id);
let source = null; // { name, bytes }
let result = null; // { name, bytes }

const kb = (n) => (n >= 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB");

async function choose(file) {
  if (!file) return;
  if (!/pdf$/i.test(file.type) && !/\.pdf$/i.test(file.name)) { $("status").textContent = "That is not a PDF."; return; }
  source = { name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) };
  result = null;
  $("drop-title").textContent = file.name;
  $("drop-sub").textContent = kb(source.bytes.length) + " · click to choose another";
  $("options").hidden = false;
  $("result").hidden = true;
  $("status").textContent = "";
}

async function convert() {
  if (!source) return;
  $("convert").disabled = true;
  $("status").textContent = "Converting…";
  try {
    const { bytes, stats } = await convertPdfToCmyk(window.PDFLib, source.bytes, {
      blackAsK: $("opt-black").checked, greyPictures: $("opt-grey").checked, colourPictures: $("opt-colour").checked,
    });
    result = { name: source.name.replace(/\.pdf$/i, "") + "-cmyk.pdf", bytes };
    $("report").textContent = describeConversion(stats);
    $("sizes").textContent = `Before: ${kb(source.bytes.length)} · After: ${kb(bytes.length)}`;
    $("result").hidden = false;
    $("status").textContent = "";
  } catch (err) {
    $("status").textContent = "Couldn't convert this PDF: " + (err && err.message ? err.message : "unknown error");
  } finally {
    $("convert").disabled = false;
  }
}

$("file").addEventListener("change", (e) => choose(e.target.files[0]));
$("convert").addEventListener("click", convert);
$("download").addEventListener("click", () => { if (result) downloadBlob(new Blob([result.bytes], { type: "application/pdf" }), result.name); });
const drop = $("drop");
drop.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); $("file").click(); } });
drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("is-over"); });
drop.addEventListener("dragleave", () => drop.classList.remove("is-over"));
drop.addEventListener("drop", (e) => { e.preventDefault(); drop.classList.remove("is-over"); choose(e.dataTransfer.files[0]); });
