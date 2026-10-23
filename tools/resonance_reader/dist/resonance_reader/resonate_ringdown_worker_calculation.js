import { analyzeObservedRingdown } from "./resonate_ringdown_observed.js";
export function calculateRingdownFromJob(wave, sampleRate, input, math) {
    const buffer = copyRingdownWindowFromWave(wave, input.startSample, input.sampleCount);
    if (input.method === "legacy")
        return math.analyzeModeRingdown({
            buffer, sampleRate, targetFrequencyHz: input.targetFrequencyHz,
            spectrum: input.spectrum, modeBandwidthHz: input.spectralWidthHz,
            smoothWindowMs: 5, attackSkipMs: 40, fitFloorDb: 26,
        });
    return analyzeObservedRingdown({ ...input, wave, buffer, sampleRate }, math);
}
function copyRingdownWindowFromWave(wave, startSample, sampleCount) {
    if (!Number.isInteger(startSample) || !Number.isInteger(sampleCount) || startSample < 0 || sampleCount <= 0 || startSample + sampleCount > wave.length) {
        throw new Error("Invalid ring-down sample window");
    }
    return Float32Array.from({ length: sampleCount }, (_, index) => Number(wave[startSample + index]) || 0);
}
