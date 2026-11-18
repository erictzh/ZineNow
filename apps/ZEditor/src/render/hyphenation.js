// Hyphenation: where a word may be broken at the end of a line.
//
// The composer asks for this through `currentHyphenator()`: a function that
// takes one word of letters and returns its pieces (["hy", "phen", "ation"]),
// or null for a word that shouldn't be split. The built-in one uses the
// standard TeX English (US) patterns from the `hyphen` package, bundled into
// the app. Other languages would plug in here with setHyphenator().

import { hyphenateSync } from "hyphen/en-us";

const SOFT_HYPHEN = "­";
// Like InDesign's defaults: only words of at least 5 letters are split (the patterns
// themselves keep 2 letters before and 3 after a hyphen).
const MIN_WORD_LENGTH = 5;

export function englishHyphenator(word) {
  if (word.length < MIN_WORD_LENGTH) return null;
  if (word.length > 1 && word === word.toUpperCase()) return null; // ACRONYMS and shouted words stay whole
  const pieces = hyphenateSync(word, { minWordLength: MIN_WORD_LENGTH }).split(SOFT_HYPHEN);
  return pieces.length > 1 ? pieces : null;
}

let hyphenator = englishHyphenator;

export function setHyphenator(fn) { hyphenator = fn || null; }
export function currentHyphenator() { return hyphenator; }
