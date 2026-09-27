import { estimateLocalModalNoise } from "./resonate_ringdown_noise.js";
import { selectDecayWindow } from "./resonate_ringdown_fit_window.js";
import { isolateAnalyticMode, selectIsolationBand } from "./resonate_ringdown_isolation.js";
export function analyzeAdaptiveRingdown(input, math) {
    assertValidInput(input);
    const band = selectIsolationBand(input.targetFrequencyHz, input.spectralWidthHz, input.neighborFrequencies);
    const isolate = (samples, factor = 1) => isolateAnalyticMode(samples, input.sampleRate, input.targetFrequencyHz, band.widthHz * factor, math.transformComplex);
    const noise = estimateLocalModalNoise({ ...input, envelope: (samples) => isolate(samples).envelope });
    const isolated = isolate(input.buffer);
    const window = selectDecayWindow({
        envelope: isolated.envelope, sampleRate: input.sampleRate, frequencyHz: input.targetFrequencyHz,
        noiseAmplitude: noise.amplitude, settlingSec: band.settlingSec, onsetSec: input.onsetSec,
    });
    const fit = fitSelectedWindow(isolated.response, input, window, math);
    const variation = fit.tau ? bandwidthSensitivity(input, window, math, isolate, fit.tau) : null;
    const flags = [
        ...(noise.status === "measured" ? [] : [`noise_${noise.status}`]),
        ...(window.rejection ? [window.rejection] : []),
        ...(window.endReason === "recording_end" ? ["observation_truncated"] : []),
        ...(band.overlap ? ["overlapping_modes"] : []),
        ...(variation !== null && variation > 0.15 ? ["filter_sensitive"] : []),
        ...(!fit.r2 || fit.r2 < 0.85 ? ["unstable_decay"] : []),
    ];
    const rejected = Boolean(window.rejection || band.overlap || !fit.tau || !fit.r2 || fit.r2 < 0.85 || (variation !== null && variation > 0.15));
    const preview = responsePreview(isolated, input.sampleRate);
    return {
        ...preview, f0: input.targetFrequencyHz, tau: rejected ? null : fit.tau,
        Q: rejected ? null : Math.PI * fit.frequencyHz * fit.tau,
        deltaF: input.spectralWidthHz, envelopeR2: fit.r2, slope: rejected ? null : fit.slope,
        fitStartSec: window.startSec, fitEndSec: window.endSec, flags,
        sampleRate: input.sampleRate, attackSkipMs: (window.startSec - input.onsetSec) * 1000,
        smoothWindowMs: 1000 / input.targetFrequencyHz, fitMethod: "damped_sinusoid",
        isolationBandwidthHz: band.widthHz,
        evidence: { method: "adaptive-v1", noise, window, fittedFrequencyHz: fit.frequencyHz, bandwidthVariation: variation, rejected },
    };
}
function fitSelectedWindow(response, input, window, math) {
    if (window.rejection)
        return { frequencyHz: null, tau: null, r2: null, slope: null };
    return math.fitDampedSinusoid({
        signal: response, sampleRate: input.sampleRate, targetFrequencyHz: input.targetFrequencyHz,
        fitStartSec: window.startSec, fitEndSec: window.endSec, initialTau: window.tau,
    });
}
function bandwidthSensitivity(input, window, math, isolate, tau) {
    const estimates = [0.8, 1.2].map((factor) => fitSelectedWindow(isolate(input.buffer, factor).response, input, window, math).tau);
    if (estimates.some((value) => value === null || !Number.isFinite(value)))
        return 1;
    return Math.max(...estimates.map((value) => Math.abs(value / tau - 1)));
}
function responsePreview(isolated, sampleRate) {
    const step = Math.max(1, Math.floor(isolated.response.length / 800));
    const peak = isolated.envelope.reduce((max, value) => Math.max(max, value), 1e-20);
    const indices = Array.from({ length: Math.ceil(isolated.response.length / step) }, (_, i) => i * step);
    return {
        response: indices.map((i) => isolated.response[i] / peak),
        envelope: indices.map((i) => isolated.envelope[i] / peak),
        timeAxis: indices.map((i) => i / sampleRate),
    };
}
function assertValidInput(input) {
    if (!Number.isFinite(input.sampleRate) || input.sampleRate <= 0 || !input.buffer.length)
        throw new Error("Ring-down requires audio and a valid sample rate");
    if (!Number.isFinite(input.targetFrequencyHz) || input.targetFrequencyHz <= 0 || input.targetFrequencyHz >= input.sampleRate / 2)
        throw new Error("Ring-down requires a frequency below Nyquist");
    if (!Array.from(input.buffer).every(Number.isFinite))
        throw new Error("Ring-down audio contains invalid samples");
}
