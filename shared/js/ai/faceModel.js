// The face-detection model: YuNet (OpenCV Zoo, MIT licence, about 0.23 MB). It only finds where faces are (boxes); it does not recognise or
// identify anyone. Shown as-is in the panel and the download pop-up.
export const FACE_CACHE = "zinenow-ai-face-model";
export const FACE_MODEL = {
  key: "yunet", name: "YuNet", kind: "Face detection", label: "YuNet (Face detection)",
  mb: 0.23, licence: "MIT", host: "huggingface.co", repo: "huggingface.co/opencv/face_detection_yunet",
  url: "https://huggingface.co/opencv/face_detection_yunet/resolve/main/face_detection_yunet_2023mar.onnx",
  about: "Finds where faces are (boxes only). It does not recognise or identify anyone.",
};
