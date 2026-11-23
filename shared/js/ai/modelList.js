// Every model the apps can download, as facts to show people (Ai Tools (Local)'s Models page, download pop-ups): who made it, its licence,
// its size, and where it is downloaded from. The background-removal ones are in bgModel.js. New tools add their models here.
import { DEFAULT_MODEL_URL } from "./modelStore.js";
import { BG_MODELS } from "./bgModel.js";

export const FILL_MODEL = {
  key: "migan", name: "MI-GAN", kind: "Remove object", label: "MI-GAN (Remove object)",
  mb: 28.2, licence: "MIT", host: "huggingface.co", repo: "huggingface.co/lxfater/inpaint-web", url: DEFAULT_MODEL_URL,
  about: "Fills the area you mark with what would plausibly be behind it.",
};

// { id, tool, model } rows for the Models page: id is "fill" or "bg:<key>".
export const MODEL_ROWS = [
  { id: "fill", tool: "Remove object", model: FILL_MODEL },
  ...BG_MODELS.map((m) => ({ id: "bg:" + m.key, tool: "Remove background", model: m })),
];
