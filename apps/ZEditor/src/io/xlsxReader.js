// Opening an .xlsx workbook for the data merge: every visible sheet becomes CSV text (the form the merge keeps), with dates as dates and
// formulas as their last saved value. Only .xlsx (not the old .xls); pictures and formatting are ignored.

import { parseDateStyles, parseRelationships, parseSharedStrings, parseSheetRows, parseWorkbook, rowsToCsv } from "../model/dataMerge/xlsx.js";
import { openZip } from "./zipReader.js";

// Returns [{ name, rows, csv }] for each visible sheet that has anything in it. Throws a readable error when the file cannot be read.
export async function readWorkbook(buffer) {
  const zip = openZip(buffer);
  const workbookXml = await zip.text("xl/workbook.xml");
  if (!workbookXml) throw new Error("That does not look like an .xlsx workbook.");
  const workbook = parseWorkbook(workbookXml);
  const rels = parseRelationships((await zip.text("xl/_rels/workbook.xml.rels")) || "");
  const strings = parseSharedStrings((await zip.text("xl/sharedStrings.xml")) || "");
  const isDate = parseDateStyles((await zip.text("xl/styles.xml")) || "");
  const sheets = [];
  for (const sheet of workbook.sheets) {
    if (sheet.hidden) continue;
    const target = rels.get(sheet.rid);
    if (!target) continue;
    const path = target.startsWith("/") ? target.slice(1) : "xl/" + target.replace(/^\.\//, "");
    const xml = await zip.text(path);
    if (!xml) continue;
    const result = rowsToCsv(parseSheetRows(xml, strings, isDate, workbook.date1904));
    if (result) sheets.push({ name: sheet.name, rows: result.rows, csv: result.csv });
  }
  return sheets;
}
