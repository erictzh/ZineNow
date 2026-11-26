// Reading the photos chosen for the data merge: each picture file is shrunk to at most `maxSide` pixels on its longest side (so a folder of
// phone photos does not make the project huge) and kept as a data URL. A PNG stays a PNG (it may be transparent); the rest become JPEG.

const IMAGE_FILE = /\.(jpe?g|png|webp|gif|bmp)$/i;

export async function readPhotos(files, maxSide = 1600) {
  const out = new Map();
  for (const file of files) {
    if (!(file.type || "").startsWith("image/") && !IMAGE_FILE.test(file.name)) continue;
    try {
      const bitmap = await createImageBitmap(file); // honours the photo's rotation
      const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
      const width = Math.max(1, Math.round(bitmap.width * scale)), height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext("2d");
      const png = file.type === "image/png" || /\.png$/i.test(file.name);
      if (!png) { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, width, height); }
      ctx.drawImage(bitmap, 0, 0, width, height);
      if (bitmap.close) bitmap.close();
      const name = file.name.split("/").pop();
      out.set(name.toLowerCase(), { name, src: canvas.toDataURL(png ? "image/png" : "image/jpeg", 0.85), width, height });
    } catch { /* not a picture the browser can read: skipped */ }
  }
  return [...out.values()];
}
