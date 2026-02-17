import { bandOverlapRatio, modeBandWidth, partialBandWidth } from "./core_peaks.js";
import { lateTimeSlope, lateTimeStats } from "./core_envelope.js";
import { confidenceFrom, couplingTier } from "./core_two_mode_fit_wobble_metrics_and_instability.js";
const DOMINANCE_OVERLAP_MAX = 0.45;
const DECAY_SLOPE_DIFF_MIN = 0.15;
const BODY_SLOPE_MIN_NEG = -0.08;
export function centsBetween(freq, ref) {
    if (!Number.isFinite(freq) || !Number.isFinite(ref) || freq <= 0 || ref <= 0)
        return Infinity;
    return 1200 * Math.log2(freq / ref);
}
function buildBodyModeStats(modes, bodyNorm, t) {
    const [bodyLate, bodySlopeByMode] = [{}, {}];
    modes.forEach((mode) => {
        const env = bodyNorm[mode.id] || [];
        bodyLate[mode.id] = lateTimeStats(env, t);
        bodySlopeByMode[mode.id] = lateTimeSlope(env, t);
    });
    return { bodyLate, bodySlopeByMode };
}
function buildPartialSlopeMap(partials, partialNorm, t) {
    const partialSlope = {};
    partials.forEach((partial) => {
        partialSlope[partial.key] = lateTimeSlope(partialNorm[partial.key] || [], t);
    });
    return partialSlope;
}
function buildModeCandidates(partial, modes, bodyLate, bodySlopeByMode, partialSlope) {
    return modeCandidatesFromPartial(partial, modes, bodyLate, bodySlopeByMode, partialSlope);
}
function modeCandidatesFromPartial(partial, modes, bodyLate, bodySlopeByMode, partialSlope) {
    return modeCandidatesFromModes(partial, modes, bodyLate, bodySlopeByMode, partialSlope);
}
function modeCandidatesFromModes(partial, modes, bodyLate, bodySlopeByMode, partialSlope) {
    const partialBw = partialBandwidthForCandidate(partial);
    return modeCandidatesFromModesWithBandwidth(partial, modes, partialBw, bodyLate, bodySlopeByMode, partialSlope);
}
function modeCandidatesFromModesWithBandwidth(partial, modes, partialBw, bodyLate, bodySlopeByMode, partialSlope) {
    let nearest = null;
    const candidates = modes.map((mode) => {
        const entry = modeCandidateForPartial(partial, mode, partialBw, bodyLate, bodySlopeByMode, partialSlope);
        nearest = nearestCandidateByCentsAbs(nearest, entry);
        return entry;
    });
    return { candidates, nearest };
}
function partialBandwidthForCandidate(partial) {
    return partialBandWidth(partial.key, partial.freq);
}
function nearestCandidateByCentsAbs(nearest, entry) {
    return !nearest || entry.centsAbs < nearest.centsAbs ? entry : nearest;
}
function modeCandidateForPartial(partial, mode, partialBw, bodyLate, bodySlopeByMode, partialSlope) {
    const { cents, centsAbs } = centsAndAbsForModePartial(mode, partial);
    const tier = couplingTier(centsAbs);
    const overlap = overlapRatioForPartialMode(partial, mode, partialBw);
    const late = lateStatsForMode(bodyLate, mode);
    const slopeIndependent = slopeIndependentForModePartial(mode, partial, bodySlopeByMode, partialSlope);
    return { mode, cents, centsAbs, tier, overlap, late, slopeIndependent };
}
function centsAndAbsForModePartial(mode, partial) {
    const cents = centsBetween(mode.peakFreq, partial.freq);
    return { cents, centsAbs: Math.abs(cents) };
}
function lateStatsForMode(bodyLate, mode) {
    return bodyLate[mode.id] || { mean: 0, cv: 1, stable: false };
}
function slopeIndependentForModePartial(mode, partial, bodySlopeByMode, partialSlope) {
    const slopeDiff = slopeDiffForModePartial(mode, partial, bodySlopeByMode, partialSlope);
    return Number.isFinite(slopeDiff) ? slopeDiff >= DECAY_SLOPE_DIFF_MIN : false;
}
function slopeDiffForModePartial(mode, partial, bodySlopeByMode, partialSlope) {
    return Number.isFinite(bodySlopeByMode[mode.id]) && Number.isFinite(partialSlope[partial.key])
        ? Math.abs(bodySlopeByMode[mode.id] - partialSlope[partial.key])
        : null;
}
function overlapRatioForPartialMode(partial, mode, partialBw) {
    return bandOverlapRatio(partial.freq, partialBw, mode.peakFreq, modeBandWidth(mode.peakFreq));
}
function selectDriverCandidate(candidates) {
    return bestEligibleCandidate(candidates);
}
function bestEligibleCandidate(candidates) {
    const eligible = candidates
        .filter((c) => isStrongStableCandidate(c))
        .sort(compareCandidatePriority);
    return eligible[0] || null;
}
function isStrongStableCandidate(candidate) {
    var _a;
    return candidate.tier === "strong" && ((_a = candidate.late) === null || _a === void 0 ? void 0 : _a.stable);
}
function compareCandidatePriority(a, b) {
    var _a, _b;
    return (_b = (_a = compareCandidateCentsAbs(a, b)) !== null && _a !== void 0 ? _a : compareCandidateLateMean(a, b)) !== null && _b !== void 0 ? _b : compareCandidateQ(a, b);
}
function compareCandidateCentsAbs(a, b) {
    return a.centsAbs !== b.centsAbs ? a.centsAbs - b.centsAbs : null;
}
function compareCandidateLateMean(a, b) {
    var _a, _b;
    const meanA = ((_a = a.late) === null || _a === void 0 ? void 0 : _a.mean) || 0;
    const meanB = ((_b = b.late) === null || _b === void 0 ? void 0 : _b.mean) || 0;
    return meanA !== meanB ? meanB - meanA : null;
}
function compareCandidateQ(a, b) {
    return candidateQValue(b) - candidateQValue(a);
}
function candidateQValue(candidate) {
    var _a;
    return Number.isFinite((_a = candidate.mode) === null || _a === void 0 ? void 0 : _a.q) ? candidate.mode.q : 0;
}
function dominanceTimeForDriver(driver, sharedBand, t, bodyShares, partialShares, partialKey) {
    if (!driver || sharedBand || !driver.slopeIndependent)
        return null;
    return dominanceTimeFromShares(t, bodyShares[driver.mode.id] || [], partialShares[partialKey] || []);
}
function dominanceTimeFromShares(t, bodyShare, partialShare) {
    const idx = bodyShare.findIndex((v, i) => { var _a, _b; return v > ((_a = partialShare[i]) !== null && _a !== void 0 ? _a : 0) && ((_b = t[i]) !== null && _b !== void 0 ? _b : 0) > 0.1; });
    return idx >= 0 ? t[idx] : null;
}
function exchangeDepthDbForDriver(driver, bodyRaw, partialRaw, partialKey) {
    return driver ? exchangeDepthDbForDriverArrays(driver, bodyRaw, partialRaw, partialKey) : null;
}
function exchangeDepthDbForDriverArrays(driver, bodyRaw, partialRaw, partialKey) {
    const bodyArr = bodyRaw[driver.mode.id] || [];
    const partialArr = partialRaw[partialKey] || [];
    const maxBody = maxOfSeries(bodyArr);
    const maxPartial = maxOfSeries(partialArr);
    return exchangeDepthDbFromMax(maxBody, maxPartial);
}
function maxOfSeries(values) {
    return values.length ? Math.max(...values) : 0;
}
function exchangeDepthDbFromMax(maxBody, maxPartial) {
    if (maxBody > 0 && maxPartial > 0) {
        return Math.max(0, 20 * Math.log10(maxBody / maxPartial));
    }
    return null;
}
function driverSharedBandOverlap(driver) {
    return Boolean(driver && Number.isFinite(driver.overlap) && driver.overlap > DOMINANCE_OVERLAP_MAX);
}
function deriveDriverSlopeContext(driver, partialKey, bodySlopeByMode, partialSlope) {
    const { bodySlopeVal, partialSlopeVal } = slopeValuesForDriver(driver, partialKey, bodySlopeByMode, partialSlope);
    const slopeInversion = slopeInversionFromValues(bodySlopeVal, partialSlopeVal);
    const directionalSink = directionalSinkFromSlopeValues(driver, bodySlopeVal, slopeInversion);
    return {
        bodySlope: bodySlopeVal,
        partialSlope: partialSlopeVal !== null && partialSlopeVal !== void 0 ? partialSlopeVal : null,
        slopeInversion,
        directionalSink,
    };
}
function slopeValuesForDriver(driver, partialKey, bodySlopeByMode, partialSlope) {
    const bodySlopeVal = driver ? bodySlopeByMode[driver.mode.id] : null;
    const partialSlopeVal = partialSlope[partialKey];
    return { bodySlopeVal, partialSlopeVal };
}
function slopeInversionFromValues(bodySlopeVal, partialSlopeVal) {
    return Number.isFinite(bodySlopeVal) && Number.isFinite(partialSlopeVal)
        ? partialSlopeVal < bodySlopeVal - DECAY_SLOPE_DIFF_MIN
        : false;
}
function directionalSinkFromSlopeValues(driver, bodySlopeVal, slopeInversion) {
    const bodySlopeOk = Number.isFinite(bodySlopeVal) ? bodySlopeVal <= BODY_SLOPE_MIN_NEG : false;
    return Boolean(driver) && slopeInversion && bodySlopeOk;
}
function derivePartialState(driver, directionalSink, instability) {
    if (!driver)
        return "normal";
    return derivePartialStateForDriver(directionalSink, instability);
}
function derivePartialStateForDriver(directionalSink, instability) {
    if (instability)
        return "wolf";
    return sinkOrNormalState(directionalSink);
}
function sinkOrNormalState(directionalSink) {
    return directionalSink ? "sink" : "normal";
}
function sinkFlavorFromSharedBand(sharedBand) {
    return sharedBand ? "shared-band" : "clean";
}
function deriveSinkFlavor(state, sharedBand) {
    if (state !== "sink")
        return null;
    return sinkFlavorFromSharedBand(sharedBand);
}
function deriveConfidenceFromCandidate(reportCandidate) {
    var _a, _b, _c, _d, _e;
    if (!reportCandidate)
        return "Low";
    return confidenceFrom(reportCandidate.centsAbs, (_b = (_a = reportCandidate.late) === null || _a === void 0 ? void 0 : _a.stable) !== null && _b !== void 0 ? _b : false, (_c = reportCandidate.overlap) !== null && _c !== void 0 ? _c : null, (_e = (_d = reportCandidate.mode) === null || _d === void 0 ? void 0 : _d.source) !== null && _e !== void 0 ? _e : null);
}
function buildDriverEntry(partial, ctx) {
    const { candidates, nearest } = buildModeCandidates(partial, ctx.modesWithFreq, ctx.bodyLate, ctx.bodySlopeByMode, ctx.partialSlope);
    const derived = buildDriverEntryDerivedFields(partial, ctx, candidates, nearest);
    return {
        partial,
        ...derived,
    };
}
function buildDriverEntryDerivedFields(partial, ctx, candidates, nearest) {
    var _a;
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
        slopeIndependent: (_a = driver === null || driver === void 0 ? void 0 : driver.slopeIndependent) !== null && _a !== void 0 ? _a : false,
        instability: signals.instability,
        state: signals.state,
        sinkFlavor: signals.sinkFlavor,
        bodySlope: slopes.bodySlope,
        partialSlope: slopes.partialSlope,
    };
}
function selectDriverAndSharedBand(candidates) {
    const driver = selectDriverCandidate(candidates);
    const sharedBand = driverSharedBandOverlap(driver);
    return { driver, sharedBand };
}
function buildDriverEntrySignals(driver, nearest, sharedBand, slopes, ctx, partialKey) {
    var _a, _b, _c;
    const reportCandidate = driver || nearest;
    const confidence = deriveConfidenceFromCandidate(reportCandidate);
    const instability = (_c = (_b = (_a = ctx.partialInstability) === null || _a === void 0 ? void 0 : _a[partialKey]) === null || _b === void 0 ? void 0 : _b.unstable) !== null && _c !== void 0 ? _c : false;
    const state = derivePartialState(driver, slopes.directionalSink, instability);
    const sinkFlavor = deriveSinkFlavor(state, sharedBand);
    return {
        confidence,
        instability,
        state,
        sinkFlavor,
    };
}
export function buildPartialDriverMap(partials, modes, series, partialInstability = {}) {
    if (!(partials === null || partials === void 0 ? void 0 : partials.length) || !series)
        return [];
    return buildPartialDriverMapFromContext(partials, buildDriverContextFromSeries(partials, modes, series, partialInstability));
}
function buildPartialDriverMapFromContext(partials, driverContext) {
    return partials.map((partial) => buildDriverEntry(partial, driverContext));
}
function buildDriverContextFromSeries(partials, modes, series, partialInstability) {
    const { t, partialShares, partialRaw, partialNorm, bodyShares, bodyRaw, bodyNorm, } = energySeriesSlices(series);
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
function energySeriesSlices(series) {
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
function modesWithFrequency(modes) {
    return (modes || []).filter((mode) => Number.isFinite(mode === null || mode === void 0 ? void 0 : mode.peakFreq));
}
export function pickPrimaryDriver(drivers) {
    return (drivers === null || drivers === void 0 ? void 0 : drivers.length)
        ? primaryDriverFromCandidates(driverCandidates(drivers), confidenceRankMap())
        : null;
}
function driverCandidates(drivers) {
    return drivers.filter((d) => d.driver);
}
function compareDriverEntries(a, b, rank) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r;
    const ra = (_a = rank[a.confidence]) !== null && _a !== void 0 ? _a : 2;
    const rb = (_b = rank[b.confidence]) !== null && _b !== void 0 ? _b : 2;
    if (ra !== rb)
        return ra - rb;
    const ca = (_d = (_c = a.driver) === null || _c === void 0 ? void 0 : _c.centsAbs) !== null && _d !== void 0 ? _d : Infinity;
    const cb = (_f = (_e = b.driver) === null || _e === void 0 ? void 0 : _e.centsAbs) !== null && _f !== void 0 ? _f : Infinity;
    if (ca !== cb)
        return ca - cb;
    const ma = (_j = (_h = (_g = a.driver) === null || _g === void 0 ? void 0 : _g.late) === null || _h === void 0 ? void 0 : _h.mean) !== null && _j !== void 0 ? _j : 0;
    const mb = (_m = (_l = (_k = b.driver) === null || _k === void 0 ? void 0 : _k.late) === null || _l === void 0 ? void 0 : _l.mean) !== null && _m !== void 0 ? _m : 0;
    if (ma !== mb)
        return mb - ma;
    const qA = Number.isFinite((_p = (_o = a.driver) === null || _o === void 0 ? void 0 : _o.mode) === null || _p === void 0 ? void 0 : _p.q) ? a.driver.mode.q : 0;
    const qB = Number.isFinite((_r = (_q = b.driver) === null || _q === void 0 ? void 0 : _q.mode) === null || _r === void 0 ? void 0 : _r.q) ? b.driver.mode.q : 0;
    return qB - qA;
}
function primaryDriverFromCandidates(candidates, rank) {
    return candidates.length ? sortDriverCandidates(candidates, rank)[0] : null;
}
function sortDriverCandidates(candidates, rank) {
    candidates.sort((a, b) => compareDriverEntries(a, b, rank));
    return candidates;
}
function confidenceRankMap() {
    return { High: 0, Medium: 1, Low: 2 };
}
export function pickNearestCandidate(drivers) {
    if (!(drivers === null || drivers === void 0 ? void 0 : drivers.length))
        return null;
    return nearestCandidateFromDrivers(drivers);
}
function nearestCandidateFromDrivers(drivers) {
    let best = null;
    drivers.forEach((entry) => {
        best = chooseNearestCandidate(best, entry);
    });
    return best;
}
function chooseNearestCandidate(best, entry) {
    if (!(entry === null || entry === void 0 ? void 0 : entry.nearest) || entry.nearest.tier === "none")
        return best;
    return pickBetterCandidate(best, entry);
}
function pickBetterCandidate(best, entry) {
    return isNearestCandidateBetter(best, entry) ? entry : best;
}
function isNearestCandidateBetter(best, entry) {
    var _a, _b, _c;
    return !best || ((_a = entry.nearest.centsAbs) !== null && _a !== void 0 ? _a : Infinity) < ((_c = (_b = best.nearest) === null || _b === void 0 ? void 0 : _b.centsAbs) !== null && _c !== void 0 ? _c : Infinity);
}
