// Hidden SVG filters the live editor uses to preview grayscale and duotone on images.

import { hexToRgb } from "../../model/color.js";
import { DEFAULT_DUOTONE_DARK, DEFAULT_DUOTONE_LIGHT } from "../../model/pageFilters.js";
import { LUMINANCE_MATRIX_VALUES } from "../../render/filters/luma.js";

// Grayscale/duotone SVG filters for live image previews — see
// AnnotationImage. color-interpolation-filters="sRGB" keeps the
// math in the same byte space applyColorRemap uses on canvas
// (browsers default filter primitives to linearRGB, which would
// throw preview and Export PDF out of sync). The duotone colours come
// from the current page's filter.
export function LiveFilterDefs({ pageFilter }) {
  const dark = hexToRgb(pageFilter.darkColor || DEFAULT_DUOTONE_DARK);
  const light = hexToRgb(pageFilter.lightColor || DEFAULT_DUOTONE_LIGHT);
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <defs>
        <filter id="ze-filter-grayscale" colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values={LUMINANCE_MATRIX_VALUES} />
        </filter>
        <filter id="ze-filter-duotone" colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values={LUMINANCE_MATRIX_VALUES} />
          <feComponentTransfer>
            <feFuncR type="linear" slope={(light.r - dark.r) / 255} intercept={dark.r / 255} />
            <feFuncG type="linear" slope={(light.g - dark.g) / 255} intercept={dark.g / 255} />
            <feFuncB type="linear" slope={(light.b - dark.b) / 255} intercept={dark.b / 255} />
          </feComponentTransfer>
        </filter>
      </defs>
    </svg>
  );
}
