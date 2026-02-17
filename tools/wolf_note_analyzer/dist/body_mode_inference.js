import { MODE_BANDS, appState, fftEngine, renderBodyModesUi } from "./state.js";
import { WolfNoteCore } from "./core.js";
const { analyzeModes, estimateQFromDb } = WolfNoteCore;
function canInferBodyModesFromNoteSlice() {
    const hasOverrides = Object.values(appState.modeOverrides).some((overrideValue) => Number.isFinite(overrideValue));
    return !hasOverrides;
}
async function computeNoteSpectrumDb(noteSlice) {
    var _a;
    const spectrum = await fftEngine.magnitude(noteSlice.wave, noteSlice.sampleRate, { maxFreq: 600, window: "hann" });
    return ((_a = window.FFTPlot) === null || _a === void 0 ? void 0 : _a.applyDb) ? window.FFTPlot.applyDb(spectrum) : spectrum;
}
function hasBodyModePeakFreq(bodyMode) {
    return Number.isFinite(bodyMode === null || bodyMode === void 0 ? void 0 : bodyMode.peakFreq);
}
function shouldReplaceBodyModesWithInferred() {
    const hasDetectedModes = Object.values(appState.bodyModes).some(hasBodyModePeakFreq);
    return !hasDetectedModes;
}
function setBodyModesToInferred(inferred) {
    appState.bodyModes = inferred;
}
function listMissingBodyModeKeys(inferred) {
    return Object.keys(inferred).filter((modeKey) => !hasBodyModePeakFreq(appState.bodyModes[modeKey]));
}
function assignBodyModeFromInferred(modeKey, inferred) {
    appState.bodyModes[modeKey] = inferred[modeKey];
}
function mergeMissingBodyModes(inferred) {
    const missingModeKeys = listMissingBodyModeKeys(inferred);
    missingModeKeys.forEach((modeKey) => assignBodyModeFromInferred(modeKey, inferred));
}
function mergeInferredBodyModes(inferred) {
    if (shouldReplaceBodyModesWithInferred())
        return setBodyModesToInferred(inferred);
    return mergeMissingBodyModes(inferred);
}
function isSpectrumDbAvailable(spectrum) {
    var _a;
    return Boolean((_a = spectrum === null || spectrum === void 0 ? void 0 : spectrum.freqs) === null || _a === void 0 ? void 0 : _a.length);
}
function spectrumFreqsArrayFromSpectrum(spectrum) {
    return Array.from(spectrum.freqs);
}
function spectrumDbValuesFromSpectrum(spectrum) {
    var _a;
    const dbs = ((_a = spectrum.dbs) === null || _a === void 0 ? void 0 : _a.length) ? spectrum.dbs : spectrum.mags || [];
    return Array.from(dbs);
}
function spectrumModeInputsFromSpectrum(spectrum) {
    const freqs = spectrumFreqsArrayFromSpectrum(spectrum);
    const dbValues = spectrumDbValuesFromSpectrum(spectrum);
    return { freqs, dbs: dbValues };
}
function assignBodyModeFromModeResult(bodyModesByBand, modeResult) {
    bodyModesByBand[modeResult.mode] = { ...modeResult, q: null, source: "Inferred" };
}
function bodyModesByBandFromModeResults(modes) {
    const bodyModesByBand = {};
    modes.forEach((modeResult) => assignBodyModeFromModeResult(bodyModesByBand, modeResult));
    return bodyModesByBand;
}
function inferBodyModesByBandFromValidSpectrum(spectrum) {
    const modeInputs = spectrumModeInputsFromSpectrum(spectrum);
    const modes = analyzeModes(modeInputs, MODE_BANDS);
    return bodyModesByBandFromModeResults(modes);
}
function inferBodyModesByBandFromSpectrum(spectrum) {
    if (!isSpectrumDbAvailable(spectrum))
        return null;
    return inferBodyModesByBandFromValidSpectrum(spectrum);
}
function applyInferredBodyModesIfPresent(inferred) {
    if (!inferred)
        return;
    mergeInferredBodyModes(inferred);
    renderBodyModesUi();
}
function applyInferredBodyModesForSpectrumDb(spectrumDb) {
    const inferred = inferBodyModesByBandFromSpectrum(spectrumDb);
    applyInferredBodyModesIfPresent(inferred);
}
function bodyModeQFromTapMode(freqs, dbs, mode) {
    if (!Number.isFinite(mode === null || mode === void 0 ? void 0 : mode.peakFreq))
        return null;
    return estimateQFromDb(freqs, dbs, { freq: mode.peakFreq, db: mode.peakDb });
}
function bodyModeFromTapMode(freqs, dbs, mode) {
    const q = bodyModeQFromTapMode(freqs, dbs, mode);
    return { ...mode, q, source: "Detected" };
}
function bodyModesByBandFromTapModes(freqs, dbs, modes) {
    const bodyModesByBand = {};
    modes.forEach((mode) => {
        bodyModesByBand[mode.mode] = bodyModeFromTapMode(freqs, dbs, mode);
    });
    return bodyModesByBand;
}
export function inferBodyModesFromTapSpectrum(freqs, dbs) {
    const modes = analyzeModes({ freqs, dbs }, MODE_BANDS);
    return bodyModesByBandFromTapModes(freqs, dbs, modes);
}
async function computeSpectrumDbAndApplyInference(noteSlice) {
    const spectrumDb = await computeNoteSpectrumDb(noteSlice);
    applyInferredBodyModesForSpectrumDb(spectrumDb);
    return spectrumDb;
}
async function computeSpectrumDbWhenInferenceAllowed(noteSlice) {
    if (!canInferBodyModesFromNoteSlice())
        return null;
    return computeSpectrumDbAndApplyInference(noteSlice);
}
export async function computeSpectrumDbAndApplyInferredBodyModes(noteSlice) {
    return computeSpectrumDbWhenInferenceAllowed(noteSlice);
}
if (typeof window !== "undefined") {
    window.computeSpectrumDbAndApplyInferredBodyModes = computeSpectrumDbAndApplyInferredBodyModes;
}
