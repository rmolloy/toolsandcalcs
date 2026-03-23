import type { ModeDetection } from "./resonate_mode_detection.js";
import type { PlateMaterialMeasurements } from "./resonate_plate_material_panel.js";

const MODE_TO_PARAM: Record<string, string> = {
  long: "long",
  cross: "cross",
  transverse: "twisting",
};

const MATERIAL_TO_PARAM: Record<keyof PlateMaterialMeasurements, string> = {
  panelLengthMm: "panel_length",
  panelWidthMm: "panel_width",
  panelHeightMm: "panel_height",
  panelMassG: "panel_mass",
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

export function plateThicknessHrefBuildFromModes(
  baseHref: string,
  modesDetected: ModeDetection[],
  materialMeasurements?: PlateMaterialMeasurements,
) {
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
  plateMaterialQueryParamsApply(url, materialMeasurements);
  return url.toString();
}

function plateMaterialQueryParamsApply(url: URL, materialMeasurements?: PlateMaterialMeasurements) {
  if (!materialMeasurements) return;
  (Object.entries(MATERIAL_TO_PARAM) as Array<[keyof PlateMaterialMeasurements, string]>).forEach(([fieldKey, paramKey]) => {
    const value = materialMeasurements[fieldKey];
    if (!Number.isFinite(value) || value <= 0) {
      url.searchParams.delete(paramKey);
      return;
    }
    url.searchParams.set(paramKey, value.toFixed(1));
  });
}
