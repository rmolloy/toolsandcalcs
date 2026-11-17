import { measureModeNormalize } from "./resonate_mode_config.js?rev=f105e0d448ca";
export function overlayToggleShouldRender(el) {
    return Boolean(el?.checked);
}
export function overlayShouldRenderForMeasureMode(measureMode, el) {
    return measureModeNormalize(measureMode) === "guitar" && overlayToggleShouldRender(el);
}
