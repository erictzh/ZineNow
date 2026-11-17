// Undo/redo limits: how long rapid edits merge into one step, and how many steps are kept.

// Undo/redo — one entry per discrete action (a finished drag, a
// committed edit, a delete, a rotate), not per pixel or keystroke.
// Rapid repeats of the SAME gesture (a drag's mousemoves, a slider
// being dragged, keystrokes while typing) collapse into one entry by
// sharing a coalesce key within this window; letting go and coming
// back starts a fresh entry. See recordUndoCheckpoint in App.
export const UNDO_COALESCE_MS = 700;
export const MAX_UNDO_HISTORY = 50;
