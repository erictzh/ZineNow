// "Reload app" without losing work: the project is parked in the browser (IndexedDB) just before
// the page reloads, and picked up once when the editor starts again.
//
// Useful while the app's code is being changed: the reload loads the new code, and the open
// project comes back as it was (pages, items, title, the saved-to file). Undo history isn't kept.
// IndexedDB rather than sessionStorage because a project with PDFs and images is easily bigger
// than sessionStorage's few MB, and a File System Access handle can be stored there as it is.

const DB_NAME = "zeditor-reload";
const STORE = "snapshot";
const KEY = "pending";
const MAX_AGE_MS = 10 * 60 * 1000; // a snapshot older than this is stale (a reload that never happened)

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function run(mode, action) {
  return openDb().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = action(tx.objectStore(STORE));
    tx.oncomplete = () => { db.close(); resolve(req && req.result); };
    tx.onerror = () => { db.close(); reject(tx.error); };
    tx.onabort = () => { db.close(); reject(tx.error); };
  }));
}

// Parks `snapshot` ({ json, selectedIdx, fileHandle, title }) for the next start.
export function saveReloadSnapshot(snapshot) {
  return run("readwrite", (store) => store.put({ ...snapshot, savedAt: Date.now() }, KEY));
}

// The parked snapshot (removed as it's read, so it's used once), or null.
export async function takeReloadSnapshot() {
  try {
    const snapshot = await run("readonly", (store) => store.get(KEY));
    if (!snapshot) return null;
    await run("readwrite", (store) => store.delete(KEY));
    return Date.now() - snapshot.savedAt <= MAX_AGE_MS ? snapshot : null;
  } catch (err) {
    return null; // storage blocked (private window...): start empty, as a plain reload would
  }
}
