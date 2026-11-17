// Turns imposed sheets into the preview/print HTML: a section per sheet side, a canvas per page cell.

const SIDE_NAMES = { Left: "left", Right: "right", Top: "top", Bottom: "bottom" };

// Guide options decide how cut and fold markers show: with the center
// guide a cut is a solid line; with fold guides cuts and folds are dotted.
export function sheetsHtml(sheets, { guideMargins, guideCenter, guideFolds }) {
  const marginGuides = guideMargins ? " guide-margins" : "";
  const tokenClass = (token) => {
    if (token === "r") return " rotate";
    const kind = token.startsWith("cut") ? "cut" : "fold";
    const side = SIDE_NAMES[token.slice(kind.length)];
    if (kind === "cut") return guideCenter ? " guide-solid-" + side : guideFolds ? " guide-dotted-" + side : "";
    return guideFolds ? " guide-dotted-" + side : "";
  };

  let html = "";
  for (const sheet of sheets) {
    html += "<section class=\"zine-sheet " + sheet.grid + marginGuides + "\" id=\"s" + sheet.id + "\">";
    for (const cell of sheet.cells) {
      html += "<section class=\"zine-page " + cell.pos + cell.tokens.map(tokenClass).join("") + "\">"
        + "<canvas class=\"zine-canvas\" id=\"p" + cell.page + cell.copy + "\"></canvas></section>";
    }
    html += "</section>";
  }
  return html;
}
