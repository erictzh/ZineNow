## Intro

You can put a picture in your document by **dragging it onto the page**: from your file manager, or from another website. The picture is stored **inside your Markdown text**, so a saved `.md` file still has it.

## How to use

- **Drag a picture** (png, jpg, gif, webp, svg) onto the window. A dashed orange frame says *Drop a picture to add it to your text*. Release, and it is inserted at the caret, or at the end if you have not clicked into the text yet. Up to 12 pictures from one drop; the rest are left out and a message says so.
- Or use the **picture button** (or Insert → **Image from file…**) to pick a file.
- Or Insert → **Image from web address**: it inserts `![image](https://)` with the address selected; paste the picture's web address over it.
- Pictures are **shrunk to at most 1600 px** on the longest side, never enlarged.
- Some websites do not let other pages copy their pictures; then the picture goes in as a **web link**, which shows only while that site keeps it online. Save the picture to your computer and drop the file to keep it permanently.
- Dropping something that is not a picture shows a message with the supported types.

## How it works

### In the text: a reference

A picture's data is very long (thousands of characters), which would bury your writing. So the line in your text is short, `![photo][image-1]`, and the **long data goes at the very end** of the text as `[image-1]: data:image/jpeg;base64,…`. Markdown calls this a **reference**: the name in the second brackets points to a definition elsewhere. The next picture is `image-2`, and so on.

### Shrinking

The picture is drawn onto a **canvas** (an invisible drawing surface) of the new size and exported again. If it has any see-through pixels it is saved as **PNG** (lossless, keeps transparency); otherwise as **JPEG** at 85% quality, which is far smaller for photos. An SVG is drawn first. A GIF loses its animation (only the first frame is kept).

### Reading a drop

A drop carries different things depending on where it came from. A file from your computer arrives as a **file**. From a website, Chrome often gives the file too; Firefox and Safari often give only a **web address**, in the dragged HTML (`<img src=…>`) or as a link. The code looks in this order: files, then the `<img>` tag, then a link or plain text that looks like a picture address. Then it tries to **fetch** the address; browsers refuse this for most sites (the **CORS** rule: a website must allow other pages to read its pictures), in which case the web link is used.

### Waiting for the editor

If the Typography tab is showing, there is no editor to receive the picture. The drop waits in a small holding variable, the page switches to the Editor tab, and the editor picks it up when it appears.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### Reading what was dropped: `readDrop`

```js file=shared/js/dropImages.js fn=usableUrl,readDrop
```

**The Logic:** `usableUrl` accepts only `data:image/` addresses and `http(s)` ones (a leading `//` gets `https:`); relative, `blob:` and `file:` addresses cannot be fetched from here, so they give `null`. `readDrop`: files that are pictures first (`filter(isImageFile)`); else the first `<img …>` tag in the dragged HTML, whose `src` and `alt` are read; else a link from the `text/uri-list` (skipping `#` comment lines) or the plain text if it is one word. A bare link must look like a picture (`IMAGE_URL`: ends in `.png`, `.jpg`… optionally followed by `?query` or `#part`), because dragging an ordinary page link is not a picture drop. It returns `{ files, url, alt }` or `null`.

**Worked example.** Dragging a photo from Firefox gives HTML `<img src="//cdn.site.com/cat.jpg" alt="A cat">`: `usableUrl` makes the address `https://cdn.site.com/cat.jpg`; result `{ files: [], url: "https://cdn.site.com/cat.jpg", alt: "A cat" }`. Dragging the link `https://site.com/about` gives `null` (not a picture address). Dragging `https://site.com/a.png?v=2` is accepted (`.png` followed by `?v=2`).

### Fetching and naming: `nameFromUrl` and `fetchImageFile`

```js file=shared/js/dropImages.js fn=nameFromUrl,fetchImageFile
```

**The Logic:** `fetchImageFile` asks the address for the picture with `fetch`, sending no cookies (`credentials: "omit"`) and no referrer. Only a good reply (`res.ok`) whose type starts with `image/` counts; any error (including the CORS refusal) returns `null`, which is the signal to use a link instead. The reply is wrapped as a `File` so the rest of the code treats it like a file from your computer. `nameFromUrl` takes the last part of the address path (`decodeURIComponent` turns `%20` back into a space), replaces characters not allowed in file names with `_`, and adds an ending from the type if there is none (`image/svg+xml` becomes `svg`, `jpeg` becomes `jpg`).

**Worked example.** `https://x.com/img/My%20Cat.jpg?x=1` → name `My Cat.jpg`. `https://x.com/photo` with type `image/jpeg` → `photo.jpg`. A `data:` address → `dropped-picture.png` (or the type's ending).

### Shrinking: `imageFileToDataUrl`

```js file=shared/js/imageFiles.js fn=imageFileToDataUrl
```

**The Logic:** `shrink = Math.min(1, maxSide / longest)`: the factor to multiply by so the longest side becomes `maxSide`, but never above 1 (no enlarging). Width and height are rounded and at least 1. After drawing, `hasTransparency` scans the pixel data: every 4th number from index 3 is the **alpha** (opacity, 0 to 255) of one pixel, so any value under 255 means a see-through pixel.

**Worked example.** A 4000 × 3000 photo: `shrink = min(1, 1600 / 4000) = 0.4` → **1600 × 1200**. An 800 × 600 picture: `min(1, 1600/800) = 1` → stays 800 × 600. A 1000 × 5000 strip: `1600 / 5000 = 0.32` → 320 × 1600. The size message: for a data address of 200,000 characters, `kb = round(200000 × 3 / 4 / 1024) = 146` (base64 uses 4 characters for every 3 bytes, so multiply by 3/4 to get bytes).

### Putting it in the text: `nextImageRef` and `insertImageFile`

```js file=apps/Markdown-to-PDF/src/editor/format.js fn=nextImageRef,insertImageFile,insertImageLink
```

**The Logic:** `nextImageRef` scans for lines beginning `[image-N]:` (`matchAll` with the `m` flag means `^` matches at every line start) and returns one more than the highest `N`. `insertImageFile` cleans the alt text (brackets and newlines would end it early), builds `![alt][image-N]` on its own line, applies it to a copy of the text, trims the trailing whitespace, and appends `[image-N]: data…` after a blank line. The edit replaces everything from the caret to the end, so it is **one undo step**. `insertImageLink` percent-encodes spaces and brackets in the address (`%20`, `%28`, `%29`) so they cannot end the link.

**Worked example.** `nextImageRef("[image-1]: x⏎[image-4]: y")` → `image-5` (one more than the highest, even with a gap). Inserting a picture "My [pic]" into the text `Hi` at the end gives `Hi⏎⏎![My  pic][image-1]⏎⏎[image-1]: data:…⏎` (the brackets become spaces). `insertImageLink` with `http://x.com/a b(1).png` gives `![a](http://x.com/a%20b%281%29.png)`.

### Handing the drop to the editor

```js file=apps/Markdown-to-PDF/src/editor/droppedPictures.js fn=queueDropped,takeDropped
```

**The Logic:** a single variable, `pending`, holds the drop. `takeDropped` returns it and **empties** it in the same step, so a drop is used once. It is a "mailbox": the sender puts something in; whoever shows up next takes it.
