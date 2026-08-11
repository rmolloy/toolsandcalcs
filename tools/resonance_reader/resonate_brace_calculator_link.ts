import type { ModeDetection } from "./resonate_mode_detection.js";
import {
  braceStockMaterialBuildFromMeasurements,
  type BraceStockMeasurements,
} from "./resonate_brace_stock_material.js";

export type { BraceStockMeasurements } from "./resonate_brace_stock_material.js";

const MODE_TO_PARAM: Record<string, string> = {
  long: "long",
  cross: "cross",
  transverse: "twisting",
};

export function braceCalculatorHrefBuildFromModes(
  baseHref: string,
  modesDetected: ModeDetection[],
  measurements?: BraceStockMeasurements,
) {
  const runtimeBase = typeof window !== "undefined" ? window.location.href : "http://localhost/";
  const url = new URL(baseHref, runtimeBase);
  (Object.keys(MODE_TO_PARAM) as Array<"long" | "cross" | "transverse">).forEach((modeKey) => {
    const paramKey = MODE_TO_PARAM[modeKey];
    const value = braceModeFrequencyResolveByKey(modesDetected, modeKey);
    if (value === null) {
      url.searchParams.delete(paramKey);
      return;
    }
    url.searchParams.set(paramKey, value);
  });
  braceMeasurementsApplyToUrl(url, modesDetected, measurements);
  return url.toString();
}

function braceModeFrequencyResolveByKey(
  modesDetected: ModeDetection[],
  modeKey: "long" | "cross" | "transverse",
) {
  const entry = modesDetected.find((mode) => mode.mode === modeKey);
  const freq = entry?.peakFreq;
  if (!Number.isFinite(freq) || (freq as number) <= 0) return null;
  return (freq as number).toFixed(1);
}

function braceMeasurementsApplyToUrl(
  url: URL,
  modesDetected: ModeDetection[],
  measurements?: BraceStockMeasurements,
) {
  if (!measurements) return;
  const material = braceStockMaterialBuildFromMeasurements(measurements, braceLongModeFrequencyResolve(modesDetected));
  if (!material) return;
  url.searchParams.set("brace_density", material.densityKgM3.toFixed(1));
  url.searchParams.set("brace_modulus", material.dynamicYoungsModulusGPa.toFixed(3));
}

function braceLongModeFrequencyResolve(modesDetected: ModeDetection[]) {
  const frequency = modesDetected.find((mode) => mode.mode === "long")?.peakFreq;
  if (!Number.isFinite(frequency) || (frequency as number) <= 0) return null;
  return frequency as number;
}
