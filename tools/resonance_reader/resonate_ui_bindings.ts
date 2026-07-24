import { toneControllerCreateFromWindow } from "./resonate_tone_controller.js";
import { measureModeNormalize, type MeasureMode } from "./resonate_mode_config.js";
import {
  consumeResonanceNotebookConnectDraft,
  restoreResonanceNotebookConnectDraftState,
} from "./resonate_notebook_connect_draft.js";
import { restoreResonanceNotebookEventIntoState } from "./resonate_notebook_restore.js";
import { resonanceSaveRunnerCreate } from "./resonate_save_target.js";
import type { ResonanceSaveActionRunner } from "./resonate_save_contract.js";
import { customMeasurementKeyIsCustom } from "./resonate_custom_measurements.js";
import { settingsModalBind } from "./resonate_settings_modal.js";
import {
  takeOverlayCaptureCurrentFromState,
  takeOverlayClearAll,
  takeOverlayCurrentPayloadBuild,
  takeOverlayListRead,
  takeOverlaySelectAsCurrent,
} from "./resonate_take_overlays.js";
import { resonancePerTabSessionCreate } from "./resonate_per_tab_session.js";

type ResonancePerTabSession = {
  restoreIntoState(state: Record<string, any>): Promise<boolean>;
  persistFromState(state: Record<string, any>): Promise<void>;
};

type UiBindingsDeps = {
  state: Record<string, any>;
  runResonatePipeline: (trigger: string) => Promise<void>;
  renderMock: () => void;
  setStatus: (text: string) => void;
  renderSpectrum: (payload: { freqs: number[]; mags: number[]; overlay?: number[]; modes?: any[]; takeOverlays?: ReturnType<typeof takeOverlayCurrentPayloadBuild> }) => void;
  renderModes: (modes: any[]) => void;
  renderWaveform: (wave: any) => void;
  pipelineBus?: PipelineBusLike;
  perTabSession?: ResonancePerTabSession | null;
};

const resonanceSaveRunner = resonanceSaveRunnerCreate();

type PipelineBusLike = {
  wire: (event: string, handler: (payload: any, ctx?: { log: (message: string) => void }) => void) => void;
};

type SaveState = "clean" | "dirty";
type SaveSurfaceMode = "offline" | "lab-disconnected" | "lab-connected";

function saveButtonElementGet() {
  return document.getElementById("btn_save_audio") as HTMLButtonElement | null;
}

function saveStateRead(state: Record<string, any>): SaveState {
  return state.saveState === "dirty" ? "dirty" : "clean";
}

function saveSurfaceModeRead(state: Record<string, any>): SaveSurfaceMode {
  return state.saveSurfaceMode || "lab-disconnected";
}

function saveStateWrite(state: Record<string, any>, next: SaveState) {
  state.saveState = next;
}

function saveSurfaceModeWrite(state: Record<string, any>, next: SaveSurfaceMode) {
  state.saveSurfaceMode = next;
}

function saveSurfaceHintRead(state: Record<string, any>): string {
  return String(state.saveSurfaceHint || "").trim();
}

function saveSurfaceHintWrite(state: Record<string, any>, next: string) {
  state.saveSurfaceHint = String(next || "").trim();
}

function saveButtonRenderFromState(state: Record<string, any>) {
  const button = saveButtonElementGet();
  if (!button) return;
  const next = saveStateRead(state);
  const isDirty = next === "dirty";
  button.textContent = isDirty ? saveButtonLabelBuild(saveSurfaceModeRead(state)) : "✓ Saved";
  button.disabled = !isDirty;
  button.classList.toggle("save-state-dirty", isDirty);
  button.classList.toggle("save-state-clean", !isDirty);
}

function saveButtonLabelBuild(saveSurfaceMode: SaveSurfaceMode): string {
  if (saveSurfaceMode === "offline") return "Save";
  if (saveSurfaceMode === "lab-disconnected") return "Save ▾";
  return "Save";
}

export function readResonanceIdleStatus(state: Record<string, any>): string {
  const base = "Load or record to view the waveform.";
  const hint = saveSurfaceHintRead(state);

  if (!hint) {
    return base;
  }

  return `${base} ${hint}`;
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

function perTabSessionPersist(deps: UiBindingsDeps): Promise<void> {
  return perTabSessionResolve(deps)?.persistFromState(deps.state).catch((error) => {
    console.warn("[Resonance Reader] Per-tab restoration save failed", error);
  }) || Promise.resolve();
}

function perTabSessionResolve(deps: UiBindingsDeps) {
  return deps.perTabSession || resonancePerTabSessionCreate();
}

function recordingMenuLabelSet(label: string, state?: Record<string, any>) {
  if (state) state.recordingLabel = label;
  const menu = takeOverlayMenuElementGet();
  if (!menu) return;
  menu.textContent = label;
  recordingMenuWidthSyncFromLabel(menu, label);
}

function recordingMenuWidthSyncFromLabel(menu: HTMLButtonElement, label: string) {
  const charUnits = recordingMenuWidthCharUnitsFromLabel(label);
  menu.style.width = `${charUnits}ch`;
}

function recordingMenuWidthCharUnitsFromLabel(label: string) {
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
  recordingMenuLabelSet("Recording (mic)", deps.state);
  takeOverlayControlsRender(deps);
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
    state.__livePreviewActive = false;
    FFTAudio.stopRecording();
    updateWaveTransportLabels();
    deps.setStatus("Recording stopped.");
    return;
  }
  updateWaveTransportLabels();
  deps.setStatus("Recording...");
  takeOverlayCaptureCurrentAndRender(deps);
  state.__livePreviewActive = true;
  delete state.peakHoldSpectrumState;
  previewDispatch.start?.();
  FFTAudio.startRecording({
    onPreview: (wave: Float64Array, sampleRate: number) => {
      previewDispatch.push?.(wave, sampleRate, deps);
    },
    onDone: () => {
      previewDispatch.stop?.();
      state.__livePreviewActive = false;
      recordCaptureRunFromMic(deps);
    },
  }).then(() => {
    updateWaveTransportLabels();
  }).catch((err: any) => {
    previewDispatch.stop?.();
    state.__livePreviewActive = false;
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
  const btnImport = document.getElementById("btn_import") as HTMLElement | null;
  const fileInput = document.getElementById("file_input") as HTMLInputElement | null;
  if (!btnImport || !fileInput) return;
  btnImport.addEventListener("click", () => {
    importFileInputPrepare(fileInput);
    if (importControlRequiresProgrammaticClick(btnImport, fileInput)) {
      fileInput.click();
    }
  });
  btnImport.addEventListener("keydown", (event) => {
    if (!importControlUsesNativeLabel(btnImport, fileInput)) return;
    if (!importKeyShouldOpenChooser(event)) return;
    event.preventDefault();
    importFileInputPrepare(fileInput);
    fileInput.click();
  });
  fileInput.addEventListener("change", async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    takeOverlayCaptureCurrentAndRender(deps);
    deps.setStatus(`Loading ${file.name}...`);
    recordingMenuLabelSet(file.name, deps.state);
    takeOverlayControlsRender(deps);
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

function takeOverlayCaptureCurrentAndRender(deps: UiBindingsDeps) {
  if (!takeOverlayCaptureCurrentFromState(deps.state)) return;
  takeOverlayControlsRender(deps);
}

function bindTakeOverlayControls(deps: UiBindingsDeps) {
  const menu = takeOverlayMenuElementGet();
  const panel = takeOverlayPanelElementGet();
  const clear = takeOverlayClearElementGet();
  if (menu && panel) {
    menu.addEventListener("click", () => takeOverlayPanelToggle(menu, panel));
  }
  if (panel) {
    panel.addEventListener("click", (event) => takeOverlayPanelClickHandle(event, deps));
  }
  if (clear) {
    clear.addEventListener("click", () => takeOverlayClearAndRender(deps));
  }
}

function takeOverlayClearAndRender(deps: UiBindingsDeps) {
  takeOverlayClearAll(deps.state);
  perTabSessionPersist(deps);
  takeOverlayControlsRender(deps);
  rerenderFromLastSpectrumIfPossible(deps.state);
}

function takeOverlayPanelToggle(menu: HTMLButtonElement, panel: HTMLElement) {
  if (menu.disabled) return;
  const expanded = menu.getAttribute("aria-expanded") === "true";
  menu.setAttribute("aria-expanded", expanded ? "false" : "true");
  panel.hidden = expanded;
}

function takeOverlayPanelClickHandle(event: Event, deps: UiBindingsDeps) {
  const clearButton = (event.target as HTMLElement | null)?.closest?.("[data-take-overlay-clear]") as HTMLButtonElement | null;
  if (clearButton) {
    takeOverlayClearAndRender(deps);
    return;
  }
  const row = takeOverlaySelectRowResolveFromEvent(event);
  if (!row) return;
  takeOverlaySelectAsCurrent(deps.state, row.dataset.takeOverlayId || "");
  perTabSessionPersist(deps);
  takeOverlayControlsRender(deps);
  takeOverlayPanelClose();
  takeOverlayCurrentTakeRender(deps);
}

function takeOverlaySelectRowResolveFromEvent(event: Event) {
  return (event.target as HTMLElement | null)?.closest?.(".take-overlay-row[data-take-overlay-id]") as HTMLElement | null;
}

function takeOverlayCurrentTakeRender(deps: UiBindingsDeps) {
  recordingMenuLabelSet(takeOverlayCurrentLabelRead(deps.state), deps.state);
  deps.renderModes(Array.isArray(deps.state.lastModeCards) ? deps.state.lastModeCards : []);
  if (deps.state.lastWaveSlice) deps.renderWaveform(deps.state.lastWaveSlice);
  rerenderFromLastSpectrumIfPossible(deps.state);
}

function takeOverlayPanelClose() {
  const menu = takeOverlayMenuElementGet();
  const panel = takeOverlayPanelElementGet();
  if (menu) menu.setAttribute("aria-expanded", "false");
  if (panel) panel.hidden = true;
}

function takeOverlayControlsRender(deps: UiBindingsDeps) {
  const controls = takeOverlayControlsElementGet();
  const panel = takeOverlayPanelElementGet();
  const menu = takeOverlayMenuElementGet();
  const clear = takeOverlayClearElementGet();
  const overlays = takeOverlayListRead(deps.state);
  if (!controls || !panel || !menu || !clear) return;
  menu.disabled = overlays.length === 0;
  clear.hidden = overlays.length === 0;
  recordingMenuLabelSet(takeOverlayCurrentLabelRead(deps.state));
  panel.innerHTML = takeOverlayPanelHtmlBuild(deps.state, overlays);
  if (!overlays.length) {
    panel.hidden = true;
    menu.setAttribute("aria-expanded", "false");
  }
}

function takeOverlayPanelHtmlBuild(
  state: Record<string, any>,
  overlays: ReturnType<typeof takeOverlayListRead>,
) {
  return [
    takeOverlayCurrentRowHtmlBuild(takeOverlayCurrentLabelRead(state)),
    ...overlays.map(takeOverlayRowHtmlBuild),
  ].join("");
}

function takeOverlayCurrentRowHtmlBuild(label: string) {
  return [
    `<div class="take-overlay-row is-current" aria-current="true">`,
    `<span class="take-overlay-row__label">${takeOverlayHtmlEscape(label)}</span>`,
    `<span class="take-overlay-row__state">Current</span>`,
    `</div>`,
  ].join("");
}

function takeOverlayRowHtmlBuild(take: ReturnType<typeof takeOverlayListRead>[number]) {
  return [
    `<button class="take-overlay-row" type="button" data-take-overlay-id="${takeOverlayHtmlEscape(take.id)}" data-take-overlay-select="true">`,
    `<span class="take-overlay-row__label">${takeOverlayHtmlEscape(take.label)}</span>`,
    `<span class="take-overlay-row__state">Select</span>`,
    `</button>`,
  ].join("");
}

function takeOverlayCurrentLabelRead(state: Record<string, any>) {
  const label = String(state.recordingLabel || "").trim();
  if (label) return label;
  return takeOverlayMenuElementGet()?.textContent?.trim() || "Demo (click record)";
}

function takeOverlayHtmlEscape(value: string) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  }[char] || char));
}

function takeOverlayControlsElementGet() {
  return document.getElementById("take_overlay_controls") as HTMLElement | null;
}

function takeOverlayMenuElementGet() {
  return document.getElementById("take_overlay_menu") as HTMLButtonElement | null;
}

function takeOverlayPanelElementGet() {
  return document.getElementById("take_overlay_panel") as HTMLElement | null;
}

function takeOverlayClearElementGet() {
  return document.getElementById("take_overlay_clear") as HTMLButtonElement | null;
}

export function importFileInputPrepare(fileInput: HTMLInputElement) {
  fileInput.value = "";
}

export function importControlUsesNativeLabel(control: HTMLElement, fileInput: HTMLInputElement) {
  return importControlTagNameRead(control) === "label" && (control as HTMLLabelElement).htmlFor === fileInput.id;
}

function importControlRequiresProgrammaticClick(control: HTMLElement, fileInput: HTMLInputElement) {
  return !importControlUsesNativeLabel(control, fileInput);
}

function importKeyShouldOpenChooser(event: KeyboardEvent) {
  return event.key === "Enter" || event.key === " ";
}

function importControlTagNameRead(control: HTMLElement) {
  return control.tagName.toLowerCase();
}

function bindSaveAudio(deps: UiBindingsDeps) {
  const btnSave = document.getElementById("btn_save_audio");
  if (!btnSave) return;
  bindSaveAudioClick(btnSave, deps, resonanceSaveRunner);
}

function bindSaveAudioClick(
  button: HTMLElement,
  deps: UiBindingsDeps,
  saveRunner: ResonanceSaveActionRunner,
) {
  button.addEventListener("click", () => {
    if (saveStateRead(deps.state) !== "dirty") return;
    void runResonanceSaveActionAndRenderCleanState(deps, saveRunner);
  });
}

async function runResonanceSaveActionAndRenderCleanState(
  deps: UiBindingsDeps,
  saveRunner: ResonanceSaveActionRunner,
) {
  const button = saveButtonElementGet();
  const saved = await saveRunner.runResonanceSaveAction({
    state: deps.state,
    button,
    setStatus: deps.setStatus,
  });
  if (saved) {
    saveStateMarkCleanAndRender(deps.state);
  }
}

async function refreshResonanceSaveSurfaceAndRender(
  state: Record<string, any>,
  saveRunner: ResonanceSaveActionRunner,
  setStatus?: (text: string) => void,
) {
  const saveSurface = await saveRunner.readResonanceSaveSurface();
  saveSurfaceModeWrite(state, saveSurface.mode);
  saveSurfaceHintWrite(state, readResonanceSaveSurfaceHint(saveSurface));
  saveButtonRenderFromState(state);
  renderResonanceIdleStatusWhenAppropriate(state, setStatus);
}

function readResonanceSaveSurfaceHint(saveSurface: Awaited<ReturnType<ResonanceSaveActionRunner["readResonanceSaveSurface"]>>): string {
  return String(saveSurface && "hint" in saveSurface ? saveSurface.hint || "" : "").trim();
}

function renderResonanceIdleStatusWhenAppropriate(
  state: Record<string, any>,
  setStatus: ((text: string) => void) | undefined,
) {
  if (!setStatus || !shouldRenderResonanceIdleStatus(state)) {
    return;
  }

  setStatus(readResonanceIdleStatus(state));
}

function shouldRenderResonanceIdleStatus(state: Record<string, any>) {
  return saveStateRead(state) === "clean" && !state.currentWave;
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
    if (next) toneFrequencyStateReset(state);
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

function toneFrequencyStateReset(state: Record<string, any>) {
  state.toneFreqHz = null;
}

function toneButtonRenderFromState(button: HTMLButtonElement, enabled: boolean) {
  button.setAttribute("aria-pressed", enabled ? "true" : "false");
  button.classList.toggle("is-active", enabled);
}

export function uiBindingsAttach(deps: UiBindingsDeps) {
  const attach = async () => {
    const restoredNotebookDraft = restoreNotebookConnectDraftIntoUi(deps);
    if (restoredNotebookDraft) {
      saveStateMarkDirtyAndRender(deps.state);
    } else {
      saveStateMarkCleanAndRender(deps.state);
    }
    await refreshResonanceSaveSurfaceAndRender(deps.state, resonanceSaveRunner, deps.setStatus);
    saveStatePipelineDirtySubscriptionAttach(deps.pipelineBus, deps.state);
    deps.pipelineBus?.wire("pipeline.completed", () => perTabSessionPersist(deps));
    recordingMenuInitialWidthSync();
    bindImport(deps);
    bindSaveAudio(deps);
    bindRecord(deps);
    bindWaveTransport(deps);
    bindTakeOverlayControls(deps);
    takeOverlayControlsRender(deps);
    settingsModalBind(deps);
    bindMeasureMode(deps);
    if (restoredNotebookDraft) {
      deps.setStatus("Notebook connected. Review the draft and save again.");
      return;
    }
    if (await restoreNotebookEventIntoUi(deps)) {
      saveStateMarkCleanAndRender(deps.state);
      deps.setStatus("Notebook event restored.");
      return;
    }
    if (await restorePerTabSessionIntoUi(deps)) {
      return;
    }
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
      deps.setStatus(readResonanceIdleStatus(deps.state));
    }
    const uiEvents = (window as any).ResonateUiEvents;
    if (uiEvents?.RESONATE_UI_EVENT_FLAG?.defaultValue) {
      uiEvents.uiEventSubscriptionAttach(deps.state, deps.pipelineBus);
    }
  };
  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", () => {
      void attach();
    });
  } else {
    void attach();
  }
}

async function restorePerTabSessionIntoUi(deps: UiBindingsDeps): Promise<boolean> {
  if (!await perTabSessionResolve(deps)?.restoreIntoState(deps.state)) {
    return false;
  }
  restoreNotebookConnectDraftControls(deps.state);
  renderNotebookConnectDraftIntoUi(deps);
  takeOverlayControlsRender(deps);
  saveStateMarkDirtyAndRender(deps.state);
  return true;
}

export function restoreNotebookConnectDraftIntoUi(deps: UiBindingsDeps): boolean {
  const draft = consumeResonanceNotebookConnectDraft(window);

  if (!restoreResonanceNotebookConnectDraftState(deps.state, draft)) {
    return false;
  }

  restoreNotebookConnectDraftControls(deps.state);
  renderNotebookConnectDraftIntoUi(deps);
  return true;
}

async function restoreNotebookEventIntoUi(deps: UiBindingsDeps): Promise<boolean> {
  const restored = await restoreResonanceNotebookEventIntoState({
    runtime: window,
    state: deps.state,
  });

  if (!restored) {
    return false;
  }

  restoreNotebookConnectDraftControls(deps.state);
  renderNotebookConnectDraftIntoUi(deps);
  return true;
}

function restoreNotebookConnectDraftControls(state: Record<string, any>) {
  writeMeasureModeSelectValue(state.measureMode);
  recordingMenuLabelSet(String(state.recordingLabel || "Notebook draft"), state);
}

function writeMeasureModeSelectValue(measureMode: unknown) {
  const select = measureModeSelectElementGet();
  const normalized = measureModeNormalize(measureMode);

  if (!select || !normalized) {
    return;
  }

  select.value = normalized;
}

function renderNotebookConnectDraftIntoUi(deps: UiBindingsDeps) {
  renderNotebookConnectDraftSpectrum(deps);
  renderNotebookConnectDraftModes(deps);
  renderNotebookConnectDraftWaveform(deps);
}

function renderNotebookConnectDraftSpectrum(deps: UiBindingsDeps) {
  const spectrum = deps.state.lastSpectrum;

  if (!spectrum?.freqs?.length || !spectrum?.dbs?.length) {
    return;
  }

  deps.renderSpectrum({
    freqs: spectrum.freqs,
    mags: spectrum.dbs,
    overlay: Array.isArray(deps.state.lastOverlay) ? deps.state.lastOverlay : undefined,
    modes: Array.isArray(deps.state.lastModesDetected) ? deps.state.lastModesDetected : [],
  });
}

function renderNotebookConnectDraftModes(deps: UiBindingsDeps) {
  deps.renderModes(Array.isArray(deps.state.lastModeCards) ? deps.state.lastModeCards : []);
}

function renderNotebookConnectDraftWaveform(deps: UiBindingsDeps) {
  if (!deps.state.currentWave) {
    return;
  }

  deps.renderWaveform(deps.state.currentWave);
}

function recordingMenuInitialWidthSync() {
  const menu = takeOverlayMenuElementGet();
  if (!menu) return;
  recordingMenuWidthSyncFromLabel(menu, menu.textContent || "Demo (click record)");
}

function measureModeSelectElementGet() {
  return document.getElementById("measure_mode") as HTMLSelectElement | null;
}

function measureModeStateSeedFromSelect(state: Record<string, any>) {
  const select = measureModeSelectElementGet();
  state.measureMode = measureModeNormalize(select?.value);
  peakAnalysisSourceMeasureModeSync(state, state.measureMode);
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
  nextMode: MeasureMode,
  deps: Pick<UiBindingsDeps, "state" | "renderMock" | "renderModes" | "runResonatePipeline" | "setStatus">,
) {
  peakAnalysisSourceMeasureModeSync(deps.state, nextMode);
  deps.state.measureMode = nextMode;
  deps.state.lastOverlay = undefined;
  measureModeViewRangesReset(deps.state);
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

export function peakAnalysisSourceMeasureModeSync(state: Record<string, any>, nextMode: MeasureMode) {
  if (nextMode !== "peak_analysis") {
    state.peakAnalysisSourceMeasureMode = nextMode;
    return;
  }
  const previousMode = measureModeNormalize(state.measureMode);
  if (previousMode !== "peak_analysis") {
    state.peakAnalysisSourceMeasureMode = previousMode;
  }
}

export function measureModeChangeShouldRenderMock(state: Record<string, any>) {
  return !state?.currentWave;
}

export function measureModeChangeShouldReseedDemoWave() {
  return !String((window as any).FFTState?.recordingLabel || "").trim();
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

export function measureModeViewRangesReset(state: Record<string, any>) {
  state.viewRangeMs = null;
  state.noteSelectionRangeMs = null;
  state.lastPrimaryRangePipelineFingerprint = null;
  state.lastNoteRangePipelineFingerprint = null;
}

function renderTryModePanelForMeasureMode(
  measureMode: MeasureMode,
  deps: UiBindingsDeps,
) {
  if (measureMode === "guitar" || measureMode === "played_note") return;
  deps.state.modeTargets = {};
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
