// Importing a document into the editor: turns .md / .txt / .muse / .docx / .epub into Markdown.

import { convertDocxToMarkdown } from "../convert/docx.js";
import { convertEpubToMarkdown } from "../convert/epub.js";
import { convertMuseToMarkdown } from "../convert/muse.js";

// For the hidden <input type="file"> fallback.
export const DOCUMENT_INPUT_ACCEPT = ".md,.markdown,.txt,.muse,.docx,.epub";

// For the native Open dialog.
export const DOCUMENT_PICKER_TYPES = {
  description: "Markdown, Word, EPUB, or Muse document",
  accept: {
    "text/markdown": [".md", ".markdown"],
    "text/plain": [".txt"],
    "text/x-muse": [".muse"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    "application/epub+zip": [".epub"],
  },
};

// Converts by extension; Markdown and plain text need no conversion.
// Throws a readable error for anything else.
export async function documentToMarkdown(file) {
  const name = (file && file.name) || "document";
  const dot = name.lastIndexOf(".");
  const ext = dot > -1 ? name.slice(dot + 1).toLowerCase() : "";
  if (ext === "md" || ext === "markdown" || ext === "txt") return file.text();
  if (ext === "muse") return convertMuseToMarkdown(await file.text());
  if (ext === "docx") return convertDocxToMarkdown(await file.arrayBuffer());
  if (ext === "epub") return convertEpubToMarkdown(await file.arrayBuffer());
  throw new Error(`Unsupported file type ".${ext || "?"}" — supported: .md, .txt, .muse, .docx, .epub.`);
}
