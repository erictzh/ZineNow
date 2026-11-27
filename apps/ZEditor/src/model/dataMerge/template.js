// Data templates: a .znow file made to be shared and reused with other data. It holds the designed page(s) and the merge settings, but not the
// spreadsheet or the photos, and it is marked inside (`dataTemplate`) and by its name (`ZDATA = `). Pure.

import { titleToFileName } from "../documentTitle.js";
import { fieldsUsedOnPage } from "./build.js";

export const TEMPLATE_PREFIX = "ZDATA = ";
const VIRTUAL = ["page in group", "pages in group", "records in group"];

export const stripTemplatePrefix = (name) => String(name || "").replace(/^ZDATA\s*=\s*/i, "");
export const isTemplateFileName = (name) => /^ZDATA\s*=\s*/i.test(String(name || ""));
// "Name cards" -> "ZDATA = Name cards.znow"
export const templateFileName = (title) => TEMPLATE_PREFIX + titleToFileName(stripTemplatePrefix(title), ".znow");

// The pages of a template: the designed pages only. Pages a merge made are left out, and a designed page that was hidden so the merge would
// not export it is shown again.
export function templatePages(pages) {
  const designed = new Set(pages.filter((p) => p.mergedFrom !== undefined).map((p) => p.mergedFrom));
  // A continuation design (`dataFor`: the key of the page it belongs to) was hidden along with its page, and is shown again with it.
  return pages.filter((p) => p.mergedFrom === undefined).map((p) => ((designed.has(p.key) || designed.has(p.dataFor)) && p.hidden ? { ...p, hidden: undefined } : p));
}

// Which columns a template needs: the fields its text uses, the columns its pictures take photos from, and the Group by column.
export function templateNeeds(pages, groupBy) {
  const columns = [];
  const add = (c) => { if (c && !columns.includes(c) && !VIRTUAL.includes(c)) columns.push(c); };
  for (const p of pages) {
    fieldsUsedOnPage(p.annotations || []).forEach(add);
    for (const a of p.annotations || []) if (a.type === "image") add(a.picField);
  }
  add(groupBy);
  return columns;
}

// The saved settings of a template: everything but the data and the photos.
export function templateSettings(settings) {
  const { dataSource, dataPhotos, ...rest } = settings;
  return rest;
}
