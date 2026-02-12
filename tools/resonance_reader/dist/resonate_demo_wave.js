import { measureModeNormalize } from "./resonate_mode_config.js";
const DEMO_PEAKS_BY_MODE = {
    guitar: [98, 178, 220],
    top: [42, 82, 126],
    back: [38, 88, 134],
};
export function demoPeakFrequenciesResolveFromMeasureMode(measureMode) {
    return DEMO_PEAKS_BY_MODE[measureModeNormalize(measureMode)];
}
export function demoWaveBuildFromMeasureMode(measureMode, sampleLengthMs = 1500) {
    return demoWaveBuildFromPeaks(demoPeakFrequenciesResolveFromMeasureMode(measureMode), sampleLengthMs);
}
function demoWaveBuildFromPeaks(peaksHz, sampleLengthMs) {
    const sampleRate = 44100;
    const samples = Math.max(64, Math.round((sampleLengthMs / 1000) * sampleRate));
    const timeMs = new Array(samples);
    const wave = new Array(samples);
    const normalizedPeaks = peaksHz.filter((peak) => Number.isFinite(peak) && peak > 0);
    const decayFast = 4.2;
    const decaySlow = 2.3;
    for (let i = 0; i < samples; i += 1) {
        const t = i / sampleRate;
        timeMs[i] = t * 1000;
        wave[i] = demoWaveSampleBuildFromTime(t, i, normalizedPeaks, decayFast, decaySlow);
    }
    return { timeMs, wave, sampleRate };
}
function demoWaveSampleBuildFromTime(t, idx, peaksHz, decayFast, decaySlow) {
    let sample = 0;
    for (let i = 0; i < peaksHz.length; i += 1) {
        const peak = peaksHz[i];
        const gain = 1 / (1 + i * 0.65);
        sample += gain * Math.sin(2 * Math.PI * peak * t) * Math.exp(-decayFast * t);
        sample += gain * 0.3 * Math.sin(2 * Math.PI * peak * 2 * t) * Math.exp(-decaySlow * t);
    }
    const bed = Math.sin(2 * Math.PI * 9 * t) * Math.exp(-1.7 * t) * 0.03;
    const flutter = Math.sin(idx * 0.013) * 0.0025;
    return sample + bed + flutter;
}
