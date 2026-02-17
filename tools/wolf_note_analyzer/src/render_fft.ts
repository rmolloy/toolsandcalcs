/**
 * FFT rendering helpers (Plotly + DOM wiring).
 */

import { ENERGY_COLORS, UNLABELED_META, allBodyModes, fftEngine, hexToRgba, setFftDefaultRanges } from "./state.js";

export async function renderFft(slice: any, f0: number | null, mode: any, precomputed: any = null) {
  const plot = document.getElementById("plot_fft");
  if (!plot) return;
  if (!slice) {
    (window as any).Plotly?.purge?.(plot);
    return null;
  }
  const spectrum = precomputed || await fftEngine.magnitude(slice.wave, slice.sampleRate, { maxFreq: 1000, window: "hann" });
  const smoothed = (window as any).FFTPlot?.smoothSpectrum ? (window as any).FFTPlot.smoothSpectrum(spectrum, 1.5) : spectrum;
  const withDb = (window as any).FFTPlot?.applyDb ? (window as any).FFTPlot.applyDb(smoothed) : smoothed;
  const freqs = Array.from(withDb.freqs as any, (v: number) => v as number);
  const dbs = Array.from(withDb.dbs || withDb.mags, (v: number) => v as number);

  const trace = {
    x: freqs,
    y: dbs,
    type: "scatter",
    mode: "lines",
    line: { color: "#8ecbff", width: 2.5 },
    hovertemplate: "%{x:.1f} Hz<br>%{y:.1f} dB<extra></extra>",
  };

  const shapes: any[] = [];
  const annotations: any[] = [];
  if (Number.isFinite(f0)) {
    const f0Val = f0 as number;
    [1, 2, 3].forEach((mult, idx) => {
      const x = f0Val * mult;
      shapes.push({
        type: "line",
        xref: "x",
        yref: "paper",
        x0: x,
        x1: x,
        y0: 0,
        y1: 1,
        line: { color: idx === 0 ? ENERGY_COLORS.fundamental : ENERGY_COLORS.harmonic, width: 1.5, dash: idx === 0 ? "solid" : "dot" },
      });
    });
  }
  allBodyModes().forEach((m: any) => {
    if (!Number.isFinite(m?.peakFreq)) return;
    const color = m.color || UNLABELED_META.color;
    const band = Math.max(5, (m.peakFreq as number) * 0.01);
    shapes.push({
      type: "rect",
      xref: "x",
      yref: "paper",
      x0: (m.peakFreq as number) - band,
      x1: (m.peakFreq as number) + band,
      y0: 0,
      y1: 1,
      fillcolor: hexToRgba(color, 0.18),
      line: { color: hexToRgba(color, 0.55), width: 1 },
    });
    annotations.push({
      x: m.peakFreq,
      y: 0.95,
      xref: "x",
      yref: "paper",
      text: m.label,
      showarrow: false,
      font: { color: hexToRgba(color, 0.9), size: 10 },
      bgcolor: "rgba(6, 10, 18, 0.65)",
      bordercolor: hexToRgba(color, 0.35),
      borderwidth: 1,
      borderpad: 3,
      xanchor: "center",
    });
  });

  const layout = {
    margin: { l: 50, r: 10, t: 10, b: 40 },
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
    xaxis: { title: "Frequency (Hz)", gridcolor: "rgba(255,255,255,0.06)" },
    yaxis: { title: "Level (dB)", gridcolor: "rgba(255,255,255,0.06)" },
    shapes,
    annotations,
    showlegend: false,
  };

  (window as any).Plotly.newPlot(plot, [trace], layout, {
    displayModeBar: true,
    displaylogo: false,
    responsive: true,
  });

  const xRange: [number, number] = [freqs[0] || 0, freqs[freqs.length - 1] || 1000];
  const yMax = Math.max(...dbs);
  const yMin = Math.min(...dbs);
  setFftDefaultRanges({ x: xRange, y: [yMin, yMax] });
  return withDb;
}

if (typeof window !== "undefined") {
  (window as any).renderFft = renderFft;
}
