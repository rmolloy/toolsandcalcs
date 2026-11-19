import { measureModeNormalize } from "./resonate_mode_config.js?rev=2f4a6c9dc10d";
export function overlayToggleShouldRender(el) {
    return Boolean(el?.checked);
}
export function overlayShouldRenderForMeasureMode(measureMode, el) {
    return measureModeNormalize(measureMode) === "guitar" && overlayToggleShouldRender(el);
}
