import { toneControllerCreateFromWindow } from "./resonate_tone_controller.js";
function saveButtonElementGet() {
    return document.getElementById("btn_save_audio");
}
function saveStateRead(state) {
    return state.saveState === "dirty" ? "dirty" : "clean";
}
function saveStateWrite(state, next) {
    state.saveState = next;
}
function saveButtonRenderFromState(state) {
    const button = saveButtonElementGet();
    if (!button)
        return;
    const next = saveStateRead(state);
    const isDirty = next === "dirty";
    button.textContent = isDirty ? "Save" : "✓ Saved";
    button.disabled = !isDirty;
    button.classList.toggle("save-state-dirty", isDirty);
    button.classList.toggle("save-state-clean", !isDirty);
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
        btnPlay.innerHTML = playing ? '<span class="transport-icon" aria-hidden="true">⏸</span>Pause' : '<span class="transport-icon" aria-hidden="true">▶</span>Play';
        btnPlay.classList.toggle("is-active", playing);
    }
    if (btnStop)
        btnStop.innerHTML = '<span class="transport-icon" aria-hidden="true">■</span>Stop';
}
function recordCaptureRunFromMic(deps) {
    deps.state.viewRangeMs = null;
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
    if (FFTAudio.isRecordingActive()) {
        FFTAudio.stopRecording();
        updateWaveTransportLabels();
        deps.setStatus("Recording stopped.");
        return;
    }
    updateWaveTransportLabels();
    deps.setStatus("Recording...");
    FFTAudio.startRecording(() => {
        recordCaptureRunFromMic(deps);
    }).catch((err) => {
        console.error("[Resonance Reader] record failed", err);
        deps.setStatus("Recording failed or denied.");
        updateWaveTransportLabels();
    });
}
function bindImport(deps) {
    const btnImport = document.getElementById("btn_import");
    const fileInput = document.getElementById("file_input");
    if (!btnImport || !fileInput)
        return;
    btnImport.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", async (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        deps.setStatus(`Loading ${file.name}...`);
        recordingSelectLabelSet(file.name);
        try {
            deps.state.viewRangeMs = null;
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
function bindSaveAudio(deps) {
    const btnSave = document.getElementById("btn_save_audio");
    if (!btnSave)
        return;
    btnSave.addEventListener("click", () => {
        if (saveStateRead(deps.state) !== "dirty")
            return;
        const FFTAudio = window.FFTAudio;
        const hasWave = Boolean(window.FFTState?.currentWave);
        if (!hasWave) {
            saveStateMarkCleanAndRender(deps.state);
            deps.setStatus("Load or record before saving.");
            return;
        }
        if (typeof FFTAudio?.saveCurrentAudio === "function") {
            FFTAudio.saveCurrentAudio();
            saveStateMarkCleanAndRender(deps.state);
            deps.setStatus("Saved.");
        }
        else {
            deps.setStatus("Save unavailable.");
        }
    });
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
    const attach = () => {
        saveStateMarkCleanAndRender(deps.state);
        saveStatePipelineDirtySubscriptionAttach(deps.pipelineBus, deps.state);
        recordingSelectInitialWidthSync();
        bindImport(deps);
        bindSaveAudio(deps);
        bindRecord(deps);
        bindWaveTransport(deps);
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
            deps.setStatus("Load or record to view the waveform.");
        }
        const uiEvents = window.ResonateUiEvents;
        if (uiEvents?.RESONATE_UI_EVENT_FLAG?.defaultValue) {
            uiEvents.uiEventSubscriptionAttach(deps.state, deps.pipelineBus);
        }
    };
    if (document.readyState === "loading") {
        window.addEventListener("DOMContentLoaded", attach);
    }
    else {
        attach();
    }
}
function recordingSelectInitialWidthSync() {
    const select = document.getElementById("recording_select");
    if (!select)
        return;
    const selected = select.options[select.selectedIndex];
    const label = (selected?.textContent || "Demo (read-only)").trim();
    recordingSelectWidthSyncFromLabel(select, label);
}
