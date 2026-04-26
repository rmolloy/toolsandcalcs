import { toneControllerCreateFromWindow } from "./resonate_tone_controller.js";
import { measureModeNormalize } from "./resonate_mode_config.js";
import { consumeResonanceNotebookConnectDraft, restoreResonanceNotebookConnectDraftState, } from "./resonate_notebook_connect_draft.js";
import { restoreResonanceNotebookEventIntoState } from "./resonate_notebook_restore.js";
import { resonanceSaveRunnerCreate } from "./resonate_save_target.js";
import { customMeasurementKeyIsCustom } from "./resonate_custom_measurements.js";
import { settingsModalBind } from "./resonate_settings_modal.js";
const resonanceSaveRunner = resonanceSaveRunnerCreate();
function saveButtonElementGet() {
    return document.getElementById("btn_save_audio");
}
function saveStateRead(state) {
    return state.saveState === "dirty" ? "dirty" : "clean";
}
function saveSurfaceModeRead(state) {
    return state.saveSurfaceMode || "lab-disconnected";
}
function saveStateWrite(state, next) {
    state.saveState = next;
}
function saveSurfaceModeWrite(state, next) {
    state.saveSurfaceMode = next;
}
function saveSurfaceHintRead(state) {
    return String(state.saveSurfaceHint || "").trim();
}
function saveSurfaceHintWrite(state, next) {
    state.saveSurfaceHint = String(next || "").trim();
}
function saveButtonRenderFromState(state) {
    const button = saveButtonElementGet();
    if (!button)
        return;
    const next = saveStateRead(state);
    const isDirty = next === "dirty";
    button.textContent = isDirty ? saveButtonLabelBuild(saveSurfaceModeRead(state)) : "✓ Saved";
    button.disabled = !isDirty;
    button.classList.toggle("save-state-dirty", isDirty);
    button.classList.toggle("save-state-clean", !isDirty);
}
function saveButtonLabelBuild(saveSurfaceMode) {
    if (saveSurfaceMode === "offline")
        return "Download";
    if (saveSurfaceMode === "lab-disconnected")
        return "Save ▾";
    return "Save";
}
export function readResonanceIdleStatus(state) {
    const base = "Load or record to view the waveform.";
    const hint = saveSurfaceHintRead(state);
    if (!hint) {
        return base;
    }
    return `${base} ${hint}`;
}
function saveStateMarkDirtyAndRender(state) {
    saveStateWrite(state, "dirty");
    saveButtonRenderFromState(state);
}
function saveStateMarkCleanAndRender(state) {
    saveStateWrite(state, "clean");
    saveButtonRenderFromState(state);
}
function saveStatePipelineDirtySubscriptionAttach(bus, state) {
    if (!bus?.wire)
        return;
    bus.wire("pipeline.completed", (payload) => {
        const trigger = String(payload?.summary?.trigger || "");
        if (trigger !== "import" && trigger !== "record")
            return;
        saveStateMarkDirtyAndRender(state);
    });
}
function recordingSelectLabelSet(label) {
    const select = document.getElementById("recording_select");
    if (!select)
        return;
    select.innerHTML = "";
    const option = document.createElement("option");
    option.value = label;
    option.textContent = label;
    option.selected = true;
    select.appendChild(option);
    recordingSelectWidthSyncFromLabel(select, label);
}
function recordingSelectWidthSyncFromLabel(select, label) {
    const charUnits = recordingSelectWidthCharUnitsFromLabel(label);
    select.style.width = `${charUnits}ch`;
}
function recordingSelectWidthCharUnitsFromLabel(label) {
    const minCh = 14;
    const maxCh = 34;
    const paddingCh = 4;
    const textCh = Math.max(0, String(label || "").length);
    return Math.max(minCh, Math.min(maxCh, textCh + paddingCh));
}
function updateWaveTransportLabels() {
    const FFTAudio = window.FFTAudio;
    if (!FFTAudio)
        return;
    const recording = FFTAudio.isRecordingActive?.() ?? false;
    const playing = FFTAudio.isPlaybackActive?.() ?? false;
    const btnRecord = document.getElementById("btn_wave_record");
    const btnPlay = document.getElementById("btn_wave_play");
    const btnStop = document.getElementById("btn_wave_stop");
    if (btnRecord) {
        btnRecord.innerHTML = recording ? '<span class="transport-icon" aria-hidden="true">■</span>Stop' : '<span class="transport-icon" aria-hidden="true">⏺</span>Record';
        btnRecord.classList.toggle("is-active", recording);
    }
    if (btnPlay) {
        btnPlay.innerHTML = playing ? '<span class="transport-icon" aria-hidden="true">■</span>Stop' : '<span class="transport-icon" aria-hidden="true">▶</span>Play';
        btnPlay.classList.toggle("is-active", playing);
    }
    if (btnStop)
        btnStop.innerHTML = '<span class="transport-icon" aria-hidden="true">■</span>Stop';
}
function recordCaptureRunFromMic(deps) {
    deps.state.viewRangeMs = null;
    deps.state.noteSelectionRangeMs = null;
    updateWaveTransportLabels();
    const current = window.FFTState?.currentWave || null;
    const wave = current?.wave || current?.samples || null;
    const sampleRate = current?.sampleRate || null;
    const input = { trigger: "record", source: { wave, sampleRate, sourceKind: "mic" } };
    const config = { version: "v1", stages: ["ingest", "refresh"] };
    const runner = window.ResonatePipelineRunner;
    recordingSelectLabelSet("Recording (mic)");
    if (!runner?.run) {
        console.warn("[Resonance Reader] Pipeline runner missing while event rendering is enabled.");
    }
    else {
        runner.run(input, config).catch((err) => console.error("[Resonance Reader] refresh after record failed", err));
    }
    deps.setStatus("Recorded.");
}
function recordToggleFromMic(deps) {
    const FFTAudio = window.FFTAudio;
    if (!FFTAudio)
        return;
    const state = deps.state;
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
    state.__livePreviewActive = true;
    delete state.peakHoldSpectrumState;
    previewDispatch.start?.();
    FFTAudio.startRecording({
        onPreview: (wave, sampleRate) => {
            previewDispatch.push?.(wave, sampleRate, deps);
        },
        onDone: () => {
            previewDispatch.stop?.();
            state.__livePreviewActive = false;
            recordCaptureRunFromMic(deps);
        },
    }).then(() => {
        updateWaveTransportLabels();
    }).catch((err) => {
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
    let latest = null;
    const previewConfig = { version: "v1", stages: ["ingest", "refresh"] };
    const runNext = (deps) => {
        if (!running || inFlight || !latest)
            return;
        const payload = latest;
        latest = null;
        inFlight = true;
        const runner = window.ResonatePipelineRunner;
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
            .catch((err) => {
            console.warn("[Resonance Reader] live FFT preview failed", err);
        })
            .finally(() => {
            inFlight = false;
            if (latest)
                runNext(deps);
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
        push(wave, sampleRate, deps) {
            if (!running)
                return;
            latest = { wave, sampleRate };
            runNext(deps);
        },
    };
}
function bindImport(deps) {
    const btnImport = document.getElementById("btn_import");
    const fileInput = document.getElementById("file_input");
    if (!btnImport || !fileInput)
        return;
    btnImport.addEventListener("click", () => {
        importFileInputPrepare(fileInput);
        fileInput.click();
    });
    fileInput.addEventListener("change", async (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        deps.setStatus(`Loading ${file.name}...`);
        recordingSelectLabelSet(file.name);
        try {
            deps.state.viewRangeMs = null;
            deps.state.noteSelectionRangeMs = null;
            const runner = window.ResonatePipelineRunner;
            if (!runner?.run) {
                throw new Error("Resonance pipeline runner not available");
            }
            const input = { trigger: "import", source: { file, sourceKind: "file" } };
            const config = { version: "v1", stages: ["ingest", "refresh"] };
            await runner.run(input, config);
            deps.setStatus("Loaded.");
        }
        catch (err) {
            console.error("[Resonance Reader] import failed", err);
            deps.setStatus("Import failed. Try a short WAV/AIFF file.");
        }
    });
}
export function importFileInputPrepare(fileInput) {
    fileInput.value = "";
}
function bindSaveAudio(deps) {
    const btnSave = document.getElementById("btn_save_audio");
    if (!btnSave)
        return;
    bindSaveAudioClick(btnSave, deps, resonanceSaveRunner);
}
function bindSaveAudioClick(button, deps, saveRunner) {
    button.addEventListener("click", () => {
        if (saveStateRead(deps.state) !== "dirty")
            return;
        void runResonanceSaveActionAndRenderCleanState(deps, saveRunner);
    });
}
async function runResonanceSaveActionAndRenderCleanState(deps, saveRunner) {
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
async function refreshResonanceSaveSurfaceAndRender(state, saveRunner, setStatus) {
    const saveSurface = await saveRunner.readResonanceSaveSurface();
    saveSurfaceModeWrite(state, saveSurface.mode);
    saveSurfaceHintWrite(state, readResonanceSaveSurfaceHint(saveSurface));
    saveButtonRenderFromState(state);
    renderResonanceIdleStatusWhenAppropriate(state, setStatus);
}
function readResonanceSaveSurfaceHint(saveSurface) {
    return String(saveSurface && "hint" in saveSurface ? saveSurface.hint || "" : "").trim();
}
function renderResonanceIdleStatusWhenAppropriate(state, setStatus) {
    if (!setStatus || !shouldRenderResonanceIdleStatus(state)) {
        return;
    }
    setStatus(readResonanceIdleStatus(state));
}
function shouldRenderResonanceIdleStatus(state) {
    return saveStateRead(state) === "clean" && !state.currentWave;
}
function bindRecord(deps) {
    const btn = document.getElementById("btn_record");
    if (!btn)
        return;
    btn.addEventListener("click", () => {
        recordToggleFromMic(deps);
    });
}
function bindWaveTransport(deps) {
    bindToneControl(deps.state);
    const btnRecord = document.getElementById("btn_wave_record");
    const btnPlay = document.getElementById("btn_wave_play");
    const btnStop = document.getElementById("btn_wave_stop");
    const btnReset = document.getElementById("btn_reset_zoom");
    if (btnRecord) {
        btnRecord.addEventListener("click", () => {
            const mainRecord = document.getElementById("btn_record");
            if (mainRecord) {
                mainRecord.click();
                updateWaveTransportLabels();
                return;
            }
            recordToggleFromMic(deps);
        });
    }
    if (btnPlay) {
        btnPlay.addEventListener("click", () => {
            const FFTAudio = window.FFTAudio;
            if (!FFTAudio?.playCurrent || !FFTAudio?.isPlaybackActive)
                return;
            if (FFTAudio.isPlaybackActive()) {
                FFTAudio.stopPlayback?.();
                updateWaveTransportLabels();
                return;
            }
            if (FFTAudio.playCurrent(() => updateWaveTransportLabels()))
                updateWaveTransportLabels();
        });
    }
    if (btnStop) {
        btnStop.addEventListener("click", () => {
            const FFTAudio = window.FFTAudio;
            FFTAudio?.stopAll?.();
            updateWaveTransportLabels();
            deps.setStatus("Stopped.");
        });
    }
    if (btnReset) {
        btnReset.addEventListener("click", () => {
            const plot = document.getElementById("plot_waveform");
            if (plot && window.Plotly) {
                window.Plotly.relayout(plot, { "xaxis.autorange": true });
            }
        });
    }
}
function bindToneControl(state) {
    const btnTone = document.getElementById("btn_wave_tone");
    if (!btnTone)
        return;
    const tone = toneControllerCreateFromWindow(window);
    toneStateWrite(state, false);
    toneButtonRenderFromState(btnTone, toneStateRead(state));
    btnTone.addEventListener("click", () => {
        const next = !toneStateRead(state);
        toneStateWrite(state, next);
        tone.toneEnableSet(next);
        if (!next)
            tone.toneStop();
        toneButtonRenderFromState(btnTone, next);
    });
}
function toneStateRead(state) {
    return Boolean(state.toneEnabled);
}
function toneStateWrite(state, enabled) {
    state.toneEnabled = enabled;
}
function toneButtonRenderFromState(button, enabled) {
    button.setAttribute("aria-pressed", enabled ? "true" : "false");
    button.classList.toggle("is-active", enabled);
}
export function uiBindingsAttach(deps) {
    const attach = async () => {
        const restoredNotebookDraft = restoreNotebookConnectDraftIntoUi(deps);
        if (restoredNotebookDraft) {
            saveStateMarkDirtyAndRender(deps.state);
        }
        else {
            saveStateMarkCleanAndRender(deps.state);
        }
        await refreshResonanceSaveSurfaceAndRender(deps.state, resonanceSaveRunner, deps.setStatus);
        saveStatePipelineDirtySubscriptionAttach(deps.pipelineBus, deps.state);
        recordingSelectInitialWidthSync();
        bindImport(deps);
        bindSaveAudio(deps);
        bindRecord(deps);
        bindWaveTransport(deps);
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
        let hasStartup = false;
        const startup = window.ResonateStartup;
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
        const uiEvents = window.ResonateUiEvents;
        if (uiEvents?.RESONATE_UI_EVENT_FLAG?.defaultValue) {
            uiEvents.uiEventSubscriptionAttach(deps.state, deps.pipelineBus);
        }
    };
    if (document.readyState === "loading") {
        window.addEventListener("DOMContentLoaded", () => {
            void attach();
        });
    }
    else {
        void attach();
    }
}
export function restoreNotebookConnectDraftIntoUi(deps) {
    const draft = consumeResonanceNotebookConnectDraft(window);
    if (!restoreResonanceNotebookConnectDraftState(deps.state, draft)) {
        return false;
    }
    restoreNotebookConnectDraftControls(deps.state);
    renderNotebookConnectDraftIntoUi(deps);
    return true;
}
async function restoreNotebookEventIntoUi(deps) {
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
function restoreNotebookConnectDraftControls(state) {
    writeMeasureModeSelectValue(state.measureMode);
    recordingSelectLabelSet(String(state.recordingLabel || "Notebook draft"));
}
function writeMeasureModeSelectValue(measureMode) {
    const select = measureModeSelectElementGet();
    const normalized = measureModeNormalize(measureMode);
    if (!select || !normalized) {
        return;
    }
    select.value = normalized;
}
function renderNotebookConnectDraftIntoUi(deps) {
    renderNotebookConnectDraftSpectrum(deps);
    renderNotebookConnectDraftModes(deps);
    renderNotebookConnectDraftWaveform(deps);
}
function renderNotebookConnectDraftSpectrum(deps) {
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
function renderNotebookConnectDraftModes(deps) {
    deps.renderModes(Array.isArray(deps.state.lastModeCards) ? deps.state.lastModeCards : []);
}
function renderNotebookConnectDraftWaveform(deps) {
    if (!deps.state.currentWave) {
        return;
    }
    deps.renderWaveform(deps.state.currentWave);
}
function recordingSelectInitialWidthSync() {
    const select = document.getElementById("recording_select");
    if (!select)
        return;
    const selected = select.options[select.selectedIndex];
    const label = (selected?.textContent || "Demo (click record)").trim();
    recordingSelectWidthSyncFromLabel(select, label);
}
function measureModeSelectElementGet() {
    return document.getElementById("measure_mode");
}
function measureModeStateSeedFromSelect(state) {
    const select = measureModeSelectElementGet();
    state.measureMode = measureModeNormalize(select?.value);
}
function energyTransferPanelSyncFromState(state) {
    const render = window.ResonateUiRender?.renderEnergyTransferFromState;
    if (typeof render !== "function")
        return;
    render(state);
}
function measureModeChangeHandle(deps) {
    const select = measureModeSelectElementGet();
    if (!select)
        return;
    const nextMode = measureModeNormalize(select.value);
    measureModeChangeApply(nextMode, deps);
}
export function measureModeChangeApply(nextMode, deps) {
    deps.state.measureMode = nextMode;
    deps.state.lastOverlay = undefined;
    if (measureModeChangeShouldReseedDemoWave()) {
        measureModeStateResetForDemoWave(deps.state);
    }
    measureModeStatePreserveCustomCardsOnly(deps.state);
    renderTryModePanelForMeasureMode(nextMode, deps);
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
export function measureModeChangeShouldRenderMock(state) {
    return !state?.currentWave;
}
export function measureModeChangeShouldReseedDemoWave() {
    return recordingSelectValueRead() === "";
}
export function measureModeChangeShouldRunPipelineForDemoWave() {
    return measureModeChangeShouldReseedDemoWave();
}
export function measureModeStatePreserveCustomCardsOnly(state) {
    const cards = Array.isArray(state?.lastModeCards) ? state.lastModeCards : [];
    state.lastModeCards = cards.filter((card) => customMeasurementKeyIsCustom(String(card?.key || "")));
    state.lastModesDetected = [];
}
export function measureModeStateResetForDemoWave(state) {
    state.currentWave = null;
    state.lastSpectrum = null;
    state.lastSpectrumRaw = null;
    state.lastSpectrumNoteSelection = null;
}
function renderTryModePanelForMeasureMode(measureMode, deps) {
    if (measureMode === "guitar" || measureMode === "played_note")
        return;
    deps.state.modeTargets = {};
}
function recordingSelectValueRead() {
    return recordingSelectElementGet()?.value || "";
}
function recordingSelectElementGet() {
    return document.getElementById("recording_select");
}
function rerenderFromLastSpectrumIfPossible(state) {
    if (typeof state?.rerenderFromLastSpectrum !== "function")
        return;
    state.preserveSpectrumRangesOnNextRender = true;
    state.rerenderFromLastSpectrum({ skipDof: true });
}
function runMeasureModePipelineRefresh(deps) {
    deps.runResonatePipeline("measure-mode-change").catch(() => rerenderFromLastSpectrumIfPossible(deps.state));
}
function bindMeasureMode(deps) {
    measureModeStateSeedFromSelect(deps.state);
    energyTransferPanelSyncFromState(deps.state);
    const select = measureModeSelectElementGet();
    if (!select)
        return;
    select.addEventListener("change", () => measureModeChangeHandle(deps));
}
