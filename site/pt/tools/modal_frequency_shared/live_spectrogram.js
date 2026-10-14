"use strict";
(() => {
    const unusedPlotly = (typeof window !== "undefined" ? window.Plotly : undefined);
    const DEFAULT_OPTS = {
        fftSize: 2048,
        smoothingTimeConstant: 0.6,
    };
    function createAnalyser(audioCtx, opts = {}) {
        var _a, _b;
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = (_a = opts.fftSize) !== null && _a !== void 0 ? _a : DEFAULT_OPTS.fftSize;
        analyser.smoothingTimeConstant = (_b = opts.smoothingTimeConstant) !== null && _b !== void 0 ? _b : DEFAULT_OPTS.smoothingTimeConstant;
        analyser.minDecibels = -90;
        analyser.maxDecibels = -10;
        return analyser;
    }
    function createLiveSpectrogram(opts = {}) {
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
            if (!state.analyser)
                return;
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
    function renderSpectrogram(spec, opts = {}) {
        var _a, _b, _c, _d;
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
        const trace = {
            x: Array.from(spec.times),
            y: Array.from(spec.freqs),
            z,
            type: "heatmap",
            colorscale: "Viridis",
            zmin: -120,
            zmax: 0,
            colorbar: { title: "dB" },
        };
        const layout = {
            margin: { l: 50, r: 15, t: 10, b: 40 },
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            xaxis: { title: "Time (s)", gridcolor: "var(--border-soft)" },
            yaxis: { title: "Freq (Hz)", gridcolor: "var(--border-soft)" },
            showlegend: false,
        };
        if ((_d = window.Plotly) === null || _d === void 0 ? void 0 : _d.newPlot) {
            window.Plotly.newPlot(el, [trace], layout, { displayModeBar: false, responsive: true })
                .catch((err) => console.error("[Spectrogram] plot render failed", err));
        }
    }
    const scope = (typeof window !== "undefined" ? window : globalThis);
    scope.createLiveSpectrogram = createLiveSpectrogram;
    scope.renderSpectrogram = renderSpectrogram;
})();
