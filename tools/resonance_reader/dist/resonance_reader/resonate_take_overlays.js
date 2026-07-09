const MAX_TAKES_STORED = 8;
const MAX_TAKES_VISIBLE = 4;
export function takeOverlayCaptureCurrentFromState(state) {
    const snapshot = takeOverlaySnapshotBuild(state);
    if (!snapshot)
        return null;
    const overlays = takeOverlayListRead(state).filter((take) => take.label !== snapshot.label);
    const next = takeOverlayStoredLimitApply([{ ...snapshot, visible: true }, ...overlays]);
    state.takeOverlays = takeOverlayVisibleLimitApply(next);
    return snapshot;
}
export function takeOverlayCurrentPayloadBuild(state) {
    return takeOverlayListRead(state).filter((take) => take.visible);
}
export function takeOverlayVisibilityToggle(state, takeId) {
    const overlays = takeOverlayListRead(state);
    const next = overlays.map((take) => take.id === takeId ? { ...take, visible: !take.visible } : take);
    state.takeOverlays = takeOverlayVisibleLimitApply(next);
}
export function takeOverlaySelectAsCurrent(state, takeId) {
    const overlays = takeOverlayListRead(state);
    const selected = overlays.find((take) => take.id === takeId);
    if (!selected)
        return null;
    const current = takeOverlaySnapshotBuild(state);
    const remaining = overlays.filter((take) => take.id !== takeId && take.label !== current?.label);
    state.takeOverlays = takeOverlayVisibleLimitApply(takeOverlayStoredLimitApply([
        ...(current ? [{ ...current, visible: true }] : []),
        ...remaining,
    ]));
    takeOverlaySnapshotRestoreIntoState(state, selected);
    return selected;
}
export function takeOverlayRemove(state, takeId) {
    state.takeOverlays = takeOverlayListRead(state).filter((take) => take.id !== takeId);
}
export function takeOverlayClearAll(state) {
    state.takeOverlays = [];
}
export function takeOverlayListRead(state) {
    return Array.isArray(state.takeOverlays) ? state.takeOverlays.filter(takeOverlayValid) : [];
}
function takeOverlaySnapshotBuild(state) {
    if (!state.currentWave)
        return null;
    const spectrum = state.lastSpectrum;
    const freqs = Array.isArray(spectrum?.freqs) ? spectrum?.freqs : [];
    const mags = Array.isArray(spectrum?.dbs)
        ? spectrum?.dbs
        : Array.isArray(spectrum?.mags)
            ? spectrum?.mags
            : [];
    if (!freqs.length || !mags.length)
        return null;
    const label = takeOverlayLabelResolve(state);
    if (!label)
        return null;
    return {
        id: takeOverlayIdBuild(label, freqs, mags),
        label,
        freqs: freqs.slice(),
        mags: mags.slice(),
        visible: true,
        snapshot: takeOverlaySnapshotStateBuild(state, freqs, mags),
    };
}
function takeOverlaySnapshotStateBuild(state, freqs, mags) {
    return {
        currentWave: takeOverlayValueClone(state.currentWave),
        lastSpectrum: takeOverlayValueClone(state.lastSpectrum || { freqs, dbs: mags }),
        lastOverlay: takeOverlayValueClone(state.lastOverlay),
        lastModesDetected: takeOverlayValueClone(state.lastModesDetected),
        lastModeCards: takeOverlayValueClone(state.lastModeCards),
        lastPolymaxCandidates: takeOverlayValueClone(state.lastPolymaxCandidates),
        lastWaveSlice: takeOverlayValueClone(state.lastWaveSlice),
        lastPeakHoldSpectrum: takeOverlayValueClone(state.lastPeakHoldSpectrum),
        lastSpectrumNoteSelection: takeOverlayValueClone(state.lastSpectrumNoteSelection),
    };
}
function takeOverlaySnapshotRestoreIntoState(state, take) {
    const snapshot = take.snapshot || {};
    state.recordingLabel = take.label;
    state.currentWave = takeOverlayValueClone(snapshot.currentWave ?? state.currentWave);
    state.lastSpectrum = takeOverlayValueClone(snapshot.lastSpectrum || { freqs: take.freqs, dbs: take.mags });
    state.lastOverlay = takeOverlayValueClone(snapshot.lastOverlay);
    state.lastModesDetected = takeOverlayValueClone(snapshot.lastModesDetected || []);
    state.lastModeCards = takeOverlayValueClone(snapshot.lastModeCards || []);
    state.lastPolymaxCandidates = takeOverlayValueClone(snapshot.lastPolymaxCandidates || []);
    state.lastWaveSlice = takeOverlayValueClone(snapshot.lastWaveSlice);
    state.lastPeakHoldSpectrum = takeOverlayValueClone(snapshot.lastPeakHoldSpectrum);
    state.lastSpectrumNoteSelection = takeOverlayValueClone(snapshot.lastSpectrumNoteSelection);
}
function takeOverlayLabelResolve(state) {
    const label = String(state.recordingLabel || "").trim();
    if (!label || label === "Demo (click record)")
        return "";
    return label;
}
function takeOverlayIdBuild(label, freqs, mags) {
    const firstFreq = Number.isFinite(freqs[0]) ? Number(freqs[0]).toFixed(1) : "na";
    const firstMag = Number.isFinite(mags[0]) ? Number(mags[0]).toFixed(1) : "na";
    return `${label}:${freqs.length}:${firstFreq}:${firstMag}`;
}
function takeOverlayStoredLimitApply(overlays) {
    return overlays.slice(0, MAX_TAKES_STORED);
}
function takeOverlayVisibleLimitApply(overlays) {
    let visibleCount = 0;
    return overlays.map((take) => {
        if (!take.visible)
            return take;
        visibleCount += 1;
        if (visibleCount <= MAX_TAKES_VISIBLE)
            return take;
        return { ...take, visible: false };
    });
}
function takeOverlayValid(value) {
    const take = value;
    return Boolean(take
        && typeof take.id === "string"
        && typeof take.label === "string"
        && Array.isArray(take.freqs)
        && Array.isArray(take.mags));
}
function takeOverlayValueClone(value) {
    if (value === undefined || value === null)
        return value;
    try {
        if (typeof structuredClone === "function")
            return structuredClone(value);
    }
    catch (_error) {
        return value;
    }
    return value;
}
