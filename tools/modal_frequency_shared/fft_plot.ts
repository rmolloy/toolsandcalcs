(() => {
  type SpectrumSeries = number[] | Float64Array;
  interface Spectrum {
    freqs: SpectrumSeries;
    mags: SpectrumSeries;
    dbs?: SpectrumSeries;
    maxDb?: number | null;
    maxMag?: number | null;
    binWidth?: number | null;
  }

  interface Peak {
    f: number;
    label?: string;
  }

  interface ModeAnnotation {
    freq: number;
    label: string;
    color?: string;
  }

  interface FftPlotOptions {
    showNoteGrid: boolean;
    showPeaks: boolean;
    peaks?: Peak[];
    freqMin: number;
    freqMax: number;
    useNoteAxis?: boolean;
    showWolfBand?: boolean;
    modeAnnotations?: ModeAnnotation[];
  }

  const scope = (typeof window !== "undefined" ? window : globalThis) as typeof globalThis & {
    FFTState?: any;
    FFTUtils: any;
    handleToneHover?: (freq: number | null) => void;
    addAnnotation?: (pt: any) => void;
    FFTPlot?: any;
  };

  const state = (scope.FFTState as any) as {
    lastSpectrum: Spectrum | null;
    useNoteAxis: boolean;
    fftHoverShapeApplied: boolean;
    fftDefaultRanges: { x: [number, number]; y: [number, number] } | null;
    resetZoomBound: boolean;
  };
  const { freqToNoteCents, deviationColor, COLOR_ORANGE } = scope.FFTUtils;
  const NOTE_ORDER = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const Plotly = (typeof window !== "undefined" ? (window as any).Plotly : undefined);
  const EPS = 1e-12;

  function midiFromNote(note: string): number {
    const match = /^([A-G]#?)(\d)$/.exec(note);
    if (!match) throw new Error(`Invalid note: ${note}`);
    const [, name, octaveStr] = match;
    const octave = Number(octaveStr);
    const offset = NOTE_ORDER.indexOf(name);
    if (offset < 0) throw new Error(`Unknown note name: ${name}`);
    return (octave + 1) * 12 + offset;
  }

  function noteFromMidi(midi: number): string {
    const octave = Math.floor(midi / 12) - 1;
    const name = NOTE_ORDER[midi % 12];
    return `${name}${octave}`;
  }

  function freqFromMidi(midi: number): number {
    return +(440 * (2 ** ((midi - 69) / 12))).toFixed(2);
  }

  function buildChromaticNotes(startNote: string, endNote: string) {
    const start = midiFromNote(startNote);
    const end = midiFromNote(endNote);
    const notes: { name: string; freq: number; midi: number }[] = [];
    for (let midi = start; midi <= end; midi += 1) {
      notes.push({ name: noteFromMidi(midi), freq: freqFromMidi(midi), midi });
    }
    return notes;
  }

  const CHROMATIC_NOTES = buildChromaticNotes("C1", "C6");
  const NOTE_AXIS_START = CHROMATIC_NOTES[0].midi;
  const NOTE_AXIS_END = CHROMATIC_NOTES[CHROMATIC_NOTES.length - 1].midi;
  const NOTE_AXIS_TICK_VALS = CHROMATIC_NOTES.map((n) => n.midi);
  const NOTE_AXIS_TICK_TEXT = CHROMATIC_NOTES.map((n) => n.name);

  function makeFftPlot(spectrum: Spectrum, opts: FftPlotOptions) {
    const { showNoteGrid, showPeaks, peaks, freqMin, freqMax, useNoteAxis, showWolfBand, modeAnnotations = [] } = opts;
    const useChromaticAxis = Boolean(useNoteAxis);
    const { freqs, mags } = spectrum;
    const freqsArr = Array.from(freqs as any, (v: number) => v as number);
    const magsArr = Array.from(mags as any, (v: number) => v as number);
    const dbsArr = spectrum.dbs ? Array.from(spectrum.dbs as any, (v: number) => v as number) : null;
    const peakData = peaks || [];
    const maxFreq = Math.min(freqMax, freqsArr[freqsArr.length - 1] || freqMax);
    const notePoints = freqsArr.map((f) => {
      const { name, cents, centsNum, midi } = freqToNoteCents(f);
      const color = deviationColor(Math.abs(centsNum ?? 999));
      return {
        name,
        cents,
        centsNum,
        midi: Number.isFinite(midi) ? midi : NOTE_AXIS_START,
        freq: f,
        color,
      };
    });
    const xValues = notePoints.map((p) => (useChromaticAxis ? p.midi : p.freq));
    state.lastSpectrum = {
      freqs,
      mags,
      dbs: dbsArr || [],
      maxDb: spectrum.maxDb || (dbsArr ? Math.max(...dbsArr, -120) : null),
      maxMag: spectrum.maxMag || Math.max(...magsArr, 1e-9),
      binWidth: freqsArr.length > 1 ? Math.abs(freqsArr[1] - freqsArr[0]) : null,
    };
    const ySeries = dbsArr && dbsArr.length ? dbsArr : magsArr;
    const inRange = freqsArr.map((f, idx) => ({ f, v: ySeries[idx] })).filter((p) => p.f >= freqMin && p.f <= maxFreq);
    const yMax = inRange.length ? Math.max(...inRange.map((p) => p.v)) : Math.max(...ySeries);
    const yMin = inRange.length ? Math.min(...inRange.map((p) => p.v)) : Math.min(...ySeries);
    const span = Math.max(1, yMax - yMin);
    const pad = span * 0.2;
    const yRange = [yMin - pad, yMax + pad];
    const xRange: [number, number] = useChromaticAxis ? [NOTE_AXIS_START, NOTE_AXIS_END] : [freqMin, maxFreq];
    const noteCustomData = notePoints.map((p) => [p.name, p.cents, p.centsNum, p.color, p.freq, p.midi]);
    const trace = {
      x: xValues,
      y: ySeries,
      type: "scatter",
      mode: "lines",
      line: { color: "var(--blue)", width: 2, shape: "spline", smoothing: 1 },
      hovertemplate: "%{customdata[4]:.1f} Hz<br>%{y:.2f} dB<br>%{customdata[0]} <span style=\"color:%{customdata[3]};font-weight:700;\">%{customdata[1]}</span><extra></extra>",
      customdata: noteCustomData,
    };

    const overlay: any[] = [];
    if (showPeaks && peakData.length > 0) {
      const mapPeakX = (freq: number) => {
        if (!useChromaticAxis) return freq;
        const { midi } = freqToNoteCents(freq);
        return Number.isFinite(midi) ? midi : NOTE_AXIS_START;
      };
      overlay.push({
        x: peakData.map((p) => mapPeakX(p.f)),
        y: peakData.map(() => Math.max(...ySeries) * 0.85),
        mode: "markers+text",
        type: "scatter",
        marker: { color: "var(--orange)", size: 8 },
        text: peakData.map((p) => p.label),
        textposition: "top center",
        hoverinfo: "skip",
        customdata: peakData.map((p) => [p.f]),
      });
    }

    state.useNoteAxis = useChromaticAxis;
    let chromaticMin = NOTE_AXIS_START;
    let chromaticMax = NOTE_AXIS_END;
    if (useChromaticAxis) {
      xValues.forEach((x) => {
        if (x < chromaticMin) chromaticMin = x;
        if (x > chromaticMax) chromaticMax = x;
      });
      chromaticMin = Math.min(chromaticMin, NOTE_AXIS_START);
      chromaticMax = Math.max(chromaticMax, NOTE_AXIS_END);
    }
    const shapes: any[] = [];
    if (showNoteGrid) {
      shapes.push(...buildNoteGridShapes(useChromaticAxis ? ((note) => note.midi) : undefined));
    }
    if (useChromaticAxis && showWolfBand) {
      shapes.push(...buildWolfBandShapes());
    }

    const annotations: any[] = [];
    if (modeAnnotations && modeAnnotations.length) {
      const mapX = (f: number) => {
        if (!useChromaticAxis) return f;
        const note = freqToNoteCents(f);
        const midiVal = Number.isFinite(note.midi) ? note.midi : NOTE_AXIS_START;
        return clampMidi(midiVal);
      };
      const yAtFreq = (f: number) => {
        let bestIdx = 0;
        let bestDist = Infinity;
        freqs.forEach((fv, idx) => {
          const d = Math.abs(fv - f);
          if (d < bestDist) {
            bestDist = d;
            bestIdx = idx;
          }
        });
        return ySeries[bestIdx] || yMax;
      };
      modeAnnotations.forEach((ann, idx) => {
        const x = mapX(ann.freq);
        const y = yAtFreq(ann.freq);
        annotations.push({
          x,
          y,
          text: `${ann.label}<br>${ann.freq.toFixed(1)} Hz`,
          bgcolor: "rgba(11,15,22,0.92)",
          bordercolor: ann.color || COLOR_ORANGE,
          font: { color: "#fff", size: 11 },
          arrowcolor: ann.color || COLOR_ORANGE,
          arrowsize: 1,
          arrowwidth: 1,
          ax: 0,
          ay: -40 - (idx * 6),
        });
      });
    }

    const layout = {
      margin: { l: 55, r: 10, t: 10, b: 40 },
      paper_bgcolor: "transparent",
      plot_bgcolor: "transparent",
      hovermode: "x",
      hoverdistance: -1,
      xaxis: {
        title: useChromaticAxis ? "Chromatic note (C1–C6)" : "Frequency (Hz)",
        gridcolor: "var(--border-soft)",
        range: xRange,
        showspikes: true,
        spikemode: "across",
        spikecolor: COLOR_ORANGE,
        spikethickness: 2,
        spikedash: "solid",
        tickmode: useChromaticAxis ? "array" : "auto",
        tickvals: useChromaticAxis ? NOTE_AXIS_TICK_VALS : undefined,
        ticktext: useChromaticAxis ? NOTE_AXIS_TICK_TEXT : undefined,
        tickangle: useChromaticAxis ? -45 : undefined,
      },
      yaxis: {
        title: "Level (dB)",
        gridcolor: "var(--border-soft)",
        range: yRange,
        showspikes: false,
      },
      hoverlabel: {
        bgcolor: "rgba(50,105,165,0.9)",
        bordercolor: "var(--white)",
        font: { color: "#fff", size: 12, family: "system-ui, -apple-system, Segoe UI, sans-serif" },
      },
      showlegend: false,
      annotations,
      shapes,
    };

    state.fftHoverShapeApplied = false;
    Plotly.newPlot("plot_fft", [trace, ...overlay], layout, { displayModeBar: false, responsive: true })
      .then((plot: any) => {
        state.fftDefaultRanges = {
          x: [...xRange] as [number, number],
          y: [...yRange] as [number, number],
        };
        attachFftHoverHandlers();
        return plot;
      })
      .catch((err: unknown) => {
        console.error("[FFT Lite] plot render failed", err);
      });
  }

  function getCssColor(variable: string, fallback: string): string {
    const value = getComputedStyle(document.documentElement).getPropertyValue(variable);
    return value && value.trim() ? value.trim() : fallback;
  }

  function buildNoteGridShapes(xMapper: ((note: { freq: number; midi: number; name: string }) => number) = (note) => note.freq) {
    const orange = getCssColor("--orange", "#E69F00");
    return CHROMATIC_NOTES.map((n) => ({
      type: "line",
      x0: xMapper(n),
      x1: xMapper(n),
      y0: 0,
      y1: 1,
      xref: "x",
      yref: "paper",
      line: { color: orange, width: 2, dash: "dot" },
    }));
  }

  function buildWolfBandShapes() {
    const fill = "rgba(240,228,66,0.12)";
    const border = "rgba(240,228,66,0.45)";
    return CHROMATIC_NOTES.map((n) => {
      const lower = freqToNoteCents(n.freq * 0.985).midi;
      const upper = freqToNoteCents(n.freq * 1.015).midi;
      return {
        type: "rect",
        x0: clampMidi(lower ?? NOTE_AXIS_START),
        x1: clampMidi(upper ?? NOTE_AXIS_END),
        y0: 0,
        y1: 1,
        xref: "x",
        yref: "paper",
        fillcolor: fill,
        line: { color: border, width: 0 },
        layer: "below",
      };
    });
  }

  function clampMidi(value: number): number {
    if (!Number.isFinite(value)) return NOTE_AXIS_START;
    return Math.min(Math.max(value, NOTE_AXIS_START), NOTE_AXIS_END);
  }

  function renderHoverReadout({ freq, db, freqText }: { freq: number | null; db: number | null; freqText?: string }) {
    const note = freqToNoteCents(freq);
    const hasFreq = Number.isFinite(freq);
    const hasDb = Number.isFinite(db);
    const freqEl = document.getElementById("hover_freq");
    if (freqEl) {
      freqEl.textContent = freqText
        ? freqText
        : hasFreq && freq !== null ? `${freq.toFixed(2)} Hz` : "— Hz";
    }
    const dbEl = document.getElementById("hover_db");
    if (dbEl) dbEl.textContent = hasDb && db !== null ? `${db.toFixed(2)} dB` : "— dB";
    const color = deviationColor(Math.abs(note.centsNum ?? 999));
    const noteEl = document.getElementById("hover_note");
    if (noteEl) noteEl.innerHTML = `Note: ${note.name} <span style="color:${color};font-weight:700;">${note.cents}</span>`;
    if (hasFreq) {
      const toneFreq = document.getElementById("tone_freq");
      if (toneFreq) (toneFreq as HTMLInputElement).value = (freq as number).toFixed(2);
    }
  }

  function dbForFreq(freq: number): number | null {
    if (!state.lastSpectrum) return null;
    let bestIdx = 0;
    let bestDist = Infinity;
    state.lastSpectrum.freqs.forEach((f, idx) => {
      const d = Math.abs(f - freq);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = idx;
      }
    });
    const dbs = state.lastSpectrum.dbs as any;
    if (dbs && dbs.length) {
      return dbs[bestIdx] as number;
    }
    const mags = state.lastSpectrum.mags as any;
    const mag = mags[bestIdx] || 1e-12;
    return 20 * Math.log10(mag);
  }

  function attachFftHoverHandlers() {
    const plot = document.getElementById("plot_fft");
    if (!plot || state.fftHoverShapeApplied) return;
    state.fftHoverShapeApplied = true;

    (plot as any).on("plotly_hover", (evt: any) => {
      const pt = evt.points?.[0];
      if (!pt) return;
      const freqFromPoint = extractFreqFromPoint(pt);
      const pointIdx = Number.isFinite(pt.pointNumber) ? pt.pointNumber : null;
      const binFreq = (pointIdx !== null && state.lastSpectrum?.freqs)
        ? state.lastSpectrum.freqs[pointIdx] ?? freqFromPoint
        : freqFromPoint;
      const binFreqVal = Number.isFinite(binFreq) ? (binFreq as number) : null;
      if (binFreqVal === null) return;
      const db = dbForFreq(binFreqVal);
      const refined = refineParabolicPeak(pointIdx, binFreqVal);
      const freqText = (() => {
        if (!refined || !Number.isFinite(refined.freq)) return `${binFreqVal.toFixed(2)} Hz`;
        const deltaHz = refined.freq - binFreqVal;
        const deltaText = `${deltaHz >= 0 ? "+" : ""}${deltaHz.toFixed(2)} Hz`;
        return `Bin ${binFreqVal.toFixed(2)} Hz • Parab ${refined.freq.toFixed(2)} Hz (${deltaText})`;
      })();
      const displayFreq = refined?.freq ?? binFreqVal;
      renderHoverReadout({ freq: displayFreq, db, freqText });
      const hoverToneFreq = displayFreq;
      scope.handleToneHover?.(hoverToneFreq);
    });

    (plot as any).on("plotly_unhover", () => {
      renderHoverReadout({ freq: null, db: null });
      scope.handleToneHover?.(null);
    });

    (plot as any).on("plotly_click", (evt: any) => {
      const pt = evt.points?.[0];
      if (!pt) return;
      const freq = extractFreqFromPoint(pt);
      if (!Number.isFinite(freq)) return;
      const clone = { ...pt, x: freq };
      scope.addAnnotation?.(clone);
    });

    const resetButton = document.getElementById("btn_reset_zoom");
    if (resetButton && !state.resetZoomBound) {
      state.resetZoomBound = true;
      resetButton.addEventListener("click", () => {
        const ranges = state.fftDefaultRanges;
        if (!ranges) return;
        const xRange = Array.isArray(ranges.x) ? [...ranges.x] : null;
        const yRange = Array.isArray(ranges.y) ? [...ranges.y] : null;
        if (!xRange || !yRange) return;
        Plotly.relayout(plot, {
          "xaxis.autorange": false,
          "xaxis.range": xRange,
          "yaxis.autorange": false,
          "yaxis.range": yRange,
        });
      });
    }
  }

  function extractFreqFromPoint(pt: any): number | null {
    if (!pt) return null;
    const data = pt.customdata;
    if (Array.isArray(data)) {
      if (Number.isFinite(data[4])) return data[4];
      if (Number.isFinite(data[0])) return data[0];
    } else if (data && typeof data === "object" && Number.isFinite(data.freq)) {
      return data.freq;
    }
    if (Number.isFinite(pt.x) && !state.useNoteAxis) return pt.x;
    if (Number.isFinite(pt.x) && state.useNoteAxis) return freqFromMidi(pt.x);
    return null;
  }

  function refineParabolicPeak(pointIndex: number | null, fallbackFreq: number | null = null): { freq: number; delta: number } | null {
    const spectrum = state.lastSpectrum;
    if (!spectrum || !spectrum.mags?.length || !spectrum.freqs?.length) return null;
    let k: number | null = Number.isFinite(pointIndex) ? (pointIndex as number) : null;
    if (k === null && Number.isFinite(fallbackFreq)) {
      const target = fallbackFreq as number;
      let bestIdx = 0;
      let bestDist = Infinity;
      spectrum.freqs.forEach((f, idx) => {
        const d = Math.abs(f - target);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = idx;
        }
      });
      k = bestIdx;
    }
    if (k === null || !Number.isFinite(k)) return null;
    if (k <= 0 || k >= spectrum.mags.length - 1) return null;
    const binWidthVal = spectrum.binWidth ?? (spectrum.freqs.length > 1 ? Math.abs(spectrum.freqs[1] - spectrum.freqs[0]) : null);
    if (binWidthVal == null) return null;
    if (!Number.isFinite(binWidthVal) || binWidthVal <= 0) return null;
    const idx = k as number;
    const bw = binWidthVal as number;
    const a = (spectrum.mags as any)[idx - 1];
    const b = (spectrum.mags as any)[idx];
    const c = (spectrum.mags as any)[idx + 1];
    if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(c)) return null;
    const denom = a - (2 * b) + c;
    if (Math.abs(denom) < EPS) return null;
    const delta = 0.5 * (a - c) / denom;
    if (!Number.isFinite(delta)) return null;
    const clampedDelta = Math.max(-1.5, Math.min(1.5, delta));
    const freq = spectrum.freqs[idx] + clampedDelta * bw;
    return { freq, delta: clampedDelta };
  }

  function smoothSpectrum(spectrum: Spectrum, smoothHz: number): Spectrum {
    if (!smoothHz || smoothHz <= 0) return spectrum;
    const freqsArr = Array.from(spectrum.freqs as any, (v: number) => v as number);
    const magsArr = Array.from(spectrum.mags as any, (v: number) => v as number);
    const out: number[] = [];
    const bandwidth = smoothHz;
    for (let i = 0; i < freqsArr.length; i += 1) {
      const f = freqsArr[i];
      let acc = 0;
      let weight = 0;
      for (let j = 0; j < freqsArr.length; j += 1) {
        const df = Math.abs(freqsArr[j] - f);
        if (df <= bandwidth) {
          const w = 1 - (df / bandwidth);
          acc += magsArr[j] * w;
          weight += w;
        }
      }
      out.push(weight > 0 ? acc / weight : magsArr[i]);
    }
    return { freqs: spectrum.freqs, mags: out };
  }

  function applyDb(spectrum: Spectrum): Spectrum & { dbs: number[]; maxDb: number; floorDb: number } {
    const rawDb = Array.from(spectrum.mags as any, (m: number) => 20 * Math.log10(Math.max(m, 1e-12)));
    const maxDb = Math.max(...rawDb, -200);
    const floorDb = Math.max(maxDb - 80, -120);
    const dbs = rawDb.map((d) => Math.max(d, floorDb));
    return { ...spectrum, dbs, maxDb, floorDb };
  }

  scope.FFTPlot = {
    makeFftPlot,
    smoothSpectrum,
    applyDb,
    renderHoverReadout,
  };
})();
