// The upscaling model: Real-ESRGAN general x4v3 (SRVGGNetCompact: BSD-3-Clause, from the upstream Real-ESRGAN project, about 4.9 MB), a small model that
// enlarges a picture 4 times. The file is a third-party ONNX copy on Hugging Face. Shown as-is in the panel and the download pop-up.
export const UPSCALE_CACHE = "zinenow-ai-upscale-model";
export const UPSCALE_MODEL = {
  key: "realesr-x4v3", name: "Real-ESRGAN general x4v3", kind: "Upscale", label: "Real-ESRGAN x4v3 (Upscale)",
  mb: 4.9, licence: "BSD-3-Clause", host: "huggingface.co", repo: "huggingface.co/OwlMaster/AllFilesRope",
  author: "Xintao Wang et al. (Real-ESRGAN)", homepage: "https://github.com/xinntao/Real-ESRGAN", openness: "weights",
  url: "https://huggingface.co/OwlMaster/AllFilesRope/resolve/main/realesr-general-x4v3.onnx",
  about: "Enlarges a picture 2 or 4 times and adds believable detail. It works piece by piece, so big pictures are slow.",
};
