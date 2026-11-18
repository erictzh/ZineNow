// Dotted lines joining threaded text frames, from each frame's out-port to the next frame's in-port.
// Editor only: never exported. The story you're working in (any of its frames selected) is drawn stronger.
// Hovering a line (or selecting a frame of its story) shows scissors at its middle: clicking them cuts
// the link there (state/textFrameActions.js, unlinkNextFrame).

import { threadLinks } from "../../model/text/threads.js";
import { measureTextBox } from "../../render/textLayout.js";

// The box's size as drawn (measureTextBox already counts its border).
const frameSize = (v) => measureTextBox(v);
const stop = (e) => { e.preventDefault(); e.stopPropagation(); };

export function ThreadLinks({ views, pageSize, selectedIds, zoom, onUnlink }) {
  const links = threadLinks(views, frameSize);
  if (!links.length) return null;
  const selected = new Set(selectedIds.filter((id) => id != null));
  const activeHeads = new Set(views.filter((v) => selected.has(v.id) && v.storyHeadId != null).map((v) => v.storyHeadId));
  const k = 1 / (zoom || 1); // keeps the scissors and the hover band the same size on screen at any zoom
  return (
    <svg className="ze-thread-links" width={pageSize.width} height={pageSize.height}>
      {links.map((l) => {
        const active = activeHeads.has(l.headId);
        const mx = (l.x1 + l.x2) / 2, my = (l.y1 + l.y2) / 2;
        const unlink = (e) => { stop(e); const view = views.find((v) => v.id === l.id); if (view && onUnlink) onUnlink(view); };
        return (
          <g key={l.id} className={"ze-thread-link" + (active ? " is-active" : "")}>
            <line className="ze-thread-link-hit" x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} strokeWidth={10 * k} onMouseDown={stop} />
            <line className="ze-thread-link-line" x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />
            <circle className="ze-thread-link-end" cx={l.x1} cy={l.y1} r={2.5 * k} />
            <circle className="ze-thread-link-end" cx={l.x2} cy={l.y2} r={2.5 * k} />
            {onUnlink && (
              <g className="ze-thread-unlink" transform={`translate(${mx} ${my}) scale(${k})`} onMouseDown={stop} onClick={unlink} role="button" aria-label="Unlink these text boxes">
                <title>Unlink: the text stops flowing into the next box</title>
                <circle r="10" />
                <text textAnchor="middle" dominantBaseline="central">✂</text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
