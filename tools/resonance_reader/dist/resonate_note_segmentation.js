const NOTE_F0_MIN = 60;
const NOTE_F0_MAX = 450;
const NOTE_F0_MAX_FREQ = 1000;
function peakFrequencyFindInBand(freqs, mags, minHz, maxHz) {
    let bestIdx = -1;
    let bestVal = -Infinity;
    for (let i = 0; i < freqs.length; i += 1) {
        const f = freqs[i];
        if (!Number.isFinite(f) || f < minHz || f > maxHz)
            continue;
        const v = mags[i];
        if (!Number.isFinite(v))
            continue;
        if (v > bestVal) {
            bestVal = v;
            bestIdx = i;
        }
    }
    if (bestIdx < 0)
        return null;
    return freqs[bestIdx] ?? null;
}
async function noteF0EstimateFromSlice(slice) {
    const fftFactory = window.createFftEngine;
    if (typeof fftFactory !== "function")
        return null;
    const engine = fftFactory({});
    if (!engine?.magnitude)
        return null;
    const spectrum = await engine.magnitude(slice.samples, slice.sampleRate, { maxFreq: NOTE_F0_MAX_FREQ, window: "hann" });
    const freqs = Array.from(spectrum?.freqs || [], (v) => Number(v));
    const mags = Array.from(spectrum?.mags || [], (v) => Number(v));
    const peak = peakFrequencyFindInBand(freqs, mags, NOTE_F0_MIN, NOTE_F0_MAX);
    return Number.isFinite(peak) ? peak : null;
}
export async function noteSegmentationBuildFromWave(wave, sampleRate) {
    const segmenter = window.ModalSegmentation?.segmentNotesFromBuffer;
    if (!segmenter || !wave || !sampleRate)
        return { slices: [], results: [] };
    const notes = segmenter(wave, sampleRate, {});
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
