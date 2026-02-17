/**
 * Wolf Note Analyzer core.
 *
 * Pure, DOM-free analysis utilities exposed on `window.WolfNoteCore`.
 *
 * Contract:
 * - Keep the exported API stable; UI code (`main*.ts`) treats this as an external dependency.
 * - Prefer pure functions and explicit inputs/outputs.
 */
import { demodulatePartial } from "./core_dsp.js";
import { analyzeModes, bandOverlapRatio, estimateQFromDb, modeBandWidth, partialBandWidth, refineParabolicPeak, } from "./core_peaks.js";
import { lateTimeSlope, lateTimeStats, lateWindowIndices, normalizeEnvelope, } from "./core_envelope.js";
import { confidenceFrom, computePartialInstabilityMap, couplingTier, fitTwoMode, fitTwoModeEnvelopeAndComputeWolfMetrics, isUnstableDecay, } from "./core_two_mode_fit_wobble_metrics_and_instability.js";
import { buildPartialDriverMap, centsBetween, pickNearestCandidate, pickPrimaryDriver, } from "./core_driver.js";
export const WolfNoteCore = (() => {
    function classifyWolfRisk(score) {
        const val = Number.isFinite(score) ? score : 0;
        return classifyWolfRiskFromValue(val);
    }
    function classifyWolfRiskFromValue(val) {
        if (val < 0.1)
            return "None";
        return classifyWolfRiskFromMild(val);
    }
    function classifyWolfRiskFromMild(val) {
        if (val < 0.25)
            return "Mild";
        return classifyWolfRiskFromModerate(val);
    }
    function classifyWolfRiskFromModerate(val) {
        return val < 0.45 ? "Moderate" : "High";
    }
    return {
        analyzeModes,
        bandOverlapRatio,
        buildPartialDriverMap,
        centsBetween,
        demodulatePartial,
        estimateQFromDb,
        classifyWolfRisk,
        computePartialInstabilityMap,
        confidenceFrom,
        couplingTier,
        fitTwoModeEnvelopeAndComputeWolfMetrics,
        fitTwoMode,
        isUnstableDecay,
        lateTimeSlope,
        lateTimeStats,
        lateWindowIndices,
        modeBandWidth,
        normalizeEnvelope,
        partialBandWidth,
        pickNearestCandidate,
        pickPrimaryDriver,
        refineParabolicPeak,
    };
})();
if (typeof window !== "undefined") {
    window.WolfNoteCore = WolfNoteCore;
}
