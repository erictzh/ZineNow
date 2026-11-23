// Where the source code lives, and the notes about what ZineNow is built on: shown as small links in the apps' gear panels and on Ai Tools (Local)'s
// Models page (AGPL-3.0 asks that the people who use a changed version can get its source; a visible link is the simplest way).
export const REPO_URL = "https://github.com/erictzh/ZineNow";
export const ABOUT = {
  text: "ZineNow is free software (AGPL-3.0-or-later).",
  links: [
    { label: "Source code", href: REPO_URL },
    { label: "Third-party notices", href: REPO_URL + "/blob/main/THIRD-PARTY-NOTICES.md" },
  ],
};
export const POLICY_URL = REPO_URL + "/blob/main/docs/AI-MODELS-POLICY.md";
