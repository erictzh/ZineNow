// How many sheets go in each signature (user's choice, or automatic with a cap).

import { MAX_AUTO_SIGNATURE_SHEETS } from "../sizes.js";
import { state } from "../state.js";

// Decides how many sheets go in each signature. Called from every zine-size branch
// below, right after pagesPerSheet is known and pageCount has been padded to a multiple
// of it. Respects an explicit user-set sigSize with no cap; otherwise auto-sizes,
// capping at MAX_AUTO_SIGNATURE_SHEETS (splitting into multiple balanced signatures
// instead of one large one once the document is long enough to exceed it).
export function resolveSheetsPerSig(totalPageCount, sheetPageCapacity) {
    var totalSheets = totalPageCount / sheetPageCapacity;
    if(state.sigSize > 0) {
        return state.sigSize; // explicit user choice — always respected, never capped
    }
    if(totalSheets <= MAX_AUTO_SIGNATURE_SHEETS) {
        return totalSheets; // already fits in one signature — same as the old unconditional behavior
    }
    var numSignatures = Math.ceil(totalSheets / MAX_AUTO_SIGNATURE_SHEETS);
    return Math.ceil(totalSheets / numSignatures); // balanced size, guaranteed <= the cap
}
