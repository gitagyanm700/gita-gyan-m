// ==========================================================================
// ADMIN-ONLY SHARE CARD EXPORT SIZE PRESETS
// Matches social media platform ratios & exact pixel dimensions
// ==========================================================================

export const DEFAULT_SHARE_CARD_SIZE_ID = "ig-reel";

export const SHARE_CARD_SIZE_PRESETS = [
  {
    id: "ig-reel",
    label: "Instagram Reel",
    ratio: "9:16",
    width: 1080,
    height: 1920,
    layoutMode: "9:16",
  },
  {
    id: "ig-story",
    label: "Instagram Story",
    ratio: "9:16",
    width: 1080,
    height: 1920,
    layoutMode: "9:16",
  },
  {
    id: "ig-portrait",
    label: "Instagram Post (Portrait)",
    ratio: "4:5",
    width: 1080,
    height: 1350,
    layoutMode: "4:5",
  },
  {
    id: "ig-square",
    label: "Instagram Square Post",
    ratio: "1:1",
    width: 1080,
    height: 1080,
    layoutMode: "1:1",
  },
  {
    id: "yt-shorts",
    label: "YouTube Shorts",
    ratio: "9:16",
    width: 1080,
    height: 1920,
    layoutMode: "9:16",
  },
  {
    id: "yt-community",
    label: "YouTube Community Image Post",
    ratio: "1:1",
    width: 1080,
    height: 1080,
    layoutMode: "1:1",
  },
  {
    id: "yt-video",
    label: "YouTube Video",
    ratio: "16:9",
    width: 1920,
    height: 1080,
    layoutMode: "16:9",
  },
  {
    id: "yt-thumbnail",
    label: "YouTube Thumbnail",
    ratio: "16:9",
    width: 1280,
    height: 720,
    layoutMode: "16:9",
  },
];

export function getShareCardSizePreset(id) {
  return (
    SHARE_CARD_SIZE_PRESETS.find((preset) => preset.id === id) ||
    SHARE_CARD_SIZE_PRESETS[0]
  );
}
