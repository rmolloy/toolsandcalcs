/**
 * Selection + coupling reasoning helpers.
 *
 * Pure helpers that derive secondary state from the current selection.
 * Kept DOM-free so `main2.ts` can stay thin.
 */
import { formatCentsValue, deriveFirstThreePartialsFromNote, allBodyModes, } from "./state.js";
import { computeEnergySeries } from "./energy_series.js";
import { WolfNoteCore } from "./core.js";
const NO_RESONANCE_REASON = "No close body resonance; wolf classification not allowed.";
export const NO_COUPLING_REASON = "No coupling flags yet.";
const { buildPartialDriverMap, computePartialInstabilityMap, pickNearestCandidate, pickPrimaryDriver, isUnstableDecay, classifyWolfRisk, } = WolfNoteCore;
export function computeSelectionDerivedState(slice, noteResult) {
    var _a, _b;
    const modes = allBodyModes();
    const partials = deriveFirstThreePartialsFromNote(noteResult);
    const baseEnergy = computeEnergySeries(slice, noteResult.f0, modes);
    const partialInstability = baseEnergy ? computePartialInstabilityMap(baseEnergy) : {};
    const hasPartialInstability = Object.keys(partialInstability).length > 0;
    const drivers = baseEnergy ? buildPartialDriverMap(partials, modes, baseEnergy, partialInstability) : [];
    const primary = pickPrimaryDriver(drivers) || pickNearestCandidate(drivers);
    const couplingOk = Boolean(primary === null || primary === void 0 ? void 0 : primary.driver);
    const instability = (partialInstability === null || partialInstability === void 0 ? void 0 : partialInstability.f0) ? partialInstability.f0.unstable : isUnstableDecay(noteResult);
    const energy = baseEnergy
        ? { ...baseEnergy, dominanceTime: (_a = primary === null || primary === void 0 ? void 0 : primary.dominanceTime) !== null && _a !== void 0 ? _a : null, exchangeDepthDb: (_b = primary === null || primary === void 0 ? void 0 : primary.exchangeDepthDb) !== null && _b !== void 0 ? _b : null }
        : null;
    return {
        modes,
        partials,
        energy,
        partialInstability: hasPartialInstability ? partialInstability : null,
        drivers,
        primary,
        couplingOk,
        instability,
    };
}
export function buildSelectionReason(noteResult, derived) {
    const { drivers, primary, couplingOk } = derived;
    const noCouplingReason = buildNoCouplingReason(drivers, couplingOk);
    if (!couplingOk)
        return noCouplingReason;
    if (!(primary === null || primary === void 0 ? void 0 : primary.driver))
        return noCouplingReason;
    const labels = collectPrimaryLabels(primary, noteResult);
    let reason = buildCoupledReason(primary, labels);
    reason = appendSharedBandDescriptor(primary, reason);
    return reason;
}
export function buildNoCouplingReason(drivers, couplingOk) {
    if (couplingOk)
        return NO_RESONANCE_REASON;
    const hasStrong = drivers.some((d) => { var _a; return ((_a = d.nearest) === null || _a === void 0 ? void 0 : _a.tier) === "strong"; });
    const hasPossible = drivers.some((d) => { var _a; return ((_a = d.nearest) === null || _a === void 0 ? void 0 : _a.tier) === "possible"; });
    if (hasStrong) {
        return "Coupling flagged, but no late-time stable body resonance; wolf classification not allowed.";
    }
    if (hasPossible) {
        return "Possible coupling within 50c; wolf classification not allowed.";
    }
    return NO_RESONANCE_REASON;
}
function collectPrimaryLabels(primary, noteResult) {
    var _a, _b, _c, _d, _e;
    return {
        modeLabel: ((_b = (_a = primary.driver) === null || _a === void 0 ? void 0 : _a.mode) === null || _b === void 0 ? void 0 : _b.label) || "Body mode",
        partialLabel: ((_c = primary.partial) === null || _c === void 0 ? void 0 : _c.label) || "Partial",
        centsLabel: formatCentsValue((_d = primary.driver) === null || _d === void 0 ? void 0 : _d.cents),
        confidence: primary.confidence || "Low",
        risk: classifyWolfRisk((_e = noteResult === null || noteResult === void 0 ? void 0 : noteResult.wolfScore) !== null && _e !== void 0 ? _e : null),
    };
}
export function buildCoupledReason(primary, labels) {
    const { modeLabel, partialLabel, centsLabel, confidence, risk } = labels;
    switch (primary.state) {
        case "wolf":
            return buildWolfReason(modeLabel, partialLabel, centsLabel, confidence, risk);
        case "sink":
            return buildDirectionalSinkReason(partialLabel, confidence);
        case "normal":
        default:
            return buildStableCouplingReason(modeLabel, partialLabel, centsLabel, confidence);
    }
}
function buildWolfReason(modeLabel, partialLabel, centsLabel, confidence, risk) {
    return `${risk} risk, ${partialLabel} coupling to ${modeLabel} (${centsLabel}). Confidence: ${confidence}.`;
}
function buildDirectionalSinkReason(partialLabel, confidence) {
    return `Directional sink on ${partialLabel}; not a wolf. Confidence: ${confidence}.`;
}
function buildStableCouplingReason(modeLabel, partialLabel, centsLabel, confidence) {
    return `${partialLabel} couples to ${modeLabel} (${centsLabel}); decay stable. Confidence: ${confidence}.`;
}
export function appendSharedBandDescriptor(primary, base) {
    if (primary.state === "sink" && primary.sinkFlavor === "shared-band") {
        return `${base} Shared-band sink; envelopes track by design.`;
    }
    if (primary.sharedBand) {
        return `${base} Shared-band energy; envelopes track by design.`;
    }
    return base;
}
// Expose for UI and tests (global script context).
if (typeof window !== "undefined") {
    window.WolfSelection = {
        computeSelectionDerivedState,
        buildSelectionReason,
        buildNoCouplingReason,
        buildCoupledReason,
        appendSharedBandDescriptor,
    };
}
