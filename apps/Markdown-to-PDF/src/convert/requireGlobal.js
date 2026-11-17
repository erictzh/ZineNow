// Checks that an optional CDN library loaded, with a clear error naming it if not.

/* ------------------------------------------------------------------
 * requireGlobal(name, featureLabel)
 * ------------------------------------------------------------------
 * convertDocxToMarkdown/convertEpubToMarkdown depend on CDN-loaded
 * libraries that, unlike marked.js, aren't needed for the app to
 * work at all — only if the user actually imports one of those
 * formats. If one failed to load (no internet the first time, a
 * blocked request, an ad blocker), calling it directly would throw
 * an opaque "X is not a function" deep inside this file. This turns
 * that into one clear, actionable error message instead.
 * ------------------------------------------------------------------ */
export function requireGlobal(name, featureLabel) {
  if (typeof window[name] === 'undefined') {
    throw new Error(
      featureLabel + ' needs the "' + name + '" library, which did not load ' +
      '(this app loads it from a CDN, so it needs internet access the first ' +
      'time). Try again once you are online, or reload the page.'
    );
  }
  return window[name];
}
