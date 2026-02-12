type NoteSlice = {
  id: number;
  startMs: number;
  endMs: number;
  samples: Float32Array;
  sampleRate: number;
};

type NoteResult = {
  id: number;
  f0: number | null;
};

type NoteSegmentation = {
  slices: NoteSlice[];
  results: NoteResult[];
};

const NOTE_F0_MIN = 60;
const NOTE_F0_MAX = 450;
const NOTE_F0_MAX_FREQ = 1000;

function peakFrequencyFindInBand(freqs: number[], mags: number[], minHz: number, maxHz: number) {
  let bestIdx = -1;
  let bestVal = -Infinity;
  for (let i = 0; i < freqs.length; i += 1) {
    const f = freqs[i];
    if (!Number.isFinite(f) || f < minHz || f > maxHz) continue;
    const v = mags[i];
    if (!Number.isFinite(v)) continue;
    if (v > bestVal) {
      bestVal = v;
      bestIdx = i;
    }
  }
  if (bestIdx < 0) return null;
  return freqs[bestIdx] ?? null;
}

async function noteF0EstimateFromSlice(slice: NoteSlice) {
  const fftFactory = (window as any).createFftEngine;
  if (typeof fftFactory !== "function") return null;
  const engine = fftFactory({});
  if (!engine?.magnitude) return null;
  const spectrum = await engine.magnitude(slice.samples, slice.sampleRate, { maxFreq: NOTE_F0_MAX_FREQ, window: "hann" });
  const freqs = Array.from(spectrum?.freqs || [], (v) => Number(v));
  const mags = Array.from(spectrum?.mags || [], (v) => Number(v));
  const peak = peakFrequencyFindInBand(freqs, mags, NOTE_F0_MIN, NOTE_F0_MAX);
  return Number.isFinite(peak) ? (peak as number) : null;
}

export async function noteSegmentationBuildFromWave(
  wave: Float32Array | number[],
  sampleRate: number,
): Promise<NoteSegmentation> {
  const segmenter = (window as any).ModalSegmentation?.segmentNotesFromBuffer;
  if (!segmenter || !wave || !sampleRate) return { slices: [], results: [] };
  const notes = segmenter(wave as ArrayLike<number>, sampleRate, {});
  if (!Array.isArray(notes) || !notes.length) return { slices: [], results: [] };
  const slices = notes.map((note: any, idx: number) => ({
    id: note?.id ?? idx + 1,
    startMs: (note?.startIndex / sampleRate) * 1000,
    endMs: (note?.endIndex / sampleRate) * 1000,
    samples: note?.samples ? (note.samples as Float32Array) : Float32Array.from(wave.slice(note.startIndex, note.endIndex)),
    sampleRate,
  }));
  const results: NoteResult[] = [];
  for (const slice of slices) {
    const f0 = await noteF0EstimateFromSlice(slice);
    results.push({ id: slice.id, f0 });
  }
  return { slices, results };
}
