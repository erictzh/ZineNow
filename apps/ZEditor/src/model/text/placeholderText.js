// Placeholder ("dummy") text for laying out a page before the real words exist:
// Latin lorem ipsum and Chinese 假文. Pure; the same count always gives the same text.

export const PLACEHOLDER_KINDS = [
  { key: "latin", label: "Lorem ipsum" },
  { key: "chinese", label: "中文假文" },
];
export const MAX_PLACEHOLDER_PARAGRAPHS = 50;

const LATIN_OPENING = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.";
const LATIN_WORDS = (
  "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore " +
  "magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat " +
  "duis aute irure in reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat " +
  "cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum curabitur pretium tincidunt " +
  "lacus nunc viverra imperdiet fusce placerat mauris integer vitae justo eget magna fermentum iaculis porta " +
  "nibh venenatis cras semper auctor neque donec ultrices tortor pellentesque habitant morbi tristique senectus netus"
).split(" ");

// Common characters, so the 假文 looks like ordinary running Chinese text.
const CHINESE_CHARS = Array.from(
  "的一是在不了有和人这中大为上个国我以要他时来用们生到作地于出就分对成会可主发年动同工也能下过子说产种面而方后多定行学法所民得经" +
  "十三之进着等部度家电力里如水化高自二理起小物现实加量都两体制机当使点从业本去把性好应开它合还因由其些然前外天政四日那社义事平形相全表间样与关各重新线内数正心反你明看原又么利比或但质气第向道命此变条只没结解问意建月公无系军很情者最立代想已通并提直题党程展五果料象员革位入常文总次品式活设及管特件长求老头基资边流路级少图山统接知较将组见计别她手角期根论运农指几九区强放决西被干做必战先回则任取据处府",
);

// A small seeded generator (mulberry32), so text doesn't change every time the panel redraws.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const between = (rand, lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));

function latinParagraph(rand, first) {
  const sentences = first ? [LATIN_OPENING] : [];
  const count = between(rand, 4, 6) - sentences.length;
  for (let s = 0; s < count; s++) {
    const words = [];
    const len = between(rand, 6, 14);
    for (let w = 0; w < len; w++) {
      words.push(LATIN_WORDS[Math.floor(rand() * LATIN_WORDS.length)]);
      if (w > 2 && w < len - 2 && rand() < 0.12) words[words.length - 1] += ",";
    }
    const sentence = words.join(" ");
    sentences.push(sentence[0].toUpperCase() + sentence.slice(1) + ".");
  }
  return sentences.join(" ");
}

function chineseParagraph(rand) {
  let out = "";
  const sentences = between(rand, 3, 5);
  for (let s = 0; s < sentences; s++) {
    const clauses = between(rand, 1, 3);
    for (let c = 0; c < clauses; c++) {
      const len = between(rand, 5, 12);
      for (let i = 0; i < len; i++) out += CHINESE_CHARS[Math.floor(rand() * CHINESE_CHARS.length)];
      out += c < clauses - 1 ? "，" : rand() < 0.15 ? "？" : "。";
    }
  }
  return out;
}

// `count` paragraphs of the given kind, separated by new lines (each new line is a paragraph in a text box).
export function placeholderText(kind, count) {
  const n = Math.max(1, Math.min(MAX_PLACEHOLDER_PARAGRAPHS, Math.round(Number(count)) || 1));
  const rand = rng(kind === "chinese" ? 0x5a1e : 0x10e3);
  const paragraphs = [];
  for (let i = 0; i < n; i++) paragraphs.push(kind === "chinese" ? chineseParagraph(rand) : latinParagraph(rand, i === 0));
  return paragraphs.join("\n");
}
