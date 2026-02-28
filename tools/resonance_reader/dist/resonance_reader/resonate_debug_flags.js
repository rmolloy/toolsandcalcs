const DEBUG_FLAGS_DEFAULTS = {
    useHannWindow: true,
    useTapAveraging: true,
    useSpectrumSmoothing: true,
    useParabolicPeakRefine: true,
    spectrumSmoothingHz: null,
    tapSliceWindowMs: null,
    energyBandWidthHz: null,
};
function debugWindowResolve() {
    return (typeof window !== "undefined" ? window : globalThis);
}
function debugFlagsStoreResolve() {
    const scope = debugWindowResolve();
    if (!scope.__RR_DEBUG_FLAGS || typeof scope.__RR_DEBUG_FLAGS !== "object")
        scope.__RR_DEBUG_FLAGS = {};
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
    const tapSliceWindowMsRaw = store.tapSliceWindowMs;
    const tapSliceWindowMs = Number.isFinite(tapSliceWindowMsRaw) ? Number(tapSliceWindowMsRaw) : null;
    const energyBandWidthHzRaw = store.energyBandWidthHz;
    const energyBandWidthHz = Number.isFinite(energyBandWidthHzRaw) ? Number(energyBandWidthHzRaw) : null;
    return {
        useHannWindow: debugFlagValueResolve("useHannWindow"),
        useTapAveraging: debugFlagValueResolve("useTapAveraging"),
        useSpectrumSmoothing: debugFlagValueResolve("useSpectrumSmoothing"),
        useParabolicPeakRefine: debugFlagValueResolve("useParabolicPeakRefine"),
        spectrumSmoothingHz: smoothingHz,
        tapSliceWindowMs,
        energyBandWidthHz,
    };
}
function debugFlagsSet(next) {
    Object.assign(debugFlagsStoreResolve(), next);
    return debugFlagsCurrentResolve();
}
function debugFlagsReset() {
    const store = debugFlagsStoreResolve();
    delete store.useHannWindow;
    delete store.useTapAveraging;
    delete store.useSpectrumSmoothing;
    delete store.useParabolicPeakRefine;
    delete store.spectrumSmoothingHz;
    delete store.tapSliceWindowMs;
    delete store.energyBandWidthHz;
    return debugFlagsCurrentResolve();
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
    return debugFlagValueResolve("useHannWindow") ? "hann" : "rect";
}
export function resonanceTapAveragingEnabled() {
    debugApiEnsureInstalled();
    return debugFlagValueResolve("useTapAveraging");
}
export function resonanceSpectrumSmoothingEnabled() {
    debugApiEnsureInstalled();
    return debugFlagValueResolve("useSpectrumSmoothing");
}
export function resonanceSpectrumSmoothingHzResolve(defaultHz) {
    debugApiEnsureInstalled();
    const current = debugFlagsCurrentResolve().spectrumSmoothingHz;
    if (!Number.isFinite(current) || current < 0)
        return defaultHz;
    return current;
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
