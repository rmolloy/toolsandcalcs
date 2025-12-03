// @ts-nocheck
(() => {
  interface SpectrogramOptions {
    fftSize?: number;
    hopSize?: number;
    maxFreq?: number;
    window?: "hann" | "hamming" | "rect";
  }

  interface SpectrogramResult {
    freqs: Float64Array;
    times: Float64Array;
    mags: Float64Array[];
  }

  async function computeSpectrogram(
    wave: Float64Array,
    sampleRate: number,
    fftEngine: any,
    opts: SpectrogramOptions = {}
  ): Promise<SpectrogramResult> {
    const N = opts.fftSize ?? 2048;
    const hop = opts.hopSize ?? (N >> 1);
    const maxFreq = opts.maxFreq ?? 1000;
    const window = opts.window ?? "hann";

    const frames: Float64Array[] = [];
    const times: number[] = [];
    let freqs: Float64Array | null = null;

    for (let start = 0; start + N <= wave.length; start += hop) {
      const slice = wave.slice(start, start + N);
      // fftEngine.magnitude is async; honor that to keep behavior consistent.
      const spec = await fftEngine.magnitude(slice, sampleRate, { maxFreq, window });
      if (!freqs) freqs = spec.freqs;
      frames.push(spec.mags);
      times.push(start / sampleRate);
    }

    return {
      freqs: freqs ?? new Float64Array(),
      times: new Float64Array(times),
      mags: frames,
    };
  }

  window.ModalSpectrogram = {
    computeSpectrogram,
  };
})();
