import { measureModeNormalize } from "./resonate_mode_config.js";

type ModeLike = {
  mode?: string | null | undefined;
  peakFreq: number | null | undefined;
};
const TAP_CLASSIFY_CENTS_THRESHOLD = 15;
const TAP_CLASSIFY_BINS_THRESHOLD = 2;

function centsDistanceAbs(freqA: number, freqB: number) {
  if (!Number.isFinite(freqA) || !Number.isFinite(freqB) || freqA <= 0 || freqB <= 0) return Number.POSITIVE_INFINITY;
  return Math.abs(1200 * Math.log2(freqA / freqB));
}

function bodyResonanceNearWithinCents(
  f0: number,
  modesDetected: ModeLike[],
  thresholdCents: number,
) {
  return modesDetected.some((mode) => {
    if (!Number.isFinite(mode?.peakFreq)) return false;
    const dist = centsDistanceAbs(f0, mode.peakFreq as number);
    return Number.isFinite(dist) && dist <= thresholdCents;
  });
}

function binWidthHzResolveFromSlice(sampleCount: number, sampleRate: number) {
  if (!Number.isFinite(sampleCount) || !Number.isFinite(sampleRate) || sampleCount <= 0 || sampleRate <= 0) return null;
  return sampleRate / sampleCount;
}

function nearestModeDistanceResolve(f0: number, modesDetected: ModeLike[]) {
  let bestHz = Number.POSITIVE_INFINITY;
  let bestCents = Number.POSITIVE_INFINITY;
  let bestMode: string | null = null;
  let bestModeFreq: number | null = null;
  modesDetected.forEach((mode) => {
    if (!Number.isFinite(mode?.peakFreq)) return;
    const peakFreq = mode.peakFreq as number;
    const distHz = Math.abs(f0 - peakFreq);
    if (distHz < bestHz) {
      bestHz = distHz;
      bestMode = typeof mode.mode === "string" ? mode.mode : null;
      bestModeFreq = peakFreq;
    }
    const distCents = centsDistanceAbs(f0, peakFreq);
    if (distCents < bestCents) bestCents = distCents;
  });
  return {
    mode: bestMode,
    modeFreq: bestModeFreq,
    hz: Number.isFinite(bestHz) ? bestHz : null,
    cents: Number.isFinite(bestCents) ? bestCents : null,
  };
}

function tapLabelDebugEnabled() {
  if ((globalThis as any)?.process?.env?.VITEST) return false;
  try {
    const runtimeFlag = Boolean((window as any).__RESONATE_DEBUG_TAP_LABELS__);
    const storageFlag = (window as any).localStorage?.getItem?.("resonate.debug.tapLabels") === "1";
    return runtimeFlag || storageFlag;
  } catch {
    return false;
  }
}

function tapLabelDecisionLog(payload: Record<string, unknown>) {
  if (!tapLabelDebugEnabled()) return;
  const sliceId = payload.noteSliceId ?? "?";
  const f0Hz = Number.isFinite(payload.f0Hz as number) ? (payload.f0Hz as number).toFixed(3) : "—";
  const nearestMode = payload.nearestMode ?? "—";
  const nearestModeHz = Number.isFinite(payload.nearestModeHz as number) ? (payload.nearestModeHz as number).toFixed(3) : "—";
  const cents = Number.isFinite(payload.nearestModeDistanceCents as number) ? (payload.nearestModeDistanceCents as number).toFixed(2) : "—";
  const bins = Number.isFinite(payload.nearestModeDistanceBins as number) ? (payload.nearestModeDistanceBins as number).toFixed(2) : "—";
  const decision = payload.decision ?? "—";
  const reason = payload.reason ?? "—";
  console.warn(
    `[Resonance Reader][Tap Label][TEMP] slice=${sliceId} f0=${f0Hz}Hz nearest=${nearestMode}@${nearestModeHz}Hz cents=${cents} bins=${bins} decision=${decision} reason=${reason}`,
    payload,
  );
}

function bodyResonanceNearWithinThresholds(args: {
  f0: number;
  modesDetected: ModeLike[];
  thresholdCents: number;
  thresholdBins: number;
  sampleCount?: number;
  sampleRate?: number;
  debugMeta?: Record<string, unknown>;
}) {
  const nearest = nearestModeDistanceResolve(args.f0, args.modesDetected);
  if (!Number.isFinite(nearest.cents) || (nearest.cents as number) > args.thresholdCents) {
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
  const bins = (nearest.hz as number) / (binWidthHz as number);
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

export function waveformLabelResolveFromContext(args: {
  f0: number | null;
  measureMode: unknown;
  modesDetected: ModeLike[];
  noteNameResolve: (freq: number) => string | null;
  bodyResonanceCentsThreshold?: number;
  bodyResonanceBinsThreshold?: number;
  noteSliceSampleCount?: number;
  noteSliceSampleRate?: number;
  debugMeta?: Record<string, unknown>;
}) {
  if (!Number.isFinite(args.f0)) return null;
  const f0 = args.f0 as number;
  const thresholdCents = Number.isFinite(args.bodyResonanceCentsThreshold)
    ? (args.bodyResonanceCentsThreshold as number)
    : TAP_CLASSIFY_CENTS_THRESHOLD;
  const thresholdBins = Number.isFinite(args.bodyResonanceBinsThreshold)
    ? (args.bodyResonanceBinsThreshold as number)
    : TAP_CLASSIFY_BINS_THRESHOLD;
  if (
    ["guitar", "played_note"].includes(measureModeNormalize(args.measureMode))
    && bodyResonanceNearWithinThresholds({
      f0,
      modesDetected: args.modesDetected || [],
      thresholdCents,
      thresholdBins,
      sampleCount: args.noteSliceSampleCount,
      sampleRate: args.noteSliceSampleRate,
      debugMeta: args.debugMeta,
    })
  ) {
    return "Tap";
  }
  return args.noteNameResolve(f0);
}
