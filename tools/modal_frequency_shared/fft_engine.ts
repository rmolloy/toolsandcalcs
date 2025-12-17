(() => {
  type WindowType = "hann" | "hamming" | "rect";

  interface FftOptions {
    window?: WindowType;
    maxFreq?: number;
  }

  interface FftResult {
    freqs: Float64Array;
    mags: Float64Array;
  }

  interface FftEngineOpts {
    wasmUrl?: string | null;
  }

  class JsFftFallback {
    static applyWindow(buffer: ArrayLike<number>, windowType: WindowType): Float64Array {
      const n = buffer.length;
      if (windowType === "rect") return buffer instanceof Float64Array ? buffer : Float64Array.from(buffer);
      const out = new Float64Array(n);
      for (let i = 0; i < n; i += 1) {
        const frac = i / (n - 1 || 1);
        let w = 1;
        if (windowType === "hann") {
          w = 0.5 * (1 - Math.cos(2 * Math.PI * frac));
        } else if (windowType === "hamming") {
          w = 0.54 - 0.46 * Math.cos(2 * Math.PI * frac);
        }
        out[i] = buffer[i] * w;
      }
      return out;
    }

    static fftRadix2(real: Float64Array, imag: Float64Array): void {
      const n = real.length;
      if ((n & (n - 1)) !== 0) return;

      let j = 0;
      for (let i = 0; i < n; i += 1) {
        if (i < j) {
          [real[i], real[j]] = [real[j], real[i]];
          [imag[i], imag[j]] = [imag[j], imag[i]];
        }
        let m = n >> 1;
        while (m >= 1 && j >= m) {
          j -= m;
          m >>= 1;
        }
        j += m;
      }

      for (let len = 2; len <= n; len <<= 1) {
        const ang = (-2 * Math.PI) / len;
        const wlenCos = Math.cos(ang);
        const wlenSin = Math.sin(ang);
        for (let i = 0; i < n; i += len) {
          let wCos = 1;
          let wSin = 0;
          for (let k = 0; k < len / 2; k += 1) {
            const uReal = real[i + k];
            const uImag = imag[i + k];
            const vReal = real[i + k + len / 2] * wCos - imag[i + k + len / 2] * wSin;
            const vImag = real[i + k + len / 2] * wSin + imag[i + k + len / 2] * wCos;

            real[i + k] = uReal + vReal;
            imag[i + k] = uImag + vImag;
            real[i + k + len / 2] = uReal - vReal;
            imag[i + k + len / 2] = uImag - vImag;

            const nextCos = wCos * wlenCos - wSin * wlenSin;
            wSin = wCos * wlenSin + wSin * wlenCos;
            wCos = nextCos;
          }
        }
      }
    }

    static magnitudeSpectrum(wave: ArrayLike<number>, sampleRate: number, opts: FftOptions = {}): FftResult {
      const { window = "hann", maxFreq = 1200 } = opts;
      const padded = 1 << Math.ceil(Math.log2(wave.length * 2));
      const real = new Float64Array(padded);
      const imag = new Float64Array(padded);
      const windowed = JsFftFallback.applyWindow(wave, window);
      real.set(windowed);
      JsFftFallback.fftRadix2(real, imag);

      const nyquist = sampleRate / 2;
      const limit = Math.min(Math.floor((maxFreq / nyquist) * (padded / 2)), padded / 2);
      const scale = 2 / padded; // normalize positive-frequency magnitudes
      const freqs = new Float64Array(limit - 1);
      const mags = new Float64Array(limit - 1);
      for (let k = 1; k < limit; k += 1) {
        freqs[k - 1] = (k * sampleRate) / padded;
        mags[k - 1] = Math.hypot(real[k], imag[k]) * scale;
      }
      return { freqs, mags };
    }
  }

  class KissFftWasm {
    wasmUrl: string | null;
    ready: boolean;
    instance: WebAssembly.Instance | null;

    constructor({ wasmUrl }: { wasmUrl?: string | null }) {
      this.wasmUrl = wasmUrl ?? null;
      this.ready = false;
      this.instance = null;
    }

    async load(): Promise<this> {
      if (!this.wasmUrl) throw new Error("No wasmUrl provided for KissFFT");
      const response = await fetch(this.wasmUrl);
      const bytes = await response.arrayBuffer();
      const { instance } = await WebAssembly.instantiate(bytes, {});
      this.instance = instance;
      this.ready = true;
      // NOTE: Glue for actual KissFFT calls will be wired once the WASM binary is added.
      return this;
    }

    // Placeholder: real WASM bridge to be implemented when the binary is available.
    transform(): never {
      throw new Error("KissFFT WASM bridge not wired yet");
    }
  }

  class FftEngine {
    wasmUrl: string | null;
    wasm: KissFftWasm | null;
    useWasm: boolean;
    loadPromise: Promise<unknown> | null;

    constructor(opts: FftEngineOpts = {}) {
      this.wasmUrl = opts.wasmUrl ?? null;
      this.wasm = null;
      this.useWasm = Boolean(opts.wasmUrl);
      this.loadPromise = null;
    }

    async ensureLoaded(): Promise<boolean> {
      if (!this.useWasm) return false;
      if (!this.loadPromise) {
        this.wasm = new KissFftWasm({ wasmUrl: this.wasmUrl });
        this.loadPromise = this.wasm.load().catch((err) => {
          console.warn("[FFT] KissFFT WASM load failed; falling back to JS FFT.", err);
          this.useWasm = false;
          return false;
        });
      }
      await this.loadPromise;
      return this.useWasm && Boolean(this.wasm?.ready);
    }

    async magnitude(wave: ArrayLike<number>, sampleRate: number, opts: FftOptions = {}): Promise<FftResult> {
      const useWasm = await this.ensureLoaded();
      if (useWasm && this.wasm) {
        try {
          // When wired, will return the WASM FFT result.
          return await (this.wasm as any).transform(wave, sampleRate, opts);
        } catch (err) {
          console.warn("[FFT] KissFFT transform failed; using JS fallback.", err);
        }
      }
      return JsFftFallback.magnitudeSpectrum(wave, sampleRate, opts);
    }
  }

  type FftEngineApi = (opts?: FftEngineOpts) => FftEngine;
  const scope = (typeof window !== "undefined" ? window : globalThis) as typeof globalThis & {
    createFftEngine?: FftEngineApi;
  };

  scope.createFftEngine = function createFftEngine(opts?: FftEngineOpts) {
    return new FftEngine(opts);
  };
})();
