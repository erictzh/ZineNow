## Intro

**Threads** link text frames into one **story** that flows from frame to frame, like a magazine article that continues on the next page. Type or paste the story once in the first frame; whatever does not fit moves on into the next frame. Change a frame's size and the text re-flows.

## How to use

1. Give a text box a fixed size (columns and a **Frame height**, or drag its handles) and put the story in it.
2. When the text does not fit, a red **+** shows at the bottom-right corner. **Click it** to make a new linked frame (or use the link button at that corner on a frame that fits).
3. Move and resize the new frame anywhere, even on another page's worth of layout: the dotted line between the corners shows the link.
4. Edit the story in **any** frame: the words belong to the story, not to the frame.
5. Each frame keeps its own position, size, columns, vertical alignment, lock and visibility. Font, size, colour, style and effects belong to the story (the first frame).
6. Delete a frame: the chain closes up. Delete the first frame: the next one becomes the head and takes the story.
7. Copying a frame makes a plain box with just the words it shows. **Rasterize to Image** is unavailable on threaded frames.

## How it works

### Head and followers

The first frame (the **head**) stores the story's text and look. Every later frame (a **follower**) stores only `threadFrom`, the id of the frame before it, plus its **frame settings** (position, size, columns…). Which settings belong to the frame and which to the story is one list, `FRAME_PROPS`; everything not on that list is the story's. A chain of frames is a **linked list**.

### Resolving a page

Drawing code lays out one box at a time. So before drawing, `resolvePageText` turns the stored chain into ordinary independent boxes: the head keeps the whole text (it will simply hide what does not fit), and each follower becomes a copy of the head's look with only **the rest** of the text, starting at the point where the previous frame stopped. The offset is found by laying out frame 1, asking how many characters fit (`fittedLength`), then starting frame 2 there, and so on down the chain. This is also how the editor, the PDF export and Rasterize all agree.

### Editing through a follower

You may type in frame 3, but its text is only a slice of the story. `routeFramePatch` splits an edit into **frame changes** (position and the like, applied to the frame) and **story changes** (applied to the head): a new text for frame 3 is glued onto the story's first `offset` characters, `story.slice(0, offset) + newText`, and the spans are shifted by the same offset.

### Keeping the chain intact

`removeWithThreads` removes frames and then **re-links the survivors** in order: each survivor's `threadFrom` becomes the survivor before it, and if the head went, the next frame is given the story's properties and becomes the new head. This is the same operation as deleting a node from a linked list.

### Loops and orphans

`storyChains` ignores a frame whose previous box is missing, is not text, already has another follower, or forms a loop: it behaves as an ordinary empty box. This keeps damaged or hand-edited files from crashing the editor.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `storyChains`

```js file=apps/ZEditor/src/model/text/threads.js fn=storyChains
```

**The Logic:**
- `texts` is a `Map` from id to text item, for quick lookup. `nextOf` maps a frame's id to the frame that follows it.
- The first loop fills `nextOf`: for each follower, if it has a `threadFrom` that exists, and that frame does not already have a follower (`!nextOf.has(...)`), record the link.
- The second loop finds **heads**: frames that have a follower but are not themselves anyone's follower. For each head the chain is walked: `for (let f = nextOf.get(head.id); f && !seen.has(f.id); f = nextOf.get(f.id))` follows the links, and `seen` (a `Set`) stops a loop. Only chains of two or more frames are returned.

**Worked example (real output).** Frames: 1 (a story), 2 (`threadFrom: 1`), 3 (`threadFrom: 2`), and 9 (alone). `nextOf = { 1 → frame 2, 2 → frame 3 }`. Frame 1 has a follower and no previous: a head. The chain is **`[1, 2, 3]`**. Frame 9 has no follower: not returned.

### `followerView`

```js file=apps/ZEditor/src/model/text/threads.js fn=followerView
```

**The Logic:** `view` starts as a copy of the head (`{ ...head }`). Then each frame setting is overwritten by the follower's own (`for (const key of FRAME_PROPS) view[key] = frame[key]`). `threadFrom` and `fitHeight` are cleared (shrink-to-fit is per box). The text is the story from `offset` on (`.slice(offset)`). Spans that end after the offset are kept and **shifted left by the offset**, with starts clamped at 0 (`Math.max(0, r.start − offset)`). `storyContinues` is true when the frame starts in the middle of a paragraph, so the composer does not indent its first line.

**Worked example (real output).** Head text `"0123456789"` with a red run on letters 2–7, a follower `{ id: 2, x: 10, y: 20, width: 80 }`, offset 4: the view has `text: "456789"`, the run becomes `{ start: 0, end: 3 }` (letters 4–6 of the story are now letters 0–2, the part of the run after the offset), the frame's own `x`, `y`, `width`, and `storyContinues: true` (the character before the offset, "3", is not a newline).

### `routeFramePatch`

```js file=apps/ZEditor/src/model/text/threads.js fn=routeFramePatch
```

**The Logic:** for each `[key, value]` of the patch: frame settings go to `framePatch`; anything except `text` and `colorRuns` goes to `headPatch` (the story's look). The new text is `story.slice(0, offset) + patch.text`: the first part of the story stays, the edited slice replaces the rest. For spans, those that start before the offset are kept (clipped at the offset), the edited spans are shifted **right** by the offset, and `normalizeRuns` merges them. **Worked example (real output).** Head story `"0123456789"`, a follower showing from offset 4, and the patch `{ text: "abc", x: 50, color: "#f00" }`: `framePatch = { x: 50 }`; `headPatch = { color: "#f00", text: "0123abc" }`.

### `removeWithThreads`

```js file=apps/ZEditor/src/model/text/threads.js fn=removeWithThreads
```

**The Logic:** `gone` is the set of ids to delete; `replaced` collects frames that need changes. For each chain that loses a frame, `survivors` are the frames that remain. For each survivor `frame` at position `i`: the first one is the new head: if it already was the head it is unchanged, otherwise it receives the old head's story properties (`{ ...frame, ...storyProps(chain[0]), threadFrom: undefined }`). Every other survivor whose `threadFrom` is not the survivor before it is re-pointed. Finally the deleted items are filtered out and replaced frames substituted. **Worked example (real output).** Chain 1 → 2 → 3, delete **2**: frame 3 now has `threadFrom: 1`. Delete **1** (the head): frame 2 becomes the head, with the story text `"Story"`, and frame 3 still follows 2.

### `threadLinks`: the dotted lines

```js file=apps/ZEditor/src/model/text/threads.js fn=threadLinks
```

**The Logic:** `corner(v, fx, fy)` finds a corner of a frame: `(fx, fy)` is (0,0) for top-left and (1,1) for bottom-right. It takes the offset from the frame's centre (`(fx − 0.5) × width`), rotates it by the frame's angle (`dx·cos − dy·sin`, `dx·sin + dy·cos`), and adds the centre. Each link goes from the previous frame's out-port (bottom-right, `corner(v, 1, 1)`) to the next frame's in-port (top-left, `corner(next, 0, 0)`), skipped if either is hidden. **Worked example.** Frame A at `(100, 100)`, 200 × 150, not rotated: out-port `(100 + 200, 100 + 150) = (300, 250)`. Frame B at `(100, 400)`: in-port `(100, 400)`. The line runs from `(300, 250)` to `(100, 400)`.

### `fittedLength` and `resolvePageText`

```js file=apps/ZEditor/src/render/pageText.js fn=fittedLength,resolvePageText
```

**The Logic:**
- `fittedLength(view)` lays the frame out (`layoutTextBox`) and finds the first **hidden** line (one that did not fit): its `start` is how many characters fit. If no line is hidden, the whole text fits.
- `resolvePageText` returns early for an empty list, and also uses a **cache**: a `WeakMap` keyed by the annotations array itself. If the same array is asked again (and the wrap shapes have not changed: `version`), the old result is returned. This is cheap because arrays are never edited in place (see [State hooks](zeditor/workspace/state-hooks)); a `WeakMap` lets the entry vanish when the array is no longer used.
- For each chain, `head` and `story` are set; `offset` starts at 0. For frame `i`: the head is itself with `storyLength` cleared; a follower is `followerView(head, frame, min(offset, story.length))`. The link properties (`storyHeadId`, `storyIndex`, `storyPrevId`, `storyNextId`) are added, and text wrap obstacles (`withWrap`).
- Except for the last frame, `fits = fittedLength(view)` is how much this frame shows; if less than all of its text, `storyLength = fits` marks the cut, and `offset` advances for the next frame.

**Worked example.** A story of 1000 characters in three frames. Frame 1 (the head): the whole story is laid out, 400 characters fit: `storyLength = 400`, next `offset = 0 + 400`. Frame 2 gets `story.slice(400)` (600 characters); 350 fit: `storyLength = 350`, next `offset = 400 + 350 = 750`. Frame 3, the last, gets `story.slice(750)` (250 characters), and shows them all if they fit, or overflows with the red +.
