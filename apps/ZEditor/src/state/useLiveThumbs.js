// Live sidebar thumbnails: a page with items on it (or a page filter) gets a thumbnail that shows them,
// redrawn as it changes. A page with neither keeps the plain base thumbnail (page.dataUrl), so an
// untouched document costs nothing extra.
//
// How it stays cheap:
//   - the base picture (PDF page or blank paper) is never redrawn: the items and filter are painted over
//     the cached base (render/pageRender.js renderPageThumbWithItems), at a small size;
//   - a change is noticed by comparing references (the annotation list and the filter are replaced, never
//     edited in place), so nothing is hashed or compared deeply;
//   - the page being edited redraws at most about 6 times a second (and the slower a redraw, the longer
//     the wait), with one last redraw when changes stop; other pages (e.g. a filter applied to many)
//     redraw one after another in the background;
//   - the pictures are blob URLs kept out of the page data, so undo history doesn't grow, and old ones
//     are released.
//
// It can be switched off in the Display gear ("Live page thumbnails", ui/displaySettings.js): then nothing
// is drawn or scheduled, the pictures made so far are released, and the plain thumbnails show.
//
// Returns { [page.key]: url } for the pages that have a live thumbnail.

import { renderPageThumbWithItems } from "../render/pageRender.js";

const { useState, useEffect, useRef } = React;

const SELECTED_GAP_MS = 150; // the page being edited: about 6 redraws a second at most
const OTHER_GAP_MS = 25; // the others: one after another, close together
const SLOW_FACTOR = 4; // a redraw that takes t ms makes the next wait at least 4 t (on the edited page)

const filterOn = (f) => Boolean(f && f.type && f.type !== "none");
const needsLive = (p) => (p.annotations && p.annotations.length > 0) || filterOn(p.filter);
const revokeLater = (url) => setTimeout(() => URL.revokeObjectURL(url), 1500); // not while an <img> may still show it

export function useLiveThumbs(pages, selectedKey) {
  const [urls, setUrls] = useState({});
  const urlsRef = useRef({}); // page key -> blob URL
  const madeFrom = useRef(new Map()); // page key -> { annotations, filter, base } its thumbnail was drawn from
  const baseCache = useRef(null); // { key, src, image }: the edited page's decoded base picture
  const latest = useRef({ pages, selectedKey });
  const timer = useRef(0);
  const running = useRef(false);
  const lastEnd = useRef(0);
  const lastMs = useRef(0);
  const alive = useRef(true);
  // The Display gear's tick box: html.ze-static-thumbs means off. The gear applies its classes before the
  // first render and announces every change with a window event.
  const [on, setOn] = useState(() => !document.documentElement.classList.contains("ze-static-thumbs"));
  const onRef = useRef(on);
  onRef.current = on;
  latest.current = { pages, selectedKey };
  useEffect(() => {
    const listener = (e) => setOn(!(e.detail && e.detail.staticThumbs));
    window.addEventListener("zn-display-prefs", listener);
    return () => window.removeEventListener("zn-display-prefs", listener);
  }, []);

  const isStale = (p) => {
    const m = madeFrom.current.get(p.key);
    return !m || m.annotations !== p.annotations || m.filter !== p.filter || m.base !== p.dataUrl;
  };
  // The page to draw next: the selected one if it needs it, else the first that does.
  function nextStale() {
    if (!onRef.current) return null;
    const { pages: ps, selectedKey: sel } = latest.current;
    let first = null;
    for (const p of ps) {
      if (!needsLive(p) || !isStale(p)) continue;
      if (p.key === sel) return p;
      if (!first) first = p;
    }
    return first;
  }

  async function drawBlob(p) {
    let cached = baseCache.current;
    if (!cached || cached.key !== p.key || cached.src !== p.dataUrl) {
      const image = new Image();
      image.src = p.dataUrl;
      await image.decode();
      cached = { key: p.key, src: p.dataUrl, image };
      if (p.key === latest.current.selectedKey) baseCache.current = cached; // kept for the page being edited only
    }
    const canvas = await renderPageThumbWithItems(p, cached.image);
    return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  }

  function schedule() {
    if (running.current || timer.current || !alive.current) return;
    const p = nextStale();
    if (!p) return;
    const edited = p.key === latest.current.selectedKey;
    const gap = edited ? Math.max(SELECTED_GAP_MS, lastMs.current * SLOW_FACTOR) : Math.max(OTHER_GAP_MS, lastMs.current);
    timer.current = setTimeout(run, Math.max(0, lastEnd.current + gap - performance.now()));
  }

  async function run() {
    timer.current = 0;
    const p = nextStale();
    if (!p || !alive.current) return;
    running.current = true;
    const from = { annotations: p.annotations, filter: p.filter, base: p.dataUrl };
    const started = performance.now();
    let blob = null;
    try { blob = await drawBlob(p); } catch (err) { /* keeps the base thumbnail */ }
    lastMs.current = performance.now() - started;
    lastEnd.current = performance.now();
    running.current = false;
    if (!alive.current || !onRef.current) return; // unmounted, or switched off while this was drawing
    // Recorded even when drawing failed, so the same state isn't retried in a loop.
    madeFrom.current.set(p.key, from);
    if (blob && latest.current.pages.some((q) => q.key === p.key)) {
      const old = urlsRef.current[p.key];
      urlsRef.current = { ...urlsRef.current, [p.key]: URL.createObjectURL(blob) };
      setUrls(urlsRef.current);
      if (old) revokeLater(old);
    }
    schedule();
  }

  useEffect(() => {
    // Pages that were deleted, or no longer have anything on them, go back to the base thumbnail.
    const wanted = new Set(on ? pages.filter(needsLive).map((p) => p.key) : []); // off: none, so all are released
    let next = null;
    for (const k of Object.keys(urlsRef.current)) {
      if (wanted.has(Number(k))) continue;
      next = next || { ...urlsRef.current };
      revokeLater(next[k]);
      delete next[k];
    }
    for (const k of [...madeFrom.current.keys()]) if (!wanted.has(k)) madeFrom.current.delete(k);
    if (next) { urlsRef.current = next; setUrls(next); }
    schedule();
  }, [pages, selectedKey, on]);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      clearTimeout(timer.current);
      for (const url of Object.values(urlsRef.current)) URL.revokeObjectURL(url);
    };
  }, []);

  return on ? urls : NO_THUMBS;
}

const NO_THUMBS = {};
