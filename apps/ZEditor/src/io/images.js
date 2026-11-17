// Reads a photo file into a (downscaled) data URL.

// Reads a chosen photo for a text fill: scaled down to at most 2000 px on a
// side (it only shows through letters, and it's stored in the project file).
export function readPhotoFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn't read that photo."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That file isn't an image the browser can open."));
      img.onload = () => {
        const shrink = Math.min(1, 2000 / Math.max(img.naturalWidth, img.naturalHeight));
        const width = Math.max(1, Math.round(img.naturalWidth * shrink));
        const height = Math.max(1, Math.round(img.naturalHeight * shrink));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve({ src: canvas.toDataURL(file.type === "image/png" ? "image/png" : "image/jpeg", 0.92), width, height });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
