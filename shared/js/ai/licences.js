// Licence facts shown next to each AI model (the Models page): a link to the licence text, and what "open" means for that model.
// Every model must pass the FOSS check in docs/AI-MODELS-POLICY.md before it is added.
export const licenceUrl = (spdx) => "https://spdx.org/licenses/" + encodeURIComponent(spdx) + ".html";
export const OPENNESS = {
  weights: "Open weights: the model file is free under this licence; the training data and recipe are not included",
  full: "Fully open: the model file, the training data and the training code are all public",
};
