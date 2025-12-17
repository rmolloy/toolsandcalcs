(() => {
  type ModeKey = "air" | "top" | "back" | string;

  interface ModeBand {
    low: number;
    high: number;
    peak?: number | null;
  }

  const MODE_DEFAULTS: Record<ModeKey, ModeBand> = {
    air: { low: 75, high: 115 },
    top: { low: 150, high: 205 },
    back: { low: 210, high: 260 },
  };

  const MODE_COLORS: Record<ModeKey, string> = {
    air: "#56B4E9",
    top: "#E69F00",
    back: "#009E73",
  };

  function modeLabel(key: ModeKey): string {
    if (key === "air") return "Air";
    if (key === "top") return "Top";
    if (key === "back") return "Back";
    return key;
  }

  function normalizeRange(low: number | null | undefined, high: number | null | undefined, fallback?: ModeBand): ModeBand {
    const safeLow = Number.isFinite(low) ? low : fallback?.low;
    const safeHigh = Number.isFinite(high) ? high : fallback?.high;
    const lo = Number.isFinite(safeLow) ? (safeLow as number) : 0;
    const hi = Number.isFinite(safeHigh) ? (safeHigh as number) : lo;
    return {
      low: Math.min(lo, hi),
      high: Math.max(lo, hi),
    };
  }

  function readModeRanges(config: Record<string, { low: string; high: string }>): Record<ModeKey, ModeBand & { peak: number | null }> {
    const ranges: Record<ModeKey, ModeBand & { peak: number | null }> = {};
    Object.entries(config).forEach(([key, ids]) => {
      const defaults = MODE_DEFAULTS[key];
      const lowEl = document.getElementById(ids.low) as HTMLInputElement | null;
      const highEl = document.getElementById(ids.high) as HTMLInputElement | null;
      const lowVal = lowEl ? Number(lowEl.value) : defaults?.low;
      const highVal = highEl ? Number(highEl.value) : defaults?.high;
      const band = normalizeRange(lowVal, highVal, defaults);
      ranges[key] = { ...band, peak: null };
    });
    return ranges;
  }

  interface ModeAnnotation {
    freq: number;
    label: string;
    color?: string;
  }

  function buildModeAnnotations(modeRefs: Record<ModeKey, ModeBand | null | undefined>): ModeAnnotation[] {
    const anns: ModeAnnotation[] = [];
    Object.entries(modeRefs).forEach(([key, band]) => {
      if (!band) return;
      const center = (band.low + band.high) / 2;
      if (!Number.isFinite(center)) return;
      anns.push({
        freq: center,
        label: modeLabel(key),
        color: MODE_COLORS[key] || undefined,
      });
    });
    return anns;
  }

  interface SpectrumLike {
    freqs: number[] | Float64Array;
    dbs?: number[] | Float64Array;
    mags?: number[] | Float64Array;
  }

  function buildModeAnnotationsFromSpectrum(modeRefs: Record<ModeKey, ModeBand | null | undefined>, spectrum: SpectrumLike): ModeAnnotation[] {
    if (!spectrum?.freqs?.length) return [];
    const dbs = spectrum.dbs?.length ? spectrum.dbs : spectrum.mags || [];
    const anns: ModeAnnotation[] = [];
    Object.entries(modeRefs).forEach(([key, band]) => {
      if (!band) return;
      let bestIdx = -1;
      let bestDb = -Infinity;
      spectrum.freqs.forEach((f, idx) => {
        if (f >= band.low && f <= band.high && dbs[idx] > bestDb) {
          bestDb = dbs[idx];
          bestIdx = idx;
        }
      });
      if (bestIdx >= 0) {
        const freq = spectrum.freqs[bestIdx];
        anns.push({
          freq,
          label: modeLabel(key),
          color: MODE_COLORS[key] || undefined,
        });
      }
    });
    return anns;
  }

  type ModalModesApi = {
    MODE_DEFAULTS: typeof MODE_DEFAULTS;
    MODE_COLORS: typeof MODE_COLORS;
    modeLabel: typeof modeLabel;
    normalizeRange: typeof normalizeRange;
    readModeRanges: typeof readModeRanges;
    buildModeAnnotations: typeof buildModeAnnotations;
    buildModeAnnotationsFromSpectrum: typeof buildModeAnnotationsFromSpectrum;
  };

  const scope = (typeof window !== "undefined" ? window : globalThis) as typeof globalThis & {
    ModalModes?: ModalModesApi;
  };

  scope.ModalModes = {
    MODE_DEFAULTS,
    MODE_COLORS,
    modeLabel,
    normalizeRange,
    readModeRanges,
    buildModeAnnotations,
    buildModeAnnotationsFromSpectrum,
  };
})();
