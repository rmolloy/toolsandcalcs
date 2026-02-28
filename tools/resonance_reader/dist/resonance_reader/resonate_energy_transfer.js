import { measureModeNormalize } from "./resonate_mode_config.js";
import { resolveColorHexFromRole, resolveColorRgbaFromRole } from "./resonate_color_roles.js";
import { resonanceEnergyBandWidthHzResolve } from "./resonate_debug_flags.js";
const ENERGY_COLORS = {
    fundamental: resolveColorRgbaFromRole("stringFundamental", 0.9),
    secondPartial: resolveColorRgbaFromRole("secondPartial", 0.9),
    thirdPartial: resolveColorRgbaFromRole("thirdPartial", 0.9),
    thirdPartialFill: resolveColorRgbaFromRole("thirdPartial", 0.3),
};
const ENERGY_DB_FLOOR = -60;
const ENERGY_STRIDE_TARGET = 360;
const ENERGY_SLICE_CACHE_KEY = "__energySliceCache";
const ENERGY_BANDWIDTH_CENTS = 25;
const ENERGY_BANDWIDTH_FLOOR_HZ = 0.5;
export function energyBandWidthHzResolveFromFrequency(frequencyHz, cents = ENERGY_BANDWIDTH_CENTS, minFloorHz = ENERGY_BANDWIDTH_FLOOR_HZ) {
    if (!Number.isFinite(frequencyHz) || frequencyHz <= 0)
        return minFloorHz;
    const centsRatio = cents / 1200;
    const upper = 2 ** centsRatio;
    const lower = 2 ** (-centsRatio);
    const widthHz = frequencyHz * (upper - lower);
    return Math.max(minFloorHz, widthHz);
}
export function energyTransferShouldRenderForMeasureMode(measureMode) {
    return measureModeNormalize(measureMode) === "played_note";
}
export function selectedNoteSliceResolveFromState(state) {
    const slices = Array.isArray(state.noteSlices) ? state.noteSlices : [];
    if (!slices.length)
        return null;
    const range = state.noteSelectionRangeMs;
    if (range && Number.isFinite(range.start) && Number.isFinite(range.end)) {
        const selected = slices.find((slice) => (Number.isFinite(slice?.startMs)
            && Number.isFinite(slice?.endMs)
            && slice.startMs >= range.start
            && slice.endMs <= range.end));
        if (selected)
            return selected;
    }
    return slices[0];
}
function overlapMsResolve(left, right) {
    const start = Math.max(left.start, right.start);
    const end = Math.min(left.end, right.end);
    return Math.max(0, end - start);
}
function selectedNoteResultResolveFromState(state, noteSlice) {
    const results = Array.isArray(state.noteResults) ? state.noteResults : [];
    if (Number.isFinite(noteSlice?.id)) {
        return results.find((result) => result?.id === noteSlice?.id) || null;
    }
    const range = state.noteSelectionRangeMs;
    const slices = Array.isArray(state.noteSlices) ? state.noteSlices : [];
    if (!(range && Number.isFinite(range.start) && Number.isFinite(range.end))) {
        return results[0] || null;
    }
    const scored = slices
        .map((slice) => ({
        id: slice?.id,
        overlapMs: overlapMsResolve({ start: range.start, end: range.end }, { start: Number(slice?.startMs) || 0, end: Number(slice?.endMs) || 0 }),
    }))
        .filter((entry) => Number.isFinite(entry.id) && entry.overlapMs > 0)
        .sort((left, right) => right.overlapMs - left.overlapMs);
    if (scored.length) {
        return results.find((result) => result?.id === scored[0].id) || null;
    }
    return results[0] || null;
}
function noteOverrideLabelBySliceIdResolve(state, sliceId) {
    if (!Number.isFinite(sliceId))
        return null;
    const overrides = state.noteLabelOverrides || {};
    const label = overrides[sliceId];
    return typeof label === "string" && label.length ? label : null;
}
function noteFrequencyHzResolveFromLabel(noteLabel) {
    const match = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(String(noteLabel || "").trim());
    if (!match)
        return null;
    const letter = match[1].toUpperCase();
    const accidental = match[2];
    const octave = Number(match[3]);
    if (!Number.isFinite(octave))
        return null;
    const baseSemitone = noteNaturalSemitoneResolve(letter);
    if (!Number.isFinite(baseSemitone))
        return null;
    const accidentalOffset = accidental === "#" ? 1 : accidental === "b" ? -1 : 0;
    const semitone = baseSemitone + accidentalOffset;
    const midi = (octave + 1) * 12 + semitone;
    return 440 * (2 ** ((midi - 69) / 12));
}
function noteNaturalSemitoneResolve(letter) {
    if (letter === "C")
        return 0;
    if (letter === "D")
        return 2;
    if (letter === "E")
        return 4;
    if (letter === "F")
        return 5;
    if (letter === "G")
        return 7;
    if (letter === "A")
        return 9;
    if (letter === "B")
        return 11;
    return null;
}
export function selectedF0HzResolveFromState(state, noteResult) {
    const overrideLabel = noteOverrideLabelBySliceIdResolve(state, noteResult?.id);
    const overrideHz = noteFrequencyHzResolveFromLabel(overrideLabel);
    if (Number.isFinite(overrideHz))
        return overrideHz;
    return Number.isFinite(noteResult?.f0) ? noteResult?.f0 : null;
}
function energyPanelElementGet() {
    return document.getElementById("energy_nav");
}
function energyPlotElementGet() {
    return document.getElementById("plot_energy_transfer");
}
function energyPanelVisibleSet(visible) {
    const panel = energyPanelElementGet();
    if (!panel)
        return;
    panel.hidden = !visible;
    if (visible) {
        panel.style.removeProperty("display");
        return;
    }
    panel.style.display = "none";
}
function energyPlotPurge() {
    const plot = energyPlotElementGet();
    if (!plot)
        return;
    window.Plotly?.purge?.(plot);
}
function clamp01(x) {
    return Math.min(1, Math.max(0, x));
}
function hexToRgba(hex, alpha) {
    if (!hex || typeof hex !== "string")
        return resolveColorRgbaFromRole("secondPartial", alpha);
    let h = hex.trim();
    if (h.startsWith("#"))
        h = h.slice(1);
    if (h.length === 3)
        h = h.split("").map((c) => c + c).join("");
    if (h.length !== 6)
        return resolveColorRgbaFromRole("secondPartial", alpha);
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    if ([r, g, b].some((v) => Number.isNaN(v)))
        return resolveColorRgbaFromRole("secondPartial", alpha);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
function modeListResolveFromState(state) {
    const modes = Array.isArray(state.lastModesDetected) ? state.lastModesDetected : [];
    const cards = Array.isArray(state.lastModeCards) ? state.lastModeCards : [];
    const customMeasurements = Array.isArray(state.customMeasurements) ? state.customMeasurements : [];
    const meta = state.modeMeta || {};
    const detectedModesById = modeDetectionByIdResolve(modes);
    const builtInCardsById = modeCardsByIdResolve(cards, "built-in");
    const builtInModeIds = modeIdsInPreferredOrderResolve(modes, cards);
    const builtInModes = builtInModeIds
        .map((modeId) => modeFromCardOrDetectionResolve(modeId, builtInCardsById, detectedModesById, meta))
        .filter((mode) => Boolean(mode));
    const usedIds = new Set(builtInModes.map((mode) => mode.id));
    const customModes = cards
        .filter((card) => Number.isFinite(card?.freq))
        .filter((card) => card?.kind === "custom" || !usedIds.has(String(card?.key || "")))
        .map((card) => {
        const modeId = String(card?.key || "");
        const modeMeta = meta[modeId] || {};
        return {
            id: modeId,
            label: String(card?.label || modeMeta.label || modeId),
            color: modeMeta.color || energyModeColorHexResolveFromModeId(modeId),
            peakFreq: card.freq,
        };
    })
        .filter((mode) => Boolean(mode.id && Number.isFinite(mode.peakFreq)));
    const mergedCustomModes = [...customModes];
    const mergedIds = new Set(mergedCustomModes.map((mode) => mode.id));
    customMeasurements.forEach((measurement) => {
        const modeId = String(measurement?.key || "");
        const freq = Number(measurement?.freqHz);
        if (!modeId || !Number.isFinite(freq) || mergedIds.has(modeId) || usedIds.has(modeId))
            return;
        const modeMeta = meta[modeId] || {};
        mergedCustomModes.push({
            id: modeId,
            label: String(measurement?.label || modeMeta.label || modeId),
            color: modeMeta.color || energyModeColorHexResolveFromModeId(modeId),
            peakFreq: freq,
        });
        mergedIds.add(modeId);
    });
    return [...builtInModes, ...mergedCustomModes];
}
function modeDetectionByIdResolve(modes) {
    const byId = new Map();
    modes.forEach((mode) => {
        if (!mode?.mode)
            return;
        byId.set(String(mode.mode), mode);
    });
    return byId;
}
function modeCardsByIdResolve(cards, kind) {
    const byId = new Map();
    cards.forEach((card) => {
        if (card?.kind !== kind)
            return;
        if (!card?.key)
            return;
        byId.set(String(card.key), card);
    });
    return byId;
}
function modeIdsInPreferredOrderResolve(modes, cards) {
    const orderedIds = [];
    const seen = new Set();
    modes.forEach((mode) => {
        const modeId = String(mode?.mode || "");
        if (!modeId || seen.has(modeId))
            return;
        seen.add(modeId);
        orderedIds.push(modeId);
    });
    cards.forEach((card) => {
        if (card?.kind !== "built-in")
            return;
        const modeId = String(card?.key || "");
        if (!modeId || seen.has(modeId))
            return;
        seen.add(modeId);
        orderedIds.push(modeId);
    });
    return orderedIds;
}
function modeFromCardOrDetectionResolve(modeId, cardsById, detectedById, meta) {
    const card = cardsById.get(modeId);
    const detected = detectedById.get(modeId);
    const cardFrequency = Number(card?.freq);
    const detectedFrequency = Number(detected?.peakFreq);
    const peakFreq = Number.isFinite(cardFrequency) ? cardFrequency : detectedFrequency;
    if (!Number.isFinite(peakFreq))
        return null;
    const modeMeta = meta[modeId] || {};
    return {
        id: modeId,
        label: String(card?.label || modeMeta.label || modeId),
        color: modeMeta.color || energyModeColorHexResolveFromModeId(modeId),
        peakFreq,
    };
}
function energyModeColorHexResolveFromModeId(modeId) {
    if (modeId === "air")
        return resolveColorHexFromRole("airMode");
    if (modeId === "top")
        return resolveColorHexFromRole("topMode");
    if (modeId === "back")
        return resolveColorHexFromRole("backMode");
    if (modeId === "transverse")
        return resolveColorHexFromRole("plateTransverseMode");
    if (modeId === "long")
        return resolveColorHexFromRole("plateLongMode");
    if (modeId === "cross")
        return resolveColorHexFromRole("plateCrossMode");
    return resolveColorHexFromRole("customMode");
}
function buildBodyEnvelopesFromModes(wolfCore, noteSlice, modes) {
    const bodyEnvs = {};
    modes.forEach((mode) => {
        const defaultBandwidthHz = energyBandWidthHzResolveFromFrequency(mode.peakFreq);
        const bandwidthHz = resonanceEnergyBandWidthHzResolve(defaultBandwidthHz);
        bodyEnvs[mode.id] = wolfCore.demodulatePartial(noteSlice.samples, noteSlice.sampleRate, mode.peakFreq, bandwidthHz, 20);
    });
    return bodyEnvs;
}
function accumulateEnergyShares(noteSlice, fundEnv, secondPartialEnvelope, thirdPartialEnvelope, bodyEnvs, modes) {
    const len = fundEnv.length;
    const stride = Math.max(1, Math.ceil(len / ENERGY_STRIDE_TARGET));
    const sliceStartSec = Number.isFinite(noteSlice?.startMs) ? noteSlice.startMs / 1000 : 0;
    const t = [];
    const partialShares = { f0: [], secondPartial: [], thirdPartial: [] };
    const bodyShares = {};
    modes.forEach((mode) => { bodyShares[mode.id] = []; });
    const totalRaw = [];
    for (let i = 0; i < len; i += stride) {
        const f = fundEnv[i] || 0;
        const secondPartial = secondPartialEnvelope[i] || 0;
        const thirdPartial = thirdPartialEnvelope[i] || 0;
        const bodyVals = {};
        let total = f + secondPartial + thirdPartial;
        modes.forEach((mode) => {
            const env = bodyEnvs[mode.id];
            const value = env ? (env[i] || 0) : 0;
            bodyVals[mode.id] = value;
            total += value;
        });
        total = Math.max(1e-9, total);
        t.push(sliceStartSec + (i / noteSlice.sampleRate));
        partialShares.f0.push(f / total);
        partialShares.secondPartial.push(secondPartial / total);
        partialShares.thirdPartial.push(thirdPartial / total);
        modes.forEach((mode) => {
            bodyShares[mode.id].push((bodyVals[mode.id] || 0) / total);
        });
        totalRaw.push(total);
    }
    return { t, partialShares, bodyShares, totalRaw };
}
function levelScaleBuildFromTotal(totalRaw) {
    const maxTotal = Math.max(...totalRaw, 1e-9);
    return totalRaw.map((value) => {
        const db = 20 * Math.log10(value / maxTotal);
        if (!Number.isFinite(db))
            return 0;
        return clamp01((db - ENERGY_DB_FLOOR) / -ENERGY_DB_FLOOR);
    });
}
function computeEnergySeriesFromState(state) {
    const wolfCore = window.WolfNoteCore;
    if (!wolfCore?.demodulatePartial || !wolfCore?.partialBandWidth || !wolfCore?.modeBandWidth)
        return null;
    const modes = modeListResolveFromState(state);
    if (!modes.length)
        return null;
    const cacheEntries = energySliceCacheRefreshFromState(state, modes, wolfCore);
    const combined = energySliceSeriesCombine(cacheEntries, modes);
    if (!combined)
        return null;
    const selectedNoteSlice = selectedNoteSliceResolveFromState(state);
    const selectedNoteResult = selectedNoteResultResolveFromState(state, selectedNoteSlice);
    const selectedF0Hz = selectedF0HzResolveFromState(state, selectedNoteResult);
    const xWindowSec = energyXWindowResolveFromState(state, selectedNoteSlice || {});
    return {
        t: combined.t,
        partialShares: combined.partialShares,
        bodyShares: combined.bodyShares,
        levelScale: combined.levelScale,
        bodyModes: modes,
        dominanceTime: null,
        xWindowSec,
        f0Hz: Number.isFinite(selectedF0Hz) ? selectedF0Hz : combined.f0Hz,
    };
}
function energySliceCacheGetOrInit(state) {
    if (state[ENERGY_SLICE_CACHE_KEY])
        return state[ENERGY_SLICE_CACHE_KEY];
    const cache = {
        modeSignature: "",
        signaturesBySliceId: {},
        entriesBySliceId: {},
    };
    state[ENERGY_SLICE_CACHE_KEY] = cache;
    return cache;
}
function energyModesSignatureResolve(modes) {
    return modes
        .map((mode) => `${mode.id}:${mode.peakFreq.toFixed(4)}`)
        .sort()
        .join("|");
}
function energySliceSignatureResolve(slice, f0Hz) {
    const analysisEndMs = Number(slice?.analysisEndMs);
    return [
        Number(slice?.startMs) || 0,
        Number(slice?.endMs) || 0,
        Number.isFinite(analysisEndMs) ? analysisEndMs : (Number(slice?.endMs) || 0),
        Number(slice?.sampleRate) || 0,
        Number(slice?.samples?.length) || 0,
        f0Hz.toFixed(4),
    ].join("|");
}
function energySliceSeriesCompute(slice, f0Hz, modes, wolfCore) {
    const samples = slice?.analysisSamples || slice?.samples || slice?.wave;
    if (!samples || !Number.isFinite(slice?.sampleRate))
        return null;
    const fundamentalBandWidthHz = resonanceEnergyBandWidthHzResolve(energyBandWidthHzResolveFromFrequency(f0Hz));
    const secondPartialBandWidthHz = resonanceEnergyBandWidthHzResolve(energyBandWidthHzResolveFromFrequency(f0Hz * 2));
    const thirdPartialBandWidthHz = resonanceEnergyBandWidthHzResolve(energyBandWidthHzResolveFromFrequency(f0Hz * 3));
    const fundEnv = wolfCore.demodulatePartial(samples, slice.sampleRate, f0Hz, fundamentalBandWidthHz, 20);
    const secondPartialEnvelope = wolfCore.demodulatePartial(samples, slice.sampleRate, f0Hz * 2, secondPartialBandWidthHz, 20);
    const thirdPartialEnvelope = wolfCore.demodulatePartial(samples, slice.sampleRate, f0Hz * 3, thirdPartialBandWidthHz, 20);
    const bodyEnvs = buildBodyEnvelopesFromModes(wolfCore, { ...slice, samples }, modes);
    const { t, partialShares, bodyShares, totalRaw } = accumulateEnergyShares(slice, fundEnv, secondPartialEnvelope, thirdPartialEnvelope, bodyEnvs, modes);
    return {
        sliceId: slice.id,
        startMs: Number(slice.startMs) || 0,
        endMs: Number(slice.endMs) || 0,
        t,
        partialShares,
        bodyShares,
        levelScale: levelScaleBuildFromTotal(totalRaw),
        f0Hz,
    };
}
function energyNoteSlicesResolveFromState(state) {
    const slices = Array.isArray(state.noteSlices) ? state.noteSlices : [];
    return slices.filter((slice) => (Number.isFinite(slice?.id)
        && Number.isFinite(slice?.startMs)
        && Number.isFinite(slice?.endMs)
        && Number.isFinite(slice?.sampleRate)
        && (slice?.samples?.length || 0) > 0));
}
function energySliceNextStartMsResolveFromState(state, slice) {
    const slices = Array.isArray(state.noteSlices) ? state.noteSlices : [];
    const startMs = Number(slice?.startMs);
    if (!Number.isFinite(startMs))
        return null;
    const nextSlice = slices
        .filter((entry) => Number.isFinite(entry?.startMs))
        .sort((left, right) => Number(left.startMs) - Number(right.startMs))
        .find((entry) => Number(entry.startMs) > startMs);
    const nextStartMs = Number(nextSlice?.startMs);
    if (!Number.isFinite(nextStartMs) || nextStartMs <= startMs)
        return null;
    return nextStartMs;
}
function energySliceAnalysisWindowExpandFromState(state, slice) {
    const startMs = Number(slice?.startMs);
    const defaultEndMs = Number(slice?.endMs);
    const nextStartMs = energySliceNextStartMsResolveFromState(state, slice);
    const analysisEndMs = Number.isFinite(nextStartMs) ? nextStartMs : defaultEndMs;
    if (!Number.isFinite(startMs) || !Number.isFinite(analysisEndMs) || analysisEndMs <= startMs)
        return null;
    const src = state.currentWave;
    const FFTWaveform = window.FFTWaveform;
    if (!src || typeof FFTWaveform?.sliceWaveRange !== "function")
        return { analysisEndMs, analysisSamples: slice?.samples };
    const sampleRate = Number(src.sampleRate);
    const wave = src.wave || src.samples;
    if (!Number.isFinite(sampleRate) || !wave)
        return { analysisEndMs, analysisSamples: slice?.samples };
    const sliced = FFTWaveform.sliceWaveRange({ wave, sampleRate }, startMs, analysisEndMs);
    const analysisSamples = sliced?.wave?.length ? sliced.wave : slice?.samples;
    return { analysisEndMs, analysisSamples };
}
function energySliceSignatureInputsResolveFromState(state, modeSignature) {
    const slices = energyNoteSlicesResolveFromState(state);
    const signatureInputs = {};
    if (!slices.length)
        return { slices, signatureInputs };
    slices.forEach((slice) => {
        const analysis = energySliceAnalysisWindowExpandFromState(state, slice);
        if (!analysis)
            return;
        const enrichedSlice = { ...slice, analysisEndMs: analysis.analysisEndMs, analysisSamples: analysis.analysisSamples };
        const noteResult = noteResultBySliceIdResolve(state, slice.id);
        const selectedF0Hz = selectedF0HzResolveFromState(state, noteResult);
        if (!Number.isFinite(selectedF0Hz))
            return;
        const sliceSignature = energySliceSignatureResolve(enrichedSlice, selectedF0Hz);
        signatureInputs[slice.id] = `${modeSignature}|${sliceSignature}`;
    });
    return { slices, signatureInputs };
}
export function energySliceDeltaPlanBuild(previousSignaturesBySliceId, nextSignaturesBySliceId) {
    const recomputeSliceIds = [];
    const removeSliceIds = [];
    Object.keys(nextSignaturesBySliceId).forEach((idText) => {
        const id = Number(idText);
        if (!Number.isFinite(id))
            return;
        if (previousSignaturesBySliceId[id] === nextSignaturesBySliceId[id])
            return;
        recomputeSliceIds.push(id);
    });
    Object.keys(previousSignaturesBySliceId).forEach((idText) => {
        const id = Number(idText);
        if (!Number.isFinite(id))
            return;
        if (Object.prototype.hasOwnProperty.call(nextSignaturesBySliceId, id))
            return;
        removeSliceIds.push(id);
    });
    return { recomputeSliceIds, removeSliceIds };
}
function energySliceCacheRefreshFromState(state, modes, wolfCore) {
    const cache = energySliceCacheGetOrInit(state);
    const modeSignature = energyModesSignatureResolve(modes);
    if (cache.modeSignature !== modeSignature) {
        cache.modeSignature = modeSignature;
        cache.signaturesBySliceId = {};
        cache.entriesBySliceId = {};
    }
    const { slices, signatureInputs } = energySliceSignatureInputsResolveFromState(state, modeSignature);
    const deltaPlan = energySliceDeltaPlanBuild(cache.signaturesBySliceId, signatureInputs);
    deltaPlan.removeSliceIds.forEach((sliceId) => {
        delete cache.signaturesBySliceId[sliceId];
        delete cache.entriesBySliceId[sliceId];
    });
    deltaPlan.recomputeSliceIds.forEach((sliceId) => {
        const slice = slices.find((entry) => entry.id === sliceId);
        if (!slice)
            return;
        const analysis = energySliceAnalysisWindowExpandFromState(state, slice);
        if (!analysis)
            return;
        const enrichedSlice = { ...slice, analysisEndMs: analysis.analysisEndMs, analysisSamples: analysis.analysisSamples };
        const noteResult = noteResultBySliceIdResolve(state, slice.id);
        const selectedF0Hz = selectedF0HzResolveFromState(state, noteResult);
        if (!Number.isFinite(selectedF0Hz))
            return;
        const series = energySliceSeriesCompute(enrichedSlice, selectedF0Hz, modes, wolfCore);
        if (!series)
            return;
        cache.signaturesBySliceId[sliceId] = signatureInputs[sliceId];
        cache.entriesBySliceId[sliceId] = { signature: signatureInputs[sliceId], series };
    });
    const ordered = Object.values(cache.entriesBySliceId)
        .map((entry) => entry.series)
        .sort((left, right) => left.startMs - right.startMs);
    state.energyTransferDeltaDebug = {
        recomputeSliceIds: deltaPlan.recomputeSliceIds.slice(),
        removeSliceIds: deltaPlan.removeSliceIds.slice(),
        modeSignature,
    };
    return ordered;
}
function energySliceSeriesCombine(sliceSeriesList, modes) {
    if (!sliceSeriesList.length)
        return null;
    const t = [];
    const levelScale = [];
    const partialShares = { f0: [], secondPartial: [], thirdPartial: [] };
    const bodyShares = {};
    modes.forEach((mode) => { bodyShares[mode.id] = []; });
    sliceSeriesList.forEach((sliceSeries, index) => {
        const isFirst = index === 0;
        if (!isFirst) {
            t.push(NaN);
            levelScale.push(NaN);
            partialShares.f0.push(NaN);
            partialShares.secondPartial.push(NaN);
            partialShares.thirdPartial.push(NaN);
            modes.forEach((mode) => bodyShares[mode.id].push(NaN));
        }
        t.push(...sliceSeries.t);
        levelScale.push(...sliceSeries.levelScale);
        partialShares.f0.push(...sliceSeries.partialShares.f0);
        partialShares.secondPartial.push(...sliceSeries.partialShares.secondPartial);
        partialShares.thirdPartial.push(...sliceSeries.partialShares.thirdPartial);
        modes.forEach((mode) => {
            bodyShares[mode.id].push(...(sliceSeries.bodyShares[mode.id] || []));
        });
    });
    return {
        t,
        levelScale,
        partialShares,
        bodyShares,
        f0Hz: sliceSeriesList[0].f0Hz,
    };
}
function applyLevelScale(seriesValues, levelScale) {
    return seriesValues.map((value, idx) => {
        const scale = Number.isFinite(levelScale[idx]) ? levelScale[idx] : 0;
        return value * 100 * scale;
    });
}
function frequencyLabelResolve(freqHz) {
    return `${freqHz.toFixed(1)} Hz`;
}
function noteLabelResolve(freqHz) {
    const FFTUtils = window.FFTUtils;
    const note = FFTUtils?.freqToNoteCents?.(freqHz);
    if (!note || typeof note.name !== "string")
        return { note: "—", deviation: "—", cents: "—" };
    const centsNum = Number.isFinite(note.centsNum) ? note.centsNum : null;
    return {
        note: note.name || "—",
        deviation: note.cents || "—",
        cents: centsNum === null ? "—" : `${Math.abs(centsNum)}c`,
    };
}
function hoverTemplateBuild(freqHz) {
    const freq = frequencyLabelResolve(freqHz);
    const note = noteLabelResolve(freqHz);
    return [
        "<b>%{fullData.name}</b>",
        `${freq} · ${note.note} ${note.deviation}`,
        `Cents: ${note.cents}`,
        "Amp: %{y:.1f}",
        "<extra></extra>",
    ].join("<br>");
}
function hoverTemplateBuildFromCustomData() {
    return [
        "<b>%{fullData.name}</b>",
        "%{customdata[0]} · %{customdata[1]} %{customdata[2]}",
        "Cents: %{customdata[3]}",
        "Amp: %{y:.1f}",
        "<extra></extra>",
    ].join("<br>");
}
function hoverLabelStyleBuild() {
    return {
        bgcolor: "rgba(10,14,24,0.9)",
        bordercolor: "rgba(255,255,255,0.18)",
        font: { family: "Inter, system-ui, -apple-system, Segoe UI, sans-serif", size: 14, color: "#eef1ff" },
        align: "left",
    };
}
function hoverPointBuildFromFrequency(freqHz, noteOverrideLabel = null) {
    const note = noteLabelResolve(freqHz);
    if (noteOverrideLabel) {
        return [frequencyLabelResolve(freqHz), noteOverrideLabel, note.deviation, note.cents];
    }
    return [frequencyLabelResolve(freqHz), note.note, note.deviation, note.cents];
}
function noteSliceForTimeMsResolve(state, timeMs) {
    const slices = Array.isArray(state.noteSlices) ? state.noteSlices : [];
    if (!Number.isFinite(timeMs))
        return null;
    return slices.find((slice) => {
        const startMs = Number(slice?.startMs);
        const endMs = Number(slice?.endMs);
        if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs)
            return false;
        return timeMs >= startMs && timeMs <= endMs;
    }) || null;
}
function noteResultBySliceIdResolve(state, sliceId) {
    if (!Number.isFinite(sliceId))
        return null;
    const results = Array.isArray(state.noteResults) ? state.noteResults : [];
    return results.find((result) => result?.id === sliceId) || null;
}
function energyHoverDescriptorAtTimeSecResolve(state, timeSec, fallbackF0Hz) {
    const timeMs = timeSec * 1000;
    const slice = noteSliceForTimeMsResolve(state, timeMs);
    const result = noteResultBySliceIdResolve(state, slice?.id);
    const selectedF0 = selectedF0HzResolveFromState(state, result);
    const f0Hz = Number.isFinite(selectedF0) ? selectedF0 : fallbackF0Hz;
    const noteOverrideLabel = noteOverrideLabelBySliceIdResolve(state, slice?.id);
    return { f0Hz, noteOverrideLabel };
}
export function energyHoverDescriptorsResolveFromState(state, timesSec, fallbackF0Hz) {
    return timesSec.map((timeSec) => energyHoverDescriptorAtTimeSecResolve(state, timeSec, fallbackF0Hz));
}
function tracesBuildFromSeries(series, state) {
    const hoverDescriptors = energyHoverDescriptorsResolveFromState(state, series.t, series.f0Hz);
    const fundamentalHoverData = hoverDescriptors.map((entry) => hoverPointBuildFromFrequency(entry.f0Hz, entry.noteOverrideLabel));
    const secondPartialHoverData = hoverDescriptors.map((entry) => hoverPointBuildFromFrequency(entry.f0Hz * 2));
    const thirdPartialHoverData = hoverDescriptors.map((entry) => hoverPointBuildFromFrequency(entry.f0Hz * 3));
    const traces = [
        {
            x: series.t,
            y: applyLevelScale(series.partialShares.f0 || [], series.levelScale),
            type: "scatter",
            mode: "lines",
            name: "Fundamental",
            line: { color: ENERGY_COLORS.fundamental, width: 3, dash: "solid" },
            fill: "tozeroy",
            fillcolor: resolveColorRgbaFromRole("stringFundamental", 0.25),
            customdata: fundamentalHoverData,
            hovertemplate: hoverTemplateBuildFromCustomData(),
            hoverlabel: hoverLabelStyleBuild(),
        },
        {
            x: series.t,
            y: applyLevelScale(series.partialShares.secondPartial || [], series.levelScale),
            type: "scatter",
            mode: "lines",
            name: "Second Partial",
            line: { color: ENERGY_COLORS.secondPartial, width: 3, dash: "solid" },
            fill: "none",
            customdata: secondPartialHoverData,
            hovertemplate: hoverTemplateBuildFromCustomData(),
            hoverlabel: hoverLabelStyleBuild(),
        },
        {
            x: series.t,
            y: applyLevelScale(series.partialShares.thirdPartial || [], series.levelScale),
            type: "scatter",
            mode: "lines",
            name: "Third Partial",
            line: { color: ENERGY_COLORS.thirdPartial, width: 3, dash: "solid" },
            fill: "none",
            fillcolor: ENERGY_COLORS.thirdPartialFill,
            customdata: thirdPartialHoverData,
            hovertemplate: hoverTemplateBuildFromCustomData(),
            hoverlabel: hoverLabelStyleBuild(),
        },
    ];
    series.bodyModes.forEach((mode) => {
        traces.push({
            x: series.t,
            y: applyLevelScale(series.bodyShares[mode.id] || [], series.levelScale),
            type: "scatter",
            mode: "lines",
            name: `Body (${mode.label})`,
            line: { color: mode.color, width: 2, dash: "dash" },
            fill: "none",
            fillcolor: hexToRgba(mode.color, 0.3),
            hovertemplate: hoverTemplateBuild(mode.peakFreq),
            hoverlabel: hoverLabelStyleBuild(),
        });
    });
    return traces;
}
export function energyXWindowResolveFromState(state, noteSlice) {
    const range = state.noteSelectionRangeMs;
    if (range && Number.isFinite(range.start) && Number.isFinite(range.end) && range.end > range.start) {
        return { start: range.start / 1000, end: range.end / 1000 };
    }
    const startMs = Number(noteSlice?.startMs);
    const endMs = energyWindowEndMsResolveFromSlices(state, noteSlice);
    if (Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs) {
        return { start: startMs / 1000, end: endMs / 1000 };
    }
    return { start: 0, end: 1 };
}
function energyWindowEndMsResolveFromSlices(state, noteSlice) {
    const defaultEndMs = Number(noteSlice?.endMs);
    const noteSliceId = Number(noteSlice?.id);
    if (!Number.isFinite(noteSliceId))
        return defaultEndMs;
    const slices = Array.isArray(state.noteSlices) ? state.noteSlices : [];
    const currentStartMs = Number(noteSlice?.startMs);
    const nextSlice = slices
        .filter((slice) => Number.isFinite(slice?.startMs))
        .sort((left, right) => Number(left.startMs) - Number(right.startMs))
        .find((slice) => Number(slice?.startMs) > currentStartMs);
    const nextStartMs = Number(nextSlice?.startMs);
    if (Number.isFinite(nextStartMs) && nextStartMs > currentStartMs)
        return nextStartMs;
    return defaultEndMs;
}
export function energyYMaxVisibleResolveFromSeries(series) {
    let maxVisible = 0;
    for (let i = 0; i < series.t.length; i += 1) {
        if (!Number.isFinite(series.t[i]))
            continue;
        const scale = Number.isFinite(series.levelScale[i]) ? series.levelScale[i] : 0;
        const values = [
            (series.partialShares.f0?.[i] || 0) * 100 * scale,
            (series.partialShares.secondPartial?.[i] || 0) * 100 * scale,
            (series.partialShares.thirdPartial?.[i] || 0) * 100 * scale,
            ...series.bodyModes.map((mode) => ((series.bodyShares[mode.id]?.[i] || 0) * 100 * scale)),
        ];
        const localMax = Math.max(...values, 0);
        if (localMax > maxVisible)
            maxVisible = localMax;
    }
    const floorMax = Math.max(maxVisible, 5);
    return (floorMax * 1.2) + 2;
}
function layoutBuildFromSeries(series) {
    const shapes = [];
    const annotations = [];
    if (Number.isFinite(series.dominanceTime)) {
        shapes.push({
            type: "line",
            xref: "x",
            yref: "paper",
            x0: series.dominanceTime,
            x1: series.dominanceTime,
            y0: 0,
            y1: 1,
            line: { color: resolveColorRgbaFromRole("modelOverlay", 0.85), width: 2, dash: "dot" },
        });
        annotations.push({
            x: series.dominanceTime,
            y: 98,
            xref: "x",
            yref: "y",
            text: `Body dominance begins (~${series.dominanceTime.toFixed(2)} s)`,
            showarrow: false,
            font: { color: resolveColorRgbaFromRole("modelOverlay", 0.9), size: 11 },
            bgcolor: "rgba(12, 16, 24, 0.6)",
            bordercolor: resolveColorRgbaFromRole("modelOverlay", 0.35),
            borderwidth: 1,
            borderpad: 4,
            xanchor: "left",
        });
    }
    return {
        margin: { l: 50, r: 10, t: 46, b: 40 },
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        yaxis: {
            title: "Relative level",
            range: [0, energyYMaxVisibleResolveFromSeries(series)],
            gridcolor: "rgba(255,255,255,0.06)",
            zeroline: false,
            tickfont: { color: "rgba(255,255,255,0.5)" },
        },
        xaxis: {
            title: "Time (s)",
            range: [series.xWindowSec.start, series.xWindowSec.end],
            gridcolor: "rgba(255,255,255,0.06)",
            tickfont: { color: "rgba(255,255,255,0.5)" },
        },
        showlegend: true,
        legend: {
            orientation: "h",
            x: 0,
            xanchor: "left",
            y: 1.2,
            yanchor: "top",
            bgcolor: "rgba(0,0,0,0)",
            font: { color: "rgba(255,255,255,0.82)", size: 12 },
            itemclick: "toggle",
            itemdoubleclick: "toggleothers",
        },
        shapes,
        annotations,
    };
}
function renderEnergyPlotFromSeries(series, state) {
    const plot = energyPlotElementGet();
    if (!plot)
        return;
    const plotly = window.Plotly;
    if (!plotly?.newPlot)
        return;
    const traces = tracesBuildFromSeries(series, state);
    const layout = layoutBuildFromSeries(series);
    plotly.newPlot(plot, traces, layout, { displayModeBar: true, displaylogo: false, responsive: true });
}
export function renderEnergyTransferFromState(state) {
    const shouldRender = energyTransferShouldRenderForMeasureMode(state.measureMode);
    energyPanelVisibleSet(shouldRender);
    if (!shouldRender) {
        energyPlotPurge();
        return;
    }
    const series = computeEnergySeriesFromState(state);
    if (!series) {
        energyPlotPurge();
        return;
    }
    renderEnergyPlotFromSeries(series, state);
}
