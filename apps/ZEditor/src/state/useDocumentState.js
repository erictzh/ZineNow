// The open document: its pages, which page(s) are selected, the loaded source PDFs and the id counters.

import { DEFAULT_PAGE_FILTER } from "../model/pageFilters.js";

const { useState, useRef, useMemo } = React;

export function useDocumentState() {
  const [pages, setPages] = useState([]); // {key, pageNumber, rotation, dataUrl, isBlank, annotations, filter}
  const [selectedIdx, setSelectedIdx] = useState(null);
  // Shift+Click multi-select of pages: `selectedIdx` is the page shown,
  // these are the other selected pages.
  const [selectedPageIndices, setSelectedPageIndices] = useState([]);
  // Page filter (grayscale/duotone/halftone) is a per-page property
  // (page.filter) rather than app-wide state — each page keeps its own
  // look, and switching pages shows/edits that page's own setting
  // instead of one filter bleeding onto every page.
  const selectedPage = selectedIdx !== null ? pages[selectedIdx] : null;
  const pageFilter = useMemo(() => (selectedPage && selectedPage.filter) || DEFAULT_PAGE_FILTER, [selectedPage]);

  // Map of docId -> { doc, bytes } — a page can come from any one of
  // several loaded source PDFs (the original load, plus anything
  // brought in via Insert PDF), not just a single document.
  const pdfDocsRef = useRef({});
  const nextKeyRef = useRef(1);
  const nextAnnIdRef = useRef(1);
  const nextDocIdRef = useRef(1);
  const pageSizeRef = useRef(null); // captured from the first loaded PDF page; used as the default size for new blank pages

  // Fresh ids for new pages, documents and items.
  const ids = {
    pageKey: () => nextKeyRef.current++,
    docId: () => "doc" + nextDocIdRef.current++,
    annId: () => nextAnnIdRef.current++,
  };

  return {
    pages, setPages, selectedIdx, setSelectedIdx, selectedPageIndices, setSelectedPageIndices,
    selectedPage, pageFilter,
    pdfDocsRef, nextKeyRef, nextAnnIdRef, nextDocIdRef, pageSizeRef, ids,
  };
}
