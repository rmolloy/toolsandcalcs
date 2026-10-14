#!/usr/bin/env node

function stdinTextRead() {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
}

function browserGlobalsInstall() {
  globalThis.window = globalThis;
  globalThis.FFTState = globalThis.FFTState || {};
  globalThis.FFTUtils = globalThis.FFTUtils || {
    COLOR_ORANGE: "#f59e0b",
    deviationColor: () => "#64748b",
    freqToNoteCents: (freq) => ({
      name: "",
      cents: "",
      centsNum: null,
      midi: Number.isFinite(freq) ? 69 + 12 * Math.log2(freq / 440) : null,
    }),
  };
}

function numbersFrom(values) {
  return Array.from(values || [], (value) => Number(value));
}

function spectrumForJson(spectrum) {
  if (!spectrum) return null;
  return {
    freqs: numbersFrom(spectrum.freqs),
    mags: numbersFrom(spectrum.mags),
    dbs: numbersFrom(spectrum.dbs),
    maxDb: Number.isFinite(spectrum.maxDb) ? Number(spectrum.maxDb) : null,
    floorDb: Number.isFinite(spectrum.floorDb) ? Number(spectrum.floorDb) : null,
    tapsUsed: Number.isFinite(spectrum.tapsUsed) ? Number(spectrum.tapsUsed) : null,
  };
}

browserGlobalsInstall();
await import("../modal_frequency_shared/fft_plot.js");
await import("../modal_frequency_shared/fft_engine.js");

const { detectTaps } = await import("./dist/resonance_reader/resonate_transient_detection.js");
const { averageTapSpectra } = await import("./dist/resonance_reader/resonate_tap_spectra.js");

const request = JSON.parse(await stdinTextRead());
const sampleRate = Number(request.sampleRate);
const wave = Float32Array.from(request.wave || [], (value) => Number(value));
const engine = globalThis.createFftEngine();
const fullFileRaw = await engine.magnitude(wave, sampleRate, {
  window: "hann",
  maxFreq: 2000,
  minFftSamples: 32768,
});
const fullFile = globalThis.FFTPlot.applyDb(fullFileRaw);
const taps = detectTaps(wave, sampleRate);
const detectedTapAverage = await averageTapSpectra(wave, sampleRate, taps, engine);

process.stdout.write(JSON.stringify({
  sampleRate,
  fullFile: spectrumForJson(fullFile),
  taps,
  detectedTapAverage: spectrumForJson(detectedTapAverage),
}));
