import { analyzeAdaptiveRingdown } from "./resonate_ringdown_adaptive.js?rev=c40b9f2c1b26";
import { measureDecayNeighborEvidence } from "./resonate_ringdown_neighbors.js?rev=c40b9f2c1b26";
export function analyzeObservedRingdown(input, math) {
    const neighborEvidence = measureDecayNeighborEvidence(input.buffer, input.sampleRate, input.targetFrequencyHz, math.transformComplex);
    const neighborFrequencies = neighborEvidence.status === "insufficient_observation"
        ? input.neighborFrequencies : neighborEvidence.peaks.map((peak) => peak.frequencyHz);
    const result = analyzeAdaptiveRingdown({ ...input, neighborFrequencies, neighborEvidence }, math);
    if (neighborEvidence.status === "measured" || neighborEvidence.status === "insufficient_observation")
        return result;
    return { ...result, Q: null, tau: null, slope: null,
        flags: [...result.flags, "target_not_observed"], evidence: { ...result.evidence, rejected: true } };
}
