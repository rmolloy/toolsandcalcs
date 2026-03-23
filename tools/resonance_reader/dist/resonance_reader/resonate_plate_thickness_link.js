const MODE_TO_PARAM = {
    long: "long",
    cross: "cross",
    transverse: "twisting",
};
const MATERIAL_TO_PARAM = {
    panelLengthMm: "panel_length",
    panelWidthMm: "panel_width",
    panelHeightMm: "panel_height",
    panelMassG: "panel_mass",
};
function plateModeFrequencyResolveByKey(modesDetected, modeKey) {
    const entry = modesDetected.find((mode) => mode.mode === modeKey);
    const freq = entry?.peakFreq;
    if (!Number.isFinite(freq) || freq <= 0)
        return null;
    return freq.toFixed(1);
}
export function plateThicknessHrefBuildFromModes(baseHref, modesDetected, materialMeasurements) {
    const runtimeBase = typeof window !== "undefined" ? window.location.href : "http://localhost/";
    const url = new URL(baseHref, runtimeBase);
    Object.keys(MODE_TO_PARAM).forEach((modeKey) => {
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
function plateMaterialQueryParamsApply(url, materialMeasurements) {
    if (!materialMeasurements)
        return;
    Object.entries(MATERIAL_TO_PARAM).forEach(([fieldKey, paramKey]) => {
        const value = materialMeasurements[fieldKey];
        if (!Number.isFinite(value) || value <= 0) {
            url.searchParams.delete(paramKey);
            return;
        }
        url.searchParams.set(paramKey, value.toFixed(1));
    });
}
