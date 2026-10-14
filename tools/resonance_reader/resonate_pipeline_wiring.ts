import type { PipelineEventName, PipelineHandler } from "../common/pipeline_events.js";
import { modeOverrideStateReset, modeOverrideStateSet } from "./resonate_mode_override_state.js";
import {
  customMeasurementFrequencySetFromState,
  customMeasurementModesBuildFromState,
} from "./resonate_custom_measurements.js";
import { resonanceLocalizedMessages } from "./resonate_localized_messages.js";

type PipelineBus = {
  wire: (event: PipelineEventName, handler: PipelineHandler) => void;
};

type PipelineUiRender = {
  renderSpectrum: (payload: {
    freqs: number[];
    mags: number[];
    overlay?: number[];
    modes?: any[];
    secondarySpectrum?: { freqs: number[]; mags: number[] } | null;
    peakHoldSpectrum?: { freqs: number[]; mags: number[] } | null;
    polymaxCandidates?: Array<{ freqHz: number; zeta: number; stability: number; orderCount: number }> ;
  }) => void;
  renderModes: (modes: any[]) => void;
  renderWaveform: (wave: any) => void;
  renderEnergyTransferFromState: (state: Record<string, any>) => void;
  setStatus: (text: string) => void;
};

function pipelineUiRenderGet(): PipelineUiRender | null {
  const ui = (window as any).ResonateUiRender;
  if (!ui) return null;
  if (typeof ui.renderSpectrum !== "function") return null;
  if (typeof ui.renderModes !== "function") return null;
  if (typeof ui.renderWaveform !== "function") return null;
  if (typeof ui.renderEnergyTransferFromState !== "function") return null;
  if (typeof ui.setStatus !== "function") return null;
  return ui as PipelineUiRender;
}

function pipelineStatusSet(message: string) {
  const status = (window as any).ResonateStatus;
  if (typeof status?.setStatus !== "function") return;
  status.setStatus(message);
}

function pipelineStartEventHandle(_payload: unknown, ctx: { log: (message: string) => void }) {
  ctx.log("pipeline.started");
  pipelineStatusSet(resonanceLocalizedMessages.pipelineStartedStatus);
}

function pipelineCompletedEventHandle(_payload: unknown, ctx: { log: (message: string) => void }) {
  ctx.log("pipeline.completed");
  pipelineStatusSet(resonanceLocalizedMessages.pipelineCompletedStatus);
}

function pipelineFailedEventHandle(_payload: unknown, ctx: { log: (message: string) => void }) {
  ctx.log("pipeline.failed");
  pipelineStatusSet(resonanceLocalizedMessages.pipelineFailedStatus);
}

function pipelineStageStartedEventHandle(payload: unknown, ctx: { log: (message: string) => void }) {
  const stage = pipelineStageRead(payload);
  ctx.log(`stage.started:${stage || "unknown"}`);
  pipelineStatusSet(resonanceLocalizedMessages.pipelineStageStartedTemplate.replace(
    "{stage}",
    stage || resonanceLocalizedMessages.pipelineUnknownStageLabel,
  ));
}

function pipelineStageCompletedEventHandle(payload: unknown, ctx: { log: (message: string) => void }) {
  const stage = pipelineStageRead(payload);
  ctx.log(`stage.completed:${stage || "unknown"}`);
  pipelineStatusSet(resonanceLocalizedMessages.pipelineStageCompletedTemplate.replace(
    "{stage}",
    stage || resonanceLocalizedMessages.pipelineUnknownStageLabel,
  ));
}

function pipelineStageRead(payload: unknown) {
  return String((payload as { stage?: string } | null)?.stage || "").trim();
}

function pipelineSpectrumReadyEventHandle(payload: unknown, ctx: { log: (message: string) => void }) {
  ctx.log("spectrum.ready");
  const ui = pipelineUiRenderGet();
  const spectrum = (payload as { spectrum?: { freqs?: number[]; mags?: number[]; dbs?: number[] } } | null)?.spectrum;
  const secondarySpectrum = (payload as { secondarySpectrum?: { freqs?: number[]; mags?: number[] } | null } | null)?.secondarySpectrum;
  const peakHoldSpectrum = (payload as { peakHoldSpectrum?: { freqs?: number[]; mags?: number[] } | null } | null)?.peakHoldSpectrum;
  if (!ui || !spectrum?.freqs || !spectrum?.mags) return;
  const state = (window as any).FFTState;
  const overlay = Array.isArray(state?.lastOverlay) ? state.lastOverlay : undefined;
  const builtinModes = Array.isArray(state?.lastModesDetected) ? state.lastModesDetected : [];
  const customModes = state
    ? customMeasurementModesBuildFromState(state, {
        freqs: spectrum.freqs,
        dbs: spectrum.dbs || spectrum.mags,
      })
    : [];
  const modes = [...builtinModes, ...customModes];
  const secondary = secondarySpectrum?.freqs && secondarySpectrum?.mags
    ? { freqs: secondarySpectrum.freqs, mags: secondarySpectrum.mags }
    : null;
  const peakHold = peakHoldSpectrum?.freqs && peakHoldSpectrum?.mags
    ? { freqs: peakHoldSpectrum.freqs, mags: peakHoldSpectrum.mags }
    : null;
  ui.renderSpectrum({
    freqs: spectrum.freqs,
    mags: spectrum.dbs || spectrum.mags,
    overlay,
    modes,
    secondarySpectrum: secondary,
    peakHoldSpectrum: peakHold,
    polymaxCandidates: Array.isArray(state?.lastPolymaxCandidates) ? state.lastPolymaxCandidates : [],
  });
}

function pipelineModesReadyEventHandle(payload: unknown, ctx: { log: (message: string) => void }) {
  ctx.log("modes.ready");
  const ui = pipelineUiRenderGet();
  const cards = Array.isArray((payload as { cards?: any[] } | null)?.cards) ? (payload as { cards?: any[] }).cards : [];
  if (!ui || !cards.length) return;
  ui.renderModes(cards);
  const state = (window as any).FFTState;
  const waveSlice = state?.lastWaveSlice;
  if (waveSlice) ui.renderWaveform(waveSlice);
  if (state) ui.renderEnergyTransferFromState(state);
}

function pipelineWaveformReadyEventHandle(payload: unknown, ctx: { log: (message: string) => void }) {
  ctx.log("waveform.ready");
  const ui = pipelineUiRenderGet();
  const runId = (payload as { runId?: string } | null)?.runId;
  const wave = (payload as { wave?: unknown } | null)?.wave;
  const state = (window as any).FFTState;
  if (runId && state?.lastWaveformRunId === runId) return;
  if (runId && state) state.lastWaveformRunId = runId;
  if (!ui || !wave) return;
  ui.renderWaveform(wave);
  const dbg = state?.waveDebug;
  const renderDbg = state?.waveRenderDebug;
  if (dbg && Number.isFinite(dbg.sampleRate) && Number.isFinite(dbg.waveLen)) {
    ui.setStatus(pipelineWaveformLoadedStatusBuild(dbg, renderDbg));
    console.info("[Resonance Reader] waveform scale", {
      sampleRate: dbg.sampleRate,
      waveLen: dbg.waveLen,
      endMs: dbg.endMs,
      pipelineMaxAbs: dbg.maxAbs ?? null,
      maxAbs: renderDbg?.maxAbs ?? null,
      yMax: renderDbg?.yMax ?? null,
      nanCount: renderDbg?.nanCount ?? null,
      nonZeroCount: renderDbg?.nonZeroCount ?? null,
    });
  }
}

function pipelineWaveformLoadedStatusBuild(dbg: any, renderDbg: any) {
  return resonanceLocalizedMessages.pipelineWaveformLoadedTemplate
    .replace("{sampleCount}", String(dbg.waveLen))
    .replace("{sampleRate}", String(dbg.sampleRate))
    .replace("{endLabel}", pipelineWaveformEndLabelRead(dbg))
    .replace("{renderDiagnostics}", pipelineWaveformRenderDiagnosticsBuild(renderDbg))
    .replace("{pipelineDiagnostics}", pipelineWaveformPipelineDiagnosticsBuild(dbg));
}

function pipelineWaveformEndLabelRead(dbg: any) {
  return Number.isFinite(dbg.endMs)
    ? `${Math.round(dbg.endMs)} ms`
    : resonanceLocalizedMessages.pipelineUnavailableLabel;
}

function pipelineWaveformRenderDiagnosticsBuild(renderDbg: any) {
  if (!renderDbg || !Number.isFinite(renderDbg.yMax)) return "";
  const maxAbs = Number.isFinite(renderDbg.maxAbs)
    ? renderDbg.maxAbs.toFixed(4)
    : resonanceLocalizedMessages.pipelineUnavailableLabel;
  return resonanceLocalizedMessages.pipelineWaveformRenderDiagnosticsTemplate
    .replace("{yMax}", renderDbg.yMax.toFixed(4))
    .replace("{maxAbs}", maxAbs);
}

function pipelineWaveformPipelineDiagnosticsBuild(dbg: any) {
  if (!Number.isFinite(dbg.maxAbs)) return "";
  return resonanceLocalizedMessages.pipelineWaveformPipelineDiagnosticsTemplate.replace(
    "{pipelineMax}",
    dbg.maxAbs.toFixed(4),
  );
}

function pipelineNotesReadyEventHandle(payload: unknown, ctx: { log: (message: string) => void }) {
  ctx.log("notes.ready");
  const ui = pipelineUiRenderGet();
  const noteCount = (payload as { notes?: { slices?: unknown[] } } | null)?.notes?.slices?.length ?? 0;
  if (!ui) return;
  const state = (window as any).FFTState;
  const waveSlice = state?.lastWaveSlice;
  if (waveSlice) ui.renderWaveform(waveSlice);
  if (state) ui.renderEnergyTransferFromState(state);
  if (!noteCount) {
    ui.setStatus(resonanceLocalizedMessages.pipelineNoNotesStatus);
    return;
  }
  if (noteCount === 1) {
    ui.setStatus(resonanceLocalizedMessages.pipelineOneNoteStatus);
    return;
  }
  ui.setStatus(resonanceLocalizedMessages.pipelineNotesDetectedTemplate.replace(
    "{noteCount}",
    String(noteCount),
  ));
}

function pipelineArtifactEmittedEventHandle(_payload: unknown, ctx: { log: (message: string) => void }) {
  ctx.log("artifact.emitted");
  pipelineStatusSet(resonanceLocalizedMessages.pipelineRenderReadyStatus);
}

function pipelineModeOverrideRequestedEventHandle(
  payload: unknown,
  ctx: { log: (message: string) => void; emit: (event: PipelineEventName, payload: unknown) => void },
) {
  const modeKey = (payload as { modeKey?: string } | null)?.modeKey;
  const requestedFreqHz = (payload as { requestedFreqHz?: number } | null)?.requestedFreqHz;
  if (!modeKey || !Number.isFinite(requestedFreqHz)) return;
  const state = (window as any).FFTState as Record<string, any> | undefined;
  if (!state) return;
  state.dofRefitRequested = true;
  const storedOnCustomMode = customMeasurementFrequencySetFromState(state, modeKey, requestedFreqHz as number);
  if (!storedOnCustomMode) {
    modeOverrideStateSet(state, modeKey, requestedFreqHz as number);
  }
  pipelineOverrideRerenderFromState(state);
  ctx.log(`mode.override.requested:${modeKey}`);
  ctx.emit("mode.override.updated", {
    modeKey,
    freqHz: requestedFreqHz,
    reason: "set",
    source: "label-drag",
  });
}

function pipelineModeOverrideResetRequestedEventHandle(
  payload: unknown,
  ctx: { log: (message: string) => void; emit: (event: PipelineEventName, payload: unknown) => void },
) {
  const modeKey = (payload as { modeKey?: string } | null)?.modeKey;
  if (!modeKey) return;
  const state = (window as any).FFTState as Record<string, any> | undefined;
  if (!state) return;
  state.dofRefitRequested = true;
  modeOverrideStateReset(state, modeKey);
  pipelineOverrideRerenderFromState(state);
  ctx.log(`mode.override.reset.requested:${modeKey}`);
  ctx.emit("mode.override.updated", {
    modeKey,
    freqHz: null,
    reason: "reset",
    source: "card-reset",
  });
}

function pipelineOverrideRerenderFromState(state: Record<string, any>) {
  const rerender = state?.rerenderFromLastSpectrum;
  if (typeof rerender !== "function") return;
  state.preserveSpectrumRangesOnNextRender = true;
  rerender();
}

function pipelineModeOverrideUpdatedEventHandle(
  payload: unknown,
  ctx: { log: (message: string) => void },
) {
  const modeKey = (payload as { modeKey?: string } | null)?.modeKey || "unknown";
  const reason = (payload as { reason?: string } | null)?.reason || "unknown";
  ctx.log(`mode.override.updated:${modeKey}:${reason}`);
}

export function wireResonatePipeline(bus: PipelineBus) {
  bus.wire("pipeline.started", pipelineStartEventHandle);
  bus.wire("pipeline.completed", pipelineCompletedEventHandle);
  bus.wire("pipeline.failed", pipelineFailedEventHandle);
  bus.wire("stage.started", pipelineStageStartedEventHandle);
  bus.wire("stage.completed", pipelineStageCompletedEventHandle);
  bus.wire("spectrum.ready", pipelineSpectrumReadyEventHandle);
  bus.wire("modes.ready", pipelineModesReadyEventHandle);
  bus.wire("waveform.ready", pipelineWaveformReadyEventHandle);
  bus.wire("notes.ready", pipelineNotesReadyEventHandle);
  bus.wire("artifact.emitted", pipelineArtifactEmittedEventHandle);
  bus.wire("mode.override.requested", pipelineModeOverrideRequestedEventHandle);
  bus.wire("mode.override.reset.requested", pipelineModeOverrideResetRequestedEventHandle);
  bus.wire("mode.override.updated", pipelineModeOverrideUpdatedEventHandle);
}
