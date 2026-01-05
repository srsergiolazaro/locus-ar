export interface PropsConfig {
  cardId: string;
  targetImageSrc: string;
  targetTaarSrc: string;
  videoSrc: string;
  videoWidth: number;
  videoHeight: number;
  scale: number;
}

export interface DataItem {
  id: string;
  type: "photos" | "videoNative" | "ar";
  images?: { image: string; fileId: string }[];
  url?: string;
  scale?: number;
  width?: number;
  height?: number;
}

export function mapDataToPropsConfig(data: any[]): PropsConfig {
  const photos = data.find((item) => item.type === "photos");
  const video = data.find((item) => item.type === "videoNative");
  const ar = data.find((item) => item.type === "ar");

  return {
    cardId: photos?.id || "",
    targetImageSrc: photos?.images?.[0]?.image || "",
    targetTaarSrc: ar?.url || "",
    videoSrc: video?.url || "",
    videoWidth: video?.width || 0,
    videoHeight: video?.height || 0,
    scale: video?.scale || 1,
  };
}
