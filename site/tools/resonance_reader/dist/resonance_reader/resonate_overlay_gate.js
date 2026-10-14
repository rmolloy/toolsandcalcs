import { measureModeNormalize } from "./resonate_mode_config.js?rev=88a3838e0e5a";
export function overlayToggleShouldRender(el) {
    return Boolean(el?.checked);
}
export function overlayShouldRenderForMeasureMode(measureMode, el) {
    return measureModeNormalize(measureMode) === "guitar" && overlayToggleShouldRender(el);
}
