// Regenerates every app's PWA icons (apps/<App>/icons/*.png) from tools/pwa-icons.html,
// which draws each app's top-bar logo badge on a canvas. Each icon is a headless
// Chrome/Edge screenshot of that page in single-icon mode.
//
//   node tools/pwa-icons.mjs
//
// Needs Chrome or Edge installed; set CHROME=/path/to/chrome to pick one. Not part of
// `npm run build`: the PNGs are committed, so only rerun this if a logo mark changes.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const page = pathToFileURL(join(root, "tools", "pwa-icons.html")).href;

const APPS = [
  { dir: "Markdown-to-PDF", mark: "Md" },
  { dir: "ZEditor", mark: "ZE" },
  { dir: "ZineArranger", mark: "Z|A" },
  { dir: "AiToolsLocal", mark: "AI" },
  { dir: "Wiki", mark: "Wi" },
];
const ICONS = [
  { file: "icon-192.png", size: 192, maskable: false },
  { file: "icon-512.png", size: 512, maskable: false },
  { file: "maskable-512.png", size: 512, maskable: true },
];

const browser = [
  process.env.CHROME,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].find((p) => p && existsSync(p));
if (!browser) {
  console.error("No Chrome/Edge found; set CHROME=/path/to/chrome.");
  process.exit(1);
}

for (const app of APPS) {
  const dir = join(root, "apps", app.dir, "icons");
  mkdirSync(dir, { recursive: true });
  for (const icon of ICONS) {
    const url = `${page}?mark=${encodeURIComponent(app.mark)}&size=${icon.size}&maskable=${icon.maskable ? 1 : 0}`;
    const out = join(dir, icon.file);
    const r = spawnSync(browser, [
      "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
      "--default-background-color=00000000", `--window-size=${icon.size},${icon.size}`,
      `--screenshot=${out}`, url,
    ], { stdio: "pipe" });
    if (r.status !== 0 || !existsSync(out)) {
      console.error(`✗ ${app.dir}/${icon.file}\n${r.stderr}`);
      process.exit(1);
    }
    console.log(`✓ apps/${app.dir}/icons/${icon.file}`);
  }
}
