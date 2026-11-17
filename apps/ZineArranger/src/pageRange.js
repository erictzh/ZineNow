// Parses a "1-3, 7" page range into page numbers.

// Parses a Chrome-print-dialog-style page range spec ("1-3,7") into a sorted,
// deduplicated array of valid PDF page numbers (1-indexed) within [1, maxPage].
// Ranges may be given in either order ("7-5" is treated the same as "5-7").
// Invalid/out-of-range tokens are silently skipped rather than failing the whole
// spec. An empty/whitespace-only spec, or one with no valid tokens at all,
// returns null — callers should treat that as "use every page".
export function parsePageRange(spec, maxPage) {
    if(!spec || spec.trim().length === 0) return null;
    var pages = {};
    var tokens = spec.split(",");
    for(var t = 0; t < tokens.length; t++) {
        var token = tokens[t].trim();
        if(token.length === 0) continue;
        var dashParts = token.split("-");
        if(dashParts.length === 2 && dashParts[0].trim().length > 0 && dashParts[1].trim().length > 0) {
            var a = parseInt(dashParts[0].trim(), 10);
            var b = parseInt(dashParts[1].trim(), 10);
            if(isNaN(a) || isNaN(b)) continue;
            var lo = Math.min(a, b), hi = Math.max(a, b);
            for(var pn = lo; pn <= hi; pn++) {
                if(pn >= 1 && pn <= maxPage) pages[pn] = true;
            }
        } else {
            var single = parseInt(token, 10);
            if(!isNaN(single) && single >= 1 && single <= maxPage) pages[single] = true;
        }
    }
    var result = Object.keys(pages).map(Number).sort(function(a, b) { return a - b; });
    return result.length > 0 ? result : null;
}
