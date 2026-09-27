export type RingdownTap = { start: number; end: number };
export type NoiseReference = { startSec: number; endSec: number; amplitude: number };
export type ModalNoise = {
  status: "measured" | "variable" | "unavailable";
  amplitude: number | null;
  references: NoiseReference[];
};

export function estimateLocalModalNoise(args: {
  wave: ArrayLike<number>;
  sampleRate: number;
  taps: RingdownTap[];
  selectedStart: number;
  envelope: (samples: Float64Array) => Float64Array;
}): ModalNoise {
  if (!Number.isFinite(args.sampleRate) || args.sampleRate <= 0) return noiseUnavailable();
  const windows = quietWindows(args.wave.length, args.sampleRate, args.taps, args.selectedStart);
  const references = windows.flatMap(([start, end]) => {
    const samples = Float64Array.from({ length: end - start }, (_, i) => Number(args.wave[start + i]));
    if (!samples.every(Number.isFinite)) return [];
    const amplitude = stationaryNoiseAmplitude(args.envelope(samples), args.sampleRate);
    return amplitude === null ? [] : [{ startSec: start / args.sampleRate, endSec: end / args.sampleRate, amplitude }];
  }).slice(0, 4);
  if (!references.length) return noiseUnavailable();
  const amplitudes = references.map((reference) => reference.amplitude);
  const amplitude = Math.max(...amplitudes);
  return { status: amplitude / Math.min(...amplitudes) > 2 ? "variable" : "measured", amplitude, references };
}

export function stationaryNoiseAmplitude(envelope: ArrayLike<number>, sampleRate: number): number | null {
  const trim = Math.round(sampleRate * 0.12);
  const interior = Array.from(envelope).slice(trim, -trim);
  if (interior.length < sampleRate * 0.25 || !interior.every(Number.isFinite)) return null;
  const quarters = quarterLevels(interior);
  const median = percentile(interior, 0.5);
  if (median <= 1e-10 || Math.min(...quarters) <= 0) return null;
  if (Math.max(...quarters) / Math.min(...quarters) > 1.8) return null;
  if (percentile(interior, 0.95) / median > 3) return null;
  const consistentlyFalling = quarters.slice(1).every((level, i) => level < quarters[i]);
  if (consistentlyFalling && quarters[0] / quarters[3] > 1.2) return null;
  return percentile(interior, 0.75);
}

function quietWindows(length: number, sampleRate: number, taps: RingdownTap[], selected: number) {
  const guard = Math.ceil(sampleRate * 0.1);
  const width = Math.ceil(sampleRate * 0.6);
  const valid = taps.filter((tap) => Number.isFinite(tap.start) && Number.isFinite(tap.end) && tap.end > tap.start)
    .sort((left, right) => left.start - right.start);
  if (!valid.length) return [];
  const windows: [number, number][] = [];
  let previousEnd = 0;
  for (const tap of [...valid, { start: length, end: length }]) {
    const start = Math.max(previousEnd + guard, selected - 8 * sampleRate, 0);
    const end = Math.min(tap.start - guard, selected + 8 * sampleRate, length);
    for (let offset = Math.ceil(start); offset + width <= end; offset += width) windows.push([offset, offset + width]);
    previousEnd = Math.max(previousEnd, tap.end);
  }
  return windows.sort((a, b) => Math.abs(a[0] - selected) - Math.abs(b[0] - selected)).slice(0, 16);
}

function quarterLevels(values: number[]) {
  const quarter = Math.floor(values.length / 4);
  return Array.from({ length: 4 }, (_, i) => percentile(values.slice(i * quarter, (i + 1) * quarter), 0.5));
}

function percentile(values: number[], fraction: number) {
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) * fraction)] ?? 0;
}

function noiseUnavailable(): ModalNoise {
  return { status: "unavailable", amplitude: null, references: [] };
}
