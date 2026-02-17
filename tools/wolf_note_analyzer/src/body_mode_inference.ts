import { MODE_BANDS, appState, fftEngine, renderBodyModesUi } from "./state.js";
import { WolfNoteCore } from "./core.js";

const { analyzeModes, estimateQFromDb } = WolfNoteCore;

function canInferBodyModesFromNoteSlice(): boolean {
  const hasOverrides = Object.values(appState.modeOverrides).some((overrideValue) =>
    Number.isFinite(overrideValue)
  );
  return !hasOverrides;
}

async function computeNoteSpectrumDb(noteSlice: any) {
  const spectrum = await fftEngine.magnitude(noteSlice.wave, noteSlice.sampleRate, { maxFreq: 600, window: "hann" });
  return (window as any).FFTPlot?.applyDb ? (window as any).FFTPlot.applyDb(spectrum) : spectrum;
}

function hasBodyModePeakFreq(bodyMode: any): boolean {
  return Number.isFinite(bodyMode?.peakFreq);
}

function shouldReplaceBodyModesWithInferred(): boolean {
  const hasDetectedModes = Object.values(appState.bodyModes).some(hasBodyModePeakFreq);
  return !hasDetectedModes;
}

function setBodyModesToInferred(inferred: any) {
  appState.bodyModes = inferred;
}

function listMissingBodyModeKeys(inferred: any) {
  return Object.keys(inferred).filter((modeKey) => !hasBodyModePeakFreq(appState.bodyModes[modeKey]));
}

function assignBodyModeFromInferred(modeKey: string, inferred: any) {
  appState.bodyModes[modeKey] = inferred[modeKey];
}

function mergeMissingBodyModes(inferred: any) {
  const missingModeKeys = listMissingBodyModeKeys(inferred);
  missingModeKeys.forEach((modeKey) => assignBodyModeFromInferred(modeKey, inferred));
}

function mergeInferredBodyModes(inferred: any) {
  if (shouldReplaceBodyModesWithInferred()) return setBodyModesToInferred(inferred);
  return mergeMissingBodyModes(inferred);
}

function isSpectrumDbAvailable(spectrum: any): boolean {
  return Boolean(spectrum?.freqs?.length);
}

function spectrumFreqsArrayFromSpectrum(spectrum: any) {
  return Array.from(spectrum.freqs as ArrayLike<number>);
}

function spectrumDbValuesFromSpectrum(spectrum: any) {
  const dbs = spectrum.dbs?.length ? spectrum.dbs : spectrum.mags || [];
  return Array.from(dbs as ArrayLike<number>);
}

function spectrumModeInputsFromSpectrum(spectrum: any) {
  const freqs = spectrumFreqsArrayFromSpectrum(spectrum);
  const dbValues = spectrumDbValuesFromSpectrum(spectrum);
  return { freqs, dbs: dbValues };
}

function assignBodyModeFromModeResult(bodyModesByBand: any, modeResult: any) {
  bodyModesByBand[modeResult.mode] = { ...modeResult, q: null, source: "Inferred" };
}

function bodyModesByBandFromModeResults(modes: any) {
  const bodyModesByBand: any = {};
  modes.forEach((modeResult: any) => assignBodyModeFromModeResult(bodyModesByBand, modeResult));
  return bodyModesByBand;
}

function inferBodyModesByBandFromValidSpectrum(spectrum: any) {
  const modeInputs = spectrumModeInputsFromSpectrum(spectrum);
  const modes = analyzeModes(modeInputs, MODE_BANDS);
  return bodyModesByBandFromModeResults(modes);
}

function inferBodyModesByBandFromSpectrum(spectrum: any) {
  if (!isSpectrumDbAvailable(spectrum)) return null;
  return inferBodyModesByBandFromValidSpectrum(spectrum);
}

function applyInferredBodyModesIfPresent(inferred: any) {
  if (!inferred) return;
  mergeInferredBodyModes(inferred);
  renderBodyModesUi();
}

function applyInferredBodyModesForSpectrumDb(spectrumDb: any) {
  const inferred = inferBodyModesByBandFromSpectrum(spectrumDb);
  applyInferredBodyModesIfPresent(inferred);
}

function bodyModeQFromTapMode(freqs: number[], dbs: number[], mode: any) {
  if (!Number.isFinite(mode?.peakFreq)) return null;
  return estimateQFromDb(freqs, dbs, { freq: mode.peakFreq, db: mode.peakDb });
}

function bodyModeFromTapMode(freqs: number[], dbs: number[], mode: any) {
  const q = bodyModeQFromTapMode(freqs, dbs, mode);
  return { ...mode, q, source: "Detected" };
}

function bodyModesByBandFromTapModes(freqs: number[], dbs: number[], modes: any) {
  const bodyModesByBand: any = {};
  modes.forEach((mode: any) => {
    bodyModesByBand[mode.mode] = bodyModeFromTapMode(freqs, dbs, mode);
  });
  return bodyModesByBand;
}

export function inferBodyModesFromTapSpectrum(freqs: number[], dbs: number[]) {
  const modes = analyzeModes({ freqs, dbs }, MODE_BANDS);
  return bodyModesByBandFromTapModes(freqs, dbs, modes);
}

async function computeSpectrumDbAndApplyInference(noteSlice: any) {
  const spectrumDb = await computeNoteSpectrumDb(noteSlice);
  applyInferredBodyModesForSpectrumDb(spectrumDb);
  return spectrumDb;
}

async function computeSpectrumDbWhenInferenceAllowed(noteSlice: any) {
  if (!canInferBodyModesFromNoteSlice()) return null;
  return computeSpectrumDbAndApplyInference(noteSlice);
}

export async function computeSpectrumDbAndApplyInferredBodyModes(noteSlice: any) {
  return computeSpectrumDbWhenInferenceAllowed(noteSlice);
}

if (typeof window !== "undefined") {
  (window as any).computeSpectrumDbAndApplyInferredBodyModes = computeSpectrumDbAndApplyInferredBodyModes;
}
