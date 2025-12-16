"use strict";
// @ts-nocheck
(() => {
    const DEFAULT_OPTS = {
        fftSize: 2048,
        smoothingTimeConstant: 0.6,
    };
    function createAnalyser(audioCtx, opts = {}) {
        var _a;
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = opts.fftSize || DEFAULT_OPTS.fftSize;
        analyser.smoothingTimeConstant = (_a = opts.smoothingTimeConstant) !== null && _a !== void 0 ? _a : DEFAULT_OPTS.smoothingTimeConstant;
        analyser.minDecibels = -90;
        analyser.maxDecibels = -10;
        return analyser;
    }
    function createLiveSpectrogram(opts) {
        const state = {
            audioCtx: opts.audioCtx || new (window.AudioContext || window.webkitAudioContext)(),
            analyser: null,
            source: null,
            rafId: null,
            onFrame: opts.onFrame || (() => { }),
        };
        async function startFromStream(stream) {
            stop();
            state.analyser = createAnalyser(state.audioCtx, opts);
            state.source = state.audioCtx.createMediaStreamSource(stream);
            state.source.connect(state.analyser);
            loop();
        }
        function loop() {
            const bufferLength = state.analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            state.analyser.getByteFrequencyData(dataArray);
            state.onFrame(dataArray, state.analyser);
            state.rafId = requestAnimationFrame(loop);
        }
        function stop() {
            if (state.rafId)
                cancelAnimationFrame(state.rafId);
            state.rafId = null;
            if (state.source) {
                try {
                    state.source.disconnect();
                }
                catch { /* noop */ }
            }
            state.source = null;
            state.analyser = null;
        }
        return { startFromStream, stop, audioCtx: state.audioCtx };
    }
    function transformFreqs(freqs, useNoteAxis) {
        if (!useNoteAxis)
            return Array.from(freqs);
        return freqs.map((f) => {
            var _a, _b, _c;
            const midi = (_c = (_b = (_a = window.FFTUtils) === null || _a === void 0 ? void 0 : _a.freqToNoteCents) === null || _b === void 0 ? void 0 : _b.call(_a, f)) === null || _c === void 0 ? void 0 : _c.midi;
            return Number.isFinite(midi) ? midi : f;
        });
    }
    function downsampleMatrix(z, maxY = 256, maxX = 256) {
        var _a;
        const yLen = z.length;
        const xLen = ((_a = z[0]) === null || _a === void 0 ? void 0 : _a.length) || 0;
        if (!yLen || !xLen)
            return z;
        const yStep = Math.max(1, Math.floor(yLen / maxY));
        const xStep = Math.max(1, Math.floor(xLen / maxX));
        const out = [];
        for (let y = 0; y < yLen; y += yStep) {
            const row = [];
            for (let x = 0; x < xLen; x += xStep) {
                row.push(z[y][x]);
            }
            out.push(row);
        }
        return out;
    }
    function downsampleArray(arr, targetLen) {
        if (!(arr === null || arr === void 0 ? void 0 : arr.length) || arr.length <= targetLen)
            return arr || [];
        const step = arr.length / targetLen;
        const out = [];
        for (let i = 0; i < targetLen; i += 1) {
            out.push(arr[Math.floor(i * step)]);
        }
        return out;
    }
    function transpose(matrix) {
        if (!matrix.length)
            return matrix;
        return matrix[0].map((_, colIndex) => matrix.map((row) => row[colIndex]));
    }
    function renderSpectrogram(spec, opts = {}) {
        var _a, _b, _c, _d, _e;
        const elementId = opts.elementId || "plot_spectrogram";
        const el = typeof elementId === "string" ? document.getElementById(elementId) : elementId;
        if (!el)
            return;
        if (!((_a = spec === null || spec === void 0 ? void 0 : spec.mags) === null || _a === void 0 ? void 0 : _a.length) || !((_b = spec.freqs) === null || _b === void 0 ? void 0 : _b.length) || !((_c = spec.times) === null || _c === void 0 ? void 0 : _c.length)) {
            el.innerHTML = "<div class=\"small muted\">No spectrogram data.</div>";
            return;
        }
        const timeCount = spec.times.length;
        const freqCount = spec.freqs.length;
        const z = Array.from({ length: freqCount }, () => Array(timeCount).fill(-120));
        const toDb = (v) => 20 * Math.log10(Math.max(v, 1e-9));
        spec.mags.forEach((frame, timeIdx) => {
            for (let f = 0; f < Math.min(freqCount, frame.length); f += 1) {
                z[f][timeIdx] = toDb(frame[f]);
            }
        });
        const zClamped = z.map((row) => row.map((v) => Math.max(-140, Math.min(0, v))));
        const zDs = downsampleMatrix(zClamped, opts.maxY || 256, opts.maxX || 256);
        const times = downsampleArray(Array.from(spec.times), ((_d = zDs[0]) === null || _d === void 0 ? void 0 : _d.length) || spec.times.length);
        const freqs = downsampleArray(transformFreqs(spec.freqs, opts.useNoteAxis), zDs.length);
        const trace = {
            x: opts.flipAxes ? freqs : times,
            y: opts.flipAxes ? times : freqs,
            z: opts.flipAxes ? transpose(zDs) : zDs,
            type: "heatmap",
            colorscale: "Viridis",
            zmin: -120,
            zmax: 0,
            colorbar: { title: "dB", x: 0.5, y: -0.25, orientation: "h", thickness: 12, len: 0.6 },
        };
        const layout = {
            margin: { l: 50, r: 15, t: 10, b: 40 },
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            xaxis: { title: opts.flipAxes ? "Freq" : "Time (s)", gridcolor: "var(--border-soft)" },
            yaxis: { title: opts.flipAxes ? "Time (s)" : "Freq", gridcolor: "var(--border-soft)" },
            showlegend: false,
        };
        if ((_e = window.Plotly) === null || _e === void 0 ? void 0 : _e.newPlot) {
            window.Plotly.newPlot(el, [trace], layout, { displayModeBar: false, responsive: true })
                .catch((err) => console.error("[Spectrogram] plot render failed", err));
        }
    }
    window.createLiveSpectrogram = createLiveSpectrogram;
    window.renderSpectrogram = renderSpectrogram;
})();
