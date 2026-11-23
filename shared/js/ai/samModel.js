// The click-to-select model: MobileSAM (Apache-2.0), two files that work together: an image reader (encoder, about 28 MB) and a mask maker
// (decoder, about 16.5 MB), from Acly's ONNX export on Hugging Face. Shown as-is in the panel and the download pop-up.
export const SAM_CACHE = "zinenow-ai-sam-model";
export const SAM_MODEL = {
  key: "mobilesam", name: "MobileSAM", kind: "Click-to-select", label: "MobileSAM (Click-to-select)",
  mb: 44.7, licence: "Apache-2.0", host: "huggingface.co", repo: "huggingface.co/Acly/MobileSAM",
  encoderUrl: "https://huggingface.co/Acly/MobileSAM/resolve/main/mobile_sam_image_encoder.onnx", encoderMb: 28.2,
  decoderUrl: "https://huggingface.co/Acly/MobileSAM/resolve/main/sam_mask_decoder_single.onnx", decoderMb: 16.5,
  about: "Click on a thing and it outlines it. Two files: an image reader (about 28 MB) and a mask maker (about 16.5 MB).",
};
