/**
 * Wolf-note analyzer UI orchestration.
 *
 * This file is the imperative shell: it wires user interactions (import/record/play/select)
 * to analysis + rendering, and manages async cancellation via `appState.analysisToken`.
 */

import {
  appState,
  averageTapSpectra,
  detectTaps,
  fftState,
  pickWolfiestNote,
  renderBodyModesUi,
  setWaveStatus,
  analyzeNoteSlice,
  getFftDefaultRanges,
} from "./state.js";
import { renderEnergyPlot } from "./render_energy.js";
import { renderFft } from "./render_fft.js";
import { renderWaveform, refreshWaveShapes } from "./render_waveform.js";
import { renderPlayedNote, renderTapSummary, renderWolfRisk, addExtraModeAndRenderBodyModes } from "./render_cards.js";
import { computeSelectionDerivedState, buildSelectionReason, NO_COUPLING_REASON } from "./selection_logic.js";
import type { DerivedSelectionState } from "./selection_logic.js";
import { computeSpectrumDbAndApplyInferredBodyModes, inferBodyModesFromTapSpectrum } from "./body_mode_inference.js";

/* global FFTAudio, FFTWaveform */
declare const FFTAudio: any;
declare const FFTWaveform: any;

type WaveSource = { wave: Float32Array | number[]; sampleRate: number };

type SelectedNoteData =
  | { kind: "manual"; range: { start: number; end: number }; slice: any; result: any }
  | { kind: "note"; noteId: number; slice: any; result: any };

type ControlElements = {
  btnImport: HTMLElement | null;
  btnRecord: HTMLElement | null;
  btnAddMode: HTMLElement | null;
  btnSaveAudio: HTMLElement | null;
  btnPlay: HTMLElement | null;
  btnStop: HTMLElement | null;
  btnWaveRecord: HTMLElement | null;
  btnWavePlay: HTMLElement | null;
  btnWaveStop: HTMLElement | null;
  fileInput: HTMLInputElement | null;
  btnDetectTaps: HTMLElement | null;
  btnResetZoom: HTMLElement | null;
  btnResetFft: HTMLElement | null;
  energyViewMode: HTMLSelectElement | null;
};

function getOrInitWaveSource(): WaveSource {
  const source = (fftState.currentWave as WaveSource | undefined) || (FFTAudio.generateDemoWave(3000) as WaveSource);
  if (!fftState.currentWave) fftState.currentWave = source;
  return source;
}

function resetBodyModesAndRender() {
  appState.bodyModes = { air: null, top: null, back: null };
  renderBodyModesUi();
}

function clearSelectionSummaryUi(reason: string) {
  renderBodyModesUi();
  appState.partialInstability = null;
  renderPlayedNote(null);
  renderWolfRisk(null, {
    drivers: [],
    primary: null,
    couplingOk: false,
    instability: false,
    reason,
  });
}

function clearSelectionEnergyState() {
  appState.energySeries = null;
  appState.energyMode = null;
}

async function clearSelectionDerivedStateAndRender(reason: string) {
  clearSelectionSummaryUi(reason);
  clearSelectionEnergyState();
  renderEnergyPlot(null, null);
  await renderFft(null, null, null);
}

async function detectTapModesAndUpdateUi() {
  const source = getOrInitWaveSource();
  const tapSegments = detectTaps(source.wave, source.sampleRate);
  appState.tapSegments = tapSegments;
  renderTapSummary();
  if (!tapSegments.length) {
    resetBodyModesAndRender();
    refreshWaveShapes();
    return false;
  }
  const avgSpectrum = await averageTapSpectra(source.wave, source.sampleRate, tapSegments);
  if (!avgSpectrum) {
    resetBodyModesAndRender();
    refreshWaveShapes();
    return false;
  }
  const spectrumDb = (window as any).FFTPlot?.applyDb ? (window as any).FFTPlot.applyDb(avgSpectrum) : avgSpectrum;
  const freqs = Array.from(spectrumDb.freqs as ArrayLike<number>);
  const dbs = Array.from(spectrumDb.dbs as ArrayLike<number>);
  appState.bodyModes = inferBodyModesFromTapSpectrum(freqs, dbs);
  renderBodyModesUi();
  refreshWaveShapes();
  return true;
}

function manualSelectedNoteDataFromState(): SelectedNoteData | null {
  if (!appState.manualSelection) return null;
  return { kind: "manual", ...appState.manualSelection };
}

function noteSelectedNoteDataFromState(): SelectedNoteData | null {
  if (!appState.selectedNoteId) return null;
  const noteId = appState.selectedNoteId;
  const note = appState.noteSlices.find((n) => n.id === noteId);
  const result = appState.noteResults.find((n) => n.id === noteId);
  if (!note || !result) return null;
  return { kind: "note", noteId, slice: note, result };
}

function getSelectedNoteData(): SelectedNoteData | null {
  const manualSelection = manualSelectedNoteDataFromState();
  if (manualSelection) return manualSelection;
  return noteSelectedNoteDataFromState();
}

if (typeof window !== "undefined") {
  (window as any).getSelectedNoteData = getSelectedNoteData;
}

function energyMetricsFromSelectionState(selectionState: DerivedSelectionState) {
  if (!selectionState.energy) return null;
  return {
    dominanceTime: selectionState.energy.dominanceTime,
    exchangeDepthDb: selectionState.energy.exchangeDepthDb,
    drivers: selectionState.drivers,
    primary: selectionState.primary,
  };
}

function applyDerivedSelectionState(selectionState: DerivedSelectionState) {
  appState.partialInstability = selectionState.partialInstability;
  appState.energyMetrics = energyMetricsFromSelectionState(selectionState);
  appState.energySeries = selectionState.energy;
  appState.energyMode = selectionState.primary?.driver?.mode ?? null;
}

async function renderSelectionState(
  noteResult: any,
  derived: Pick<DerivedSelectionState, "drivers" | "primary" | "couplingOk" | "instability" | "energy">,
  reason: string,
  slice: any,
  inferredSpectrum: any,
) {
  renderPlayedNote(noteResult);
  renderWolfRisk(noteResult, {
    drivers: derived.drivers,
    primary: derived.primary,
    couplingOk: derived.couplingOk,
    instability: derived.instability,
    reason,
  });
  renderEnergyPlot(derived.energy, derived.primary?.driver?.mode ?? null);
  await renderFft(slice, noteResult.f0, derived.primary?.driver?.mode ?? null, inferredSpectrum);
  refreshWaveShapes();
}

async function updateForSelection() {
  const selected = getSelectedNoteData();
  if (!selected) {
    await clearSelectionDerivedStateAndRender(NO_COUPLING_REASON);
    return;
  }
  await refreshSelectionFromSelectedNoteData(selected);
}

if (typeof window !== "undefined") {
  (window as any).updateForSelection = updateForSelection;
}

async function refreshSelectionFromSelectedNoteData(selected: SelectedNoteData) {
  const inferredSpectrum = await computeSpectrumDbAndApplyInferredBodyModes(selected.slice);
  renderBodyModesUi();
  await renderSelectionForSlice(selected.slice, selected.result, inferredSpectrum);
}

async function renderSelectionForSlice(slice: any, noteResult: any, inferredSpectrum: any) {
  const derived = computeSelectionDerivedState(slice, noteResult);
  applyDerivedSelectionState(derived);
  const reason = buildSelectionReason(noteResult, derived);
  await renderSelectionState(noteResult, derived, reason, slice, inferredSpectrum);
}

async function selectManualRange(range: { start: number; end: number }) {
  const selection = await manualSelectionResultFromRange(range);
  if (!selection) return;
  finalizeManualSelection(range, selection);
}

function finalizeManualSelection(range: { start: number; end: number }, selection: { slice: any; result: any }) {
  applyManualSelectionResult(range, selection);
  refreshSelectionAfterManualRange();
}

async function manualSelectionResultFromRange(range: { start: number; end: number }) {
  const slice = pickManualSelectionSlice(range);
  if (!slice) return null;
  return buildManualSelectionResult(slice);
}

function pickManualSelectionSlice(range: { start: number; end: number }) {
  const source = getManualSelectionSource();
  if (!source) return null;
  return sliceManualRange(source, range);
}

function getManualSelectionSource() {
  const source = fftState.currentWave as WaveSource | undefined;
  if (!source) return null;
  setWaveStatus("Analyzing selected region.");
  return source;
}

function sliceManualRange(source: WaveSource, range: { start: number; end: number }) {
  const slice = FFTWaveform.sliceWaveRange(source, range.start, range.end);
  if (!slice) return null;
  return slice;
}

async function buildManualSelectionResult(slice: any) {
  const result = await analyzeNoteSlice(slice);
  return { slice, result };
}

function applyManualSelectionResult(range: { start: number; end: number }, selection: { slice: any; result: any }) {
  appState.manualSelection = { range, slice: selection.slice, result: selection.result };
  appState.selectedNoteId = null;
  appState.autoSelect = false;
}

function refreshSelectionAfterManualRange() {
  updateForSelection().catch((err) => console.error("[Wolf] manual selection update failed", err));
}

async function segmentAndAnalyzeNotes(token: number) {
  const source = fftState.currentWave;
  if (!source || !(window as any).ModalSegmentation?.segmentNotesFromBuffer) return;
  // Invariant: async analysis must not mutate state after a newer refresh starts.
  const notes = (window as any).ModalSegmentation.segmentNotesFromBuffer(source.wave, source.sampleRate, {
    thresholdDb: -45,
    minSilenceMs: 150,
    windowMs: 20,
    minDurationMs: 200,
    minRelativeRms: 0.1,
  });
  if (token !== appState.analysisToken) return;
  appState.noteSlices = notes.map((n: any) => ({
    ...n,
    startMs: (n.startIndex / n.sampleRate) * 1000,
    endMs: (n.endIndex / n.sampleRate) * 1000,
    wave: n.samples,
  }));
  appState.noteResults = [];
  for (const note of appState.noteSlices) {
    let analysisResult;
    try {
      analysisResult = await analyzeNoteSlice({ wave: note.samples, sampleRate: note.sampleRate });
    } catch (err) {
      console.warn("[Wolf] note analysis failed", err);
      analysisResult = {
        envelope: [],
        dt: 0,
        f0: null,
        wolfScore: 0,
        category: "None",
        wobbleDepth: 0,
        beatRate: null,
        stability: null,
      };
    }
    if (token !== appState.analysisToken) return;
    appState.noteResults.push({
      id: note.id,
      startMs: note.startMs,
      endMs: note.endMs,
      ...analysisResult,
    });
  }
  const wolfiest = pickWolfiestNote();
  if (appState.autoSelect && wolfiest) {
    appState.selectedNoteId = wolfiest.id;
  }
}

async function refreshAll() {
  appState.analysisToken += 1;
  const token = appState.analysisToken;
  getOrInitWaveSource();
  appState.autoSelect = true;
  appState.manualSelection = null;
  renderWaveform({
    onSelectionChange: () => updateForSelection().catch((err) => console.error("[Wolf] selection update failed", err)),
    onManualRange: (range) => selectManualRange(range).catch((err) => console.error("[Wolf] manual selection failed", err)),
  });
  await detectTapModesAndUpdateUi();
  await segmentAndAnalyzeNotes(token);
  if (token !== appState.analysisToken) return;
  renderBodyModesUi();
  renderTapSummary();
  if (!appState.noteResults.length) {
    setWaveStatus("No notes detected yet. Load or record to detect taps and notes.");
    await clearSelectionDerivedStateAndRender(NO_COUPLING_REASON);
    return;
  }
  setWaveStatus(`${appState.noteResults.length} note${appState.noteResults.length === 1 ? "" : "s"} detected.`);
  if (!appState.selectedNoteId && appState.noteResults.length) {
    appState.selectedNoteId = appState.noteResults[0].id;
  }
  updateForSelection().catch((err) => console.error("[Wolf] selection update failed", err));
}

function updateTransportLabels() {
  const recording = FFTAudio.isRecordingActive();
  const playing = FFTAudio.isPlaybackActive();
  const recordButtons = ["btn_record", "btn_wave_record"].map((id) => document.getElementById(id));
  const playButtons = ["btn_play", "btn_wave_play"].map((id) => document.getElementById(id));
  const stopButtons = ["btn_stop", "btn_wave_stop"].map((id) => document.getElementById(id));
  recordButtons.forEach((btn) => { if (btn) btn.textContent = recording ? "Stop" : "Record"; });
  playButtons.forEach((btn) => { if (btn) btn.textContent = playing ? "Pause" : "Play"; });
  stopButtons.forEach((btn) => { if (btn) btn.textContent = "Stop"; });
}

function bindControls() {
  const controls = collectControlElements();
  const bindingTasks = [
    () => bindImportFileInputHandlers(controls.btnImport, controls.fileInput),
    () => bindAddModeButtonActions(controls.btnAddMode),
    () => bindSaveAudioButtonAction(controls.btnSaveAudio),
    () => bindRecordButtonsToToggle(controls.btnRecord, controls.btnWaveRecord),
    () => bindPlayButtonsToToggle(controls.btnPlay, controls.btnWavePlay),
    () => bindStopButtonsToStopAll(controls.btnStop, controls.btnWaveStop),
    () => bindDetectTapsButtonToRefresh(controls.btnDetectTaps),
    () => bindResetZoomButtonToAutorangePlot(controls.btnResetZoom),
    () => bindResetFftButtonToDefaultRanges(controls.btnResetFft),
    () => bindEnergyViewModeToEnergyPlot(controls.energyViewMode),
  ];

  bindingTasks.forEach((task) => task());
}

function bindImportFileInputHandlers(btnImport: HTMLElement | null, fileInput: HTMLInputElement | null) {
  if (!btnImport || !fileInput) return;
  btnImport.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", createFileInputChangeHandler(fileInput));
}

function createFileInputChangeHandler(fileInput: HTMLInputElement) {
  return async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    await processImportedFile(file);
  };
}

async function processImportedFile(file: File) {
  await FFTAudio.handleFile(file);
  updateTransportLabels();
  refreshAll().catch((err) => console.error("[Wolf] refresh after import failed", err));
}

function bindAddModeButtonActions(btnAddMode: HTMLElement | null) {
  btnAddMode?.addEventListener("click", () => {
    addExtraModeAndRenderBodyModes();
    updateForSelection().catch((err) => console.error("[Wolf] update after add mode failed", err));
  });
}

function bindSaveAudioButtonAction(btnSaveAudio: HTMLElement | null) {
  btnSaveAudio?.addEventListener("click", FFTAudio.saveCurrentAudio);
}

function bindRecordButtonsToToggle(btnRecord: HTMLElement | null, btnWaveRecord: HTMLElement | null) {
  const toggleRecord = () => {
    if (FFTAudio.isRecordingActive()) {
      FFTAudio.stopRecording();
      updateTransportLabels();
      return;
    }
    FFTAudio.startRecording(() => {
      updateTransportLabels();
      refreshAll().catch((err) => console.error("[Wolf] refresh after record failed", err));
    }).catch((err: any) => console.error("[Wolf] record failed", err));
    updateTransportLabels();
  };

  [btnRecord, btnWaveRecord].forEach((btn) => btn?.addEventListener("click", toggleRecord));
}

function bindPlayButtonsToToggle(btnPlay: HTMLElement | null, btnWavePlay: HTMLElement | null) {
  const togglePlay = () => {
    if (FFTAudio.isPlaybackActive()) {
      FFTAudio.stopPlayback();
      updateTransportLabels();
      return;
    }
    if (FFTAudio.playCurrent(() => updateTransportLabels())) updateTransportLabels();
  };

  [btnPlay, btnWavePlay].forEach((btn) => btn?.addEventListener("click", togglePlay));
}

function bindStopButtonsToStopAll(btnStop: HTMLElement | null, btnWaveStop: HTMLElement | null) {
  [btnStop, btnWaveStop].forEach((btn) =>
    btn?.addEventListener("click", () => {
      FFTAudio.stopAll();
      updateTransportLabels();
    }),
  );
}

function bindDetectTapsButtonToRefresh(btnDetectTaps: HTMLElement | null) {
  btnDetectTaps?.addEventListener("click", () => {
    detectTapModesAndUpdateUi()
      .then(() => updateForSelection())
      .catch((err) => console.error("[Wolf] tap detect failed", err));
  });
}

function bindResetZoomButtonToAutorangePlot(btnResetZoom: HTMLElement | null) {
  btnResetZoom?.addEventListener("click", () => {
    const plot = document.getElementById("plot_waveform");
    if (plot && (window as any).Plotly) {
      (window as any).Plotly.relayout(plot, { "xaxis.autorange": true });
    }
  });
}

function bindResetFftButtonToDefaultRanges(btnResetFft: HTMLElement | null) {
  btnResetFft?.addEventListener("click", () => {
    const plot = document.getElementById("plot_fft");
    const ranges = getFftDefaultRanges();
    if (plot && (window as any).Plotly && ranges) {
      (window as any).Plotly.relayout(plot, {
        "xaxis.range": ranges.x,
        "yaxis.range": ranges.y,
      });
    }
  });
}

function bindEnergyViewModeToEnergyPlot(energyViewMode: HTMLSelectElement | null) {
  energyViewMode?.addEventListener("change", () => {
    if (!appState.energySeries) return;
    renderEnergyPlot(appState.energySeries, appState.energyMode);
  });
}

function collectControlElements(): ControlElements {
  return {
    btnImport: document.getElementById("btn_import"),
    btnRecord: document.getElementById("btn_record"),
    btnAddMode: document.getElementById("btn_add_mode"),
    btnSaveAudio: document.getElementById("btn_save_audio"),
    btnPlay: document.getElementById("btn_play"),
    btnStop: document.getElementById("btn_stop"),
    btnWaveRecord: document.getElementById("btn_wave_record"),
    btnWavePlay: document.getElementById("btn_wave_play"),
    btnWaveStop: document.getElementById("btn_wave_stop"),
    fileInput: document.getElementById("file_input") as HTMLInputElement | null,
    btnDetectTaps: document.getElementById("btn_detect_taps"),
    btnResetZoom: document.getElementById("btn_reset_zoom"),
    btnResetFft: document.getElementById("btn_reset_fft"),
    energyViewMode: document.getElementById("energy_view_mode") as HTMLSelectElement | null,
  };
}

bindControls();
refreshAll().catch((err) => console.error("[Wolf] initial refresh failed", err));
