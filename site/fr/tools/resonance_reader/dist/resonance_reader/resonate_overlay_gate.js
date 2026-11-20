import { measureModeNormalize } from "./resonate_mode_config.js?rev=e906c8d81506";
export function overlayToggleShouldRender(el) {
    return Boolean(el?.checked);
}
export function overlayShouldRenderForMeasureMode(measureMode, el) {
    return measureModeNormalize(measureMode) === "guitar" && overlayToggleShouldRender(el);
}
