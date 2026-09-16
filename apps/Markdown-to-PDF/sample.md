/* ==========================================================================
   Md to PDF Converter — sample.md
   ==========================================================================
   The sample Markdown shown in the editor on first load, and restored
   by the "Load Sample Markdown" button. Edit the document between the
   backticks below freely — it's the real Markdown, byte for byte.

   Why this ".md" file isn't plain Markdown text: this app runs by
   opening index.html directly from disk, no local web server (see the
   note at the top of App.jsx) — and Chrome blocks fetch()/XHR reads of
   local sibling files under file://, the exact bug that caused a blank
   screen earlier in this app's build. A normal <script src="..."> tag
   (like this file is loaded with, in index.html) doesn't have that
   restriction, but only works if the file's content is valid
   JavaScript, so the document below is wrapped as a JS template
   literal (the backtick-delimited string type) assigned to a global
   variable, rather than being a bare .md file.

   The one thing this means for editing: because backticks (`) close a
   JS template literal, any backtick you type below — including for
   Markdown's own inline code (`like this`) or fenced code blocks
   (```like this```) — must be escaped with a backslash (\`) or it will
   break the file. The two fenced blocks already below show the pattern
   (\`\`\`json ... \`\`\`). A stray, un-escaped backtick will cause
   the whole app to fail to load (a blank screen) since this file no
   longer parses as valid JavaScript — if that happens, check here
   first. Everything else (asterisks, brackets, #, -, |, etc.) needs no
   escaping at all.
   ========================================================================== */
window.MD2eBookSampleMarkdown = `# The Art of Slow Mornings

## Why Ritual Matters

There is a particular kind of quiet that only exists before 7 a.m. — before
notifications start, before the household wakes, before the day has a
chance to hand you its list of demands. This book is about *reclaiming*
that quiet on purpose, and turning it into a ritual sturdy enough to
survive a bad night's sleep, a busy week, or a change of season.

Good mornings are not about willpower. They are about **removing
friction** so the right choice is also the easy one.

### A Note on Method

Everything in this guide has been tested against three constraints:

1. It must survive a week of travel.
2. It must work with children, pets, or roommates in the house.
3. It must cost less than a fancy cup of coffee per day.

If a habit fails any of those three tests, it didn't make the cut.

## Chapter One: The First Ten Minutes

The first ten minutes of the day set the tone for the other 1,430. Most
people spend them reacting — to an alarm, to a phone, to whatever crisis
scrolled in overnight. A better first ten minutes looks like this instead:

- Wake without immediately reaching for a screen
- Drink a full glass of water before any caffeine
- Open a window, or step outside, even briefly
- Write down the *one* thing that would make today good

> "You will never find time for anything. If you want time, you must make
> it." — Charles Buxton

That quote is a little unfair to mornings specifically, but it captures
the spirit: a slow morning is *made*, not found lying around.

### A Simple Morning Checklist

| Time        | Action                        | Notes                          |
|-------------|--------------------------------|---------------------------------|
| 6:30 – 6:35 | Wake, water, light             | No phone yet                    |
| 6:35 – 6:50 | Stretch or walk                | Outdoors if possible             |
| 6:50 – 7:10 | Coffee + journal                | Ten minutes, not thirty          |
| 7:10 – 7:30 | Plan the one important thing    | Write it somewhere you'll see it |

## Chapter Two: Tools of the Trade

You do not need special equipment, but a few small tools remove friction
from the routine. Here is a minimal setup, expressed as a config block you
can adapt:

\`\`\`json
{
  "kettle": "electric, 1L, quiet",
  "journal": "any notebook that fits in a bag",
  "light": "a lamp on a timer, or an east-facing window",
  "phone_rule": "airplane mode until after journaling"
}
\`\`\`

Code blocks like the one above are treated as a single unbreakable unit
when this document is exported to PDF — they will never be split awkwardly
across two pages.

### On Consistency

Consistency beats intensity. A **five-minute** version of this routine,
done daily, will outperform a **sixty-minute** version done twice a month.
If you only take one idea from this chapter, take that one.

## Chapter Three: Adapting the Ritual

Life will interrupt this routine constantly — new jobs, new babies, new
time zones. The goal is not to protect the ritual from change; it's to
make the ritual *flexible enough* to survive change.

Some adaptations that have worked well for readers of early drafts of this
book:

* Swapping the walk for stretching on rainy days
* Journaling by voice memo while making breakfast
* Moving the "one important thing" question to the night before, for
  people who are not mentally sharp before coffee

---

Whatever shape it takes in your life, the underlying idea stays the same:
mornings are not something that happen to you. They are something you can,
in a small and repeatable way, *design*.
`;
