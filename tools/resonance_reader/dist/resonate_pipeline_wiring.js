import { modeOverrideStateReset, modeOverrideStateSet } from "./resonate_mode_override_state.js";
import { customMeasurementFrequencySetFromState, customMeasurementModesBuildFromState, } from "./resonate_custom_measurements.js";
function pipelineUiRenderGet() {
    const ui = window.ResonateUiRender;
    if (!ui)
        return null;
    if (typeof ui.renderSpectrum !== "function")
        return null;
    if (typeof ui.renderModes !== "function")
        return null;
    if (typeof ui.renderWaveform !== "function")
        return null;
    if (typeof ui.renderEnergyTransferFromState !== "function")
        return null;
    if (typeof ui.setStatus !== "function")
        return null;
    return ui;
}
function pipelineStatusSet(message) {
    const status = window.ResonateStatus;
    if (typeof status?.setStatus !== "function")
        return;
    status.setStatus(message);
}
function pipelineStartEventHandle(_payload, ctx) {
    ctx.log("pipeline.started");
    pipelineStatusSet("Pipeline started.");
}
function pipelineCompletedEventHandle(_payload, ctx) {
    ctx.log("pipeline.completed");
    pipelineStatusSet("Pipeline completed.");
}
function pipelineFailedEventHandle(_payload, ctx) {
    ctx.log("pipeline.failed");
    pipelineStatusSet("Pipeline failed.");
}
function pipelineStageStartedEventHandle(payload, ctx) {
    const stage = payload?.stage || "unknown";
    ctx.log(`stage.started:${stage}`);
    pipelineStatusSet(`Running ${stage}...`);
}
function pipelineStageCompletedEventHandle(payload, ctx) {
    const stage = payload?.stage || "unknown";
    ctx.log(`stage.completed:${stage}`);
    pipelineStatusSet(`Completed ${stage}.`);
}
function pipelineSpectrumReadyEventHandle(payload, ctx) {
    ctx.log("spectrum.ready");
    const ui = pipelineUiRenderGet();
    const spectrum = payload?.spectrum;
    const secondarySpectrum = payload?.secondarySpectrum;
    if (!ui || !spectrum?.freqs || !spectrum?.mags)
        return;
    const state = window.FFTState;
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
    ui.renderSpectrum({
        freqs: spectrum.freqs,
        mags: spectrum.dbs || spectrum.mags,
        overlay,
        modes,
        secondarySpectrum: secondary,
    });
}
function pipelineModesReadyEventHandle(payload, ctx) {
    ctx.log("modes.ready");
    const ui = pipelineUiRenderGet();
    const cards = Array.isArray(payload?.cards) ? payload.cards : [];
    if (!ui || !cards.length)
        return;
    ui.renderModes(cards);
    const state = window.FFTState;
    if (state)
        ui.renderEnergyTransferFromState(state);
}
function pipelineWaveformReadyEventHandle(payload, ctx) {
    ctx.log("waveform.ready");
    const ui = pipelineUiRenderGet();
    const runId = payload?.runId;
    const wave = payload?.wave;
    const state = window.FFTState;
    if (runId && state?.lastWaveformRunId === runId)
        return;
    if (runId && state)
        state.lastWaveformRunId = runId;
    if (!ui || !wave)
        return;
    ui.renderWaveform(wave);
    const dbg = state?.waveDebug;
    const renderDbg = state?.waveRenderDebug;
    if (dbg && Number.isFinite(dbg.sampleRate) && Number.isFinite(dbg.waveLen)) {
        const endLabel = Number.isFinite(dbg.endMs) ? `${Math.round(dbg.endMs)} ms` : "n/a";
        const yLabel = renderDbg && Number.isFinite(renderDbg.yMax)
            ? ` yMax=${renderDbg.yMax.toFixed(4)} maxAbs=${Number.isFinite(renderDbg.maxAbs) ? renderDbg.maxAbs.toFixed(4) : "n/a"}`
            : "";
        const pipeLabel = Number.isFinite(dbg.maxAbs) ? ` pipeMax=${dbg.maxAbs.toFixed(4)}` : "";
        ui.setStatus(`Loaded. ${dbg.waveLen} samples @ ${dbg.sampleRate} Hz (${endLabel}).${yLabel}${pipeLabel}`);
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
function pipelineNotesReadyEventHandle(payload, ctx) {
    ctx.log("notes.ready");
    const ui = pipelineUiRenderGet();
    const noteCount = payload?.notes?.slices?.length ?? 0;
    if (!ui)
        return;
    const state = window.FFTState;
    const waveSlice = state?.lastWaveSlice;
    if (waveSlice)
        ui.renderWaveform(waveSlice);
    if (state)
        ui.renderEnergyTransferFromState(state);
    if (!noteCount) {
        ui.setStatus("No notes detected yet.");
        return;
    }
    ui.setStatus(`${noteCount} note${noteCount === 1 ? "" : "s"} detected.`);
}
function pipelineArtifactEmittedEventHandle(_payload, ctx) {
    ctx.log("artifact.emitted");
    pipelineStatusSet("Render ready.");
}
function pipelineModeOverrideRequestedEventHandle(payload, ctx) {
    const modeKey = payload?.modeKey;
    const requestedFreqHz = payload?.requestedFreqHz;
    if (!modeKey || !Number.isFinite(requestedFreqHz))
        return;
    const state = window.FFTState;
    if (!state)
        return;
    const storedOnCustomMode = customMeasurementFrequencySetFromState(state, modeKey, requestedFreqHz);
    if (!storedOnCustomMode) {
        modeOverrideStateSet(state, modeKey, requestedFreqHz);
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
function pipelineModeOverrideResetRequestedEventHandle(payload, ctx) {
    const modeKey = payload?.modeKey;
    if (!modeKey)
        return;
    const state = window.FFTState;
    if (!state)
        return;
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
function pipelineOverrideRerenderFromState(state) {
    const rerender = state?.rerenderFromLastSpectrum;
    if (typeof rerender !== "function")
        return;
    state.preserveSpectrumRangesOnNextRender = true;
    rerender();
}
function pipelineModeOverrideUpdatedEventHandle(payload, ctx) {
    const modeKey = payload?.modeKey || "unknown";
    const reason = payload?.reason || "unknown";
    ctx.log(`mode.override.updated:${modeKey}:${reason}`);
}
export function wireResonatePipeline(bus) {
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
