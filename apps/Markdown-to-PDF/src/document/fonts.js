// The Google Fonts links the document needs for its chosen fonts.

import { WEB_SAFE_GOOGLE_FONTS } from "../settings/defaults.js";


// Link tags for both the body and (if different) the heading font.
export function fontLinkTags(normalized) {
  var tags = googleFontLinkTag(normalized.fontFamily);
  if (normalized.headingFontFamily !== normalized.fontFamily) {
    tags += googleFontLinkTag(normalized.headingFontFamily, true);
  }
  return tags;
}

function googleFontLinkTag(fontFamily, skipPreconnect) {
  if (WEB_SAFE_GOOGLE_FONTS.hasOwnProperty(fontFamily)) {
    var family = fontFamily.replace(/ /g, '+');
    return (
      (skipPreconnect
        ? ''
        : '<link rel="preconnect" href="https://fonts.googleapis.com">' +
          '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>') +
      '<link href="https://fonts.googleapis.com/css2?family=' +
      family +
      ':wght@400;600;700;800;900&display=swap" rel="stylesheet">'
    );
  }
  return '';
}
