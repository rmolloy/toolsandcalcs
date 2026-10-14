(() => {
  type WindowType = "hann" | "hamming" | "rect";

  interface SpectrogramOptions {
    fftSize?: number;
    hopSize?: number;
    maxFreq?: number;
    window?: WindowType;
  }

  interface SpectrogramResult {
    freqs: Float64Array;
    times: Float64Array;
    mags: Float64Array[];
  }

  interface FftEngineLike {
    magnitude: (
      wave: Float64Array,
      sampleRate: number,
      opts: { maxFreq?: number; window?: WindowType }
    ) => Promise<{ freqs: Float64Array; mags: Float64Array }>;
  }

  async function computeSpectrogram(
    wave: Float64Array,
    sampleRate: number,
    fftEngine: FftEngineLike,
    opts: SpectrogramOptions = {},
  ): Promise<SpectrogramResult> {
    const N = opts.fftSize ?? 2048;
    const hop = opts.hopSize ?? (N >> 1);
    const maxFreq = opts.maxFreq ?? 1000;
    const window: WindowType = opts.window ?? "hann";

    const frames: Float64Array[] = [];
    const times: number[] = [];
    let freqs: Float64Array | null = null;

    for (let start = 0; start + N <= wave.length; start += hop) {
      const slice = wave.slice(start, start + N);
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

  type ModalSpectrogramApi = { computeSpectrogram: typeof computeSpectrogram };
  const scope = (typeof window !== "undefined" ? window : globalThis) as typeof globalThis & {
    ModalSpectrogram?: ModalSpectrogramApi;
  };

  scope.ModalSpectrogram = {
    computeSpectrogram,
  };
})();
