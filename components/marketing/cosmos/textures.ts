// The scene's textures (public/cosmos/tex, built by scripts/build-cosmos-textures.mjs),
// in the groups the journey loads them: the Earth at once, the Moon on
// lift-off, the planets when the camera is already well away.

export type TextureName =
  | "earthDay" | "earthNight" | "earthClouds" | "earthNormal" | "earthSpecular"
  | "moon"
  | "mercury" | "venus" | "mars" | "jupiter" | "saturn" | "saturnRing" | "uranus" | "neptune";

const V = "1";   // bump when the files change (they're served immutable by name)
const url = (name: string) => `/cosmos/tex/${name}.ktx2?v=${V}`;

export const TEXTURES: Record<TextureName, { url: string; group: "earth" | "moon" | "planets"; srgb: boolean }> = {
  earthDay: { url: url("earth-day"), group: "earth", srgb: true },
  earthNight: { url: url("earth-night"), group: "earth", srgb: true },
  earthClouds: { url: url("earth-clouds"), group: "earth", srgb: false },
  earthNormal: { url: url("earth-normal"), group: "earth", srgb: false },
  earthSpecular: { url: url("earth-specular"), group: "earth", srgb: false },
  moon: { url: url("moon"), group: "moon", srgb: true },
  mercury: { url: url("mercury"), group: "planets", srgb: true },
  venus: { url: url("venus"), group: "planets", srgb: true },
  mars: { url: url("mars"), group: "planets", srgb: true },
  jupiter: { url: url("jupiter"), group: "planets", srgb: true },
  saturn: { url: url("saturn"), group: "planets", srgb: true },
  saturnRing: { url: url("saturn-ring"), group: "planets", srgb: true },
  uranus: { url: url("uranus"), group: "planets", srgb: true },
  neptune: { url: url("neptune"), group: "planets", srgb: true },
};
