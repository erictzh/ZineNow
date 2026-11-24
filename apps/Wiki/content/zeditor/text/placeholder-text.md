## Intro

**Placeholder text** (also called dummy text or *lorem ipsum*) fills a box with made-up words so you can design a layout before the real text exists. ZEditor offers Latin *Lorem ipsum* and Chinese *假文*. The text is **repeatable**: asking for 3 paragraphs always gives the same 3 paragraphs.

## How to use

In the Text panel, **Placeholder text** (top section):
- Pick **Lorem ipsum** or **中文假文**, and the number of paragraphs (1–50, shown with ¶).
- **Replace text:** the box's text becomes the placeholder (spans, which belonged to the old words, are dropped).
- **Append:** adds the placeholder after the box's existing text, on a new line.
- Each paragraph is a new line. In linked frames the text flows on into the next frame.

## How it works

### Why "lorem ipsum"?

Real words distract: people read them instead of judging the design. Latin-looking nonsense has about the same word and letter shapes as English, so the page looks natural without being readable. The tradition is old; the opening sentence "Lorem ipsum dolor sit amet…" always starts the first Latin paragraph here.

### Repeatable randomness: a seeded generator

The words are picked "at random", but from a **pseudo-random number generator** (PRNG) started with a fixed **seed**: the same seed always gives the same sequence. ZEditor uses **mulberry32**, a small, fast generator that does a few arithmetic and bit operations on a 32-bit number each time it is called. Two fixed seeds (one per language) make the text identical every time the panel redraws, so it does not flicker or change under you.

### Building a paragraph

A Latin paragraph has 4–6 sentences; a sentence has 6–14 words picked from a list of 95 words; there is a 12% chance of a comma after a word (not in the first three or last two words); the sentence starts with a capital and ends with a full stop. A Chinese paragraph has 3–5 sentences, each 1–3 clauses of 5–12 characters from a list of common characters, joined by "，" and ended by "。" (or sometimes "？").

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `rng`: the mulberry32 generator

```js file=apps/ZEditor/src/model/text/placeholderText.js fn=rng,between
```

**The Logic:**
- `rng(seed)` returns **a function** (a **closure**): each call of the returned function gives the next number. `a` is the hidden state kept between calls.
- `seed >>> 0` forces the seed to an unsigned 32-bit whole number. `>>>` is a **bit shift**; shifting by 0 positions is a trick to convert.
- Each call adds a large odd constant (`0x6d2b79f5`, written in **hexadecimal**: base 16) to `a`, and mixes the bits: `t ^ (t >>> 15)` XORs (`^`) a number with a shifted copy of itself, and `Math.imul` multiplies two numbers as 32-bit integers, wrapping around instead of getting huge. This scrambling is what makes the output look random.
- The final `/ 4294967296` (2³²) turns the 32-bit number into a decimal from 0 up to (not including) 1.
- `between(rand, lo, hi)` turns such a number into a whole number from `lo` to `hi` inclusive: `lo + Math.floor(rand() × (hi − lo + 1))`.

**Worked example (real numbers).** `rng(0x10e3)` returns, call by call: 0.5450, 0.0909, 0.6180, 0.5870… Then `between(rand, 4, 6)` takes the first, `0.5450 × 3 = 1.635`, floors it to 1, and gives `4 + 1 =` **5** sentences. The next call, `between(rand, 6, 14)`: `0.0909 × 9 = 0.818` → 0, giving **6** words. Run it a thousand times with the same seed and you get 5 and 6 every time.

### `latinParagraph`

```js file=apps/ZEditor/src/model/text/placeholderText.js fn=latinParagraph
```

**The Logic:** `sentences` starts with the famous opening for the first paragraph only (`first ? [LATIN_OPENING] : []`). `count` is how many more sentences to make: a random 4–6 minus what is already there. For each sentence: `len` words are drawn, each `LATIN_WORDS[Math.floor(rand() × LATIN_WORDS.length)]` (a random list position). A comma is appended to a word (`+= ","`) when it is not among the first three or last two words and `rand() < 0.12`. The words are joined with spaces, the first letter is capitalised (`sentence[0].toUpperCase() + sentence.slice(1)`), a full stop is added, and the sentences are joined with spaces.

### `chineseParagraph`

```js file=apps/ZEditor/src/model/text/placeholderText.js fn=chineseParagraph
```

**The Logic:** `out` is built up as text. For each of 3–5 sentences there are 1–3 clauses; each clause has 5–12 random characters from the character list, followed by "，" if more clauses follow, or else "。" (and in 15% of cases "？"). **Worked example (real output).** `placeholderText("chinese", 1)` begins 自部也那种利？被加力则九少现为对同外？… The first clause happened to end with "？", the 15% case.

### `placeholderText`

```js file=apps/ZEditor/src/model/text/placeholderText.js fn=placeholderText
```

**The Logic:** `n` is the requested count, forced into 1–50: `Math.round(Number(count)) || 1` turns junk into 1, then `Math.max(1, Math.min(50, …))` clamps it. The generator is created **once** with a seed depending on the language (`0x5a1e` or `0x10e3`), and one paragraph is made per loop round, all drawing from the same generator, so paragraph 2 differs from paragraph 1 but is the same on every run. `paragraphs.join("\n")` separates them with new lines. **Worked example (real output).** `placeholderText("latin", 2)` makes a first paragraph of 5 sentences (opening plus 4 random) and a second of 4.
