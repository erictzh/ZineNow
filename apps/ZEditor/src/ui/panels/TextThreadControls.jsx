// Threaded frames in the text panel: where this frame sits in its story, and linking or unlinking the next frame.

export function TextThreadControls({ ann, frameActions }) {
  if (!frameActions) return null;
  const threaded = ann.storyHeadId != null;
  const ownLayout = ann.ransom || ann.curve || ann.vertical === "stacked";
  return (
    <div className="ze-thread-controls">
      {threaded && (
        <div className="ze-thread-status">
          Frame {ann.storyIndex + 1} of a threaded story{ann.storyNextId == null ? " (last frame)" : ""}.
        </div>
      )}
      <div className="ze-thread-buttons">
        {ann.storyNextId == null ? (
          <button
            type="button" className="ze-format-toggle ze-format-toggle-wide" disabled={ownLayout}
            title={ownLayout ? "Ransom, Curve and Stacked text can't flow into another frame" : "Make a new frame the text continues into (the red + on the frame does the same)"}
            onClick={() => frameActions.linkNextFrame(ann)}
          >
            Link to next frame
          </button>
        ) : (
          <button type="button" className="ze-format-toggle ze-format-toggle-wide" onClick={() => frameActions.unlinkNextFrame(ann)} title="Stop the text flowing on into the next frame">
            Unlink next frame
          </button>
        )}
      </div>
    </div>
  );
}
