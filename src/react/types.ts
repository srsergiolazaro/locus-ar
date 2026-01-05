export interface ARConfig {
  cardId: string;
  targetImageSrc: string;
  targetTaarSrc: string;
  videoSrc: string;
  overlaySrc: string; // Alias for preloading/compatibility
  videoWidth: number;
  videoHeight: number;
  scale: number;
  overlayType: "video" | "image";
}

export interface ARDataItem {
  id: string;
  type: "photos" | "videoNative" | "ar" | "imageOverlay";
  images?: { image: string; fileId: string }[];
  url?: string;
  fileId?: string;
  scale?: number;
  width?: number;
  height?: number;
}

export function mapDataToPropsConfig(data: ARDataItem[]): ARConfig {
  const photos = data.find((item) => item.type === "photos");
  const overlay = data.find((item) => item.type === "videoNative" || item.type === "imageOverlay");
  const ar = data.find((item) => item.type === "ar");

  return {
    cardId: photos?.id || "",
    targetImageSrc: photos?.images?.[0]?.image || "",
    targetTaarSrc: ar?.url || "",
    videoSrc: overlay?.url || "",
    overlaySrc: overlay?.url || "",
    videoWidth: overlay?.width || 0,
    videoHeight: overlay?.height || 0,
    scale: overlay?.scale || 1,
    overlayType: overlay?.type === "videoNative" ? "video" : "image",
  };
}
