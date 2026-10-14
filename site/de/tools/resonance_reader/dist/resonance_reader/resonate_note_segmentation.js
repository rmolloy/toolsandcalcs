const NOTE_F0_MIN = 60;
const NOTE_F0_MAX = 450;
const NOTE_F0_MAX_FREQ = 1000;
const NOTE_SEGMENTATION_OPTIONS = {};
const NOTE_F0_HARMONIC_COUNT = 5;
const NOTE_F0_HARMONIC_DECAY_BASE = 0.9;
const NOTE_F0_SUBHARMONIC_DIVISORS = [1, 2, 3, 4];
const NOTE_F0_HPS_SETTINGS = {
    hpsDownsample: 2,
    hpsHarmonics: 4,
    f0Min: NOTE_F0_MIN,
    f0Max: NOTE_F0_MAX,
};
const NOTE_F0_OCTAVE_CORRECTION_MIN_HZ = 170;
const NOTE_F0_OCTAVE_CORRECTION_LOW_MAX_HZ = 130;
const NOTE_F0_OCTAVE_CORRECTION_RATIO_MAX = 0.75;
function localPeakIndexesResolveInBand(freqs, mags, minHz, maxHz) {
    const peakIndexes = [];
    for (let i = 0; i < freqs.length; i += 1) {
        const f = freqs[i];
        if (!Number.isFinite(f) || f < minHz || f > maxHz)
            continue;
        const v = mags[i];
        if (!Number.isFinite(v))
            continue;
        const prev = mags[i - 1] ?? Number.NEGATIVE_INFINITY;
        const next = mags[i + 1] ?? Number.NEGATIVE_INFINITY;
        if (v >= prev && v >= next)
            peakIndexes.push(i);
    }
    return peakIndexes;
}
function nearestIndexResolveForFrequency(freqs, targetHz) {
    let bestIndex = -1;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let i = 0; i < freqs.length; i += 1) {
        const freq = freqs[i];
        if (!Number.isFinite(freq))
            continue;
        const distance = Math.abs(freq - targetHz);
        if (distance < bestDistance) {
            bestDistance = distance;
            bestIndex = i;
        }
    }
    return bestIndex;
}
function harmonicWeightResolve(index) {
    if (index === 1)
        return 0.35;
    return 1 / Math.pow(index, NOTE_F0_HARMONIC_DECAY_BASE);
}
function harmonicMagnitudeResolve(freqs, mags, frequencyHz) {
    const nearestIndex = nearestIndexResolveForFrequency(freqs, frequencyHz);
    if (nearestIndex < 0)
        return null;
    const magnitude = mags[nearestIndex];
    return Number.isFinite(magnitude) ? magnitude : null;
}
function harmonicScoreResolve(freqs, mags, fundamentalHz) {
    let score = 0;
    for (let harmonic = 1; harmonic <= NOTE_F0_HARMONIC_COUNT; harmonic += 1) {
        const harmonicHz = fundamentalHz * harmonic;
        const magnitude = harmonicMagnitudeResolve(freqs, mags, harmonicHz);
        if (!Number.isFinite(magnitude))
            continue;
        score += magnitude * harmonicWeightResolve(harmonic);
    }
    return score;
}
function subharmonicCandidatesResolveFromPeakFrequency(peakFrequencyHz, minHz, maxHz) {
    const candidates = [];
    NOTE_F0_SUBHARMONIC_DIVISORS.forEach((divisor) => {
        const candidate = peakFrequencyHz / divisor;
        if (!Number.isFinite(candidate) || candidate < minHz || candidate > maxHz)
            return;
        candidates.push(candidate);
    });
    return candidates;
}
function candidateFrequenciesResolveFromPeakIndexes(peakIndexes, freqs, minHz, maxHz) {
    const seen = new Set();
    const candidates = [];
    peakIndexes.forEach((peakIndex) => {
        const peakFrequency = freqs[peakIndex];
        if (!Number.isFinite(peakFrequency))
            return;
        const subharmonics = subharmonicCandidatesResolveFromPeakFrequency(peakFrequency, minHz, maxHz);
        subharmonics.forEach((candidate) => {
            const key = Math.round(candidate * 100);
            if (seen.has(key))
                return;
            seen.add(key);
            candidates.push(candidate);
        });
    });
    return candidates;
}
export function fundamentalFrequencyResolveFromSpectrum(freqs, mags, minHz, maxHz) {
    const peakIndexes = localPeakIndexesResolveInBand(freqs, mags, minHz, maxHz);
    if (!peakIndexes.length)
        return null;
    const candidates = candidateFrequenciesResolveFromPeakIndexes(peakIndexes, freqs, minHz, maxHz);
    if (!candidates.length)
        return null;
    let bestFrequency = null;
    let bestScore = Number.NEGATIVE_INFINITY;
    candidates.forEach((candidateFrequency) => {
        const score = harmonicScoreResolve(freqs, mags, candidateFrequency);
        if (score > bestScore || (score === bestScore && (bestFrequency === null || candidateFrequency < bestFrequency))) {
            bestScore = score;
            bestFrequency = candidateFrequency;
        }
    });
    return bestFrequency;
}
function f0HpsCandidatesResolveFromSpectrum(freqs, mags, hpsHarmonics) {
    const products = mags.slice();
    for (let harmonic = 2; harmonic <= hpsHarmonics; harmonic += 1) {
        for (let i = 0; i < products.length; i += 1) {
            const multipliedIndex = Math.floor(i * harmonic);
            products[i] *= multipliedIndex < mags.length ? mags[multipliedIndex] : 0.5;
        }
    }
    return products;
}
function peakIndexResolveFromSeries(series) {
    let bestIndex = 0;
    let bestValue = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < series.length; i += 1) {
        if (series[i] > bestValue) {
            bestValue = series[i];
            bestIndex = i;
        }
    }
    return bestIndex;
}
function peakIndexParabolicRefine(series, peakIndex) {
    if (peakIndex <= 0 || peakIndex >= series.length - 1)
        return peakIndex;
    const left = series[peakIndex - 1];
    const mid = series[peakIndex];
    const right = series[peakIndex + 1];
    const denominator = left - (2 * mid) + right;
    if (Math.abs(denominator) <= 1e-9)
        return peakIndex;
    const delta = 0.5 * (left - right) / denominator;
    return peakIndex + Math.max(-1.5, Math.min(1.5, delta));
}
function f0HarmonicRefineFromCandidate(candidateHz, freqs, mags, settings) {
    if (!Number.isFinite(candidateHz))
        return null;
    const maxDivisor = Math.max(3, settings.hpsHarmonics * 2);
    let bestFrequency = null;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (let divisor = 1; divisor <= maxDivisor; divisor += 1) {
        const frequency = candidateHz / divisor;
        if (!Number.isFinite(frequency) || frequency < settings.f0Min || frequency > settings.f0Max)
            continue;
        const score = harmonicScoreResolve(freqs, mags, frequency);
        if (score > bestScore || (score === bestScore && (bestFrequency === null || frequency < bestFrequency))) {
            bestScore = score;
            bestFrequency = frequency;
        }
    }
    return bestFrequency;
}
export function fundamentalFrequencyHpsResolveFromSpectrum(freqs, mags, settings = NOTE_F0_HPS_SETTINGS) {
    if (!freqs.length || !mags.length)
        return null;
    const products = f0HpsCandidatesResolveFromSpectrum(freqs, mags, settings.hpsHarmonics);
    const peakIndex = peakIndexResolveFromSeries(products);
    const refinedIndex = peakIndexParabolicRefine(products, peakIndex);
    const binWidth = freqs.length > 1 ? Math.abs(freqs[1] - freqs[0]) : null;
    const peakFrequency = Number.isFinite(binWidth)
        ? (freqs[peakIndex] + (refinedIndex - peakIndex) * binWidth)
        : freqs[peakIndex];
    return f0HarmonicRefineFromCandidate(peakFrequency, freqs, mags, settings);
}
function octaveCorrectedFrequencyResolve(dominantFrequency, hpsFrequency) {
    if (Number.isFinite(dominantFrequency) && Number.isFinite(hpsFrequency)) {
        const dominant = dominantFrequency;
        const hps = hpsFrequency;
        if (dominant >= NOTE_F0_OCTAVE_CORRECTION_MIN_HZ
            && hps <= NOTE_F0_OCTAVE_CORRECTION_LOW_MAX_HZ
            && hps < (dominant * NOTE_F0_OCTAVE_CORRECTION_RATIO_MAX)) {
            return hps;
        }
    }
    if (Number.isFinite(dominantFrequency))
        return dominantFrequency;
    if (Number.isFinite(hpsFrequency))
        return hpsFrequency;
    return null;
}
async function noteF0EstimateFromSlice(slice) {
    const fftFactory = window.createFftEngine;
    if (typeof fftFactory !== "function")
        return null;
    const engine = fftFactory({});
    if (!engine?.magnitude)
        return null;
    const targetSampleRate = slice.sampleRate / Math.max(1, NOTE_F0_HPS_SETTINGS.hpsDownsample);
    const resampledWave = NOTE_F0_HPS_SETTINGS.hpsDownsample > 1
        ? Array.from(slice.samples).filter((_, index) => index % NOTE_F0_HPS_SETTINGS.hpsDownsample === 0)
        : Array.from(slice.samples);
    const spectrum = await engine.magnitude(resampledWave, targetSampleRate, { maxFreq: NOTE_F0_MAX_FREQ, window: "hann" });
    const freqs = Array.from(spectrum?.freqs || [], (v) => Number(v));
    const mags = Array.from(spectrum?.mags || [], (v) => Number(v));
    const dominantFrequency = fundamentalFrequencyResolveFromSpectrum(freqs, mags, NOTE_F0_MIN, NOTE_F0_MAX);
    const hpsFrequency = fundamentalFrequencyHpsResolveFromSpectrum(freqs, mags, NOTE_F0_HPS_SETTINGS);
    return octaveCorrectedFrequencyResolve(dominantFrequency, hpsFrequency);
}
export async function noteSegmentationBuildFromWave(wave, sampleRate) {
    const segmenter = window.ModalSegmentation?.segmentNotesFromBuffer;
    if (!segmenter || !wave || !sampleRate)
        return { slices: [], results: [] };
    const notes = segmenter(wave, sampleRate, NOTE_SEGMENTATION_OPTIONS);
    if (!Array.isArray(notes) || !notes.length)
        return { slices: [], results: [] };
    const slices = notes.map((note, idx) => ({
        id: note?.id ?? idx + 1,
        startMs: (note?.startIndex / sampleRate) * 1000,
        endMs: (note?.endIndex / sampleRate) * 1000,
        samples: note?.samples ? note.samples : Float32Array.from(wave.slice(note.startIndex, note.endIndex)),
        sampleRate,
    }));
    const results = [];
    for (const slice of slices) {
        const f0 = await noteF0EstimateFromSlice(slice);
        results.push({ id: slice.id, f0 });
    }
    return { slices, results };
}
