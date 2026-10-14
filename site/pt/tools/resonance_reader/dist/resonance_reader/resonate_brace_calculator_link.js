import { braceStockMaterialBuildFromMeasurements, } from "./resonate_brace_stock_material.js";
const MODE_TO_PARAM = {
    long: "long",
    cross: "cross",
    transverse: "twisting",
};
export function braceCalculatorHrefBuildFromModes(baseHref, modesDetected, measurements) {
    const runtimeBase = typeof window !== "undefined" ? window.location.href : "http://localhost/";
    const url = new URL(baseHref, runtimeBase);
    Object.keys(MODE_TO_PARAM).forEach((modeKey) => {
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
function braceModeFrequencyResolveByKey(modesDetected, modeKey) {
    const entry = modesDetected.find((mode) => mode.mode === modeKey);
    const freq = entry?.peakFreq;
    if (!Number.isFinite(freq) || freq <= 0)
        return null;
    return freq.toFixed(1);
}
function braceMeasurementsApplyToUrl(url, modesDetected, measurements) {
    if (!measurements)
        return;
    const material = braceStockMaterialBuildFromMeasurements(measurements, braceLongModeFrequencyResolve(modesDetected));
    if (!material)
        return;
    url.searchParams.set("brace_density", material.densityKgM3.toFixed(1));
    url.searchParams.set("brace_modulus", material.dynamicYoungsModulusGPa.toFixed(3));
}
function braceLongModeFrequencyResolve(modesDetected) {
    const frequency = modesDetected.find((mode) => mode.mode === "long")?.peakFreq;
    if (!Number.isFinite(frequency) || frequency <= 0)
        return null;
    return frequency;
}
