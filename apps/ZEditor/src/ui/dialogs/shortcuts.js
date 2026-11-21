// The keyboard shortcut list (data for the shortcuts dialog).

// ---- Two-step "this erases your work" confirmation — shared by New
// Project and Load Project. Step 1 states the consequence plainly;
// step 2 is a final, separate "are you sure" rather than a second copy
// of the same warning, so it can't be clicked through as a reflex.
// Keep in step with handleKeyDown and the other input handlers in App.
export const KEYBOARD_SHORTCUTS = [
  {
    group: "Tools",
    rows: [
      ["V", "Move tool"],
      ["T", "Text tool"],
      ["I", "Add an image"],
      ["R", "Rectangle tool"],
      ["E", "Ellipse tool"],
      ["D", "Draw tool"],
      ["H", "Highlighter tool"],
      ["C", "Turn crop on / off for the selected image"],
      ["M", "Marquee tool: drag a box on the page (Shift: square, Alt: from the centre), then Make layer"],
      ["U", "Measure tool: click point a, click point b, click again to clear (Shift: 45° steps, Alt: skip guides)"],
    ],
  },
  {
    group: "Editing",
    rows: [
      ["Ctrl + Z", "Undo"],
      ["Ctrl + Shift + Z, or Ctrl + Y", "Redo"],
      ["Ctrl + C", "Copy the selected item"],
      ["Ctrl + V", "Paste a copied item, or an image from the clipboard"],
      ["Ctrl + S", "Save the project (asks where, the first time)"],
      ["Ctrl + Shift + S", "Save the project to a new file"],
      ["Delete", "Delete the selected item, or the selected page(s) if no item is selected"],
      ["Ctrl + J", "Marquee: Layer via Copy (the box becomes a new image layer)"],
      ["Ctrl + Shift + J", "Marquee: Layer via Cut (the box is taken out of the original)"],
      ["Esc", "Marquee: drop the box"],
      ["Double-click text", "Edit it (Move tool)"],
      ["Esc", "Finish editing and keep the text selected"],
      ["Enter / Esc", "Magic eraser preview: apply it / cancel it (Ctrl + Z also cancels)"],
    ],
  },
  {
    group: "Pages and selection",
    rows: [
      ["↑ / ↓", "Previous / next page, when no item is selected"],
      ["Arrow keys", "Nudge the selected items 1 px"],
      ["Shift + arrow keys", "Nudge the selected items 10 px"],
      ["Ctrl + R", "Rotate the selected page"],
      ["Ctrl + G", "Group the selected items (select several first)"],
      ["Ctrl + Shift + G", "Ungroup"],
      ["Ctrl + Alt + G", "Clipping mask on/off: the selected layer shows only where the layer directly below it has pixels (also in the Layers panel menu)"],
      ["Alt + click", "Pick one item out of a group"],
      ["Shift + click", "Add to or remove from the selection (pages and items)"],
      ["Drag on empty page", "Select the items it touches (Move tool)"],
      ["Shift + drag a handle", "Stretch an image freely, or keep a rectangle's proportions"],
      ["Shift + drag a crop handle", "Keep the crop window's proportions"],
    ],
  },
];
