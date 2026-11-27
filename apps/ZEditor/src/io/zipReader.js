// Reads a .zip file in the browser (no library): the list of files from its central directory, and each file's bytes, inflated with the
// browser's own DecompressionStream. Handles the "stored" and "deflate" methods; not encrypted or zip64 files.

async function inflateRaw(bytes) {
  if (typeof DecompressionStream !== "function") throw new Error("This browser cannot open .xlsx files. Save the sheet as a CSV file instead.");
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

// Returns { names, read(name) -> Promise<Uint8Array | null>, text(name) -> Promise<string | null> }.
export function openZip(buffer) {
  const bytes = new Uint8Array(buffer), view = new DataView(buffer);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) if (view.getUint32(i, true) === 0x06054b50) { end = i; break; }
  if (end < 0) throw new Error("That file is not a zip file (an .xlsx workbook is one).");
  const count = view.getUint16(end + 10, true);
  let at = view.getUint32(end + 16, true);
  const entries = new Map();
  const decoder = new TextDecoder();
  for (let n = 0; n < count; n++) {
    if (view.getUint32(at, true) !== 0x02014b50) throw new Error("The zip file is damaged.");
    const flags = view.getUint16(at + 8, true), method = view.getUint16(at + 10, true);
    const size = view.getUint32(at + 20, true), nameLength = view.getUint16(at + 28, true), extraLength = view.getUint16(at + 30, true), commentLength = view.getUint16(at + 32, true);
    const offset = view.getUint32(at + 42, true);
    const name = decoder.decode(bytes.subarray(at + 46, at + 46 + nameLength));
    entries.set(name, { flags, method, size, offset });
    at += 46 + nameLength + extraLength + commentLength;
  }
  async function read(name) {
    const e = entries.get(name);
    if (!e) return null;
    if (e.flags & 1) throw new Error("This workbook is password protected, so it cannot be opened here.");
    const nameLength = view.getUint16(e.offset + 26, true), extraLength = view.getUint16(e.offset + 28, true);
    const start = e.offset + 30 + nameLength + extraLength;
    const data = bytes.subarray(start, start + e.size);
    if (e.method === 0) return data;
    if (e.method === 8) return inflateRaw(data);
    throw new Error("This workbook uses a zip method that cannot be read here.");
  }
  return { names: [...entries.keys()], read, text: async (name) => { const d = await read(name); return d ? decoder.decode(d) : null; } };
}
