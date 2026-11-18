// Remembers the text selection so the Custom Text Style (span) panel can restyle it after the text box loses focus.

// The selection last made inside a text box's editor, kept outside React
// state: it's read only at the moment a colour is picked, and has to
// outlive the box leaving edit mode when focus moves to the panel.
export const textSelectionStore = { annId: null, start: 0, end: 0 };
