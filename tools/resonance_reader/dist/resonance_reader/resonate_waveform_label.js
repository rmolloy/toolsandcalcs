import { measureModeNormalize } from "./resonate_mode_config.js";
const TAP_CLASSIFY_CENTS_THRESHOLD = 15;
const TAP_CLASSIFY_BINS_THRESHOLD = 2;
function centsDistanceAbs(freqA, freqB) {
    if (!Number.isFinite(freqA) || !Number.isFinite(freqB) || freqA <= 0 || freqB <= 0)
        return Number.POSITIVE_INFINITY;
    return Math.abs(1200 * Math.log2(freqA / freqB));
}
function bodyResonanceNearWithinCents(f0, modesDetected, thresholdCents) {
    return modesDetected.some((mode) => {
        if (!Number.isFinite(mode?.peakFreq))
            return false;
        const dist = centsDistanceAbs(f0, mode.peakFreq);
        return Number.isFinite(dist) && dist <= thresholdCents;
    });
}
function binWidthHzResolveFromSlice(sampleCount, sampleRate) {
    if (!Number.isFinite(sampleCount) || !Number.isFinite(sampleRate) || sampleCount <= 0 || sampleRate <= 0)
        return null;
    return sampleRate / sampleCount;
}
function nearestModeDistanceResolve(f0, modesDetected) {
    let bestHz = Number.POSITIVE_INFINITY;
    let bestCents = Number.POSITIVE_INFINITY;
    let bestMode = null;
    let bestModeFreq = null;
    modesDetected.forEach((mode) => {
        if (!Number.isFinite(mode?.peakFreq))
            return;
        const peakFreq = mode.peakFreq;
        const distHz = Math.abs(f0 - peakFreq);
        if (distHz < bestHz) {
            bestHz = distHz;
            bestMode = typeof mode.mode === "string" ? mode.mode : null;
            bestModeFreq = peakFreq;
        }
        const distCents = centsDistanceAbs(f0, peakFreq);
        if (distCents < bestCents)
            bestCents = distCents;
    });
    return {
        mode: bestMode,
        modeFreq: bestModeFreq,
        hz: Number.isFinite(bestHz) ? bestHz : null,
        cents: Number.isFinite(bestCents) ? bestCents : null,
    };
}
function tapLabelDebugEnabled() {
    if (globalThis?.process?.env?.VITEST)
        return false;
    try {
        const runtimeFlag = Boolean(window.__RESONATE_DEBUG_TAP_LABELS__);
        const storageFlag = window.localStorage?.getItem?.("resonate.debug.tapLabels") === "1";
        return runtimeFlag || storageFlag;
    }
    catch {
        return false;
    }
}
function tapLabelDecisionLog(payload) {
    if (!tapLabelDebugEnabled())
        return;
    const sliceId = payload.noteSliceId ?? "?";
    const f0Hz = Number.isFinite(payload.f0Hz) ? payload.f0Hz.toFixed(3) : "—";
    const nearestMode = payload.nearestMode ?? "—";
    const nearestModeHz = Number.isFinite(payload.nearestModeHz) ? payload.nearestModeHz.toFixed(3) : "—";
    const cents = Number.isFinite(payload.nearestModeDistanceCents) ? payload.nearestModeDistanceCents.toFixed(2) : "—";
    const bins = Number.isFinite(payload.nearestModeDistanceBins) ? payload.nearestModeDistanceBins.toFixed(2) : "—";
    const decision = payload.decision ?? "—";
    const reason = payload.reason ?? "—";
    console.warn(`[Resonance Reader][Tap Label][TEMP] slice=${sliceId} f0=${f0Hz}Hz nearest=${nearestMode}@${nearestModeHz}Hz cents=${cents} bins=${bins} decision=${decision} reason=${reason}`, payload);
}
function bodyResonanceNearWithinThresholds(args) {
    const nearest = nearestModeDistanceResolve(args.f0, args.modesDetected);
    if (!Number.isFinite(nearest.cents) || nearest.cents > args.thresholdCents) {
        tapLabelDecisionLog({
            ...args.debugMeta,
            f0Hz: args.f0,
            nearestMode: nearest.mode,
            nearestModeHz: nearest.modeFreq,
            nearestModeDistanceCents: nearest.cents,
            nearestModeDistanceBins: null,
            thresholdCents: args.thresholdCents,
            thresholdBins: args.thresholdBins,
            decision: "note",
            reason: "cents_threshold_failed",
        });
        return false;
    }
    const binWidthHz = binWidthHzResolveFromSlice(args.sampleCount ?? NaN, args.sampleRate ?? NaN);
    if (!Number.isFinite(binWidthHz)) {
        const isNearCentsOnly = bodyResonanceNearWithinCents(args.f0, args.modesDetected, args.thresholdCents);
        tapLabelDecisionLog({
            ...args.debugMeta,
            f0Hz: args.f0,
            nearestMode: nearest.mode,
            nearestModeHz: nearest.modeFreq,
            nearestModeDistanceCents: nearest.cents,
            nearestModeDistanceBins: null,
            thresholdCents: args.thresholdCents,
            thresholdBins: args.thresholdBins,
            decision: isNearCentsOnly ? "tap" : "note",
            reason: "missing_bin_width_fallback_to_cents",
        });
        return isNearCentsOnly;
    }
    const bins = nearest.hz / binWidthHz;
    const isTap = Number.isFinite(bins) && bins <= args.thresholdBins;
    tapLabelDecisionLog({
        ...args.debugMeta,
        f0Hz: args.f0,
        nearestMode: nearest.mode,
        nearestModeHz: nearest.modeFreq,
        nearestModeDistanceCents: nearest.cents,
        nearestModeDistanceBins: Number.isFinite(bins) ? bins : null,
        thresholdCents: args.thresholdCents,
        thresholdBins: args.thresholdBins,
        binWidthHz,
        decision: isTap ? "tap" : "note",
        reason: isTap ? "within_cents_and_bins" : "bins_threshold_failed",
    });
    return isTap;
}
export function waveformLabelResolveFromContext(args) {
    if (!Number.isFinite(args.f0))
        return null;
    const f0 = args.f0;
    const thresholdCents = Number.isFinite(args.bodyResonanceCentsThreshold)
        ? args.bodyResonanceCentsThreshold
        : TAP_CLASSIFY_CENTS_THRESHOLD;
    const thresholdBins = Number.isFinite(args.bodyResonanceBinsThreshold)
        ? args.bodyResonanceBinsThreshold
        : TAP_CLASSIFY_BINS_THRESHOLD;
    if (["guitar", "played_note"].includes(measureModeNormalize(args.measureMode))
        && bodyResonanceNearWithinThresholds({
            f0,
            modesDetected: args.modesDetected || [],
            thresholdCents,
            thresholdBins,
            sampleCount: args.noteSliceSampleCount,
            sampleRate: args.noteSliceSampleRate,
            debugMeta: args.debugMeta,
        })) {
        return "Tap";
    }
    return args.noteNameResolve(f0);
}
