// One placed image on the page, including crop mode.

import { hexToRgb } from "../../model/color.js";
import { angleOf, controlValues, effectSettings } from "../../model/controls.js";
import { resizedCrop } from "../../model/crop.js";
import { MIN_RESIZE_SIZE, resizedBox } from "../../model/geometry.js";
import { FEATHER_EFFECT, LOMO_CONTROLS, imageEdgeOutline } from "../../model/imageEffects.js";
import { DEFAULT_DUOTONE_DARK, DEFAULT_DUOTONE_LIGHT, FILTER_CONTROLS, effectiveImageFilter } from "../../model/pageFilters.js";
import { PHOTO_ADJUST_CONTROLS, hasPhotoAdjust } from "../../model/photoAdjust.js";
import { loadImageElement } from "../../render/drawImage.js";
import { applyPageFilter } from "../../render/filters/applyFilter.js";
import { LUMINANCE_MATRIX_VALUES } from "../../render/filters/luma.js";
import { applyFeather } from "../../render/feather.js";
import { applyLomo } from "../../render/lomo.js";
import { applyPhotoAdjust } from "../../render/photoAdjust.js";
import { BoxEffectOverlays } from "./BoxEffectOverlays.jsx";
import { boxGroupStyle, boxOuterStyle } from "./boxStyles.js";
import { ALL_RESIZE_HANDLES, ResizeHandles } from "./ResizeHandles.jsx";
import { endResizeSnap, startResizeSnap } from "./snapStore.js";
import { dragDeltaFrom, trackPointerDrag } from "../pointer.js";
const { useRef, useEffect } = React;

// ---- One placed image --------------------------------------------
// Drag to move (Select tool, same pattern as text). A resize handle
// in the bottom-right corner appears only when selected — dragging it
// scales width/height together, keeping the image's aspect ratio
// rather than letting it stretch. Cropping isn't built yet — this is
// add/move/resize/select/delete only, deliberately scoped that way.
export function AnnotationImage({ ann, tool, isSelected, showHandles, isCropping, isEraseTarget, onPress, onUpdate, onToggleCrop, pageFilter, zoom }) {
  const halftoneCanvasRef = useRef(null);
  const naturalW = ann.naturalWidth, naturalH = ann.naturalHeight;
  // Crop is a sub-rect of the source image, in ITS OWN natural pixel
  // space — undefined/missing fields mean "no crop yet" (the full
  // image), so existing annotations from before cropping existed keep
  // working with no migration needed.
  const cropX = ann.cropX || 0, cropY = ann.cropY || 0;
  const cropW = ann.cropW || naturalW, cropH = ann.cropH || naturalH;
  // On-page size of one source pixel. The two differ once an image has
  // been stretched with Shift, which Export PDF draws the same way.
  const displayScaleX = ann.width / cropW, displayScaleY = ann.height / cropH;

  // Proportions stay locked on every handle unless Shift is held.
  function startResize(handle, e) {
    const orig = { x: ann.x, y: ann.y, width: ann.width, height: ann.height };
    const dragDelta = dragDeltaFrom(e, zoom, angleOf(ann));
    const snap = startResizeSnap(ann, orig, angleOf(ann));
    trackPointerDrag((ev) => {
      const raw = dragDelta(ev);
      const { dx, dy } = snap(handle, raw.dx, raw.dy, ev);
      onUpdate(ann.id, resizedBox(orig, handle, dx, dy, !ev.shiftKey, MIN_RESIZE_SIZE, angleOf(ann)));
    }, endResizeSnap);
  }

  // Both crop gestures work in a fixed "px on screen per natural px"
  // scale established at drag-start, and a fixed image origin (where
  // the source image's own (0,0) pixel sits on screen) — panning only
  // ever moves cropX/cropY within that fixed frame, and resizing only
  // ever moves the crop rect's edges, so the two never fight each other.
  function startCropPan(e) {
    e.preventDefault();
    e.stopPropagation();
    const dragDelta = dragDeltaFrom(e, zoom);
    const origCropX = cropX, origCropY = cropY;
    trackPointerDrag((ev) => {
      const { dx, dy } = dragDelta(ev);
      const dxNat = dx / displayScaleX;
      const dyNat = dy / displayScaleY;
      const newCropX = Math.min(Math.max(0, origCropX - dxNat), Math.max(0, naturalW - cropW));
      const newCropY = Math.min(Math.max(0, origCropY - dyNat), Math.max(0, naturalH - cropH));
      onUpdate(ann.id, { cropX: newCropX, cropY: newCropY });
    });
  }

  // Any of the crop window's eight handles (model/crop.js); Shift keeps the window's proportions.
  function startCropResize(handle, e) {
    e.preventDefault();
    e.stopPropagation();
    const imageOriginX = ann.x - cropX * displayScaleX;
    const imageOriginY = ann.y - cropY * displayScaleY;
    const dragDelta = dragDeltaFrom(e, zoom);
    const orig = { x: cropX, y: cropY, w: cropW, h: cropH };
    trackPointerDrag((ev) => {
      const { dx, dy } = dragDelta(ev);
      const c = resizedCrop(orig, naturalW, naturalH, handle, dx / displayScaleX, dy / displayScaleY, ev.shiftKey);
      onUpdate(ann.id, {
        cropX: c.x, cropY: c.y, cropW: c.w, cropH: c.h,
        x: imageOriginX + c.x * displayScaleX, y: imageOriginY + c.y * displayScaleY,
        width: c.w * displayScaleX, height: c.h * displayScaleY,
      });
    });
  }

  // An image's own filter (if it has one — see effectiveImageFilter)
  // takes over from the page filter entirely for that image, rather
  // than combining with it. Grayscale/duotone are approximated live
  // via an SVG filter built from the exact same luminance/lerp formula
  // applyColorRemap uses on canvas, so preview and Export PDF match.
  // Halftone has no CSS-filter equivalent (it replaces pixels with
  // dots, not a per-pixel remap), so that case swaps the <img> for a
  // <canvas> the effect below draws the dot pattern onto directly,
  // same drawHalftoneScreen the background and Export use — sourced from
  // the crop sub-rect via drawImage's source-rect args, which crops
  // "for free" without a separate step.
  const imgFilter = effectiveImageFilter(ann, pageFilter);
  const filterType = imgFilter.type;
  // Photo adjustments are per-pixel too, so an adjusted image is drawn on
  // the canvas as well (adjusted first, then filtered).
  const adjusted = hasPhotoAdjust(ann);
  // Lomo and Feather are pixel looks too (render/lomo.js, render/feather.js), applied in the same canvas: adjustments, Lomo, filter, then Feather.
  const lomoOn = Boolean(ann.lomo), featherOn = Boolean(ann.feather);
  const usesFilterCanvas = Boolean(FILTER_CONTROLS[filterType]) || adjusted || lomoOn || featherOn;
  const filterCanvasKey = usesFilterCanvas
    ? JSON.stringify([imgFilter, adjusted ? controlValues(ann, PHOTO_ADJUST_CONTROLS) : null, lomoOn ? controlValues(ann, LOMO_CONTROLS) : null, featherOn ? [effectSettings(ann, FEATHER_EFFECT), imageEdgeOutline(ann)] : null])
    : null;

  useEffect(() => {
    if (!usesFilterCanvas || isCropping) return;
    let cancelled = false;
    (async () => {
      const img = await loadImageElement(ann.src);
      if (cancelled) return;
      const canvas = halftoneCanvasRef.current;
      if (!canvas) return;
      const w = Math.max(1, Math.round(ann.width));
      const h = Math.max(1, Math.round(ann.height));
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, w, h);
      if (adjusted) applyPhotoAdjust(ctx, canvas, ann);
      if (lomoOn) applyLomo(ctx, canvas, ann);
      applyPageFilter(ctx, canvas, imgFilter, 1);
      if (featherOn) applyFeather(ctx, canvas, ann, imageEdgeOutline(ann), w / ann.width);
    })();
    return () => { cancelled = true; };
  }, [filterCanvasKey, isCropping, ann.src, ann.width, ann.height, cropX, cropY, cropW, cropH]);

  // Crop-editing view — shows the WHOLE source image (dimmed outside
  // the current crop window) at the scale the crop rect is already
  // displayed at, so entering/leaving crop mode doesn't jump the
  // image's apparent zoom. Deliberately no separate confirm/cancel:
  // every crop adjustment goes through onUpdate, so it's just another
  // undo-able edit like any other, rather than its own modal state.
  if (isCropping) {
    const imageOriginX = ann.x - cropX * displayScaleX;
    const imageOriginY = ann.y - cropY * displayScaleY;
    const fullW = naturalW * displayScaleX, fullH = naturalH * displayScaleY;
    const winX = cropX * displayScaleX, winY = cropY * displayScaleY, winW = cropW * displayScaleX, winH = cropH * displayScaleY;
    return (
      <div className="ze-ann-image ze-ann-image--cropping" style={{ left: imageOriginX, top: imageOriginY, width: fullW, height: fullH }}>
        {/* The part being cut away is see-through, so the page and the layers
            under it show; the part inside the crop window is drawn solid. */}
        <img src={ann.src} alt="" draggable="false" className="ze-crop-full-img" />
        <div className="ze-crop-window" style={{ left: winX, top: winY, width: winW, height: winH }} onMouseDown={startCropPan}>
          <div className="ze-crop-window-clip">
            <img src={ann.src} alt="" draggable="false" style={{ position: "absolute", left: -winX, top: -winY, width: fullW, height: fullH }} />
          </div>
          {ALL_RESIZE_HANDLES.map((handle) => (
            <div key={handle} className={"ze-crop-handle ze-crop-handle-" + handle} onMouseDown={(e) => startCropResize(handle, e)} />
          ))}
        </div>
      </div>
    );
  }

  // Grayscale always reuses the one global filter (no colors to
  // differ). Duotone reuses it too UNLESS this image has its own
  // duotone colors, in which case it gets its own uniquely-id'd
  // <filter> rendered right below, since the global one is tuned to
  // the page's duotone colors, not necessarily this image's.
  const hasOwnDuotone = ann.filter && ann.filter.type === "duotone";
  const duotoneFilterId = hasOwnDuotone ? "ze-filter-duotone-img-" + ann.id : "ze-filter-duotone";
  const cssFilter = usesFilterCanvas ? undefined : // the canvas already has the filter applied
    filterType === "grayscale" ? "url(#ze-filter-grayscale)" :
    filterType === "duotone" ? `url(#${duotoneFilterId})` : undefined;
  const frameStyle = {};
  const edgeOutline = imageEdgeOutline(ann);
  if (edgeOutline) frameStyle.clipPath = `path("${edgeOutline}")`;
  if (cssFilter) frameStyle.filter = cssFilter;
  const ownDuotoneDarkRgb = hasOwnDuotone ? hexToRgb(imgFilter.darkColor || DEFAULT_DUOTONE_DARK) : null;
  const ownDuotoneLightRgb = hasOwnDuotone ? hexToRgb(imgFilter.lightColor || DEFAULT_DUOTONE_LIGHT) : null;

  return (
    <div
      data-ann-id={ann.id}
      className={"ze-ann-image" + (isSelected ? " is-selected" : "") + (isEraseTarget ? " is-erase-target" : "") + (ann.locked ? " is-locked" : "")}
      style={boxOuterStyle(ann)}
      onMouseDown={(e) => { if (tool === "select") onPress(e, ann); }}
    >
      {/* Shadow sits on this wrapper, outside the edge clip so the clip
          can't cut it off, and away from the resize handle. It stays
          mounted when there's no shadow so toggling one never remounts
          (and blanks) the filter canvas. */}
      <div className="ze-ann-image-shadow" style={boxGroupStyle(ann)}>
        {usesFilterCanvas ? (
          <canvas ref={halftoneCanvasRef} style={frameStyle} />
        ) : (
          <div className="ze-ann-image-frame" style={frameStyle}>
            <img
              src={ann.src}
              alt=""
              draggable="false"
              style={{ position: "absolute", left: -cropX * displayScaleX, top: -cropY * displayScaleY, width: naturalW * displayScaleX, height: naturalH * displayScaleY }}
            />
          </div>
        )}
        <BoxEffectOverlays ann={ann} edgeOutline={edgeOutline} />
      </div>
      {showHandles && <ResizeHandles handles={ALL_RESIZE_HANDLES} onStart={startResize} onRotate={(angle) => onUpdate(ann.id, { angle })} />}
      {hasOwnDuotone && (
        <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
          <defs>
            <filter id={duotoneFilterId} colorInterpolationFilters="sRGB">
              <feColorMatrix type="matrix" values={LUMINANCE_MATRIX_VALUES} />
              <feComponentTransfer>
                <feFuncR type="linear" slope={(ownDuotoneLightRgb.r - ownDuotoneDarkRgb.r) / 255} intercept={ownDuotoneDarkRgb.r / 255} />
                <feFuncG type="linear" slope={(ownDuotoneLightRgb.g - ownDuotoneDarkRgb.g) / 255} intercept={ownDuotoneDarkRgb.g / 255} />
                <feFuncB type="linear" slope={(ownDuotoneLightRgb.b - ownDuotoneDarkRgb.b) / 255} intercept={ownDuotoneDarkRgb.b / 255} />
              </feComponentTransfer>
            </filter>
          </defs>
        </svg>
      )}
    </div>
  );
}
