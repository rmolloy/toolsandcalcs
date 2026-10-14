export function hasAnyTargets(targets) {
    if (!targets)
        return false;
    return Object.values(targets).some((v) => typeof v === "number" && Number.isFinite(v));
}
export function normalizedWhatIfTargets(targets) {
    const get = (k) => (typeof targets?.[k] === "number" && Number.isFinite(targets[k]) ? targets[k] : null);
    return { air: get("air"), top: get("top"), back: get("back") };
}
export function ensureBaselineFitFromDetected(state, modesDetected, fit4DofFromTargets) {
    const targets = Object.fromEntries(modesDetected.map((m) => [m.mode, m.peakFreq]));
    const targetKey = JSON.stringify({
        air: Number.isFinite(targets.air) ? Number(targets.air.toFixed(1)) : null,
        top: Number.isFinite(targets.top) ? Number(targets.top.toFixed(1)) : null,
        back: Number.isFinite(targets.back) ? Number(targets.back.toFixed(1)) : null,
    });
    if (state.lastFitTargetKey !== targetKey) {
        const fit = fit4DofFromTargets(targets, { maxIter: 12 });
        state.lastFitTargetKey = targetKey;
        state.lastFittedParams = fit?.raw || null;
    }
}
