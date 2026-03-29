import { toneControllerCreateFromWindow } from "./resonate_tone_controller.js";
import { measureModeNormalize } from "./resonate_mode_config.js";
import { customMeasurementKeyIsCustom } from "./resonate_custom_measurements.js";

type UiBindingsDeps = {
  state: Record<string, any>;
  runResonatePipeline: (trigger: string) => Promise<void>;
  renderMock: () => void;
  setStatus: (text: string) => void;
  renderSpectrum: (payload: { freqs: number[]; mags: number[]; overlay?: number[]; modes?: any[] }) => void;
  renderModes: (modes: any[]) => void;
  renderWaveform: (wave: any) => void;
  pipelineBus?: PipelineBusLike;
};

type PipelineBusLike = {
  wire: (event: string, handler: (payload: any, ctx?: { log: (message: string) => void }) => void) => void;
};

type SaveState = "clean" | "dirty";

function saveButtonElementGet() {
  return document.getElementById("btn_save_audio") as HTMLButtonElement | null;
}

function saveStateRead(state: Record<string, any>): SaveState {
  return state.saveState === "dirty" ? "dirty" : "clean";
}

function saveStateWrite(state: Record<string, any>, next: SaveState) {
  state.saveState = next;
}

function saveButtonRenderFromState(state: Record<string, any>) {
  const button = saveButtonElementGet();
  if (!button) return;
  const next = saveStateRead(state);
  const isDirty = next === "dirty";
  button.textContent = isDirty ? "Save" : "✓ Saved";
  button.disabled = !isDirty;
  button.classList.toggle("save-state-dirty", isDirty);
  button.classList.toggle("save-state-clean", !isDirty);
}

function saveStateMarkDirtyAndRender(state: Record<string, any>) {
  saveStateWrite(state, "dirty");
  saveButtonRenderFromState(state);
}

function saveStateMarkCleanAndRender(state: Record<string, any>) {
  saveStateWrite(state, "clean");
  saveButtonRenderFromState(state);
}

function saveStatePipelineDirtySubscriptionAttach(
  bus: PipelineBusLike | undefined,
  state: Record<string, any>,
) {
  if (!bus?.wire) return;
  bus.wire("pipeline.completed", (payload: any) => {
    const trigger = String(payload?.summary?.trigger || "");
    if (trigger !== "import" && trigger !== "record") return;
    saveStateMarkDirtyAndRender(state);
  });
}

function recordingSelectLabelSet(label: string) {
  const select = document.getElementById("recording_select") as HTMLSelectElement | null;
  if (!select) return;
  select.innerHTML = "";
  const option = document.createElement("option");
  option.value = label;
  option.textContent = label;
  option.selected = true;
  select.appendChild(option);
  recordingSelectWidthSyncFromLabel(select, label);
}

function recordingSelectWidthSyncFromLabel(select: HTMLSelectElement, label: string) {
  const charUnits = recordingSelectWidthCharUnitsFromLabel(label);
  select.style.width = `${charUnits}ch`;
}

function recordingSelectWidthCharUnitsFromLabel(label: string) {
  const minCh = 14;
  const maxCh = 34;
  const paddingCh = 4;
  const textCh = Math.max(0, String(label || "").length);
  return Math.max(minCh, Math.min(maxCh, textCh + paddingCh));
}

function updateWaveTransportLabels() {
  const FFTAudio = (window as any).FFTAudio;
  if (!FFTAudio) return;
  const recording = FFTAudio.isRecordingActive?.() ?? false;
  const playing = FFTAudio.isPlaybackActive?.() ?? false;
  const btnRecord = document.getElementById("btn_wave_record") as HTMLButtonElement | null;
  const btnPlay = document.getElementById("btn_wave_play") as HTMLButtonElement | null;
  const btnStop = document.getElementById("btn_wave_stop") as HTMLButtonElement | null;
  if (btnRecord) {
    btnRecord.innerHTML = recording ? '<span class="transport-icon" aria-hidden="true">■</span>Stop' : '<span class="transport-icon" aria-hidden="true">⏺</span>Record';
    btnRecord.classList.toggle("is-active", recording);
  }
  if (btnPlay) {
    btnPlay.innerHTML = playing ? '<span class="transport-icon" aria-hidden="true">■</span>Stop' : '<span class="transport-icon" aria-hidden="true">▶</span>Play';
    btnPlay.classList.toggle("is-active", playing);
  }
  if (btnStop) btnStop.innerHTML = '<span class="transport-icon" aria-hidden="true">■</span>Stop';
}

function recordCaptureRunFromMic(deps: UiBindingsDeps) {
  deps.state.viewRangeMs = null;
  deps.state.noteSelectionRangeMs = null;
  updateWaveTransportLabels();
  const current = (window as any).FFTState?.currentWave || null;
  const wave = current?.wave || current?.samples || null;
  const sampleRate = current?.sampleRate || null;
  const input = { trigger: "record", source: { wave, sampleRate, sourceKind: "mic" } };
  const config = { version: "v1", stages: ["ingest", "refresh"] };
  const runner = (window as any).ResonatePipelineRunner;
  recordingSelectLabelSet("Recording (mic)");
  if (!runner?.run) {
    console.warn("[Resonance Reader] Pipeline runner missing while event rendering is enabled.");
  } else {
    runner.run(input, config).catch((err: any) => console.error("[Resonance Reader] refresh after record failed", err));
  }
  deps.setStatus("Recorded.");
}

function recordToggleFromMic(deps: UiBindingsDeps) {
  const FFTAudio = (window as any).FFTAudio;
  if (!FFTAudio) return;
  const state = deps.state as Record<string, any>;
  const previewDispatch = state.__livePreviewDispatch || (state.__livePreviewDispatch = livePreviewDispatchBuild());
  if (FFTAudio.isRecordingActive()) {
    previewDispatch.stop?.();
    FFTAudio.stopRecording();
    updateWaveTransportLabels();
    deps.setStatus("Recording stopped.");
    return;
  }
  updateWaveTransportLabels();
  deps.setStatus("Recording...");
  previewDispatch.start?.();
  FFTAudio.startRecording({
    onPreview: (wave: Float64Array, sampleRate: number) => {
      previewDispatch.push?.(wave, sampleRate, deps);
    },
    onDone: () => {
      previewDispatch.stop?.();
      recordCaptureRunFromMic(deps);
    },
  }).then(() => {
    updateWaveTransportLabels();
  }).catch((err: any) => {
    previewDispatch.stop?.();
    console.error("[Resonance Reader] record failed", err);
    deps.setStatus("Recording failed or denied.");
    updateWaveTransportLabels();
  });
}

function livePreviewDispatchBuild() {
  let running = false;
  let inFlight = false;
  let latest: { wave: Float64Array; sampleRate: number } | null = null;
  const previewConfig = { version: "v1", stages: ["ingest", "refresh"] };
  const runNext = (deps: UiBindingsDeps) => {
    if (!running || inFlight || !latest) return;
    const payload = latest;
    latest = null;
    inFlight = true;
    const runner = (window as any).ResonatePipelineRunner;
    if (!runner?.run) {
      inFlight = false;
      return;
    }
    const input = {
      trigger: "record.preview",
      source: {
        wave: payload.wave,
        sampleRate: payload.sampleRate,
        sourceKind: "mic",
      },
    };
    runner.run(input, previewConfig)
      .catch((err: any) => {
        console.warn("[Resonance Reader] live FFT preview failed", err);
      })
      .finally(() => {
        inFlight = false;
        if (latest) runNext(deps);
      });
  };

  return {
    start() {
      running = true;
      latest = null;
      inFlight = false;
    },
    stop() {
      running = false;
      latest = null;
    },
    push(wave: Float64Array, sampleRate: number, deps: UiBindingsDeps) {
      if (!running) return;
      latest = { wave, sampleRate };
      runNext(deps);
    },
  };
}

function bindImport(deps: UiBindingsDeps) {
  const btnImport = document.getElementById("btn_import");
  const fileInput = document.getElementById("file_input") as HTMLInputElement | null;
  if (!btnImport || !fileInput) return;
  btnImport.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    deps.setStatus(`Loading ${file.name}...`);
    recordingSelectLabelSet(file.name);
    try {
      deps.state.viewRangeMs = null;
      deps.state.noteSelectionRangeMs = null;
      const runner = (window as any).ResonatePipelineRunner;
      if (!runner?.run) {
        throw new Error("Resonance pipeline runner not available");
      }
      const input = { trigger: "import", source: { file, sourceKind: "file" } };
      const config = { version: "v1", stages: ["ingest", "refresh"] };
      await runner.run(input, config);
      deps.setStatus("Loaded.");
    } catch (err) {
      console.error("[Resonance Reader] import failed", err);
      deps.setStatus("Import failed. Try a short WAV/AIFF file.");
    }
  });
}

function bindSaveAudio(deps: UiBindingsDeps) {
  const btnSave = document.getElementById("btn_save_audio");
  if (!btnSave) return;
  btnSave.addEventListener("click", () => {
    if (saveStateRead(deps.state) !== "dirty") return;
    const FFTAudio = (window as any).FFTAudio;
    const hasWave = Boolean((window as any).FFTState?.currentWave);
    if (!hasWave) {
      saveStateMarkCleanAndRender(deps.state);
      deps.setStatus("Load or record before saving.");
      return;
    }
    if (typeof FFTAudio?.saveCurrentAudio === "function") {
      FFTAudio.saveCurrentAudio();
      saveStateMarkCleanAndRender(deps.state);
      deps.setStatus("Saved.");
    } else {
      deps.setStatus("Save unavailable.");
    }
  });
}

function bindRecord(deps: UiBindingsDeps) {
  const btn = document.getElementById("btn_record");
  if (!btn) return;
  btn.addEventListener("click", () => {
    recordToggleFromMic(deps);
  });
}

function bindWaveTransport(deps: UiBindingsDeps) {
  bindToneControl(deps.state);
  const btnRecord = document.getElementById("btn_wave_record");
  const btnPlay = document.getElementById("btn_wave_play");
  const btnStop = document.getElementById("btn_wave_stop");
  const btnReset = document.getElementById("btn_reset_zoom");
  if (btnRecord) {
    btnRecord.addEventListener("click", () => {
      const mainRecord = document.getElementById("btn_record");
      if (mainRecord) {
        (mainRecord as HTMLButtonElement).click();
        updateWaveTransportLabels();
        return;
      }
      recordToggleFromMic(deps);
    });
  }
  if (btnPlay) {
    btnPlay.addEventListener("click", () => {
      const FFTAudio = (window as any).FFTAudio;
      if (!FFTAudio?.playCurrent || !FFTAudio?.isPlaybackActive) return;
      if (FFTAudio.isPlaybackActive()) {
        FFTAudio.stopPlayback?.();
        updateWaveTransportLabels();
        return;
      }
      if (FFTAudio.playCurrent(() => updateWaveTransportLabels())) updateWaveTransportLabels();
    });
  }
  if (btnStop) {
    btnStop.addEventListener("click", () => {
      const FFTAudio = (window as any).FFTAudio;
      FFTAudio?.stopAll?.();
      updateWaveTransportLabels();
      deps.setStatus("Stopped.");
    });
  }
  if (btnReset) {
    btnReset.addEventListener("click", () => {
      const plot = document.getElementById("plot_waveform");
      if (plot && (window as any).Plotly) {
        (window as any).Plotly.relayout(plot, { "xaxis.autorange": true });
      }
    });
  }
}

function bindToneControl(state: Record<string, any>) {
  const btnTone = document.getElementById("btn_wave_tone") as HTMLButtonElement | null;
  if (!btnTone) return;
  const tone = toneControllerCreateFromWindow(window);
  toneStateWrite(state, false);
  toneButtonRenderFromState(btnTone, toneStateRead(state));
  btnTone.addEventListener("click", () => {
    const next = !toneStateRead(state);
    toneStateWrite(state, next);
    tone.toneEnableSet(next);
    if (!next) tone.toneStop();
    toneButtonRenderFromState(btnTone, next);
  });
}

function toneStateRead(state: Record<string, any>) {
  return Boolean(state.toneEnabled);
}

function toneStateWrite(state: Record<string, any>, enabled: boolean) {
  state.toneEnabled = enabled;
}

function toneButtonRenderFromState(button: HTMLButtonElement, enabled: boolean) {
  button.setAttribute("aria-pressed", enabled ? "true" : "false");
  button.classList.toggle("is-active", enabled);
}

export function uiBindingsAttach(deps: UiBindingsDeps) {
  const attach = () => {
    saveStateMarkCleanAndRender(deps.state);
    saveStatePipelineDirtySubscriptionAttach(deps.pipelineBus, deps.state);
    recordingSelectInitialWidthSync();
    bindImport(deps);
    bindSaveAudio(deps);
    bindRecord(deps);
    bindWaveTransport(deps);
    bindMeasureMode(deps);
    let hasStartup = false;
    const startup = (window as any).ResonateStartup;
    if (startup?.startupPlanBuildFromMode && startup?.startupModeSelectFromFlag && startup?.startupExecuteFromPlan) {
      const plan = startup.startupPlanBuildFromMode(startup.startupModeSelectFromFlag(startup.RESONATE_STARTUP_RUNNER_FLAG.defaultValue));
      startup.startupExecuteFromPlan(plan, {
        runRunner: () => deps.runResonatePipeline("startup"),
        renderMock: deps.renderMock,
        setStatus: deps.setStatus,
      });
      hasStartup = true;
    }
    if (!hasStartup) {
      deps.renderMock();
      deps.setStatus("Load or record to view the waveform.");
    }
    const uiEvents = (window as any).ResonateUiEvents;
    if (uiEvents?.RESONATE_UI_EVENT_FLAG?.defaultValue) {
      uiEvents.uiEventSubscriptionAttach(deps.state, deps.pipelineBus);
    }
  };
  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", attach);
  } else {
    attach();
  }
}

function recordingSelectInitialWidthSync() {
  const select = document.getElementById("recording_select") as HTMLSelectElement | null;
  if (!select) return;
  const selected = select.options[select.selectedIndex];
  const label = (selected?.textContent || "Demo (click record)").trim();
  recordingSelectWidthSyncFromLabel(select, label);
}

function measureModeSelectElementGet() {
  return document.getElementById("measure_mode") as HTMLSelectElement | null;
}

function measureModeStateSeedFromSelect(state: Record<string, any>) {
  const select = measureModeSelectElementGet();
  state.measureMode = measureModeNormalize(select?.value);
}

function energyTransferPanelSyncFromState(state: Record<string, any>) {
  const render = (window as any).ResonateUiRender?.renderEnergyTransferFromState;
  if (typeof render !== "function") return;
  render(state);
}

function measureModeChangeHandle(deps: UiBindingsDeps) {
  const select = measureModeSelectElementGet();
  if (!select) return;
  const nextMode = measureModeNormalize(select.value);
  measureModeChangeApply(nextMode, deps);
}

export function measureModeChangeApply(
  nextMode: "guitar" | "played_note" | "plate_stock" | "brace_stock",
  deps: Pick<UiBindingsDeps, "state" | "renderMock" | "renderModes" | "runResonatePipeline" | "setStatus">,
) {
  deps.state.measureMode = nextMode;
  deps.state.lastOverlay = undefined;
  if (measureModeChangeShouldReseedDemoWave()) {
    measureModeStateResetForDemoWave(deps.state);
  }
  measureModeStatePreserveCustomCardsOnly(deps.state);
  renderTryModePanelForMeasureMode(nextMode, deps as UiBindingsDeps);
  energyTransferPanelSyncFromState(deps.state);
  deps.renderModes(Array.isArray(deps.state.lastModeCards) ? deps.state.lastModeCards : []);
  if (measureModeChangeShouldRunPipelineForDemoWave()) {
    runMeasureModePipelineRefresh(deps);
    return;
  }
  if (measureModeChangeShouldRenderMock(deps.state)) {
    deps.renderMock();
    deps.setStatus("Load or record to view the waveform.");
    return;
  }
  rerenderFromLastSpectrumIfPossible(deps.state);
  runMeasureModePipelineRefresh(deps);
}

export function measureModeChangeShouldRenderMock(state: Record<string, any>) {
  return !state?.currentWave;
}

export function measureModeChangeShouldReseedDemoWave() {
  return recordingSelectValueRead() === "";
}

export function measureModeChangeShouldRunPipelineForDemoWave() {
  return measureModeChangeShouldReseedDemoWave();
}

export function measureModeStatePreserveCustomCardsOnly(state: Record<string, any>) {
  const cards = Array.isArray(state?.lastModeCards) ? state.lastModeCards : [];
  state.lastModeCards = cards.filter((card) => customMeasurementKeyIsCustom(String(card?.key || "")));
  state.lastModesDetected = [];
}

export function measureModeStateResetForDemoWave(state: Record<string, any>) {
  state.currentWave = null;
  state.lastSpectrum = null;
  state.lastSpectrumRaw = null;
  state.lastSpectrumNoteSelection = null;
}

function renderTryModePanelForMeasureMode(
  measureMode: "guitar" | "played_note" | "plate_stock" | "brace_stock",
  deps: UiBindingsDeps,
) {
  if (measureMode === "guitar" || measureMode === "played_note") return;
  deps.state.modeTargets = {};
}

function recordingSelectValueRead() {
  return recordingSelectElementGet()?.value || "";
}

function recordingSelectElementGet() {
  return document.getElementById("recording_select") as HTMLSelectElement | null;
}

function rerenderFromLastSpectrumIfPossible(state: Record<string, any>) {
  if (typeof state?.rerenderFromLastSpectrum !== "function") return;
  state.preserveSpectrumRangesOnNextRender = true;
  state.rerenderFromLastSpectrum({ skipDof: true });
}

function runMeasureModePipelineRefresh(
  deps: Pick<UiBindingsDeps, "state" | "runResonatePipeline">,
) {
  deps.runResonatePipeline("measure-mode-change").catch(() => rerenderFromLastSpectrumIfPossible(deps.state));
}

function bindMeasureMode(deps: UiBindingsDeps) {
  measureModeStateSeedFromSelect(deps.state);
  energyTransferPanelSyncFromState(deps.state);
  const select = measureModeSelectElementGet();
  if (!select) return;
  select.addEventListener("change", () => measureModeChangeHandle(deps));
}
