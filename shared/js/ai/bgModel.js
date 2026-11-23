// The background-removal models: who made them, their licence, where they are downloaded from, and how big they are. Shown as-is in the
// panel and in the download pop-up, so people see exactly what they are downloading. How a picture is prepared for each is in segment.js.
export const BG_CACHE = "zinenow-ai-bg-model";

export const BG_MODELS = [
  {
    key: "u2netp", name: "U²-Netp", kind: "General", label: "U²-Netp (General)",
    mb: 4.4, licence: "Apache-2.0", host: "huggingface.co", repo: "huggingface.co/edgetools/u2netp",
    author: "Xuebin Qin et al. (U²-Net)", homepage: "https://github.com/xuebinqin/U-2-Net", openness: "weights",
    url: "https://huggingface.co/edgetools/u2netp/resolve/main/u2netp.onnx",
    about: "Any single subject: an object, an animal or a person. Edges are a little rough.",
  },
  {
    key: "modnet", name: "MODNet", kind: "Portrait", label: "MODNet (Portrait)",
    mb: 25, licence: "Apache-2.0", host: "huggingface.co", repo: "huggingface.co/Xenova/modnet",
    author: "Zhanghan Ke et al. (MODNet)", homepage: "https://github.com/ZHKKKe/MODNet", openness: "weights",
    url: "https://huggingface.co/Xenova/modnet/resolve/main/onnx/model.onnx",
    about: "Photos of people (head and shoulders): soft hair edges. Not for objects or animals.",
  },
];
export const bgModel = (key) => BG_MODELS.find((m) => m.key === key) || BG_MODELS[0];
