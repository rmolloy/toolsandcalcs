const MODE_TO_PARAM = {
    long: "long",
    cross: "cross",
    transverse: "twisting",
};
function plateModeFrequencyResolveByKey(modesDetected, modeKey) {
    const entry = modesDetected.find((mode) => mode.mode === modeKey);
    const freq = entry?.peakFreq;
    if (!Number.isFinite(freq) || freq <= 0)
        return null;
    return freq.toFixed(1);
}
export function plateThicknessHrefBuildFromModes(baseHref, modesDetected) {
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
    return url.toString();
}
