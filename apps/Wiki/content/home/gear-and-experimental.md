## Intro

The home page's **gear** (bottom left) holds one setting: **Experimental Features (AI & other development)**, off by default. It controls two things: whether **experimental apps** (Ai Tools (Local) and RGB to CMYK) show up on the home page, and whether ZEditor's AI features appear. It is **one switch shared by both**, and the home page gear also carries the **Tutorial / Wiki** link and the licence line.

## How to use

1. Click the **gear**. Tick **Experimental Features (AI & other development)**.
2. A pop-up explains that these features are still under development and testing (some download local AI models, some are newer tools with rough edges). **Enable** or **Cancel**.
3. After enabling, the Ai Tools and RGB to CMYK cards appear. Untick it to hide AI everywhere again (no confirmation needed to turn off).
- The same switch exists in ZEditor's gear.
- **Tutorial / Wiki** opens this textbook.

## How it works

### One shared setting

ZEditor saves its display settings as JSON under the `localStorage` key `zeditor.displayPrefs`; the home page reads and writes **the same key**, only touching `aiFeatures`, leaving ZEditor's other settings intact: `{ ...readPrefs(), aiFeatures: on }`. Both pages are on the same website, so they share `localStorage`. If the browser blocks storage, a variable in memory (`memoryAi`) holds the setting until the page closes.

### Confirm before enabling

Ticking does **not** switch it on: the code unticks the box again, closes the gear and opens the confirmation pop-up; only **Enable** calls `setAi(true)` and redraws the cards.

### Filtering the cards

Each card list is rebuilt by `renderGrid`, which keeps an app if it is **not** experimental or the switch is on.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### Reading and writing the shared setting

```js file=launcher/launcher.js
  const PREFS_KEY = "zeditor.displayPrefs";
  let memoryAi = false; // used only when the browser blocks storage
  function readPrefs() { try { return JSON.parse(localStorage.getItem(PREFS_KEY)) || {}; } catch (e) { return {}; } }
  function aiOn() { try { return readPrefs().aiFeatures === true; } catch (e) { return memoryAi; } }
  function setAi(on) {
    memoryAi = on;
    try { localStorage.setItem(PREFS_KEY, JSON.stringify({ ...readPrefs(), aiFeatures: on })); } catch (e) { /* not remembered */ }
  }
```

**The Logic:** `readPrefs` parses whatever is saved (or `{}` if nothing or broken). `aiOn()` is true only when `aiFeatures === true` exactly. `setAi(on)` first keeps the value in memory, then writes the **merged** object: the spread `...readPrefs()` copies the existing settings and `aiFeatures: on` overrides one of them.

**Worked example.** Saved text is `{"uiScale":125}`. `setAi(true)` writes `{"uiScale":125,"aiFeatures":true}`: ZEditor's interface size is untouched. `setAi(false)` then writes `{"uiScale":125,"aiFeatures":false}`.

### Showing the right cards

```js file=launcher/launcher.js
  function renderGrid() {
    grid.innerHTML = "";

    if (apps.length === 0) {
      const empty = document.createElement("div");
      empty.className = "zn-empty";
      empty.textContent = "No apps yet — click + to generate an entry for config/apps-config.js.";
      grid.appendChild(empty);
      return;
    }

    apps
      .filter((e) => e && e.folder && (!e.experimental || aiOn()))
      .forEach((entry) => grid.appendChild(buildCard(entry)));
  }
```

**The Logic:** with an empty list it shows a hint. Otherwise `.filter((e) => e && e.folder && (!e.experimental || aiOn()))` keeps entries that exist, have a folder, and are either ordinary or allowed by the switch; `forEach` builds and appends a card for each. `!e.experimental` is true when the property is missing or false.

**Worked example.** Four apps; the fourth has `experimental: true`. AI off: `!false || false` for the first three is true; the fourth `!true || false` is false → **3 cards**. AI on: the fourth `!true || true` → true → **4 cards**.

### The gear and the confirm

```js file=launcher/launcher.js
  aiToggle.addEventListener("change", () => {
    if (aiToggle.checked) { aiToggle.checked = false; closeGear(); openOverlayPanel("ai"); return; } // ask first
    setAi(false); renderGrid();
  });
```

**The Logic:** a ticking change is intercepted: `aiToggle.checked = false` resets the box, the gear closes and `openOverlayPanel("ai")` shows the question; unticking calls `setAi(false)` and redraws at once. The **Enable** button (below it in the file) calls `setAi(true)`, ticks the box, closes the pop-up and redraws.
