import { measureModeNormalize } from "./resonate_mode_config.js";

export function overlayToggleShouldRender(el: HTMLInputElement | null) {
  return Boolean(el?.checked);
}

export function overlayShouldRenderForMeasureMode(measureMode: unknown, el: HTMLInputElement | null) {
  return measureModeNormalize(measureMode) === "guitar" && overlayToggleShouldRender(el);
}
