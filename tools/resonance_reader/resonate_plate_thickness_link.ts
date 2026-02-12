import type { ModeDetection } from "./resonate_mode_detection.js";

const MODE_TO_PARAM: Record<string, string> = {
  long: "long",
  cross: "cross",
  transverse: "twisting",
};

function plateModeFrequencyResolveByKey(
  modesDetected: ModeDetection[],
  modeKey: "long" | "cross" | "transverse",
) {
  const entry = modesDetected.find((mode) => mode.mode === modeKey);
  const freq = entry?.peakFreq;
  if (!Number.isFinite(freq) || (freq as number) <= 0) return null;
  return (freq as number).toFixed(1);
}

export function plateThicknessHrefBuildFromModes(baseHref: string, modesDetected: ModeDetection[]) {
  const runtimeBase = typeof window !== "undefined" ? window.location.href : "http://localhost/";
  const url = new URL(baseHref, runtimeBase);
  (Object.keys(MODE_TO_PARAM) as Array<"long" | "cross" | "transverse">).forEach((modeKey) => {
    const paramKey = MODE_TO_PARAM[modeKey];
    const value = plateModeFrequencyResolveByKey(modesDetected, modeKey);
    if (value === null) {
      url.searchParams.delete(paramKey);
      return;
    }
    url.searchParams.set(paramKey, value);
  });
  return url.toString();
}
