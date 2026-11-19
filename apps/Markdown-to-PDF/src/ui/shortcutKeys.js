// How modifier keys are written in tooltips and menus: ⌘ ⌥ ⇧ on a Mac, Ctrl+ Alt+ Shift+ elsewhere.

export const IS_MAC = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
export const MOD = IS_MAC ? "⌘" : "Ctrl+";
export const ALT = IS_MAC ? "⌥" : "Alt+";
export const SHIFT = IS_MAC ? "⇧" : "Shift+";
