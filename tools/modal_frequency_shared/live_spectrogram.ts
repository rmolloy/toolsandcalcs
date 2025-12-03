// @ts-nocheck
(() => {
  const DEFAULT_OPTS = {
    fftSize: 2048,
    smoothingTimeConstant: 0.6,
  };

  function createAnalyser(audioCtx, opts = {}) {
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = opts.fftSize || DEFAULT_OPTS.fftSize;
    analyser.smoothingTimeConstant = opts.smoothingTimeConstant ?? DEFAULT_OPTS.smoothingTimeConstant;
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
      onFrame: opts.onFrame || (() => {}),
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
      if (state.rafId) cancelAnimationFrame(state.rafId);
      state.rafId = null;
      if (state.source) {
        try { state.source.disconnect(); } catch { /* noop */ }
      }
      state.source = null;
      state.analyser = null;
    }

    return { startFromStream, stop, audioCtx: state.audioCtx };
  }

  function renderSpectrogram(spec, opts = {}) {
    const elementId = opts.elementId || "plot_spectrogram";
    const el = typeof elementId === "string" ? document.getElementById(elementId) : elementId;
    if (!el) return;
    if (!spec?.mags?.length || !spec.freqs?.length || !spec.times?.length) {
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

    if (window.Plotly?.newPlot) {
      window.Plotly.newPlot(el, [trace], layout, { displayModeBar: false, responsive: true })
        .catch((err) => console.error("[Spectrogram] plot render failed", err));
    }
  }

  window.createLiveSpectrogram = createLiveSpectrogram;
  window.renderSpectrogram = renderSpectrogram;
})();
