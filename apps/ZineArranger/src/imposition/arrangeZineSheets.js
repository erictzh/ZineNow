// Lays out the zine sheets on the page from the current options: imposes, sets the print orientation, writes the HTML.

import { setPageOrientation } from "../print.js";
import { state } from "../state.js";
import { impose } from "./impose.js";
import { sheetsHtml } from "./sheetsHtml.js";

// Pads state.pageCount up to whole sheets/signatures (the caller reads it
// back), and fills #zine-scale with an empty canvas "p<slot>" per page.
export function arrangeZineSheets() {
  document.getElementById("zine-scale").innerHTML = ""; // clear the existing zine contents
  const result = impose(state, state.pageCount);
  state.pageCount = result.pageCount;
  setPageOrientation(result.portraitPaper);
  document.getElementById("zine-scale").innerHTML = sheetsHtml(result.sheets, state);
}
