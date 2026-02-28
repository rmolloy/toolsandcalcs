import { measureModeNormalize } from "./resonate_mode_config.js";
import { resolveColorHexFromRole, resolveColorRgbaFromRole } from "./resonate_color_roles.js";
import { resonanceEnergyBandWidthHzResolve } from "./resonate_debug_flags.js";

type EnergyMode = { id: string; label: string; color: string; peakFreq: number };
type EnergySeriesView = {
  t: number[];
  partialShares: {
    f0: number[];
    secondPartial: number[];
    thirdPartial: number[];
  };
  bodyShares: Record<string, number[]>;
  levelScale: number[];
  bodyModes: EnergyMode[];
  dominanceTime: number | null;
  xWindowSec: { start: number; end: number };
  f0Hz: number;
};
type EnergySliceSeries = {
  sliceId: number;
  startMs: number;
  endMs: number;
  t: number[];
  partialShares: {
    f0: number[];
    secondPartial: number[];
    thirdPartial: number[];
  };
  bodyShares: Record<string, number[]>;
  levelScale: number[];
  f0Hz: number;
};
type EnergySliceCacheEntry = {
  signature: string;
  series: EnergySliceSeries;
};
type EnergySliceCacheState = {
  modeSignature: string;
  signaturesBySliceId: Record<number, string>;
  entriesBySliceId: Record<number, EnergySliceCacheEntry>;
};

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

export function energyBandWidthHzResolveFromFrequency(
  frequencyHz: number,
  cents: number = ENERGY_BANDWIDTH_CENTS,
  minFloorHz: number = ENERGY_BANDWIDTH_FLOOR_HZ,
) {
  if (!Number.isFinite(frequencyHz) || frequencyHz <= 0) return minFloorHz;
  const centsRatio = cents / 1200;
  const upper = 2 ** centsRatio;
  const lower = 2 ** (-centsRatio);
  const widthHz = frequencyHz * (upper - lower);
  return Math.max(minFloorHz, widthHz);
}

export function energyTransferShouldRenderForMeasureMode(measureMode: unknown) {
  return measureModeNormalize(measureMode) === "played_note";
}

export function selectedNoteSliceResolveFromState(state: Record<string, any>) {
  const slices = Array.isArray(state.noteSlices) ? state.noteSlices : [];
  if (!slices.length) return null;
  const range = state.noteSelectionRangeMs;
  if (range && Number.isFinite(range.start) && Number.isFinite(range.end)) {
    const selected = slices.find((slice: any) => (
      Number.isFinite(slice?.startMs)
      && Number.isFinite(slice?.endMs)
      && slice.startMs >= range.start
      && slice.endMs <= range.end
    ));
    if (selected) return selected;
  }
  return slices[0];
}

function overlapMsResolve(
  left: { start: number; end: number },
  right: { start: number; end: number },
) {
  const start = Math.max(left.start, right.start);
  const end = Math.min(left.end, right.end);
  return Math.max(0, end - start);
}

function selectedNoteResultResolveFromState(state: Record<string, any>, noteSlice: any) {
  const results = Array.isArray(state.noteResults) ? state.noteResults : [];
  if (Number.isFinite(noteSlice?.id)) {
    return results.find((result: any) => result?.id === noteSlice?.id) || null;
  }
  const range = state.noteSelectionRangeMs;
  const slices = Array.isArray(state.noteSlices) ? state.noteSlices : [];
  if (!(range && Number.isFinite(range.start) && Number.isFinite(range.end))) {
    return results[0] || null;
  }
  const scored = slices
    .map((slice: any) => ({
      id: slice?.id,
      overlapMs: overlapMsResolve(
        { start: range.start, end: range.end },
        { start: Number(slice?.startMs) || 0, end: Number(slice?.endMs) || 0 },
      ),
    }))
    .filter((entry: any) => Number.isFinite(entry.id) && entry.overlapMs > 0)
    .sort((left: any, right: any) => right.overlapMs - left.overlapMs);
  if (scored.length) {
    return results.find((result: any) => result?.id === scored[0].id) || null;
  }
  return results[0] || null;
}

function noteOverrideLabelBySliceIdResolve(state: Record<string, any>, sliceId: number | null | undefined) {
  if (!Number.isFinite(sliceId)) return null;
  const overrides = state.noteLabelOverrides || {};
  const label = overrides[sliceId as number];
  return typeof label === "string" && label.length ? label : null;
}

function noteFrequencyHzResolveFromLabel(noteLabel: string | null | undefined) {
  const match = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(String(noteLabel || "").trim());
  if (!match) return null;
  const letter = match[1].toUpperCase();
  const accidental = match[2];
  const octave = Number(match[3]);
  if (!Number.isFinite(octave)) return null;
  const baseSemitone = noteNaturalSemitoneResolve(letter);
  if (!Number.isFinite(baseSemitone)) return null;
  const accidentalOffset = accidental === "#" ? 1 : accidental === "b" ? -1 : 0;
  const semitone = baseSemitone + accidentalOffset;
  const midi = (octave + 1) * 12 + semitone;
  return 440 * (2 ** ((midi - 69) / 12));
}

function noteNaturalSemitoneResolve(letter: string) {
  if (letter === "C") return 0;
  if (letter === "D") return 2;
  if (letter === "E") return 4;
  if (letter === "F") return 5;
  if (letter === "G") return 7;
  if (letter === "A") return 9;
  if (letter === "B") return 11;
  return null;
}

export function selectedF0HzResolveFromState(
  state: Record<string, any>,
  noteResult: { id?: number; f0?: number | null } | null | undefined,
) {
  const overrideLabel = noteOverrideLabelBySliceIdResolve(state, noteResult?.id);
  const overrideHz = noteFrequencyHzResolveFromLabel(overrideLabel);
  if (Number.isFinite(overrideHz)) return overrideHz as number;
  return Number.isFinite(noteResult?.f0) ? (noteResult?.f0 as number) : null;
}

function energyPanelElementGet() {
  return document.getElementById("energy_nav");
}

function energyPlotElementGet() {
  return document.getElementById("plot_energy_transfer");
}

function energyPanelVisibleSet(visible: boolean) {
  const panel = energyPanelElementGet();
  if (!panel) return;
  panel.hidden = !visible;
  if (visible) {
    panel.style.removeProperty("display");
    return;
  }
  panel.style.display = "none";
}

function energyPlotPurge() {
  const plot = energyPlotElementGet();
  if (!plot) return;
  (window as any).Plotly?.purge?.(plot);
}

function clamp01(x: number) {
  return Math.min(1, Math.max(0, x));
}

function hexToRgba(hex: string, alpha: number) {
  if (!hex || typeof hex !== "string") return resolveColorRgbaFromRole("secondPartial", alpha);
  let h = hex.trim();
  if (h.startsWith("#")) h = h.slice(1);
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length !== 6) return resolveColorRgbaFromRole("secondPartial", alpha);
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if ([r, g, b].some((v) => Number.isNaN(v))) return resolveColorRgbaFromRole("secondPartial", alpha);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function modeListResolveFromState(state: Record<string, any>) {
  const modes = Array.isArray(state.lastModesDetected) ? state.lastModesDetected : [];
  const cards = Array.isArray(state.lastModeCards) ? state.lastModeCards : [];
  const customMeasurements = Array.isArray(state.customMeasurements) ? state.customMeasurements : [];
  const meta = state.modeMeta || {};
  const detectedModesById = modeDetectionByIdResolve(modes);
  const builtInCardsById = modeCardsByIdResolve(cards, "built-in");
  const builtInModeIds = modeIdsInPreferredOrderResolve(modes, cards);
  const builtInModes = builtInModeIds
    .map((modeId) => modeFromCardOrDetectionResolve(modeId, builtInCardsById, detectedModesById, meta))
    .filter((mode): mode is EnergyMode => Boolean(mode));

  const usedIds = new Set(builtInModes.map((mode) => mode.id));
  const customModes = cards
    .filter((card: any) => Number.isFinite(card?.freq))
    .filter((card: any) => card?.kind === "custom" || !usedIds.has(String(card?.key || "")))
    .map((card: any) => {
      const modeId = String(card?.key || "");
      const modeMeta = meta[modeId] || {};
      return {
        id: modeId,
        label: String(card?.label || modeMeta.label || modeId),
        color: modeMeta.color || energyModeColorHexResolveFromModeId(modeId),
        peakFreq: card.freq as number,
      };
    })
    .filter((mode: EnergyMode) => Boolean(mode.id && Number.isFinite(mode.peakFreq)));

  const mergedCustomModes = [...customModes];
  const mergedIds = new Set(mergedCustomModes.map((mode) => mode.id));
  customMeasurements.forEach((measurement: any) => {
    const modeId = String(measurement?.key || "");
    const freq = Number(measurement?.freqHz);
    if (!modeId || !Number.isFinite(freq) || mergedIds.has(modeId) || usedIds.has(modeId)) return;
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

function modeDetectionByIdResolve(modes: any[]) {
  const byId = new Map<string, any>();
  modes.forEach((mode) => {
    if (!mode?.mode) return;
    byId.set(String(mode.mode), mode);
  });
  return byId;
}

function modeCardsByIdResolve(cards: any[], kind: "built-in" | "custom") {
  const byId = new Map<string, any>();
  cards.forEach((card) => {
    if (card?.kind !== kind) return;
    if (!card?.key) return;
    byId.set(String(card.key), card);
  });
  return byId;
}

function modeIdsInPreferredOrderResolve(modes: any[], cards: any[]) {
  const orderedIds: string[] = [];
  const seen = new Set<string>();
  modes.forEach((mode) => {
    const modeId = String(mode?.mode || "");
    if (!modeId || seen.has(modeId)) return;
    seen.add(modeId);
    orderedIds.push(modeId);
  });
  cards.forEach((card) => {
    if (card?.kind !== "built-in") return;
    const modeId = String(card?.key || "");
    if (!modeId || seen.has(modeId)) return;
    seen.add(modeId);
    orderedIds.push(modeId);
  });
  return orderedIds;
}

function modeFromCardOrDetectionResolve(
  modeId: string,
  cardsById: Map<string, any>,
  detectedById: Map<string, any>,
  meta: Record<string, any>,
) {
  const card = cardsById.get(modeId);
  const detected = detectedById.get(modeId);
  const cardFrequency = Number(card?.freq);
  const detectedFrequency = Number(detected?.peakFreq);
  const peakFreq = Number.isFinite(cardFrequency) ? cardFrequency : detectedFrequency;
  if (!Number.isFinite(peakFreq)) return null;
  const modeMeta = meta[modeId] || {};
  return {
    id: modeId,
    label: String(card?.label || modeMeta.label || modeId),
    color: modeMeta.color || energyModeColorHexResolveFromModeId(modeId),
    peakFreq,
  } as EnergyMode;
}

function energyModeColorHexResolveFromModeId(modeId: string) {
  if (modeId === "air") return resolveColorHexFromRole("airMode");
  if (modeId === "top") return resolveColorHexFromRole("topMode");
  if (modeId === "back") return resolveColorHexFromRole("backMode");
  if (modeId === "transverse") return resolveColorHexFromRole("plateTransverseMode");
  if (modeId === "long") return resolveColorHexFromRole("plateLongMode");
  if (modeId === "cross") return resolveColorHexFromRole("plateCrossMode");
  return resolveColorHexFromRole("customMode");
}

function buildBodyEnvelopesFromModes(
  wolfCore: any,
  noteSlice: any,
  modes: EnergyMode[],
) {
  const bodyEnvs: Record<string, Float64Array> = {};
  modes.forEach((mode) => {
    const defaultBandwidthHz = energyBandWidthHzResolveFromFrequency(mode.peakFreq);
    const bandwidthHz = resonanceEnergyBandWidthHzResolve(defaultBandwidthHz);
    bodyEnvs[mode.id] = wolfCore.demodulatePartial(
      noteSlice.samples,
      noteSlice.sampleRate,
      mode.peakFreq,
      bandwidthHz,
      20,
    );
  });
  return bodyEnvs;
}

function accumulateEnergyShares(
  noteSlice: any,
  fundEnv: Float64Array,
  secondPartialEnvelope: Float64Array,
  thirdPartialEnvelope: Float64Array,
  bodyEnvs: Record<string, Float64Array>,
  modes: EnergyMode[],
) {
  const len = fundEnv.length;
  const stride = Math.max(1, Math.ceil(len / ENERGY_STRIDE_TARGET));
  const sliceStartSec = Number.isFinite(noteSlice?.startMs) ? (noteSlice.startMs as number) / 1000 : 0;
  const t: number[] = [];
  const partialShares = { f0: [], secondPartial: [], thirdPartial: [] };
  const bodyShares: Record<string, number[]> = {};
  modes.forEach((mode) => { bodyShares[mode.id] = []; });
  const totalRaw: number[] = [];

  for (let i = 0; i < len; i += stride) {
    const f = fundEnv[i] || 0;
    const secondPartial = secondPartialEnvelope[i] || 0;
    const thirdPartial = thirdPartialEnvelope[i] || 0;
    const bodyVals: Record<string, number> = {};
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

function levelScaleBuildFromTotal(totalRaw: number[]) {
  const maxTotal = Math.max(...totalRaw, 1e-9);
  return totalRaw.map((value) => {
    const db = 20 * Math.log10(value / maxTotal);
    if (!Number.isFinite(db)) return 0;
    return clamp01((db - ENERGY_DB_FLOOR) / -ENERGY_DB_FLOOR);
  });
}

function computeEnergySeriesFromState(state: Record<string, any>) {
  const wolfCore = (window as any).WolfNoteCore;
  if (!wolfCore?.demodulatePartial || !wolfCore?.partialBandWidth || !wolfCore?.modeBandWidth) return null;
  const modes = modeListResolveFromState(state);
  if (!modes.length) return null;
  const cacheEntries = energySliceCacheRefreshFromState(state, modes, wolfCore);
  const combined = energySliceSeriesCombine(cacheEntries, modes);
  if (!combined) return null;
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
    f0Hz: Number.isFinite(selectedF0Hz) ? (selectedF0Hz as number) : combined.f0Hz,
  } as EnergySeriesView;
}

function energySliceCacheGetOrInit(state: Record<string, any>) {
  if (state[ENERGY_SLICE_CACHE_KEY]) return state[ENERGY_SLICE_CACHE_KEY] as EnergySliceCacheState;
  const cache: EnergySliceCacheState = {
    modeSignature: "",
    signaturesBySliceId: {},
    entriesBySliceId: {},
  };
  state[ENERGY_SLICE_CACHE_KEY] = cache;
  return cache;
}

function energyModesSignatureResolve(modes: EnergyMode[]) {
  return modes
    .map((mode) => `${mode.id}:${mode.peakFreq.toFixed(4)}`)
    .sort()
    .join("|");
}

function energySliceSignatureResolve(slice: any, f0Hz: number) {
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

function energySliceSeriesCompute(
  slice: any,
  f0Hz: number,
  modes: EnergyMode[],
  wolfCore: any,
) {
  const samples = slice?.analysisSamples || slice?.samples || slice?.wave;
  if (!samples || !Number.isFinite(slice?.sampleRate)) return null;
  const fundamentalBandWidthHz = resonanceEnergyBandWidthHzResolve(energyBandWidthHzResolveFromFrequency(f0Hz));
  const secondPartialBandWidthHz = resonanceEnergyBandWidthHzResolve(energyBandWidthHzResolveFromFrequency(f0Hz * 2));
  const thirdPartialBandWidthHz = resonanceEnergyBandWidthHzResolve(energyBandWidthHzResolveFromFrequency(f0Hz * 3));
  const fundEnv = wolfCore.demodulatePartial(samples, slice.sampleRate, f0Hz, fundamentalBandWidthHz, 20);
  const secondPartialEnvelope = wolfCore.demodulatePartial(samples, slice.sampleRate, f0Hz * 2, secondPartialBandWidthHz, 20);
  const thirdPartialEnvelope = wolfCore.demodulatePartial(samples, slice.sampleRate, f0Hz * 3, thirdPartialBandWidthHz, 20);
  const bodyEnvs = buildBodyEnvelopesFromModes(wolfCore, { ...slice, samples }, modes);
  const { t, partialShares, bodyShares, totalRaw } = accumulateEnergyShares(
    slice,
    fundEnv,
    secondPartialEnvelope,
    thirdPartialEnvelope,
    bodyEnvs,
    modes,
  );
  return {
    sliceId: slice.id,
    startMs: Number(slice.startMs) || 0,
    endMs: Number(slice.endMs) || 0,
    t,
    partialShares,
    bodyShares,
    levelScale: levelScaleBuildFromTotal(totalRaw),
    f0Hz,
  } as EnergySliceSeries;
}

function energyNoteSlicesResolveFromState(state: Record<string, any>) {
  const slices = Array.isArray(state.noteSlices) ? state.noteSlices : [];
  return slices.filter((slice: any) => (
    Number.isFinite(slice?.id)
    && Number.isFinite(slice?.startMs)
    && Number.isFinite(slice?.endMs)
    && Number.isFinite(slice?.sampleRate)
    && (slice?.samples?.length || 0) > 0
  ));
}

function energySliceNextStartMsResolveFromState(state: Record<string, any>, slice: any) {
  const slices = Array.isArray(state.noteSlices) ? state.noteSlices : [];
  const startMs = Number(slice?.startMs);
  if (!Number.isFinite(startMs)) return null;
  const nextSlice = slices
    .filter((entry: any) => Number.isFinite(entry?.startMs))
    .sort((left: any, right: any) => Number(left.startMs) - Number(right.startMs))
    .find((entry: any) => Number(entry.startMs) > startMs);
  const nextStartMs = Number(nextSlice?.startMs);
  if (!Number.isFinite(nextStartMs) || nextStartMs <= startMs) return null;
  return nextStartMs;
}

function energySliceAnalysisWindowExpandFromState(state: Record<string, any>, slice: any) {
  const startMs = Number(slice?.startMs);
  const defaultEndMs = Number(slice?.endMs);
  const nextStartMs = energySliceNextStartMsResolveFromState(state, slice);
  const analysisEndMs = Number.isFinite(nextStartMs) ? (nextStartMs as number) : defaultEndMs;
  if (!Number.isFinite(startMs) || !Number.isFinite(analysisEndMs) || analysisEndMs <= startMs) return null;
  const src = state.currentWave;
  const FFTWaveform = (window as any).FFTWaveform;
  if (!src || typeof FFTWaveform?.sliceWaveRange !== "function") return { analysisEndMs, analysisSamples: slice?.samples };
  const sampleRate = Number(src.sampleRate);
  const wave = src.wave || src.samples;
  if (!Number.isFinite(sampleRate) || !wave) return { analysisEndMs, analysisSamples: slice?.samples };
  const sliced = FFTWaveform.sliceWaveRange({ wave, sampleRate }, startMs, analysisEndMs);
  const analysisSamples = sliced?.wave?.length ? sliced.wave : slice?.samples;
  return { analysisEndMs, analysisSamples };
}

function energySliceSignatureInputsResolveFromState(state: Record<string, any>, modeSignature: string) {
  const slices = energyNoteSlicesResolveFromState(state);
  const signatureInputs: Record<number, string> = {};
  if (!slices.length) return { slices, signatureInputs };
  slices.forEach((slice: any) => {
    const analysis = energySliceAnalysisWindowExpandFromState(state, slice);
    if (!analysis) return;
    const enrichedSlice = { ...slice, analysisEndMs: analysis.analysisEndMs, analysisSamples: analysis.analysisSamples };
    const noteResult = noteResultBySliceIdResolve(state, slice.id);
    const selectedF0Hz = selectedF0HzResolveFromState(state, noteResult);
    if (!Number.isFinite(selectedF0Hz)) return;
    const sliceSignature = energySliceSignatureResolve(enrichedSlice, selectedF0Hz as number);
    signatureInputs[slice.id] = `${modeSignature}|${sliceSignature}`;
  });
  return { slices, signatureInputs };
}

export function energySliceDeltaPlanBuild(
  previousSignaturesBySliceId: Record<number, string>,
  nextSignaturesBySliceId: Record<number, string>,
) {
  const recomputeSliceIds: number[] = [];
  const removeSliceIds: number[] = [];
  Object.keys(nextSignaturesBySliceId).forEach((idText) => {
    const id = Number(idText);
    if (!Number.isFinite(id)) return;
    if (previousSignaturesBySliceId[id] === nextSignaturesBySliceId[id]) return;
    recomputeSliceIds.push(id);
  });
  Object.keys(previousSignaturesBySliceId).forEach((idText) => {
    const id = Number(idText);
    if (!Number.isFinite(id)) return;
    if (Object.prototype.hasOwnProperty.call(nextSignaturesBySliceId, id)) return;
    removeSliceIds.push(id);
  });
  return { recomputeSliceIds, removeSliceIds };
}

function energySliceCacheRefreshFromState(state: Record<string, any>, modes: EnergyMode[], wolfCore: any) {
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
    const slice = slices.find((entry: any) => entry.id === sliceId);
    if (!slice) return;
    const analysis = energySliceAnalysisWindowExpandFromState(state, slice);
    if (!analysis) return;
    const enrichedSlice = { ...slice, analysisEndMs: analysis.analysisEndMs, analysisSamples: analysis.analysisSamples };
    const noteResult = noteResultBySliceIdResolve(state, slice.id);
    const selectedF0Hz = selectedF0HzResolveFromState(state, noteResult);
    if (!Number.isFinite(selectedF0Hz)) return;
    const series = energySliceSeriesCompute(enrichedSlice, selectedF0Hz as number, modes, wolfCore);
    if (!series) return;
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

function energySliceSeriesCombine(sliceSeriesList: EnergySliceSeries[], modes: EnergyMode[]) {
  if (!sliceSeriesList.length) return null;
  const t: number[] = [];
  const levelScale: number[] = [];
  const partialShares = { f0: [] as number[], secondPartial: [] as number[], thirdPartial: [] as number[] };
  const bodyShares: Record<string, number[]> = {};
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

function applyLevelScale(seriesValues: number[], levelScale: number[]) {
  return seriesValues.map((value, idx) => {
    const scale = Number.isFinite(levelScale[idx]) ? levelScale[idx] : 0;
    return value * 100 * scale;
  });
}

function frequencyLabelResolve(freqHz: number) {
  return `${freqHz.toFixed(1)} Hz`;
}

function noteLabelResolve(freqHz: number) {
  const FFTUtils = (window as any).FFTUtils;
  const note = FFTUtils?.freqToNoteCents?.(freqHz);
  if (!note || typeof note.name !== "string") return { note: "—", deviation: "—", cents: "—" };
  const centsNum = Number.isFinite(note.centsNum) ? note.centsNum : null;
  return {
    note: note.name || "—",
    deviation: note.cents || "—",
    cents: centsNum === null ? "—" : `${Math.abs(centsNum)}c`,
  };
}

function hoverTemplateBuild(freqHz: number) {
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

type HoverPoint = [string, string, string, string];

function hoverPointBuildFromFrequency(freqHz: number, noteOverrideLabel: string | null = null): HoverPoint {
  const note = noteLabelResolve(freqHz);
  if (noteOverrideLabel) {
    return [frequencyLabelResolve(freqHz), noteOverrideLabel, note.deviation, note.cents];
  }
  return [frequencyLabelResolve(freqHz), note.note, note.deviation, note.cents];
}

function noteSliceForTimeMsResolve(state: Record<string, any>, timeMs: number) {
  const slices = Array.isArray(state.noteSlices) ? state.noteSlices : [];
  if (!Number.isFinite(timeMs)) return null;
  return slices.find((slice: any) => {
    const startMs = Number(slice?.startMs);
    const endMs = Number(slice?.endMs);
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return false;
    return timeMs >= startMs && timeMs <= endMs;
  }) || null;
}

function noteResultBySliceIdResolve(state: Record<string, any>, sliceId: number | null | undefined) {
  if (!Number.isFinite(sliceId)) return null;
  const results = Array.isArray(state.noteResults) ? state.noteResults : [];
  return results.find((result: any) => result?.id === sliceId) || null;
}

type EnergyHoverPointDescriptor = {
  f0Hz: number;
  noteOverrideLabel: string | null;
};

function energyHoverDescriptorAtTimeSecResolve(
  state: Record<string, any>,
  timeSec: number,
  fallbackF0Hz: number,
) {
  const timeMs = timeSec * 1000;
  const slice = noteSliceForTimeMsResolve(state, timeMs);
  const result = noteResultBySliceIdResolve(state, slice?.id);
  const selectedF0 = selectedF0HzResolveFromState(state, result);
  const f0Hz = Number.isFinite(selectedF0) ? (selectedF0 as number) : fallbackF0Hz;
  const noteOverrideLabel = noteOverrideLabelBySliceIdResolve(state, slice?.id);
  return { f0Hz, noteOverrideLabel } as EnergyHoverPointDescriptor;
}

export function energyHoverDescriptorsResolveFromState(
  state: Record<string, any>,
  timesSec: number[],
  fallbackF0Hz: number,
) {
  return timesSec.map((timeSec) => energyHoverDescriptorAtTimeSecResolve(state, timeSec, fallbackF0Hz));
}

function tracesBuildFromSeries(series: EnergySeriesView, state: Record<string, any>) {
  const hoverDescriptors = energyHoverDescriptorsResolveFromState(state, series.t, series.f0Hz);
  const fundamentalHoverData = hoverDescriptors.map((entry) => hoverPointBuildFromFrequency(entry.f0Hz, entry.noteOverrideLabel));
  const secondPartialHoverData = hoverDescriptors.map((entry) => hoverPointBuildFromFrequency(entry.f0Hz * 2));
  const thirdPartialHoverData = hoverDescriptors.map((entry) => hoverPointBuildFromFrequency(entry.f0Hz * 3));
  const traces: any[] = [
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

export function energyXWindowResolveFromState(
  state: Record<string, any>,
  noteSlice: { id?: number; startMs?: number; endMs?: number },
) {
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

function energyWindowEndMsResolveFromSlices(
  state: Record<string, any>,
  noteSlice: { id?: number; startMs?: number; endMs?: number },
) {
  const defaultEndMs = Number(noteSlice?.endMs);
  const noteSliceId = Number(noteSlice?.id);
  if (!Number.isFinite(noteSliceId)) return defaultEndMs;
  const slices = Array.isArray(state.noteSlices) ? state.noteSlices : [];
  const currentStartMs = Number(noteSlice?.startMs);
  const nextSlice = slices
    .filter((slice: any) => Number.isFinite(slice?.startMs))
    .sort((left: any, right: any) => Number(left.startMs) - Number(right.startMs))
    .find((slice: any) => Number(slice?.startMs) > currentStartMs);
  const nextStartMs = Number(nextSlice?.startMs);
  if (Number.isFinite(nextStartMs) && nextStartMs > currentStartMs) return nextStartMs;
  return defaultEndMs;
}

export function energyYMaxVisibleResolveFromSeries(series: EnergySeriesView) {
  let maxVisible = 0;
  for (let i = 0; i < series.t.length; i += 1) {
    if (!Number.isFinite(series.t[i])) continue;
    const scale = Number.isFinite(series.levelScale[i]) ? series.levelScale[i] : 0;
    const values = [
      (series.partialShares.f0?.[i] || 0) * 100 * scale,
      (series.partialShares.secondPartial?.[i] || 0) * 100 * scale,
      (series.partialShares.thirdPartial?.[i] || 0) * 100 * scale,
      ...series.bodyModes.map((mode) => ((series.bodyShares[mode.id]?.[i] || 0) * 100 * scale)),
    ];
    const localMax = Math.max(...values, 0);
    if (localMax > maxVisible) maxVisible = localMax;
  }
  const floorMax = Math.max(maxVisible, 5);
  return (floorMax * 1.2) + 2;
}

function layoutBuildFromSeries(series: EnergySeriesView) {
  const shapes: any[] = [];
  const annotations: any[] = [];
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
      text: `Body dominance begins (~${(series.dominanceTime as number).toFixed(2)} s)`,
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

function renderEnergyPlotFromSeries(series: EnergySeriesView, state: Record<string, any>) {
  const plot = energyPlotElementGet();
  if (!plot) return;
  const plotly = (window as any).Plotly;
  if (!plotly?.newPlot) return;
  const traces = tracesBuildFromSeries(series, state);
  const layout = layoutBuildFromSeries(series);
  plotly.newPlot(plot, traces, layout, { displayModeBar: true, displaylogo: false, responsive: true });
}

export function renderEnergyTransferFromState(state: Record<string, any>) {
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
