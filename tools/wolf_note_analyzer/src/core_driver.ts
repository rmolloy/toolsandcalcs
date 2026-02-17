import type {
  ConfidenceTier,
  DriverEntry,
  DriverState,
  EnergySeries,
  LateStats,
  ModeCandidate,
  ModeEntry,
  PartialEntry,
  PartialInstabilityEntry,
} from "./core_types.js";
import { bandOverlapRatio, modeBandWidth, partialBandWidth } from "./core_peaks.js";
import { lateTimeSlope, lateTimeStats } from "./core_envelope.js";
import { confidenceFrom, couplingTier } from "./core_two_mode_fit_wobble_metrics_and_instability.js";

const DOMINANCE_OVERLAP_MAX = 0.45;
const DECAY_SLOPE_DIFF_MIN = 0.15;
const BODY_SLOPE_MIN_NEG = -0.08;

export function centsBetween(freq: number, ref: number): number {
  if (!Number.isFinite(freq) || !Number.isFinite(ref) || freq <= 0 || ref <= 0) return Infinity;
  return 1200 * Math.log2(freq / ref);
}

function buildBodyModeStats(modes: ModeEntry[], bodyNorm: Record<string, number[]>, t: number[]) {
  const [bodyLate, bodySlopeByMode]: [Record<string, LateStats>, Record<string, number | null>] = [{}, {}];
  modes.forEach((mode) => {
    const env = bodyNorm[mode.id] || [];
    bodyLate[mode.id] = lateTimeStats(env, t);
    bodySlopeByMode[mode.id] = lateTimeSlope(env, t);
  });
  return { bodyLate, bodySlopeByMode };
}

function buildPartialSlopeMap(partials: PartialEntry[], partialNorm: Record<string, number[]>, t: number[]) {
  const partialSlope: Record<string, number | null> = {};
  partials.forEach((partial) => {
    partialSlope[partial.key] = lateTimeSlope(partialNorm[partial.key] || [], t);
  });
  return partialSlope;
}

function buildModeCandidates(
  partial: PartialEntry,
  modes: ModeEntry[],
  bodyLate: Record<string, LateStats>,
  bodySlopeByMode: Record<string, number | null>,
  partialSlope: Record<string, number | null>,
) {
  return modeCandidatesFromPartial(partial, modes, bodyLate, bodySlopeByMode, partialSlope);
}

function modeCandidatesFromPartial(
  partial: PartialEntry,
  modes: ModeEntry[],
  bodyLate: Record<string, LateStats>,
  bodySlopeByMode: Record<string, number | null>,
  partialSlope: Record<string, number | null>,
): { candidates: ModeCandidate[]; nearest: ModeCandidate | null } {
  return modeCandidatesFromModes(partial, modes, bodyLate, bodySlopeByMode, partialSlope);
}

function modeCandidatesFromModes(
  partial: PartialEntry,
  modes: ModeEntry[],
  bodyLate: Record<string, LateStats>,
  bodySlopeByMode: Record<string, number | null>,
  partialSlope: Record<string, number | null>,
): { candidates: ModeCandidate[]; nearest: ModeCandidate | null } {
  const partialBw = partialBandwidthForCandidate(partial);
  return modeCandidatesFromModesWithBandwidth(
    partial,
    modes,
    partialBw,
    bodyLate,
    bodySlopeByMode,
    partialSlope,
  );
}

function modeCandidatesFromModesWithBandwidth(
  partial: PartialEntry,
  modes: ModeEntry[],
  partialBw: number,
  bodyLate: Record<string, LateStats>,
  bodySlopeByMode: Record<string, number | null>,
  partialSlope: Record<string, number | null>,
): { candidates: ModeCandidate[]; nearest: ModeCandidate | null } {
  let nearest: ModeCandidate | null = null;
  const candidates = modes.map((mode) => {
    const entry = modeCandidateForPartial(
      partial,
      mode,
      partialBw,
      bodyLate,
      bodySlopeByMode,
      partialSlope,
    );
    nearest = nearestCandidateByCentsAbs(nearest, entry);
    return entry;
  });
  return { candidates, nearest };
}

function partialBandwidthForCandidate(partial: PartialEntry): number {
  return partialBandWidth(partial.key, partial.freq);
}

function nearestCandidateByCentsAbs(
  nearest: ModeCandidate | null,
  entry: ModeCandidate,
): ModeCandidate {
  return !nearest || entry.centsAbs < nearest.centsAbs ? entry : nearest;
}

function modeCandidateForPartial(
  partial: PartialEntry,
  mode: ModeEntry,
  partialBw: number,
  bodyLate: Record<string, LateStats>,
  bodySlopeByMode: Record<string, number | null>,
  partialSlope: Record<string, number | null>,
): ModeCandidate {
  const { cents, centsAbs } = centsAndAbsForModePartial(mode, partial);
  const tier = couplingTier(centsAbs);
  const overlap = overlapRatioForPartialMode(partial, mode, partialBw);
  const late = lateStatsForMode(bodyLate, mode);
  const slopeIndependent = slopeIndependentForModePartial(mode, partial, bodySlopeByMode, partialSlope);
  return { mode, cents, centsAbs, tier, overlap, late, slopeIndependent };
}

function centsAndAbsForModePartial(
  mode: ModeEntry,
  partial: PartialEntry,
): { cents: number; centsAbs: number } {
  const cents = centsBetween(mode.peakFreq as number, partial.freq);
  return { cents, centsAbs: Math.abs(cents) };
}

function lateStatsForMode(bodyLate: Record<string, LateStats>, mode: ModeEntry): LateStats {
  return bodyLate[mode.id] || { mean: 0, cv: 1, stable: false };
}

function slopeIndependentForModePartial(
  mode: ModeEntry,
  partial: PartialEntry,
  bodySlopeByMode: Record<string, number | null>,
  partialSlope: Record<string, number | null>,
): boolean {
  const slopeDiff = slopeDiffForModePartial(mode, partial, bodySlopeByMode, partialSlope);
  return Number.isFinite(slopeDiff) ? (slopeDiff as number) >= DECAY_SLOPE_DIFF_MIN : false;
}

function slopeDiffForModePartial(
  mode: ModeEntry,
  partial: PartialEntry,
  bodySlopeByMode: Record<string, number | null>,
  partialSlope: Record<string, number | null>,
): number | null {
  return Number.isFinite(bodySlopeByMode[mode.id]) && Number.isFinite(partialSlope[partial.key])
    ? Math.abs((bodySlopeByMode[mode.id] as number) - (partialSlope[partial.key] as number))
    : null;
}

function overlapRatioForPartialMode(partial: PartialEntry, mode: ModeEntry, partialBw: number): number {
  return bandOverlapRatio(
    partial.freq,
    partialBw,
    mode.peakFreq as number,
    modeBandWidth(mode.peakFreq as number),
  );
}

function selectDriverCandidate(candidates: ModeCandidate[]): ModeCandidate | null {
  return bestEligibleCandidate(candidates);
}

function bestEligibleCandidate(candidates: ModeCandidate[]): ModeCandidate | null {
  const eligible = candidates
    .filter((c) => isStrongStableCandidate(c))
    .sort(compareCandidatePriority);
  return eligible[0] || null;
}

function isStrongStableCandidate(candidate: ModeCandidate): boolean {
  return candidate.tier === "strong" && candidate.late?.stable;
}

function compareCandidatePriority(a: ModeCandidate, b: ModeCandidate): number {
  return compareCandidateCentsAbs(a, b)
    ?? compareCandidateLateMean(a, b)
    ?? compareCandidateQ(a, b);
}

function compareCandidateCentsAbs(a: ModeCandidate, b: ModeCandidate): number | null {
  return a.centsAbs !== b.centsAbs ? a.centsAbs - b.centsAbs : null;
}

function compareCandidateLateMean(a: ModeCandidate, b: ModeCandidate): number | null {
  const meanA = a.late?.mean || 0;
  const meanB = b.late?.mean || 0;
  return meanA !== meanB ? meanB - meanA : null;
}

function compareCandidateQ(a: ModeCandidate, b: ModeCandidate): number {
  return candidateQValue(b) - candidateQValue(a);
}

function candidateQValue(candidate: ModeCandidate): number {
  return Number.isFinite(candidate.mode?.q) ? candidate.mode.q : 0;
}

function dominanceTimeForDriver(
  driver: ModeCandidate | null,
  sharedBand: boolean,
  t: number[],
  bodyShares: Record<string, number[]>,
  partialShares: Record<string, number[]>,
  partialKey: string,
) {
  if (!driver || sharedBand || !driver.slopeIndependent) return null;
  return dominanceTimeFromShares(t, bodyShares[driver.mode.id] || [], partialShares[partialKey] || []);
}

function dominanceTimeFromShares(t: number[], bodyShare: number[], partialShare: number[]) {
  const idx = bodyShare.findIndex((v: number, i: number) => v > (partialShare[i] ?? 0) && (t[i] ?? 0) > 0.1);
  return idx >= 0 ? t[idx] : null;
}

function exchangeDepthDbForDriver(
  driver: ModeCandidate | null,
  bodyRaw: Record<string, number[]>,
  partialRaw: Record<string, number[]>,
  partialKey: string,
) {
  return driver ? exchangeDepthDbForDriverArrays(driver, bodyRaw, partialRaw, partialKey) : null;
}

function exchangeDepthDbForDriverArrays(
  driver: ModeCandidate,
  bodyRaw: Record<string, number[]>,
  partialRaw: Record<string, number[]>,
  partialKey: string,
): number | null {
  const bodyArr = bodyRaw[driver.mode.id] || [];
  const partialArr = partialRaw[partialKey] || [];
  const maxBody = maxOfSeries(bodyArr);
  const maxPartial = maxOfSeries(partialArr);
  return exchangeDepthDbFromMax(maxBody, maxPartial);
}

function maxOfSeries(values: number[]): number {
  return values.length ? Math.max(...values) : 0;
}

function exchangeDepthDbFromMax(maxBody: number, maxPartial: number): number | null {
  if (maxBody > 0 && maxPartial > 0) {
    return Math.max(0, 20 * Math.log10(maxBody / maxPartial));
  }
  return null;
}

type DriverSlopeContext = {
  bodySlope: number | null;
  partialSlope: number | null;
  slopeInversion: boolean;
  directionalSink: boolean;
};

function driverSharedBandOverlap(driver: ModeCandidate | null): boolean {
  return Boolean(driver && Number.isFinite(driver.overlap) && driver.overlap > DOMINANCE_OVERLAP_MAX);
}

function deriveDriverSlopeContext(
  driver: ModeCandidate | null,
  partialKey: string,
  bodySlopeByMode: Record<string, number | null>,
  partialSlope: Record<string, number | null>,
): DriverSlopeContext {
  const { bodySlopeVal, partialSlopeVal } = slopeValuesForDriver(driver, partialKey, bodySlopeByMode, partialSlope);
  const slopeInversion = slopeInversionFromValues(bodySlopeVal, partialSlopeVal);
  const directionalSink = directionalSinkFromSlopeValues(driver, bodySlopeVal, slopeInversion);
  return {
    bodySlope: bodySlopeVal,
    partialSlope: partialSlopeVal ?? null,
    slopeInversion,
    directionalSink,
  };
}

function slopeValuesForDriver(
  driver: ModeCandidate | null,
  partialKey: string,
  bodySlopeByMode: Record<string, number | null>,
  partialSlope: Record<string, number | null>,
): { bodySlopeVal: number | null; partialSlopeVal: number | null } {
  const bodySlopeVal = driver ? bodySlopeByMode[driver.mode.id] : null;
  const partialSlopeVal = partialSlope[partialKey];
  return { bodySlopeVal, partialSlopeVal };
}

function slopeInversionFromValues(bodySlopeVal: number | null, partialSlopeVal: number | null): boolean {
  return Number.isFinite(bodySlopeVal) && Number.isFinite(partialSlopeVal)
    ? (partialSlopeVal as number) < (bodySlopeVal as number) - DECAY_SLOPE_DIFF_MIN
    : false;
}

function directionalSinkFromSlopeValues(
  driver: ModeCandidate | null,
  bodySlopeVal: number | null,
  slopeInversion: boolean,
): boolean {
  const bodySlopeOk = Number.isFinite(bodySlopeVal) ? (bodySlopeVal as number) <= BODY_SLOPE_MIN_NEG : false;
  return Boolean(driver) && slopeInversion && bodySlopeOk;
}

function derivePartialState(driver: ModeCandidate | null, directionalSink: boolean, instability: boolean): DriverState {
  if (!driver) return "normal";
  return derivePartialStateForDriver(directionalSink, instability);
}

function derivePartialStateForDriver(directionalSink: boolean, instability: boolean): DriverState {
  if (instability) return "wolf";
  return sinkOrNormalState(directionalSink);
}

function sinkOrNormalState(directionalSink: boolean): DriverState {
  return directionalSink ? "sink" : "normal";
}

function sinkFlavorFromSharedBand(sharedBand: boolean): string {
  return sharedBand ? "shared-band" : "clean";
}

function deriveSinkFlavor(state: DriverState, sharedBand: boolean): string | null {
  if (state !== "sink") return null;
  return sinkFlavorFromSharedBand(sharedBand);
}

function deriveConfidenceFromCandidate(reportCandidate: ModeCandidate | null): ConfidenceTier {
  if (!reportCandidate) return "Low";
  return confidenceFrom(
    reportCandidate.centsAbs,
    reportCandidate.late?.stable ?? false,
    reportCandidate.overlap ?? null,
    reportCandidate.mode?.source ?? null,
  );
}

type DriverContext = {
  t: number[];
  bodyShares: Record<string, number[]>;
  bodyRaw: Record<string, number[]>;
  partialShares: Record<string, number[]>;
  partialRaw: Record<string, number[]>;
  partialInstability: Record<string, PartialInstabilityEntry>;
  modesWithFreq: ModeEntry[];
  bodyLate: Record<string, LateStats>;
  bodySlopeByMode: Record<string, number | null>;
  partialSlope: Record<string, number | null>;
};

function buildDriverEntry(partial: PartialEntry, ctx: DriverContext): DriverEntry {
  const { candidates, nearest } = buildModeCandidates(
    partial,
    ctx.modesWithFreq,
    ctx.bodyLate,
    ctx.bodySlopeByMode,
    ctx.partialSlope,
  );
  const derived = buildDriverEntryDerivedFields(partial, ctx, candidates, nearest);

  return {
    partial,
    ...derived,
  };
}

function buildDriverEntryDerivedFields(
  partial: PartialEntry,
  ctx: DriverContext,
  candidates: ModeCandidate[],
  nearest: ModeCandidate | null,
): Omit<DriverEntry, "partial"> {
  const { driver, sharedBand } = selectDriverAndSharedBand(candidates);
  const slopes = deriveDriverSlopeContext(driver, partial.key, ctx.bodySlopeByMode, ctx.partialSlope);
  const dominanceTime = dominanceTimeForDriver(driver, sharedBand, ctx.t, ctx.bodyShares, ctx.partialShares, partial.key);
  const exchangeDepthDb = exchangeDepthDbForDriver(driver, ctx.bodyRaw, ctx.partialRaw, partial.key);
  const signals = buildDriverEntrySignals(driver, nearest, sharedBand, slopes, ctx, partial.key);
  return {
    driver,
    nearest,
    confidence: signals.confidence,
    dominanceTime,
    exchangeDepthDb,
    sharedBand,
    slopeIndependent: driver?.slopeIndependent ?? false,
    instability: signals.instability,
    state: signals.state,
    sinkFlavor: signals.sinkFlavor,
    bodySlope: slopes.bodySlope,
    partialSlope: slopes.partialSlope,
  };
}

function selectDriverAndSharedBand(candidates: ModeCandidate[]): { driver: ModeCandidate | null; sharedBand: boolean } {
  const driver = selectDriverCandidate(candidates);
  const sharedBand = driverSharedBandOverlap(driver);
  return { driver, sharedBand };
}

function buildDriverEntrySignals(
  driver: ModeCandidate | null,
  nearest: ModeCandidate | null,
  sharedBand: boolean,
  slopes: DriverSlopeContext,
  ctx: DriverContext,
  partialKey: string,
): Pick<DriverEntry, "confidence" | "instability" | "state" | "sinkFlavor"> {
  const reportCandidate = driver || nearest;
  const confidence = deriveConfidenceFromCandidate(reportCandidate);
  const instability = ctx.partialInstability?.[partialKey]?.unstable ?? false;
  const state = derivePartialState(driver, slopes.directionalSink, instability);
  const sinkFlavor = deriveSinkFlavor(state, sharedBand);
  return {
    confidence,
    instability,
    state,
    sinkFlavor,
  };
}

export function buildPartialDriverMap(
  partials: PartialEntry[],
  modes: ModeEntry[],
  series: EnergySeries,
  partialInstability: Record<string, PartialInstabilityEntry> = {},
): DriverEntry[] {
  if (!partials?.length || !series) return [];
  return buildPartialDriverMapFromContext(partials, buildDriverContextFromSeries(partials, modes, series, partialInstability));
}

function buildPartialDriverMapFromContext(partials: PartialEntry[], driverContext: DriverContext): DriverEntry[] {
  return partials.map((partial) => buildDriverEntry(partial, driverContext));
}

function buildDriverContextFromSeries(
  partials: PartialEntry[],
  modes: ModeEntry[],
  series: EnergySeries,
  partialInstability: Record<string, PartialInstabilityEntry>,
): DriverContext {
  const {
    t,
    partialShares,
    partialRaw,
    partialNorm,
    bodyShares,
    bodyRaw,
    bodyNorm,
  } = energySeriesSlices(series);
  const modesWithFreq = modesWithFrequency(modes);
  const { bodyLate, bodySlopeByMode } = buildBodyModeStats(modesWithFreq, bodyNorm, t);
  const partialSlope = buildPartialSlopeMap(partials, partialNorm, t);
  return {
    t,
    bodyShares,
    bodyRaw,
    partialShares,
    partialRaw,
    partialInstability,
    modesWithFreq,
    bodyLate,
    bodySlopeByMode,
    partialSlope,
  };
}

function energySeriesSlices(series: EnergySeries) {
  return {
    t: series.t || [],
    partialShares: series.partialShares || {},
    partialRaw: series.partialRaw || {},
    partialNorm: series.partialNorm || {},
    bodyShares: series.bodyShares || {},
    bodyRaw: series.bodyRaw || {},
    bodyNorm: series.bodyNorm || {},
  };
}

function modesWithFrequency(modes: ModeEntry[]): ModeEntry[] {
  return (modes || []).filter((mode) => Number.isFinite(mode?.peakFreq));
}

export function pickPrimaryDriver(drivers: DriverEntry[]) {
  return drivers?.length
    ? primaryDriverFromCandidates(driverCandidates(drivers), confidenceRankMap())
    : null;
}

function driverCandidates(drivers: DriverEntry[]): DriverEntry[] {
  return drivers.filter((d) => d.driver);
}

function compareDriverEntries(
  a: DriverEntry,
  b: DriverEntry,
  rank: Record<ConfidenceTier, number>,
): number {
  const ra = rank[a.confidence] ?? 2;
  const rb = rank[b.confidence] ?? 2;
  if (ra !== rb) return ra - rb;
  const ca = a.driver?.centsAbs ?? Infinity;
  const cb = b.driver?.centsAbs ?? Infinity;
  if (ca !== cb) return ca - cb;
  const ma = a.driver?.late?.mean ?? 0;
  const mb = b.driver?.late?.mean ?? 0;
  if (ma !== mb) return mb - ma;
  const qA = Number.isFinite(a.driver?.mode?.q) ? a.driver.mode.q : 0;
  const qB = Number.isFinite(b.driver?.mode?.q) ? b.driver.mode.q : 0;
  return qB - qA;
}

function primaryDriverFromCandidates(
  candidates: DriverEntry[],
  rank: Record<ConfidenceTier, number>,
): DriverEntry | null {
  return candidates.length ? sortDriverCandidates(candidates, rank)[0] : null;
}

function sortDriverCandidates(
  candidates: DriverEntry[],
  rank: Record<ConfidenceTier, number>,
): DriverEntry[] {
  candidates.sort((a, b) => compareDriverEntries(a, b, rank));
  return candidates;
}

function confidenceRankMap(): Record<ConfidenceTier, number> {
  return { High: 0, Medium: 1, Low: 2 };
}

export function pickNearestCandidate(drivers: DriverEntry[]) {
  if (!drivers?.length) return null;
  return nearestCandidateFromDrivers(drivers);
}

function nearestCandidateFromDrivers(drivers: DriverEntry[]): DriverEntry | null {
  let best: DriverEntry | null = null;
  drivers.forEach((entry) => {
    best = chooseNearestCandidate(best, entry);
  });
  return best;
}

function chooseNearestCandidate(best: DriverEntry | null, entry: DriverEntry): DriverEntry | null {
  if (!entry?.nearest || entry.nearest.tier === "none") return best;
  return pickBetterCandidate(best, entry);
}

function pickBetterCandidate(best: DriverEntry | null, entry: DriverEntry): DriverEntry | null {
  return isNearestCandidateBetter(best, entry) ? entry : best;
}

function isNearestCandidateBetter(best: DriverEntry | null, entry: DriverEntry): boolean {
  return !best || (entry.nearest.centsAbs ?? Infinity) < (best.nearest?.centsAbs ?? Infinity);
}
