## Intro

**ZineNow is free software under the AGPL.** One of the AGPL's rules is that people who use a changed version over a network must be able to get its source. The simplest way to honour that is a **visible link** to the source, so every app shows one: a small grey line in the gear pop-up (and on the Models page of Ai Tools) with **Source code**, **Third-party notices** and, on the Models page, **AI model policy**.

## How to use

Open the gear (bottom left) in any app: the last line reads *ZineNow is free software (AGPL-3.0-or-later). Source code · Third-party notices*. The links open in a new tab: the GitHub repository and the list of every library, model and work ZineNow is built on.

## How it works

One small file holds the text and addresses, so there is **one place to change** them. Each app passes the object `ABOUT` to the gear (`about: ABOUT`), and the gear builds the links. External links use `target="_blank"` with `rel="noopener"`: the new page cannot reach back to the old one through `window.opener` (a security habit for every outside link).

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `about.js`

```js file=shared/js/about.js
export const REPO_URL = "https://github.com/erictzh/ZineNow";
export const ABOUT = {
  text: "ZineNow is free software (AGPL-3.0-or-later).",
  links: [
    { label: "Source code", href: REPO_URL },
    { label: "Third-party notices", href: REPO_URL + "/blob/main/THIRD-PARTY-NOTICES.md" },
    { label: "Report a problem", href: REPO_URL + "/issues/new/choose" },
  ],
};
export const POLICY_URL = REPO_URL + "/blob/main/docs/AI-MODELS-POLICY.md";
```

**The Logic:** `export const` makes the values importable by other files. `ABOUT` has the sentence and a list of `{ label, href }` links; `REPO_URL + "/blob/main/THIRD-PARTY-NOTICES.md"` joins the repository address and the path of a file on its `main` branch. `Report a problem` goes to the repository's issue form. `POLICY_URL` is separate because only the Models page shows it.

### Building the links in the gear

```js file=shared/js/displaySettings.js
  if (options.about) { // a small grey line with links at the bottom of the pop-up (e.g. where the source code is)
    const about = el("div", "zn-display-about");
    about.append(options.about.text + " ");
    (options.about.links || []).forEach((l, i) => { if (i) about.append(" · "); const a = el("a", "", { href: l.href, target: "_blank", rel: "noopener" }); a.textContent = l.label; about.append(a); });
    panel.appendChild(about);
  }
```

**The Logic:** for each link, `(options.about.links || []).forEach((l, i) => …)` adds a " · " separator before every link except the first (`if (i)`), creates an `<a>` with `href`, `target`, `rel`, and fills it with `textContent` (never `innerHTML`, so a label can never inject markup).

**Worked example.** With two links the line becomes: `ZineNow is free software (AGPL-3.0-or-later).` + space + `Source code` + ` · ` + `Third-party notices`: index 0 has no separator, index 1 gets one.
