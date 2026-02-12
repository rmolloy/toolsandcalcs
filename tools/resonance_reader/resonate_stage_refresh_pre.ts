import type { SignalBoundary } from "./resonate_signal_boundary.js";

export async function stageRefreshPreRun(args: {
  wave: Float32Array | number[];
  sampleRate: number;
  fftMaxHz: number;
  signal: SignalBoundary;
  fftFactory: (opts: Record<string, unknown>) => {
    magnitude: (
      wave: Float32Array | number[],
      sampleRate: number,
      opts: { maxFreq: number; window: string },
    ) => Promise<{ freqs: number[]; mags: number[]; dbs: number[] }>;
  };
}) {
  const engine = args.fftFactory({});
  const taps = args.signal.detectTaps(args.wave, args.sampleRate);
  let spectrum = await engine.magnitude(args.wave, args.sampleRate, { maxFreq: args.fftMaxHz, window: "hann" });
  if (taps.length) {
    const averaged = await args.signal.averageTapSpectra(args.wave, args.sampleRate, taps, engine as any);
    if (averaged?.freqs?.length) {
      spectrum = { freqs: averaged.freqs, mags: averaged.mags, dbs: averaged.dbs };
    }
  }
  return { spectrum, taps };
}
