import { measureModeNormalize } from "./resonate_mode_config.js?rev=7157ade1c3cc";
export function overlayToggleShouldRender(el) {
    return Boolean(el?.checked);
}
export function overlayShouldRenderForMeasureMode(measureMode, el) {
    return measureModeNormalize(measureMode) === "guitar" && overlayToggleShouldRender(el);
}
