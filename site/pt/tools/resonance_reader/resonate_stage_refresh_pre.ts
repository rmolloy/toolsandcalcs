import type { SignalBoundary } from "./resonate_signal_boundary.js";
import { resonanceFftMinSamplesResolve, resonanceFftWindowResolve, resonanceTapAveragingEnabled } from "./resonate_debug_flags.js";

export async function stageRefreshPreRun(args: {
  wave: Float32Array | number[];
  sampleRate: number;
  fftMaxHz: number;
  allowTapAveraging?: boolean;
  signal: SignalBoundary;
  fftFactory: (opts: Record<string, unknown>) => {
    magnitude: (
      wave: Float32Array | number[],
      sampleRate: number,
      opts: { maxFreq: number; minFftSamples: number; window: string },
    ) => Promise<{ freqs: number[]; mags: number[]; dbs: number[] }>;
  };
}) {
  const engine = args.fftFactory({});
  const taps = args.signal.detectTaps(args.wave, args.sampleRate);
  const fftOptions = {
    maxFreq: args.fftMaxHz,
    minFftSamples: resonanceFftMinSamplesResolve(),
    window: resonanceFftWindowResolve(),
  };
  const directSpectrum = await engine.magnitude(args.wave, args.sampleRate, fftOptions);
  let spectrum = directSpectrum;
  if (tapAveragingAllowedForRefresh(args.allowTapAveraging) && taps.length && resonanceTapAveragingEnabled()) {
    const averaged = await args.signal.averageTapSpectra(args.wave, args.sampleRate, taps, engine as any);
    if (averaged?.freqs?.length) {
      spectrum = { freqs: averaged.freqs, mags: averaged.mags, dbs: averaged.dbs };
    }
  }
  return { directSpectrum, spectrum, taps };
}

function tapAveragingAllowedForRefresh(allowTapAveraging: boolean | undefined) {
  return allowTapAveraging !== false;
}
