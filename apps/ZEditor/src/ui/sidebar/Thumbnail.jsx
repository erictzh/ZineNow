// One page thumbnail with rotate and delete buttons.

import { THUMB_SCALE, THUMB_SHOWN_SCALE } from "../../constants.js";
import { withTouchModifier } from "../touchInput.js";

// ---- One sidebar thumbnail ------------------------------------------
// `src`: the picture to show (the page with its items on it, or the plain base thumbnail).
// `story`: { continues, overflows } from render/pageText.js storyStateOfPages: a link icon when the page's story goes on to
// another page, "T+" when its last frame's text doesn't all fit (adds the next page).
export function Thumbnail({ p, src, idx, isSelected, onSelect, onRotate, onDelete, story, onContinueStory, dragHandlers }) {
  return (
    <div
      className={"ze-thumb" + (isSelected ? " is-selected" : "")}
      draggable="true"
      // Ctrl / Cmd + click: add or take out one page. Shift + click: every page from the last one clicked to this one.
      onClick={(e) => onSelect(idx, e.ctrlKey || e.metaKey ? "toggle" : withTouchModifier("shift", e) ? "range" : false)}
      {...dragHandlers}
    >
      <div className="ze-thumb-img-wrap">
        {/* Not draggable itself (so a drag takes the whole thumbnail, to reorder pages, and never starts
            dragging the picture); drawn at THUMB_SCALE but shown at THUMB_SHOWN_SCALE: see constants.js. */}
        <img srcSet={src + " " + THUMB_SCALE / THUMB_SHOWN_SCALE + "x"} draggable="false" alt={p.isBlank ? "Blank page" : "Page " + p.pageNumber} />
        {story && story.continues != null && (
          <button type="button" className="ze-thumb-story is-link" title={"This page's text goes on to page " + (story.continues + 1) + ". Click to go there."}
            onClick={(e) => { e.stopPropagation(); onSelect(story.continues, false); }}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
              <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
            </svg>
          </button>
        )}
        {story && story.continues == null && story.overflows && (
          <button type="button" className="ze-thumb-story is-add" title="This page's text doesn't all fit. Add a page after it with the rest of the text."
            onClick={(e) => { e.stopPropagation(); onContinueStory(idx); }}>T+</button>
        )}
      </div>
      <div className="ze-thumb-footer">
        <span className="ze-thumb-num">{idx + 1}</span>
        <div className="ze-thumb-actions">
          <button
            type="button"
            className="log-btn"
            title="Rotate"
            onClick={(e) => { e.stopPropagation(); onRotate(idx); }}
          >⟳</button>
          <button
            type="button"
            className="log-btn"
            title="Delete"
            onClick={(e) => { e.stopPropagation(); onDelete(idx); }}
          >
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 7h16" />
              <path d="M9 7V4h6v3" />
              <path d="M6 7l1 13h10l1-13" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
