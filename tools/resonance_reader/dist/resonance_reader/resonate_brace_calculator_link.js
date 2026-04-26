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
    const material = braceMaterialBuildFromMeasurements(measurements, modesDetected);
    if (!material)
        return;
    url.searchParams.set("brace_density", material.densityKgM3.toFixed(1));
    url.searchParams.set("brace_modulus", material.dynamicYoungsModulusGPa.toFixed(3));
}
function braceMaterialBuildFromMeasurements(measurements, modesDetected) {
    const frequencyHz = braceLongModeFrequencyResolve(modesDetected);
    if (frequencyHz === null)
        return null;
    const lengthM = measurements.stockLengthMm / 1000;
    const widthM = measurements.stockWidthMm / 1000;
    const heightM = measurements.stockHeightMm / 1000;
    const massKg = measurements.stockMassG / 1000;
    const spanM = lengthM;
    if (![lengthM, widthM, heightM, massKg, spanM].every((value) => Number.isFinite(value) && value > 0)) {
        return null;
    }
    const densityKgM3 = massKg / (lengthM * widthM * heightM);
    const correctionFactor = 1 + 6.585 * Math.pow(heightM / spanM, 2);
    const dynamicYoungsModulusPa = 0.9465
        * ((massKg * Math.pow(frequencyHz, 2) * Math.pow(spanM, 3)) / (widthM * Math.pow(heightM, 3)))
        * correctionFactor;
    return {
        densityKgM3,
        dynamicYoungsModulusGPa: dynamicYoungsModulusPa / 1000000000,
    };
}
function braceLongModeFrequencyResolve(modesDetected) {
    const frequency = modesDetected.find((mode) => mode.mode === "long")?.peakFreq;
    if (!Number.isFinite(frequency) || frequency <= 0)
        return null;
    return frequency;
}
