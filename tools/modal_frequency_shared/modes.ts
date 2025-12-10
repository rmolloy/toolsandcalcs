// @ts-nocheck
(() => {
  const MODE_DEFAULTS = {
    air: { low: 75, high: 115 },
    top: { low: 150, high: 205 },
    back: { low: 210, high: 260 },
  };

  const MODE_COLORS = {
    air: "#56B4E9",
    top: "#E69F00",
    back: "#009E73",
  };

  function modeLabel(key) {
    if (key === "air") return "Air";
    if (key === "top") return "Top";
    if (key === "back") return "Back";
    return key;
  }

  function normalizeRange(low, high, fallback) {
    const safeLow = Number.isFinite(low) ? low : fallback?.low;
    const safeHigh = Number.isFinite(high) ? high : fallback?.high;
    const lo = Number.isFinite(safeLow) ? safeLow : 0;
    const hi = Number.isFinite(safeHigh) ? safeHigh : lo;
    return {
      low: Math.min(lo, hi),
      high: Math.max(lo, hi),
    };
  }

  function readModeRanges(config) {
    const ranges = {};
    Object.entries(config).forEach(([key, ids]) => {
      const defaults = MODE_DEFAULTS[key];
      const lowEl = document.getElementById(ids.low);
      const highEl = document.getElementById(ids.high);
      const lowVal = lowEl ? Number(lowEl.value) : defaults?.low;
      const highVal = highEl ? Number(highEl.value) : defaults?.high;
      const band = normalizeRange(lowVal, highVal, defaults);
      ranges[key] = { ...band, peak: null };
    });
    return ranges;
  }

  function buildModeAnnotations(modeRefs) {
    const anns = [];
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

  function buildModeAnnotationsFromSpectrum(modeRefs, spectrum) {
    if (!spectrum?.freqs?.length) return [];
    const dbs = spectrum.dbs?.length ? spectrum.dbs : spectrum.mags || [];
    const anns = [];
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

  window.ModalModes = {
    MODE_DEFAULTS,
    MODE_COLORS,
    modeLabel,
    normalizeRange,
    readModeRanges,
    buildModeAnnotations,
    buildModeAnnotationsFromSpectrum,
  };
})();
