# ZineNow — setup (static config, no server)

## 1. Folder layout

```
zinenow/
  index.html
  style.css
  app.js
  config/
    apps-config.js   <- the list of apps — hand-edit this file
  apps/
    md2ebook/
      index.html      (required — this is what opens when you click the card)
      app-logo.png     (optional)
    ZineArranger/
      index.html
      ...
```

Drop each app's folder under `apps/`. There's no scanning — an app only
shows up once it has an entry in `config/apps-config.js`.

## 2. Run it

Just double-click `index.html`. That's it — no server, no folder picker, no
permission prompt of any kind. It loads instantly every time.

## 3. Adding an app

Two ways:

- **Hand-edit `config/apps-config.js` directly** — it's a plain JS array,
  commented with an example at the top. Add an object, save, refresh the
  page.
- **Use the + button** for help formatting the entry — fill in the folder
  name (and optionally a description / readme text), it generates the
  snippet and you paste it into `apps-config.js` yourself. It doesn't write
  anything to disk on its own.

Folder names are matched **exactly**, case-sensitive — `ZineArranger` and
`zinearranger` are different as far as this is concerned.

## 4. Removing / reordering

Just edit `config/apps-config.js` — delete an entry to remove it, cut/paste
to move it. Order in the file = order shown. Refresh the page to see the
change.

## 5. Logo, description, readme

- **Logo**: drop `app-logo.png` into the app's folder — picked up
  automatically, no config needed. No logo → a letter badge instead.
- **Description**: the `desc` field in the config entry. Omit it and the
  card just repeats the folder name.
- **Readme**: the `readme` field — markdown text, shown in the sidebar when
  you click the (i) button. Omit it and the sidebar shows "No readme
  provided."

## 6. One thing to know

Since nothing reads the disk at runtime, there's no way to catch a typo'd
folder name ahead of time — if `apps-config.js` points at a folder that
doesn't exist (or has no `index.html`), the card still shows, but clicking
it just fails to open. Double-check the folder name if that happens.
