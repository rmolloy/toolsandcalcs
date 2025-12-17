(() => {
  interface WaveData {
    timeMs: number[];
    wave: number[] | Float64Array;
    sampleRate: number;
  }

  type RangeMs = { start: number; end: number } | null;

  interface FFTStateShape {
    waveRelayoutApplied: boolean;
    viewRangeMs: RangeMs;
  }

  type RangeChangeHandler = (range: RangeMs) => void;

  const state = (typeof window !== "undefined" ? window : globalThis as any).FFTState as FFTStateShape;
  const { getCssVar } = (typeof window !== "undefined" ? window : globalThis as any).FFTUtils;
  const Plotly = (typeof window !== "undefined" ? (window as any).Plotly : undefined);

  function makeWavePlot({ timeMs, wave }: WaveData, onRangeChange?: RangeChangeHandler) {
    const absWave = Array.from(wave, (v) => Math.abs(v));
    const fillColor = "rgba(86,180,233,0.18)";
    const trace = {
      x: timeMs,
      y: absWave,
      type: "scatter",
      mode: "lines",
      fill: "tozeroy",
      fillcolor: fillColor,
      line: { color: getCssVar("--blue", "#56B4E9"), width: 2 },
      hovertemplate: "%{x:.1f} ms<br>%{y:.3f}<extra></extra>",
    };
    const layout = {
      margin: { l: 45, r: 10, t: 10, b: 40 },
      paper_bgcolor: "transparent",
      plot_bgcolor: "transparent",
      xaxis: { title: "Time (ms)", gridcolor: "var(--border-soft)" },
      yaxis: { title: "Amplitude", gridcolor: "var(--border-soft)" },
      showlegend: false,
    };
    Plotly.newPlot("plot_waveform", [trace], layout, { displayModeBar: false, responsive: true });
    state.waveRelayoutApplied = false;
    attachWaveRelayout(onRangeChange);
  }

  function attachWaveRelayout(onRangeChange?: RangeChangeHandler) {
    const plot = document.getElementById("plot_waveform") as any;
    if (!plot || state.waveRelayoutApplied) return;
    state.waveRelayoutApplied = true;

    plot.on("plotly_relayout", (ev: any) => {
      const range0 = ev["xaxis.range[0]"];
      const range1 = ev["xaxis.range[1]"];
      const auto = ev["xaxis.autorange"];

      if (auto || range0 === undefined || range1 === undefined) {
        state.viewRangeMs = null;
        if (onRangeChange) onRangeChange(null);
        return;
      }

      const start = Number(range0);
      const end = Number(range1);
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return;
      state.viewRangeMs = { start, end };
      if (onRangeChange) onRangeChange({ start, end });
    });
  }

  function sliceWave(src: { wave: number[] | Float64Array; sampleRate: number } | null, sampleLengthMs: number): WaveData | null {
    if (!src || !src.wave) return null;
    const desiredSamples = Math.max(64, Math.round((sampleLengthMs / 1000) * src.sampleRate));
    const wave = src.wave.slice(0, desiredSamples);
    const timeMs = Array.from({ length: wave.length }, (_, i) => (i / src.sampleRate) * 1000);
    return { wave, timeMs, sampleRate: src.sampleRate };
  }

  function sliceWaveRange(src: { wave: number[] | Float64Array; sampleRate: number } | null, startMs: number, endMs: number): WaveData | null {
    if (!src || !src.wave) return null;
    const clampedStart = Math.max(0, startMs);
    const clampedEnd = Math.max(clampedStart + 1, endMs);
    const startIdx = Math.floor((clampedStart / 1000) * src.sampleRate);
    const endIdx = Math.min(src.wave.length, Math.ceil((clampedEnd / 1000) * src.sampleRate));
    const wave = src.wave.slice(startIdx, endIdx);
    const timeMs = Array.from({ length: wave.length }, (_, i) => ((startIdx + i) / src.sampleRate) * 1000);
    return { wave, timeMs, sampleRate: src.sampleRate };
  }

  const scope = (typeof window !== "undefined" ? window : globalThis) as typeof globalThis & {
    FFTWaveform?: {
      makeWavePlot: typeof makeWavePlot;
      sliceWave: typeof sliceWave;
      sliceWaveRange: typeof sliceWaveRange;
    };
  };

  scope.FFTWaveform = { makeWavePlot, sliceWave, sliceWaveRange };
})();
