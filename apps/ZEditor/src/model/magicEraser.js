// Magic eraser settings: how close a colour must be to the clicked one, and whether only connected pixels go.

// tolerance: 0 = only the exact colour, 255 = every visible pixel.
// contiguous: true = only pixels connected to the clicked one (like
// Photoshop's "Contiguous"); false = every matching pixel in the image.
export const MAGIC_ERASER_DEFAULTS = { tolerance: 32, contiguous: true };
export const MAGIC_TOLERANCE_MAX = 255;
