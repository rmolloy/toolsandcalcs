import { noteAndCentsFromFreq } from "./resonate_mode_metrics.js";
import { resolveColorHexFromRole } from "./resonate_color_roles.js";
const CUSTOM_MEASUREMENT_KEY_PREFIX = "custom_";
const CUSTOM_MEASUREMENT_LABEL_PREFIX = "Custom";
const CUSTOM_MEASUREMENT_FALLBACK_FREQ_HZ = 180;
const CUSTOM_MEASUREMENT_FREQ_SEPARATION_HZ = 6;
export function customMeasurementsGetOrInit(state) {
    if (!Array.isArray(state.customMeasurements))
        state.customMeasurements = [];
    return state.customMeasurements;
}
export function customMeasurementCreateAndAppendFromState(state) {
    const customMeasurements = customMeasurementsGetOrInit(state);
    const sequence = customMeasurementSequenceNextFromState(state);
    const key = `${CUSTOM_MEASUREMENT_KEY_PREFIX}${sequence}`;
    const label = `${CUSTOM_MEASUREMENT_LABEL_PREFIX} ${sequence}`;
    const freqHz = customMeasurementFrequencyDefaultResolveFromState(state);
    const next = { key, label, freqHz };
    customMeasurements.push(next);
    return next;
}
export function customMeasurementDeleteFromState(state, key) {
    const customMeasurements = customMeasurementsGetOrInit(state);
    state.customMeasurements = customMeasurements.filter((measurement) => measurement.key !== key);
    customMeasurementTargetClearByKey(state, key);
}
export function customMeasurementKeyIsCustom(key) {
    return key.startsWith(CUSTOM_MEASUREMENT_KEY_PREFIX);
}
export function customMeasurementFrequencySetFromState(state, key, freqHz) {
    if (!customMeasurementKeyIsCustom(key) || !Number.isFinite(freqHz) || freqHz <= 0)
        return false;
    const customMeasurements = customMeasurementsGetOrInit(state);
    const target = customMeasurements.find((measurement) => measurement.key === key);
    if (!target)
        return false;
    target.freqHz = freqHz;
    return true;
}
export function customMeasurementRenameFromState(state, key, label) {
    const customMeasurements = customMeasurementsGetOrInit(state);
    const normalizedLabel = label.trim();
    if (!normalizedLabel)
        return;
    const target = customMeasurements.find((measurement) => measurement.key === key);
    if (!target)
        return;
    target.label = normalizedLabel;
}
export function customMeasurementCardsBuildFromState(state, args) {
    const customMeasurements = customMeasurementsGetOrInit(state);
    return customMeasurements.map((measurement) => customMeasurementCardBuild(measurement, args));
}
export function customMeasurementModesBuildFromState(state, spectrum) {
    const customMeasurements = customMeasurementsGetOrInit(state);
    return customMeasurements.map((measurement) => customMeasurementModeBuild(measurement, spectrum));
}
export function customMeasurementModeMetaBuildFromState(state) {
    const customMeasurements = customMeasurementsGetOrInit(state);
    const modeMeta = {};
    for (const measurement of customMeasurements) {
        modeMeta[measurement.key] = {
            label: measurement.label,
            aliasHtml: "",
            aliasText: "",
            tooltip: `${measurement.label}\nCustom measurement`,
            color: resolveColorHexFromRole("customMode"),
        };
    }
    return modeMeta;
}
function customMeasurementModeBuild(measurement, spectrum) {
    const point = customMeasurementSpectrumPointReadFromFrequency(spectrum, measurement.freqHz);
    const note = noteAndCentsFromFreq(measurement.freqHz);
    return {
        mode: measurement.key,
        peakFreq: measurement.freqHz,
        peakDb: point?.db ?? null,
        note: note.note,
        cents: note.cents,
    };
}
function customMeasurementCardBuild(measurement, args) {
    const peak = customMeasurementPeakResolveFromSpectrum(args?.spectrum, measurement.freqHz);
    const note = noteAndCentsFromFreq(measurement.freqHz);
    const q = customMeasurementQEstimateFromPeak(args, peak);
    return {
        kind: "custom",
        key: measurement.key,
        label: measurement.label,
        freq: measurement.freqHz,
        isPeak: peak.isPeak,
        note: note.note,
        cents: note.cents,
        q,
        wolfRisk: null,
        targetHz: null,
        deltaHz: null,
        peakOverrideHz: null,
    };
}
function customMeasurementQEstimateFromPeak(args, peak) {
    if (!peak.isPeak || !Number.isFinite(peak.freq) || !Number.isFinite(peak.db))
        return null;
    const estimateQ = args?.analysis?.estimateQFromDb;
    if (typeof estimateQ !== "function")
        return null;
    const freqs = Array.isArray(args?.spectrum?.freqs) ? args?.spectrum?.freqs : [];
    const dbs = Array.isArray(args?.spectrum?.dbs) ? args?.spectrum?.dbs : [];
    if (!freqs.length || !dbs.length)
        return null;
    return estimateQ(freqs, dbs, { freq: peak.freq, db: peak.db });
}
function customMeasurementPeakResolveFromSpectrum(spectrum, freqHz) {
    const point = customMeasurementSpectrumPointReadFromFrequency(spectrum, freqHz);
    if (!point || !Number.isFinite(point.idx) || !customMeasurementIndexIsLocalPeak(spectrum, point.idx)) {
        return { isPeak: false, freq: null, db: null };
    }
    return { isPeak: true, freq: point.freq, db: point.db };
}
function customMeasurementIndexIsLocalPeak(spectrum, index) {
    if (!spectrum?.dbs?.length)
        return false;
    if (index <= 0 || index >= spectrum.dbs.length - 1)
        return false;
    const center = Number(spectrum.dbs[index]);
    const left = Number(spectrum.dbs[index - 1]);
    const right = Number(spectrum.dbs[index + 1]);
    if (!Number.isFinite(center) || !Number.isFinite(left) || !Number.isFinite(right))
        return false;
    return center >= left && center >= right;
}
function customMeasurementSequenceNextFromState(state) {
    const current = Number(state.customMeasurementSequence || 0);
    const next = Number.isFinite(current) ? current + 1 : 1;
    state.customMeasurementSequence = next;
    return next;
}
function customMeasurementFrequencyDefaultResolveFromState(state) {
    const spectrum = customMeasurementSpectrumReadFromState(state);
    if (!spectrum)
        return CUSTOM_MEASUREMENT_FALLBACK_FREQ_HZ;
    const usedFrequencies = customMeasurementUsedFrequenciesReadFromState(state);
    const peak = customMeasurementPeakBestFindFromSpectrum(spectrum, usedFrequencies);
    return peak?.freq ?? CUSTOM_MEASUREMENT_FALLBACK_FREQ_HZ;
}
function customMeasurementSpectrumReadFromState(state) {
    const freqs = Array.isArray(state?.lastSpectrum?.freqs) ? state.lastSpectrum.freqs : null;
    const dbs = Array.isArray(state?.lastSpectrum?.dbs) ? state.lastSpectrum.dbs : null;
    if (!freqs || !dbs || !freqs.length || !dbs.length)
        return null;
    return { freqs, dbs };
}
function customMeasurementUsedFrequenciesReadFromState(state) {
    const frequenciesFromCards = Array.isArray(state.lastModeCards) ? state.lastModeCards : [];
    return frequenciesFromCards
        .map((card) => Number(card?.freq))
        .filter((freq) => Number.isFinite(freq));
}
function customMeasurementPeakBestFindFromSpectrum(spectrum, usedFrequencies) {
    let best = null;
    for (let index = 0; index < spectrum.freqs.length; index += 1) {
        const freq = Number(spectrum.freqs[index]);
        const db = Number(spectrum.dbs[index]);
        if (!Number.isFinite(freq) || !Number.isFinite(db))
            continue;
        if (customMeasurementFrequencyTooCloseToUsed(freq, usedFrequencies))
            continue;
        if (!best || db > best.db)
            best = { freq, db };
    }
    return best;
}
function customMeasurementFrequencyTooCloseToUsed(freq, usedFrequencies) {
    return usedFrequencies.some((used) => Math.abs(used - freq) <= CUSTOM_MEASUREMENT_FREQ_SEPARATION_HZ);
}
function customMeasurementSpectrumPointReadFromFrequency(spectrum, freqHz) {
    if (!spectrum?.freqs?.length || !spectrum?.dbs?.length)
        return null;
    let bestIndex = 0;
    for (let index = 1; index < spectrum.freqs.length; index += 1) {
        const candidateDistance = Math.abs(spectrum.freqs[index] - freqHz);
        const bestDistance = Math.abs(spectrum.freqs[bestIndex] - freqHz);
        if (candidateDistance < bestDistance)
            bestIndex = index;
    }
    return {
        idx: bestIndex,
        freq: Number(spectrum.freqs[bestIndex]),
        db: Number(spectrum.dbs[bestIndex]),
    };
}
function customMeasurementTargetClearByKey(state, key) {
    if (!state.modeTargets || typeof state.modeTargets !== "object")
        return;
    delete state.modeTargets[key];
}
