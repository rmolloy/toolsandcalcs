"use strict";
(() => {
    var _a;
    const scope = (typeof window !== "undefined" ? window : globalThis);
    const state = ((_a = scope.FFTState) !== null && _a !== void 0 ? _a : {});
    const createAudioCtx = () => new (window.AudioContext || window.webkitAudioContext)();
    function generateDemoWave(sampleLengthMs = 1500) {
        const sampleRate = 44100;
        const samples = Math.max(64, Math.round((sampleLengthMs / 1000) * sampleRate));
        const time = new Array(samples);
        const wave = new Array(samples);
        const freqs = [98, 178, 220, 262];
        const decay = 3.2;
        for (let i = 0; i < samples; i += 1) {
            const t = i / sampleRate;
            time[i] = t * 1000;
            let y = 0;
            freqs.forEach((f, idx) => {
                y += (Math.sin(2 * Math.PI * f * t) * Math.exp(-decay * t)) / (idx + 1);
            });
            wave[i] = y;
        }
        return { timeMs: time, wave, sampleRate };
    }
    async function handleFile(file) {
        if (!file)
            return;
        const arrayBuffer = await file.arrayBuffer();
        const audioCtx = createAudioCtx();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        state.currentBuffer = audioBuffer;
        state.currentSampleRate = audioBuffer.sampleRate;
        const channel = audioBuffer.getChannelData(0);
        const fullLengthMs = (channel.length / state.currentSampleRate) * 1000;
        state.currentWave = {
            wave: Float64Array.from(channel),
            timeMs: Array.from(channel, (_v, i) => (i / state.currentSampleRate) * 1000),
            sampleRate: state.currentSampleRate,
            fullLengthMs,
        };
    }
    function encodeWav(samples, sampleRate) {
        const buffer = new ArrayBuffer(44 + samples.length * 2);
        const view = new DataView(buffer);
        const writeString = (offset, str) => {
            for (let i = 0; i < str.length; i += 1) {
                view.setUint8(offset + i, str.charCodeAt(i));
            }
        };
        const floatTo16 = (outOffset, input) => {
            for (let i = 0; i < input.length; i += 1) {
                const s = Math.max(-1, Math.min(1, input[i]));
                view.setInt16(outOffset + (i * 2), s < 0 ? s * 0x8000 : s * 0x7FFF, true);
            }
        };
        writeString(0, "RIFF");
        view.setUint32(4, 36 + samples.length * 2, true);
        writeString(8, "WAVE");
        writeString(12, "fmt ");
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        writeString(36, "data");
        view.setUint32(40, samples.length * 2, true);
        floatTo16(44, samples);
        return new Blob([buffer], { type: "audio/wav" });
    }
    function saveCurrentAudio() {
        var _a, _b, _c;
        const samples = state.currentBuffer
            ? state.currentBuffer.getChannelData(0)
            : (_a = state.currentWave) === null || _a === void 0 ? void 0 : _a.wave;
        const sr = ((_b = state.currentBuffer) === null || _b === void 0 ? void 0 : _b.sampleRate) || ((_c = state.currentWave) === null || _c === void 0 ? void 0 : _c.sampleRate);
        if (!samples || !sr)
            return;
        const blob = encodeWav(samples, sr);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "fft_capture.wav";
        a.click();
        URL.revokeObjectURL(url);
    }
    function recordingCallbacksNormalize(input) {
        if (typeof input === "function")
            return { onDone: input };
        return input || {};
    }
    function livePreviewEmitterCreate(opts) {
        if (typeof opts.onPreview !== "function")
            return null;
        const audioCtx = createAudioCtx();
        const source = audioCtx.createMediaStreamSource(opts.stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.7;
        source.connect(analyser);
        const sampleRate = audioCtx.sampleRate || 44100;
        const updateMs = 75;
        const maxSeconds = 4;
        const ringSize = Math.max(2048, Math.round(sampleRate * maxSeconds));
        const ring = new Float32Array(ringSize);
        let ringWrite = 0;
        let ringFilled = 0;
        const tmp = new Float32Array(analyser.fftSize);
        const timer = window.setInterval(() => {
            var _a;
            analyser.getFloatTimeDomainData(tmp);
            for (let i = 0; i < tmp.length; i += 1) {
                ring[ringWrite] = tmp[i];
                ringWrite = (ringWrite + 1) % ringSize;
            }
            ringFilled = Math.min(ringSize, ringFilled + tmp.length);
            if (ringFilled < 1024)
                return;
            const out = new Float64Array(ringFilled);
            const start = (ringWrite - ringFilled + ringSize) % ringSize;
            for (let i = 0; i < ringFilled; i += 1)
                out[i] = ring[(start + i) % ringSize];
            (_a = opts.onPreview) === null || _a === void 0 ? void 0 : _a.call(opts, out, sampleRate);
        }, updateMs);
        return {
            stop: () => {
                window.clearInterval(timer);
                try {
                    source.disconnect();
                }
                catch { /* noop */ }
                try {
                    analyser.disconnect();
                }
                catch { /* noop */ }
                try {
                    audioCtx.close();
                }
                catch { /* noop */ }
            },
        };
    }
    async function listAudioInputDevices() {
        var _a;
        if (!((_a = navigator.mediaDevices) === null || _a === void 0 ? void 0 : _a.enumerateDevices))
            return [];
        const devices = await navigator.mediaDevices.enumerateDevices();
        return devices.filter((device) => device.kind === "audioinput");
    }
    function setAudioInputDeviceId(deviceId) {
        state.selectedAudioInputDeviceId = deviceId || null;
    }
    function getAudioInputDeviceId() {
        return state.selectedAudioInputDeviceId || null;
    }
    function audioInputConstraintsBuild() {
        const deviceId = getAudioInputDeviceId();
        if (!deviceId)
            return { audio: true };
        return { audio: { deviceId: { exact: deviceId } } };
    }
    async function startRecording(callbacksInput) {
        var _a;
        const callbacks = recordingCallbacksNormalize(callbacksInput);
        if (!((_a = navigator.mediaDevices) === null || _a === void 0 ? void 0 : _a.getUserMedia))
            return;
        const stream = await navigator.mediaDevices.getUserMedia(audioInputConstraintsBuild());
        const livePreview = livePreviewEmitterCreate({ stream, onPreview: callbacks.onPreview });
        state.recordedChunks = [];
        state.mediaRecorder = new MediaRecorder(stream);
        state.recordingActive = true;
        state.mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0)
                state.recordedChunks.push(e.data);
        };
        state.mediaRecorder.onstop = async () => {
            livePreview === null || livePreview === void 0 ? void 0 : livePreview.stop();
            const blob = new Blob(state.recordedChunks, { type: "audio/webm" });
            const arrayBuffer = await blob.arrayBuffer();
            const audioCtx = createAudioCtx();
            const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
            state.currentBuffer = audioBuffer;
            state.currentSampleRate = audioBuffer.sampleRate;
            const channel = audioBuffer.getChannelData(0);
            const fullLengthMs = (channel.length / state.currentSampleRate) * 1000;
            state.currentWave = {
                wave: Float64Array.from(channel),
                timeMs: Array.from(channel, (_v, i) => (i / state.currentSampleRate) * 1000),
                sampleRate: state.currentSampleRate,
                fullLengthMs,
            };
            state.recordingActive = false;
            if (callbacks.onDone)
                callbacks.onDone();
        };
        state.mediaRecorder.start();
    }
    function stopRecording() {
        if (state.mediaRecorder && state.mediaRecorder.state !== "inactive") {
            state.mediaRecorder.stop();
            state.recordingActive = false;
        }
    }
    function playCurrent(onEnd) {
        if (!state.currentBuffer)
            return false;
        if (state.playbackActive)
            stopPlayback();
        state.playbackCtx = createAudioCtx();
        state.playbackSource = state.playbackCtx.createBufferSource();
        state.playbackSource.buffer = state.currentBuffer;
        state.playbackSource.connect(state.playbackCtx.destination);
        state.playbackActive = true;
        state.playbackSource.onended = () => {
            stopPlayback();
            if (onEnd)
                onEnd();
        };
        state.playbackSource.start();
        return true;
    }
    function stopPlayback() {
        if (state.playbackSource) {
            try {
                state.playbackSource.stop();
            }
            catch { /* noop */ }
            state.playbackSource.disconnect();
            state.playbackSource = null;
        }
        if (state.playbackCtx) {
            try {
                state.playbackCtx.close();
            }
            catch { /* noop */ }
            state.playbackCtx = null;
        }
        state.playbackActive = false;
    }
    function stopAll() {
        stopRecording();
        stopPlayback();
    }
    // --- Tone generator for hover-follow ---
    let toneCtx = null;
    let toneOsc = null;
    let toneGain = null;
    let toneEnabled = false;
    const TONE_GLIDE_SECONDS = 0.015;
    function setToneEnabled(flag) {
        toneEnabled = !!flag;
        if (!toneEnabled)
            stopTone();
    }
    function ensureTone() {
        if (!toneCtx) {
            toneCtx = createAudioCtx();
            toneGain = toneCtx.createGain();
            toneGain.gain.value = 0.08;
            toneGain.connect(toneCtx.destination);
            toneOsc = toneCtx.createOscillator();
            toneOsc.type = "sine";
            toneOsc.frequency.value = 220;
            toneOsc.connect(toneGain);
            toneOsc.start();
        }
        if (toneCtx.state === "suspended") {
            toneCtx.resume().catch(() => { });
        }
    }
    function updateToneFreq(freq) {
        if (!toneEnabled || !Number.isFinite(freq))
            return;
        ensureTone();
        const now = toneCtx.currentTime;
        const target = freq;
        toneOsc.frequency.cancelScheduledValues(now);
        toneOsc.frequency.setTargetAtTime(target, now, TONE_GLIDE_SECONDS);
    }
    function stopTone() {
        if (toneOsc) {
            try {
                toneOsc.stop();
            }
            catch { /* noop */ }
            toneOsc.disconnect();
            toneOsc = null;
        }
        if (toneGain) {
            toneGain.disconnect();
            toneGain = null;
        }
        if (toneCtx) {
            try {
                toneCtx.close();
            }
            catch { /* noop */ }
            toneCtx = null;
        }
    }
    scope.FFTAudio = {
        generateDemoWave,
        handleFile,
        saveCurrentAudio,
        listAudioInputDevices,
        setAudioInputDeviceId,
        getAudioInputDeviceId,
        startRecording,
        stopRecording,
        playCurrent,
        stopPlayback,
        stopAll,
        isRecordingActive: () => state.recordingActive,
        isPlaybackActive: () => state.playbackActive,
        setToneEnabled,
        updateToneFreq,
        stopTone,
    };
})();
