// Hands a picture dropped on the page (App.jsx) to the editor (ui/editor/EditorTab.jsx). The editor
// may not be on screen when the drop happens (the Typography tab is showing), so the drop waits here
// until the editor has mounted and picks it up; if it is already there, the event wakes it.

export const DROPPED_EVENT = "md2pdf-dropped-pictures";

let pending = null;
export function queueDropped(drop) { pending = drop; }
export function takeDropped() {
  const drop = pending;
  pending = null;
  return drop;
}
