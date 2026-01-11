export interface ARConfig {
  cardId: string;
  targetImageSrc: string;
  targetTaarSrc?: string;
  videoSrc: string;
  videoWidth: number;
  videoHeight: number;
  scale: number;
}

export interface ARDataItem {
  id: string;
  type: "photos" | "videoNative" | "ar" | "imageOverlay";
  images?: { image: string; fileId: string }[];
  url?: string;
  scale?: number;
  width?: number;
  height?: number;
  fileId?: string;
}

export function mapDataToPropsConfig(data: any[]): ARConfig {
  const photos = data.find((item) => item.type === "photos");
  const video = data.find((item) => item.type === "videoNative");
  const imageOverlay = data.find((item) => item.type === "imageOverlay");
  const ar = data.find((item) => item.type === "ar");

  const overlay = video || imageOverlay;

  return {
    cardId: photos?.id || "",
    targetImageSrc: photos?.images?.[0]?.image || "",
    targetTaarSrc: ar?.url || "",
    videoSrc: overlay?.url || "",
    videoWidth: overlay?.width || 0,
    videoHeight: overlay?.height || 0,
    scale: overlay?.scale || 1,
  };
}
