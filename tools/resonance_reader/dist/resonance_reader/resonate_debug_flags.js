export const RESONANCE_TONELAB_DEFAULTS = {
    fftProfile: "tonelab",
    fftInputScope: null,
    fftWindow: null,
    fftResolution: null,
    spectrumSmoothingMode: null,
    spectrumAveragingMode: null,
    spectrumDisplayRange: null,
    spectrumDbScale: null,
    spectrumYAxisMode: null,
    spectrumXAxisScale: null,
    useHannWindow: true,
    useTapAveraging: false,
    useSpectrumSmoothing: true,
    usePeakHold: true,
    useParabolicPeakRefine: true,
    usePolymaxValidation: false,
    spectrumSmoothingHz: null,
    spectrumSmoothingBins: 8,
    spectrumLineWidth: 2,
    spectrumXAxisMin: 30,
    spectrumXAxisMax: null,
    spectrumYAxisMin: null,
    spectrumYAxisMax: null,
    tapSliceWindowMs: 2,
    energyBandWidthHz: null,
};
const DEBUG_FLAGS_DEFAULTS = RESONANCE_TONELAB_DEFAULTS;
function debugWindowResolve() {
    return (typeof window !== "undefined" ? window : globalThis);
}
function debugFlagsStoreResolve() {
    const scope = debugWindowResolve();
    if (!scope.__RR_DEBUG_FLAGS || typeof scope.__RR_DEBUG_FLAGS !== "object")
        scope.__RR_DEBUG_FLAGS = {};
    debugUrlFlagsApplyOnce(scope, scope.__RR_DEBUG_FLAGS);
    return scope.__RR_DEBUG_FLAGS;
}
function debugFlagValueResolve(flagName) {
    const store = debugFlagsStoreResolve();
    const raw = store[flagName];
    if (typeof raw === "boolean")
        return raw;
    return DEBUG_FLAGS_DEFAULTS[flagName];
}
function debugFlagsCurrentResolve() {
    const store = debugFlagsStoreResolve();
    const smoothingHzRaw = store.spectrumSmoothingHz;
    const smoothingHz = Number.isFinite(smoothingHzRaw) ? Number(smoothingHzRaw) : null;
    const smoothingBinsRaw = store.spectrumSmoothingBins;
    const smoothingBins = Number.isFinite(smoothingBinsRaw) ? Number(smoothingBinsRaw) : DEBUG_FLAGS_DEFAULTS.spectrumSmoothingBins;
    const lineWidthRaw = store.spectrumLineWidth;
    const lineWidth = Number.isFinite(lineWidthRaw) ? Number(lineWidthRaw) : DEBUG_FLAGS_DEFAULTS.spectrumLineWidth;
    const xAxisMinRaw = store.spectrumXAxisMin;
    const xAxisMin = Number.isFinite(xAxisMinRaw) ? Number(xAxisMinRaw) : DEBUG_FLAGS_DEFAULTS.spectrumXAxisMin;
    const xAxisMaxRaw = store.spectrumXAxisMax;
    const xAxisMax = Number.isFinite(xAxisMaxRaw) ? Number(xAxisMaxRaw) : null;
    const yAxisMinRaw = store.spectrumYAxisMin;
    const yAxisMin = Number.isFinite(yAxisMinRaw) ? Number(yAxisMinRaw) : null;
    const yAxisMaxRaw = store.spectrumYAxisMax;
    const yAxisMax = Number.isFinite(yAxisMaxRaw) ? Number(yAxisMaxRaw) : null;
    const tapSliceWindowMsRaw = store.tapSliceWindowMs;
    const tapSliceWindowMs = Number.isFinite(tapSliceWindowMsRaw) ? Number(tapSliceWindowMsRaw) : DEBUG_FLAGS_DEFAULTS.tapSliceWindowMs;
    const energyBandWidthHzRaw = store.energyBandWidthHz;
    const energyBandWidthHz = Number.isFinite(energyBandWidthHzRaw) ? Number(energyBandWidthHzRaw) : null;
    return {
        fftProfile: debugStringValueResolve("fftProfile", ["tonelab", "celestial"], DEBUG_FLAGS_DEFAULTS.fftProfile),
        fftInputScope: debugNullableStringValueResolve("fftInputScope", ["selection", "full-file"]),
        fftWindow: debugNullableStringValueResolve("fftWindow", ["hann", "hamming", "rect"]),
        fftResolution: debugNullableStringValueResolve("fftResolution", ["fast", "balanced", "fine", "very-fine"]),
        spectrumSmoothingMode: debugNullableStringValueResolve("spectrumSmoothingMode", ["gaussian-bins", "triangular-hz"]),
        spectrumAveragingMode: debugNullableStringValueResolve("spectrumAveragingMode", ["off", "avg-4", "avg-8", "exp-80", "forever"]),
        spectrumDisplayRange: debugNullableStringValueResolve("spectrumDisplayRange", ["mode-default", "celestial"]),
        spectrumDbScale: debugNullableStringValueResolve("spectrumDbScale", ["relative-floor", "celestial-fixed"]),
        spectrumYAxisMode: debugNullableStringValueResolve("spectrumYAxisMode", ["auto", "celestial-fixed"]),
        spectrumXAxisScale: debugNullableStringValueResolve("spectrumXAxisScale", ["linear", "log"]),
        useHannWindow: debugFlagValueResolve("useHannWindow"),
        useTapAveraging: debugFlagValueResolve("useTapAveraging"),
        useSpectrumSmoothing: debugFlagValueResolve("useSpectrumSmoothing"),
        usePeakHold: debugFlagValueResolve("usePeakHold"),
        useParabolicPeakRefine: debugFlagValueResolve("useParabolicPeakRefine"),
        usePolymaxValidation: debugFlagValueResolve("usePolymaxValidation"),
        spectrumSmoothingHz: smoothingHz,
        spectrumSmoothingBins: smoothingBins,
        spectrumLineWidth: lineWidth,
        spectrumXAxisMin: xAxisMin,
        spectrumXAxisMax: xAxisMax,
        spectrumYAxisMin: yAxisMin,
        spectrumYAxisMax: yAxisMax,
        tapSliceWindowMs,
        energyBandWidthHz,
    };
}
function debugStringValueResolve(name, allowed, fallback) {
    const raw = debugFlagsStoreResolve()[name];
    return allowed.includes(raw) ? raw : fallback;
}
function debugNullableStringValueResolve(name, allowed) {
    const raw = debugFlagsStoreResolve()[name];
    return allowed.includes(raw) ? raw : null;
}
function debugFlagsSet(next) {
    Object.assign(debugFlagsStoreResolve(), next);
    return debugFlagsCurrentResolve();
}
function debugFlagsReset() {
    const store = debugFlagsStoreResolve();
    delete store.useHannWindow;
    delete store.fftProfile;
    delete store.fftInputScope;
    delete store.fftWindow;
    delete store.fftResolution;
    delete store.spectrumSmoothingMode;
    delete store.spectrumAveragingMode;
    delete store.spectrumDisplayRange;
    delete store.spectrumDbScale;
    delete store.spectrumYAxisMode;
    delete store.spectrumXAxisScale;
    delete store.useTapAveraging;
    delete store.useSpectrumSmoothing;
    delete store.usePeakHold;
    delete store.useParabolicPeakRefine;
    delete store.usePolymaxValidation;
    delete store.spectrumSmoothingHz;
    delete store.spectrumSmoothingBins;
    delete store.spectrumLineWidth;
    delete store.spectrumXAxisMin;
    delete store.spectrumXAxisMax;
    delete store.spectrumYAxisMin;
    delete store.spectrumYAxisMax;
    delete store.tapSliceWindowMs;
    delete store.energyBandWidthHz;
    return debugFlagsCurrentResolve();
}
function debugUrlFlagsApplyOnce(scope, store) {
    if (scope.__RR_DEBUG_URL_FLAGS_APPLIED)
        return;
    scope.__RR_DEBUG_URL_FLAGS_APPLIED = true;
    const patch = debugFlagsPatchBuildFromUrlSearch(String(scope.location?.search || ""));
    Object.entries(patch).forEach(([key, value]) => {
        if (typeof store[key] === "undefined")
            store[key] = value;
    });
}
export function debugFlagsPatchBuildFromUrlSearch(search) {
    const params = urlParamsBuild(search);
    const patch = {};
    urlEnumParamApply(params, patch, "fftProfile", ["tonelab", "celestial"]);
    urlEnumParamApply(params, patch, "fftInputScope", ["selection", "full-file"], "fftScope");
    urlEnumParamApply(params, patch, "fftWindow", ["hann", "hamming", "rect"]);
    urlEnumParamApply(params, patch, "fftResolution", ["fast", "balanced", "fine", "very-fine"]);
    urlEnumParamApply(params, patch, "spectrumDisplayRange", ["mode-default", "celestial"], "displayRange");
    urlEnumParamApply(params, patch, "spectrumDbScale", ["relative-floor", "celestial-fixed"], "dbScale");
    urlEnumParamApply(params, patch, "spectrumYAxisMode", ["auto", "celestial-fixed"], "yAxis");
    urlEnumParamApply(params, patch, "spectrumXAxisScale", ["linear", "log"], "xScale");
    urlSmoothingParamApply(params, patch);
    urlEnumParamApply(params, patch, "spectrumAveragingMode", ["off", "avg-4", "avg-8", "exp-80", "forever"], "averaging");
    urlDirectFftAliasApply(params, patch);
    urlBooleanParamApply(params, patch, "useHannWindow");
    urlBooleanParamApply(params, patch, "useTapAveraging");
    urlBooleanParamApply(params, patch, "useSpectrumSmoothing");
    urlBooleanParamApply(params, patch, "usePeakHold");
    urlBooleanParamApply(params, patch, "useParabolicPeakRefine");
    urlBooleanParamApply(params, patch, "usePolymaxValidation");
    urlNumberParamApply(params, patch, "spectrumSmoothingHz", 0);
    urlNumberParamApply(params, patch, "spectrumSmoothingBins", 0, "gaussianBins");
    urlNumberParamApply(params, patch, "spectrumLineWidth", 0, "lineWidth");
    urlNumberParamApply(params, patch, "spectrumXAxisMin", 0, "xMin");
    urlNumberParamApply(params, patch, "spectrumXAxisMax", 0, "xMax");
    urlFiniteNumberParamApply(params, patch, "spectrumYAxisMin", "yMin");
    urlFiniteNumberParamApply(params, patch, "spectrumYAxisMax", "yMax");
    urlNumberParamApply(params, patch, "tapSliceWindowMs", 0);
    urlNumberParamApply(params, patch, "energyBandWidthHz", 0);
    return patch;
}
function urlFiniteNumberParamApply(params, patch, key, alias) {
    const raw = urlParamRead(params, String(key), alias);
    if (raw === null || raw === "")
        return;
    const value = Number(raw);
    if (!Number.isFinite(value))
        return;
    patch[key] = value;
}
function urlParamsBuild(search) {
    try {
        return new URLSearchParams(search || "");
    }
    catch {
        return new URLSearchParams("");
    }
}
function urlEnumParamApply(params, patch, key, allowed, alias) {
    const raw = urlParamRead(params, String(key), alias);
    if (!raw || !allowed.includes(raw))
        return;
    patch[key] = raw;
}
function urlSmoothingParamApply(params, patch) {
    const raw = urlParamRead(params, "spectrumSmoothingMode", "smoothing");
    if (!raw)
        return;
    if (raw === "off") {
        patch.useSpectrumSmoothing = false;
        patch.spectrumSmoothingMode = null;
        return;
    }
    if (["gaussian-bins", "triangular-hz"].includes(raw)) {
        patch.useSpectrumSmoothing = true;
        patch.spectrumSmoothingMode = raw;
    }
}
function urlDirectFftAliasApply(params, patch) {
    const enabled = urlBooleanParamRead(params, "directFftDefault");
    if (enabled === null)
        return;
    patch.fftInputScope = enabled ? "full-file" : "selection";
}
function urlBooleanParamApply(params, patch, key) {
    const value = urlBooleanParamRead(params, key);
    if (value === null)
        return;
    patch[key] = value;
}
function urlNumberParamApply(params, patch, key, minExclusive, alias) {
    const raw = urlParamRead(params, String(key), alias);
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= minExclusive)
        return;
    patch[key] = value;
}
function urlParamRead(params, key, alias) {
    if (params.has(key))
        return String(params.get(key) || "").trim();
    if (alias && params.has(alias))
        return String(params.get(alias) || "").trim();
    return null;
}
function urlBooleanParamRead(params, key) {
    const raw = urlParamRead(params, key)?.toLowerCase();
    if (!raw)
        return null;
    if (["1", "true", "on", "yes"].includes(raw))
        return true;
    if (["0", "false", "off", "no"].includes(raw))
        return false;
    return null;
}
function debugApiInstallOnWindow() {
    const scope = debugWindowResolve();
    if (scope.__RR_DEBUG_API_INSTALLED)
        return;
    scope.__RR_DEBUG_API_INSTALLED = true;
    scope.ResonanceDebug = {
        show: () => debugFlagsCurrentResolve(),
        set: (next) => debugFlagsSet(next),
        reset: () => debugFlagsReset(),
    };
}
function debugApiEnsureInstalled() {
    debugApiInstallOnWindow();
}
export function resonanceFftWindowResolve() {
    debugApiEnsureInstalled();
    const current = debugFlagsCurrentResolve();
    if (current.fftWindow)
        return current.fftWindow;
    if (current.fftProfile === "celestial")
        return "hamming";
    return debugFlagValueResolve("useHannWindow") ? "hann" : "rect";
}
export function resonanceFftInputScopeResolve() {
    debugApiEnsureInstalled();
    const current = debugFlagsCurrentResolve();
    if (current.fftInputScope)
        return current.fftInputScope;
    return current.fftProfile === "celestial" ? "full-file" : "selection";
}
export function resonanceFftMinSamplesResolve() {
    debugApiEnsureInstalled();
    const current = debugFlagsCurrentResolve();
    if (current.fftResolution === "fast")
        return 8192;
    if (current.fftResolution === "balanced")
        return 32768;
    if (current.fftResolution === "fine")
        return 65536;
    if (current.fftResolution === "very-fine")
        return 131072;
    return 32768;
}
export function resonanceSpectrumSmoothingModeResolve() {
    debugApiEnsureInstalled();
    const current = debugFlagsCurrentResolve();
    if (!current.useSpectrumSmoothing)
        return "off";
    if (current.spectrumSmoothingMode)
        return current.spectrumSmoothingMode;
    return "gaussian-bins";
}
export function resonanceSpectrumAveragingModeResolve() {
    debugApiEnsureInstalled();
    const current = debugFlagsCurrentResolve();
    return current.spectrumAveragingMode || "off";
}
export function resonanceSpectrumDisplayRangeResolve() {
    debugApiEnsureInstalled();
    const current = debugFlagsCurrentResolve();
    if (current.spectrumDisplayRange)
        return current.spectrumDisplayRange;
    return current.fftProfile === "celestial" ? "celestial" : "mode-default";
}
export function resonanceSpectrumDbScaleResolve() {
    debugApiEnsureInstalled();
    const current = debugFlagsCurrentResolve();
    if (current.spectrumDbScale)
        return current.spectrumDbScale;
    return current.fftProfile === "celestial" ? "celestial-fixed" : "relative-floor";
}
export function resonanceSpectrumYAxisModeResolve() {
    debugApiEnsureInstalled();
    const current = debugFlagsCurrentResolve();
    if (current.spectrumYAxisMode)
        return current.spectrumYAxisMode;
    return current.fftProfile === "celestial" ? "celestial-fixed" : "auto";
}
export function resonanceSpectrumXAxisScaleResolve() {
    debugApiEnsureInstalled();
    const current = debugFlagsCurrentResolve();
    return current.spectrumXAxisScale || "linear";
}
export function resonanceTapAveragingEnabled() {
    debugApiEnsureInstalled();
    return debugFlagValueResolve("useTapAveraging");
}
export function resonanceSpectrumSmoothingEnabled() {
    debugApiEnsureInstalled();
    return debugFlagValueResolve("useSpectrumSmoothing");
}
export function resonancePeakHoldEnabled() {
    debugApiEnsureInstalled();
    return debugFlagValueResolve("usePeakHold");
}
export function resonanceSpectrumSmoothingHzResolve(defaultHz) {
    debugApiEnsureInstalled();
    const current = debugFlagsCurrentResolve().spectrumSmoothingHz;
    if (!Number.isFinite(current) || current < 0)
        return defaultHz;
    return current;
}
export function resonanceSpectrumSmoothingBinsResolve(defaultBins) {
    debugApiEnsureInstalled();
    const current = debugFlagsCurrentResolve().spectrumSmoothingBins;
    if (!Number.isFinite(current) || current <= 0)
        return defaultBins;
    return current;
}
export function resonanceSpectrumLineWidthResolve(defaultWidth) {
    debugApiEnsureInstalled();
    const current = debugFlagsCurrentResolve().spectrumLineWidth;
    if (!Number.isFinite(current) || current <= 0)
        return defaultWidth;
    return current;
}
export function resonanceSpectrumAxisLimitsResolve() {
    debugApiEnsureInstalled();
    const current = debugFlagsCurrentResolve();
    return {
        xMin: current.spectrumXAxisMin,
        xMax: current.spectrumXAxisMax,
        yMin: current.spectrumYAxisMin,
        yMax: current.spectrumYAxisMax,
    };
}
export function resonanceTapSliceWindowMsResolve(defaultMs) {
    debugApiEnsureInstalled();
    const current = debugFlagsCurrentResolve().tapSliceWindowMs;
    if (!Number.isFinite(current) || current <= 0)
        return defaultMs;
    return current;
}
export function resonanceParabolicPeakRefineEnabled() {
    debugApiEnsureInstalled();
    return debugFlagValueResolve("useParabolicPeakRefine");
}
export function resonancePolymaxValidationEnabled() {
    debugApiEnsureInstalled();
    return debugFlagValueResolve("usePolymaxValidation");
}
export function resonanceEnergyBandWidthHzResolve(defaultHz) {
    debugApiEnsureInstalled();
    const current = debugFlagsCurrentResolve().energyBandWidthHz;
    if (!Number.isFinite(current) || current <= 0)
        return defaultHz;
    return current;
}
export function resonanceDebugApiInstall() {
    debugApiEnsureInstalled();
}
debugApiEnsureInstalled();
