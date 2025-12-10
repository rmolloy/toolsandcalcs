"use strict";
// @ts-nocheck
/* global FFTState, FFTUtils, FFTAudio, FFTWaveform, FFTPlot, createFftEngine */
var _a;
const wasmAllowed = typeof window !== "undefined" && ((_a = window.location) === null || _a === void 0 ? void 0 : _a.protocol) !== "file:";
const fftEngine = createFftEngine(wasmAllowed ? { wasmUrl: "../vendor/kissfft.wasm" } : {});
const FREQ_MIN = 60;
const FREQ_MAX_DEFAULT = 1000;
const state = FFTState;
const { freqToNoteCents } = FFTUtils;
const { MODE_DEFAULTS = {}, MODE_COLORS = {} } = window.ModalModes || {};
const wolfLogic = window.WolfLogic || {};
function getDebug() {
    if (!state.debug) {
        state.debug = { useStft: false, stftSize: "auto" };
    }
    return state.debug;
}
let toneOn = false;
let mediaStream = null;
let playButton = null;
let recordButton = null;
let stopButton = null;
const modeRefs = {
    air: { ...(MODE_DEFAULTS.air || { low: 75, high: 115 }), peak: null },
    top: { ...(MODE_DEFAULTS.top || { low: 150, high: 205 }), peak: null },
    back: { ...(MODE_DEFAULTS.back || { low: 210, high: 260 }), peak: null },
};
function updateMeta(sampleLengthMs, sampleRate, window) {
    document.getElementById("wave_meta").textContent = `${(sampleLengthMs / 1000).toFixed(2)} s window • ${(sampleRate / 1000).toFixed(1)} kHz`;
    document.getElementById("fft_meta").textContent = `${window} window • tone gen: Off`;
}
function toggleSpectrogramCard(show) {
    const card = document.getElementById("spectrogram_card");
    if (card)
        card.style.display = show ? "block" : "none";
}
function modeLabel(key) {
    if (key === "air")
        return "Air";
    if (key === "top")
        return "Top";
    if (key === "back")
        return "Back";
    return key;
}
function median(arr) {
    if (!(arr === null || arr === void 0 ? void 0 : arr.length))
        return 0;
    const s = arr.slice().sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
function userAnnotations() {
    return (state.annotations || []).map((a) => ({
        freq: a.freq,
        label: a.label || "Marker",
        color: "var(--orange)",
    }));
}
function buildModeAnnotations() {
    const colorMap = Object.keys(MODE_COLORS || {}).length ? MODE_COLORS : {
        air: "#56B4E9",
        top: "#E69F00",
        back: "#009E73",
    };
    const anns = [];
    Object.entries(modeRefs).forEach(([key, band]) => {
        if (!band)
            return;
        const center = (band.low + band.high) / 2;
        if (!Number.isFinite(center))
            return;
        anns.push({
            freq: center,
            label: modeLabel(key),
            color: colorMap[key] || undefined,
        });
    });
    return anns;
}
function buildModeAnnotationsFromSpectrum(spectrum) {
    var _a, _b;
    if (!((_a = spectrum === null || spectrum === void 0 ? void 0 : spectrum.freqs) === null || _a === void 0 ? void 0 : _a.length))
        return [];
    const colorMap = Object.keys(MODE_COLORS || {}).length ? MODE_COLORS : {
        air: "#56B4E9",
        top: "#E69F00",
        back: "#009E73",
    };
    const dbs = ((_b = spectrum.dbs) === null || _b === void 0 ? void 0 : _b.length) ? spectrum.dbs : spectrum.mags || [];
    const anns = [];
    Object.entries(modeRefs).forEach(([key, band]) => {
        if (!band)
            return;
        let bestIdx = -1;
        let bestDb = -Infinity;
        spectrum.freqs.forEach((f, idx) => {
            if (f >= band.low && f <= band.high && dbs[idx] > bestDb) {
                bestDb = dbs[idx];
                bestIdx = idx;
            }
        });
        if (bestIdx >= 0) {
            const freq = spectrum.freqs[bestIdx];
            anns.push({
                freq,
                label: modeLabel(key),
                color: colorMap[key] || undefined,
            });
        }
    });
    return anns;
}
function updateModeRefs() {
    const assignRange = (lowId, highId, key, defaults) => {
        const lowEl = document.getElementById(lowId);
        const highEl = document.getElementById(highId);
        const low = Number(lowEl === null || lowEl === void 0 ? void 0 : lowEl.value) || defaults.low;
        const high = Number(highEl === null || highEl === void 0 ? void 0 : highEl.value) || defaults.high;
        modeRefs[key] = {
            low: Math.min(low, high),
            high: Math.max(low, high),
            peak: null,
        };
    };
    assignRange("mode_air_low", "mode_air_high", "air", MODE_DEFAULTS.air || { low: 75, high: 115 });
    assignRange("mode_top_low", "mode_top_high", "top", MODE_DEFAULTS.top || { low: 150, high: 205 });
    assignRange("mode_back_low", "mode_back_high", "back", MODE_DEFAULTS.back || { low: 210, high: 260 });
}
const severityFromProminence = (prom) => {
    var _a, _b;
    return (_b = (_a = wolfLogic.severityFromProminence) === null || _a === void 0 ? void 0 : _a.call(wolfLogic, prom)) !== null && _b !== void 0 ? _b : (Number.isFinite(prom)
        ? prom >= 14 ? "High" : prom >= 9 ? "Medium" : "Low"
        : "Low");
};
const severityFromNoteProximity = (centsAbs) => {
    var _a, _b;
    return (_b = (_a = wolfLogic.severityFromNoteProximity) === null || _a === void 0 ? void 0 : _a.call(wolfLogic, centsAbs)) !== null && _b !== void 0 ? _b : (Number.isFinite(centsAbs)
        ? centsAbs <= 7 ? "High" : centsAbs < 15 ? "Medium" : "Low"
        : "Low");
};
const pickSeverity = (a, b) => { var _a, _b; return (_b = (_a = wolfLogic.pickSeverity) === null || _a === void 0 ? void 0 : _a.call(wolfLogic, a, b)) !== null && _b !== void 0 ? _b : ({ High: 3, Medium: 2, Low: 1 }[a] >= { High: 3, Medium: 2, Low: 1 }[b] ? a : b); };
const computeSeverity = (prominence, centsAbs) => {
    var _a, _b;
    return (_b = (_a = wolfLogic.computeSeverity) === null || _a === void 0 ? void 0 : _a.call(wolfLogic, { prominence, centsAbs })) !== null && _b !== void 0 ? _b : pickSeverity(severityFromProminence(prominence), severityFromNoteProximity(centsAbs));
};
const noteBonus = (centsAbs) => {
    var _a, _b;
    return (_b = (_a = wolfLogic.noteBonus) === null || _a === void 0 ? void 0 : _a.call(wolfLogic, centsAbs)) !== null && _b !== void 0 ? _b : (Number.isFinite(centsAbs)
        ? centsAbs <= 7 ? 4 : centsAbs <= 15 ? 2 : centsAbs <= 30 ? 1 : 0
        : 0);
};
function analyzeModes(spectrum) {
    var _a, _b;
    if (!((_a = spectrum === null || spectrum === void 0 ? void 0 : spectrum.freqs) === null || _a === void 0 ? void 0 : _a.length))
        return [];
    const dbs = ((_b = spectrum.dbs) === null || _b === void 0 ? void 0 : _b.length) ? spectrum.dbs : spectrum.mags || [];
    const freqs = spectrum.freqs;
    return Object.entries(modeRefs).map(([key, band]) => {
        var _a;
        let bestIdx = -1;
        let bestDb = -Infinity;
        freqs.forEach((f, idx) => {
            if (f >= band.low && f <= band.high && dbs[idx] > bestDb) {
                bestDb = dbs[idx];
                bestIdx = idx;
            }
        });
        if (bestIdx < 0) {
            return { mode: key, peakFreq: null, prominence: null, severity: "Low", score: 0, note: null };
        }
        const centerVal = dbs[bestIdx];
        const start = Math.max(0, bestIdx - 6);
        const end = Math.min(dbs.length - 1, bestIdx + 6);
        const neighbors = dbs.slice(start, end + 1);
        neighbors.splice(bestIdx - start, 1);
        const baseline = neighbors.length ? median(neighbors) : centerVal;
        const prominence = centerVal - baseline;
        const peakFreq = freqs[bestIdx];
        const note = freqToNoteCents(peakFreq);
        const centsAbs = Math.abs((_a = note === null || note === void 0 ? void 0 : note.centsNum) !== null && _a !== void 0 ? _a : 999);
        const severity = computeSeverity(prominence, centsAbs);
        const score = prominence + noteBonus(centsAbs);
        return { mode: key, peakFreq, prominence, severity, score, note };
    });
}
function renderModeRiskTable(matches) {
    const container = document.getElementById("mode_risk_table");
    if (!container)
        return;
    const header = `
    <div class="annotation-row annotation-head">
      <span>Mode</span><span>Peak (Hz)</span><span>Note</span><span>Wolf Risk</span>
    </div>`;
    if (!(matches === null || matches === void 0 ? void 0 : matches.length)) {
        container.innerHTML = `${header}<div class="annotation-row"><span colspan="4">No peaks in bands yet.</span></div>`;
        return;
    }
    const ordered = ["air", "top", "back"];
    const rows = ordered.map((key) => matches.find((m) => m.mode === key)).filter(Boolean).map((m) => `
    <div class="annotation-row">
      <span>${modeLabel(m.mode)}</span>
      <span>${m.peakFreq ? m.peakFreq.toFixed(1) : "—"}</span>
      <span>${m.note ? `${m.note.name} (${m.note.cents})` : "—"}</span>
      <span><span class="wolf-chip ${m.severity.toLowerCase()}">${m.severity}</span></span>
    </div>
  `).join("");
    container.innerHTML = header + rows;
}
function renderAnnotations() {
    const table = document.getElementById("annotation_table");
    const header = `
    <div class="annotation-row annotation-head">
      <span>Label</span><span>Frequency (Hz)</span><span>dB</span><span>Note / cents</span>
    </div>`;
    if (!state.annotations.length) {
        table.innerHTML = `${header}<div class="annotation-row"><span colspan="4">No markers yet.</span></div>`;
        return;
    }
    const rows = state.annotations.map((a) => `
    <div class="annotation-row">
      <span>${a.label || "—"}</span>
      <span>${a.freq.toFixed(2)}</span>
      <span>${a.db.toFixed(2)}</span>
      <span>${a.note} ${a.cents}</span>
    </div>
  `).join("");
    table.innerHTML = header + rows;
}
function addAnnotation(point) {
    const freq = point.x;
    const db = point.y;
    const note = freqToNoteCents(freq);
    state.annotations.push({
        label: `Marker ${state.annotations.length + 1}`,
        freq,
        db,
        note: note.name,
        cents: note.cents,
    });
    renderAnnotations();
}
window.addAnnotation = addAnnotation;
function clearAnnotations() {
    state.annotations.length = 0;
    renderAnnotations();
}
function saveAnnotations() {
    const blob = new Blob([JSON.stringify(state.annotations, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fft_annotations.json";
    a.click();
    URL.revokeObjectURL(url);
}
function handleWaveRangeChange(range) {
    state.viewRangeMs = range;
    if (range) {
        updateFftForRange(range).catch((err) => console.error("[FFT Lite] update FFT for range failed", err));
    }
    else {
        refresh().catch((err) => console.error("[FFT Lite] refresh failed", err));
    }
}
async function refreshDevices(requirePermission = false) {
    var _a, _b;
    try {
        if (!((_a = navigator.mediaDevices) === null || _a === void 0 ? void 0 : _a.enumerateDevices))
            return;
        // Only ask for permission if we need labels (user clicked reset).
        if (requirePermission) {
            try {
                if (mediaStream) {
                    mediaStream.getTracks().forEach((t) => t.stop());
                }
                mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            }
            catch (err) {
                console.warn("Audio permission denied; device labels may be blank.", err);
            }
        }
        let devices = await navigator.mediaDevices.enumerateDevices();
        let inputs = devices.filter((d) => d.kind === "audioinput");
        // If labels are still empty, try once more.
        const hasLabels = inputs.some((d) => d.label && d.label.trim());
        if (!hasLabels && requirePermission) {
            try {
                if (mediaStream) {
                    mediaStream.getTracks().forEach((t) => t.stop());
                }
                mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                devices = await navigator.mediaDevices.enumerateDevices();
                inputs = devices.filter((d) => d.kind === "audioinput");
            }
            catch (err) {
                console.warn("Second attempt to get mic labels failed.", err);
            }
        }
        const outputs = devices.filter((d) => d.kind === "audiooutput");
        const inputSelect = document.getElementById("input_devices");
        const outputSelect = document.getElementById("output_devices");
        const trackList = document.getElementById("track_list");
        const inputChannel = document.getElementById("input_channel");
        if (inputSelect) {
            inputSelect.innerHTML = inputs.map((d, idx) => (`<option value="${d.deviceId}">${d.label || `Input ${idx + 1}`}</option>`)).join("");
        }
        if (outputSelect) {
            outputSelect.innerHTML = outputs.map((d, idx) => (`<option value="${d.deviceId}">${d.label || `Output ${idx + 1}`}</option>`)).join("");
        }
        if (trackList) {
            const tracks = ((_b = mediaStream === null || mediaStream === void 0 ? void 0 : mediaStream.getTracks) === null || _b === void 0 ? void 0 : _b.call(mediaStream)) || [];
            trackList.textContent = tracks.length
                ? tracks.map((t) => `${t.kind}: ${t.label || "track"}`).join(" • ")
                : "No active tracks";
        }
        if (inputChannel) {
            inputChannel.innerHTML = Array.from({ length: 8 }).map((_, idx) => (`<option value="${idx + 1}">Channel ${idx + 1}</option>`)).join("");
        }
    }
    catch (err) {
        console.error("[FFT Lite] device enumeration failed", err);
    }
}
async function updateFftForRange(rangeMs) {
    var _a;
    const source = state.currentWave || FFTAudio.generateDemoWave(rangeMs.end - rangeMs.start);
    const windowType = document.getElementById("window_type").value;
    const smoothHz = Number(document.getElementById("smooth_hz").value) || 0;
    const noteGridCheckbox = document.getElementById("show_note_grid");
    const showNoteGrid = noteGridCheckbox ? noteGridCheckbox.checked : false;
    const showPeaks = document.getElementById("show_peaks").checked;
    const chromaticSpacing = (_a = document.getElementById("chromatic_spacing")) === null || _a === void 0 ? void 0 : _a.checked;
    const wolfBandCheckbox = document.getElementById("show_wolf_band");
    const showWolfBand = wolfBandCheckbox ? wolfBandCheckbox.checked : false;
    const baseModeAnnotations = buildModeAnnotations();
    const sliced = FFTWaveform.sliceWaveRange(source, rangeMs.start, rangeMs.end)
        || FFTWaveform.sliceWave(source, rangeMs.end - rangeMs.start);
    if (!sliced)
        return;
    const spectrum = await fftEngine.magnitude(sliced.wave, sliced.sampleRate, { maxFreq: FREQ_MAX_DEFAULT, window: windowType });
    const smoothed = FFTPlot.smoothSpectrum(spectrum, smoothHz);
    const withDb = FFTPlot.applyDb(smoothed);
    const modeAnnotations = buildModeAnnotationsFromSpectrum(withDb);
    const userAnns = userAnnotations();
    FFTPlot.makeFftPlot(withDb, {
        showNoteGrid,
        showPeaks,
        peaks: [],
        freqMin: FREQ_MIN,
        freqMax: FREQ_MAX_DEFAULT,
        useNoteAxis: chromaticSpacing,
        showWolfBand,
        modeAnnotations: [...(modeAnnotations.length ? modeAnnotations : baseModeAnnotations), ...userAnns],
    });
    updateMeta(rangeMs.end - rangeMs.start, sliced.sampleRate, windowType);
    renderModeRiskTable(analyzeModes(withDb));
}
async function refresh() {
    var _a, _b;
    const sampleInput = document.getElementById("sample_length");
    let sampleLengthMs = Number(sampleInput.value) || 1500;
    const debug = getDebug();
    if (state.currentWave && state.currentWave.fullLengthMs && !state.viewRangeMs) {
        sampleLengthMs = state.currentWave.fullLengthMs;
        sampleInput.value = Math.round(sampleLengthMs);
    }
    const windowType = document.getElementById("window_type").value;
    const smoothHz = Number(document.getElementById("smooth_hz").value) || 0;
    const noteGridCheckbox = document.getElementById("show_note_grid");
    const showNoteGrid = noteGridCheckbox ? noteGridCheckbox.checked : false;
    const showPeaks = document.getElementById("show_peaks").checked;
    const chromaticSpacing = (_a = document.getElementById("chromatic_spacing")) === null || _a === void 0 ? void 0 : _a.checked;
    const wolfBandCheckbox = document.getElementById("show_wolf_band");
    const showWolfBand = wolfBandCheckbox ? wolfBandCheckbox.checked : false;
    const source = state.currentWave || FFTAudio.generateDemoWave(sampleLengthMs);
    if (!state.currentWave) {
        state.currentWave = source;
    }
    const slice = state.viewRangeMs
        ? FFTWaveform.sliceWaveRange(source, state.viewRangeMs.start, state.viewRangeMs.end)
        : FFTWaveform.sliceWave(source, sampleLengthMs);
    if (!slice)
        return;
    FFTWaveform.makeWavePlot(slice, handleWaveRangeChange);
    const spectrum = await fftEngine.magnitude(slice.wave, slice.sampleRate, { maxFreq: FREQ_MAX_DEFAULT, window: windowType });
    const smoothed = FFTPlot.smoothSpectrum(spectrum, smoothHz);
    const withDb = FFTPlot.applyDb(smoothed);
    const modeAnnotations = buildModeAnnotationsFromSpectrum(withDb);
    const userAnns = userAnnotations();
    FFTPlot.makeFftPlot(withDb, {
        showNoteGrid,
        showPeaks,
        peaks: [],
        freqMin: FREQ_MIN,
        freqMax: FREQ_MAX_DEFAULT,
        useNoteAxis: chromaticSpacing,
        showWolfBand,
        modeAnnotations: [...(modeAnnotations.length ? modeAnnotations : baseModeAnnotations), ...userAnns],
    });
    updateMeta(slice.timeMs[slice.timeMs.length - 1] || sampleLengthMs, slice.sampleRate, windowType);
    renderAnnotations();
    renderModeRiskTable(analyzeModes(withDb));
    if (debug.useStft && ((_b = window.ModalSpectrogram) === null || _b === void 0 ? void 0 : _b.computeSpectrogram)) {
        const maxSamples = Math.min(slice.wave.length, Math.round(slice.sampleRate * 1));
        const waveForStft = slice.wave.length > maxSamples ? slice.wave.slice(0, maxSamples) : slice.wave;
        const stftSize = debug.stftSize === "auto" ? 2048 : Number(debug.stftSize) || 2048;
        const hop = stftSize >> 1;
        const spec = await window.ModalSpectrogram.computeSpectrogram(waveForStft, slice.sampleRate, fftEngine, { fftSize: stftSize, hopSize: hop, maxFreq: 1000, window: "hann" });
        state.lastSpectrogram = spec;
        toggleSpectrogramCard(true);
        if (window.renderSpectrogram)
            window.renderSpectrogram(spec, { elementId: "plot_spectrogram" });
    }
    else {
        state.lastSpectrogram = null;
        toggleSpectrogramCard(false);
    }
}
function bindControls() {
    const safeRefresh = () => { refresh().catch((err) => console.error("[FFT Lite] refresh failed", err)); };
    document.getElementById("btn_refresh").addEventListener("click", safeRefresh);
    document.getElementById("show_note_grid").addEventListener("change", safeRefresh);
    document.getElementById("show_peaks").addEventListener("change", safeRefresh);
    document.getElementById("sample_length").addEventListener("change", safeRefresh);
    document.getElementById("window_type").addEventListener("change", safeRefresh);
    document.getElementById("smooth_hz").addEventListener("change", safeRefresh);
    const useStft = document.getElementById("use_stft");
    if (useStft) {
        useStft.checked = getDebug().useStft;
        useStft.addEventListener("change", () => {
            getDebug().useStft = useStft.checked;
            safeRefresh();
        });
    }
    const stftSize = document.getElementById("stft_size");
    if (stftSize) {
        stftSize.value = String(getDebug().stftSize);
        stftSize.addEventListener("change", () => {
            getDebug().stftSize = stftSize.value;
            safeRefresh();
        });
    }
    const chromaticSpacing = document.getElementById("chromatic_spacing");
    if (chromaticSpacing)
        chromaticSpacing.addEventListener("change", safeRefresh);
    const wolfBand = document.getElementById("show_wolf_band");
    if (wolfBand)
        wolfBand.addEventListener("change", safeRefresh);
    const applyModes = document.getElementById("btn_apply_modes");
    if (applyModes) {
        applyModes.addEventListener("click", () => {
            updateModeRefs();
            safeRefresh();
        });
    }
    updateModeRefs();
    const resetTimeZoom = document.getElementById("btn_reset_time_zoom");
    if (resetTimeZoom) {
        resetTimeZoom.addEventListener("click", () => {
            state.viewRangeMs = null;
            const wavePlot = document.getElementById("plot_waveform");
            if (wavePlot && window.Plotly) {
                window.Plotly.relayout(wavePlot, { "xaxis.autorange": true });
            }
            safeRefresh();
        });
    }
    const clearBtn = document.getElementById("btn_clear_annotations");
    if (clearBtn)
        clearBtn.addEventListener("click", clearAnnotations);
    const saveBtn = document.getElementById("btn_save_annotations");
    if (saveBtn)
        saveBtn.addEventListener("click", saveAnnotations);
    const btnRefreshDevices = document.getElementById("btn_refresh_devices");
    if (btnRefreshDevices)
        btnRefreshDevices.addEventListener("click", () => refreshDevices(true));
    const loadBtn = document.getElementById("btn_load");
    const fileInput = document.getElementById("file_input");
    if (loadBtn && fileInput) {
        loadBtn.addEventListener("click", () => fileInput.click());
        fileInput.addEventListener("change", async (e) => {
            var _a;
            const file = (_a = e.target.files) === null || _a === void 0 ? void 0 : _a[0];
            if (!file)
                return;
            try {
                await FFTAudio.handleFile(file);
                state.viewRangeMs = null;
                await refresh();
            }
            catch (err) {
                console.error("[FFT Lite] load failed", err);
            }
        });
    }
    const btnRecord = document.getElementById("btn_record");
    const btnStop = document.getElementById("btn_stop");
    const btnPlay = document.getElementById("btn_play");
    playButton = btnPlay;
    recordButton = btnRecord;
    stopButton = btnStop;
    updateTransportLabels();
    if (btnRecord)
        btnRecord.addEventListener("click", () => {
            if (FFTAudio.isRecordingActive()) {
                FFTAudio.stopAll();
                updateTransportLabels();
                return;
            }
            FFTAudio.startRecording(() => {
                updateTransportLabels();
                refresh().catch((err) => console.error("[FFT Lite] refresh after record failed", err));
            }).catch((err) => console.error("[FFT Lite] record failed", err));
            updateTransportLabels(true, FFTAudio.isPlaybackActive());
        });
    if (btnStop)
        btnStop.addEventListener("click", () => {
            FFTAudio.stopAll();
            updateTransportLabels();
        });
    if (btnPlay)
        btnPlay.addEventListener("click", () => {
            if (FFTAudio.isPlaybackActive()) {
                FFTAudio.stopPlayback();
                updateTransportLabels();
                return;
            }
            const started = FFTAudio.playCurrent(() => updateTransportLabels());
            if (started)
                updateTransportLabels(FFTAudio.isRecordingActive(), true);
        });
    const btnSaveAudio = document.getElementById("btn_save_audio");
    if (btnSaveAudio)
        btnSaveAudio.addEventListener("click", FFTAudio.saveCurrentAudio);
    const toneToggle = document.getElementById("tone_toggle");
    if (toneToggle) {
        toneToggle.addEventListener("change", () => {
            toneOn = toneToggle.checked;
            FFTAudio.setToneEnabled(toneOn);
            if (!toneOn)
                FFTAudio.stopTone();
            document.getElementById("fft_meta").textContent = `${document.getElementById("window_type").value} window • tone gen: ${toneOn ? "On" : "Off"}`;
        });
    }
}
window.addEventListener("DOMContentLoaded", () => {
    bindControls();
    refreshDevices(false).catch((err) => console.error("[FFT Lite] device refresh failed", err));
    refresh().catch((err) => console.error("[FFT Lite] initial refresh failed", err));
});
window.handleToneHover = (freq) => {
    if (!toneOn)
        return;
    if (freq === null) {
        FFTAudio.stopTone();
    }
    else {
        FFTAudio.updateToneFreq(freq);
    }
};
function updateTransportLabels(recording = FFTAudio.isRecordingActive(), playing = FFTAudio.isPlaybackActive()) {
    if (recordButton)
        recordButton.textContent = recording ? "■ Stop recording" : "● Record";
    if (playButton)
        playButton.textContent = playing ? "⏸ Pause" : "▶ Play";
    if (stopButton)
        stopButton.textContent = "■ Stop";
}
