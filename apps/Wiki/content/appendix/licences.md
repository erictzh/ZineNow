## Intro

ZineNow is **free software** and wants to stay free: every part, every library and every AI model it uses must fit that idea. This page summarises the **licences** involved. The authoritative texts are in the repository: `LICENSE`, `THIRD-PARTY-NOTICES.md` and `docs/AI-MODELS-POLICY.md`.

*(Not legal advice: it explains what the project's files say.)*

## How to use

- **As a user:** you may use ZineNow for anything, including paid work. The things you make with it (your zines, PDFs, pictures) are yours.
- **As a developer:** you may read, change and share the code, but a changed version you share (or run for others over a network) must also be AGPL and offer its source.
- **Adding a library or model?** Follow the checklist in [Contributing](appendix/contributing) and the policy below, and add a line to `THIRD-PARTY-NOTICES.md`.
- Where to find the notices in the apps: the gear panel's **Source code** and **Third-party notices** links; the Models page in Ai Tools.

## How it works

### The licences, in words

- **AGPL-3.0-or-later** (ZineNow): use, change, share, even sell; changes stay open; people using a modified networked version can get its source.
- **MIT, BSD, ISC, Apache-2.0** (most libraries and models): *permissive*: use freely, keep the copyright notice (Apache also asks to keep its NOTICE). They fit inside an AGPL project.
- **MIT for ZineArranger's origin:** ZineArranger is based on Nash High's MIT-licensed Zine Arranger; his notice stays in `apps/ZineArranger/LICENSE` and the app says "Originally by Nash High".
- **Refused:** non-commercial or research-only licences (CC-BY-NC), "responsible AI" licences with use restrictions (OpenRAIL), custom community licences (Llama's), and anything with no licence stated.

### "Downloading is not bundling"

The apps contain **no AI model**. Your browser downloads each model from the host named in the pop-up, and keeps it in its own storage. So a model's licence does not change the app's own licence. If we ever re-hosted a model, its redistribution terms would start to apply.

### The checklist for a new model (summary)

1. Open-source licence for the **exact file** (not just its family). 2. Commercial use allowed. 3. No use restrictions. 4. AGPL-compatible for anything copied into the code. 5. Provenance written down (original project, who hosts the copy, how it was checked). 6. A line in `THIRD-PARTY-NOTICES.md` and the facts on the Models page.

### What "open" means for a model

*Open weights* (the trained file is free; data and recipe unpublished) is allowed; *fully open* (file, data and training code all public) is preferred when quality is close. The Models page labels each.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### The licence facts shown next to each model

```js file=shared/js/ai/licences.js
export const licenceUrl = (spdx) => "https://spdx.org/licenses/" + encodeURIComponent(spdx) + ".html";
export const OPENNESS = {
  weights: "Open weights: the model file is free under this licence; the training data and recipe are not included",
  full: "Fully open: the model file, the training data and the training code are all public",
};
```

**The Logic:** `licenceUrl` builds a link to the SPDX licence page for an identifier; `encodeURIComponent` makes odd characters safe inside an address. `OPENNESS` holds the two sentences, picked per model.

### Where the notices are linked

```js file=shared/js/about.js
export const REPO_URL = "https://github.com/erictzh/ZineNow";
export const ABOUT = {
  text: "ZineNow is free software (AGPL-3.0-or-later).",
  links: [
    { label: "Source code", href: REPO_URL },
    { label: "Third-party notices", href: REPO_URL + "/blob/main/THIRD-PARTY-NOTICES.md" },
  ],
};
export const POLICY_URL = REPO_URL + "/blob/main/docs/AI-MODELS-POLICY.md";
```

**The Logic:** see [About and Source link](start/shared-parts/about-and-source): one object feeds every app's gear and the Models page.

### The licence of ZineArranger's origin

```text file=apps/ZineArranger/LICENSE
ZineArranger, part of ZineNow
Modifications copyright (c) 2026 ZineNow (erictzh)
The ZineNow changes and additions are licensed under the GNU Affero General
Public License v3.0 or later (see LICENSE at the root of this repository).

Based on Zine Arranger by Nash High (https://codeberg.org/nashhigh/zine-arranger),
```

**The Logic:** the file begins with ZineNow's own statement (modifications under the AGPL) and then keeps Nash High's MIT notice, which the MIT licence requires to stay with copies.

**Worked example (the policy applied).** A model with the licence `CC-BY-NC-4.0` → **refused** (non-commercial, rule 2). `Apache-2.0` with the original project and host written down → **accepted**. A model whose Hugging Face page says "MIT" but whose original project says "research only" → **refused**: the exact file's true licence counts (rule 1), which is why the policy asks to re-check re-uploads against the original. A family such as Depth Anything V2 where the Small size is Apache-2.0 but Base and Large are non-commercial: only the Small file may be used.
