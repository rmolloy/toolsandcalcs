/* global Plotly */

(() => {
  const state = window.FFTState;
  const { freqToNoteCents, deviationColor, COLOR_ORANGE } = window.FFTUtils;
  const NOTE_ORDER = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

  function midiFromNote(note) {
    const match = /^([A-G]#?)(\d)$/.exec(note);
    if (!match) throw new Error(`Invalid note: ${note}`);
    const [, name, octaveStr] = match;
    const octave = Number(octaveStr);
    const offset = NOTE_ORDER.indexOf(name);
    if (offset < 0) throw new Error(`Unknown note name: ${name}`);
    return (octave + 1) * 12 + offset;
  }

  function noteFromMidi(midi) {
    const octave = Math.floor(midi / 12) - 1;
    const name = NOTE_ORDER[midi % 12];
    return `${name}${octave}`;
  }

  function freqFromMidi(midi) {
    return +(440 * (2 ** ((midi - 69) / 12))).toFixed(2);
  }

  function buildChromaticNotes(startNote, endNote) {
    const start = midiFromNote(startNote);
    const end = midiFromNote(endNote);
    const notes = [];
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

  function makeFftPlot(spectrum, opts) {
    const { showNoteGrid, showPeaks, peaks, freqMin, freqMax, useNoteAxis, showWolfBand } = opts;
    const useChromaticAxis = Boolean(useNoteAxis);
    const { freqs, mags } = spectrum;
    const peakData = peaks || [];
    const maxFreq = Math.min(freqMax, freqs[freqs.length - 1] || freqMax);
    const notePoints = freqs.map((f) => {
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
      dbs: spectrum.dbs || [],
      maxDb: spectrum.maxDb || (spectrum.dbs ? Math.max(...spectrum.dbs, -120) : null),
      maxMag: spectrum.maxMag || Math.max(...mags, 1e-9),
    };
    const ySeries = spectrum.dbs && spectrum.dbs.length ? spectrum.dbs : mags;
    const inRange = freqs.map((f, idx) => ({ f, v: ySeries[idx] })).filter((p) => p.f >= freqMin && p.f <= maxFreq);
    const yMax = inRange.length ? Math.max(...inRange.map((p) => p.v)) : Math.max(...ySeries);
    const yMin = inRange.length ? Math.min(...inRange.map((p) => p.v)) : Math.min(...ySeries);
    const span = Math.max(1, yMax - yMin);
    const pad = span * 0.2;
    const yRange = [yMin - pad, yMax + pad];
    const xRange = useChromaticAxis ? [NOTE_AXIS_START, NOTE_AXIS_END] : [freqMin, maxFreq];
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

    const overlay = [];
    if (showPeaks && peakData.length > 0) {
      const mapPeakX = (freq) => {
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
    const shapes = [];
    if (showNoteGrid) {
      shapes.push(...buildNoteGridShapes(useChromaticAxis ? ((note) => note.midi) : undefined));
    }
    if (useChromaticAxis && showWolfBand) {
      shapes.push(...buildWolfBandShapes());
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
      shapes,
    };

    state.fftHoverShapeApplied = false;
    Plotly.newPlot("plot_fft", [trace, ...overlay], layout, { displayModeBar: false, responsive: true })
      .then((plot) => {
        state.fftDefaultRanges = {
          x: [...xRange],
          y: [...yRange],
        };
        attachFftHoverHandlers();
        return plot;
      })
      .catch((err) => {
        console.error("[FFT Lite] plot render failed", err);
      });
  }

  function getCssColor(variable, fallback) {
    const value = getComputedStyle(document.documentElement).getPropertyValue(variable);
    return value && value.trim() ? value.trim() : fallback;
  }

  function buildNoteGridShapes(xMapper = (note) => note.freq) {
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

  function clampMidi(value) {
    if (!Number.isFinite(value)) return NOTE_AXIS_START;
    return Math.min(Math.max(value, NOTE_AXIS_START), NOTE_AXIS_END);
  }

  function renderHoverReadout({ freq, db }) {
    const note = freqToNoteCents(freq);
    const hasFreq = Number.isFinite(freq);
    const hasDb = Number.isFinite(db);
    document.getElementById("hover_freq").textContent = hasFreq ? `${freq.toFixed(2)} Hz` : "— Hz";
    document.getElementById("hover_db").textContent = hasDb ? `${db.toFixed(2)} dB` : "— dB";
    const color = deviationColor(Math.abs(note.centsNum ?? 999));
    document.getElementById("hover_note").innerHTML = `Note: ${note.name} <span style="color:${color};font-weight:700;">${note.cents}</span>`;
    if (hasFreq) {
      const toneFreq = document.getElementById("tone_freq");
      if (toneFreq) toneFreq.value = freq.toFixed(2);
    }
  }

  function dbForFreq(freq) {
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
    if (state.lastSpectrum.dbs && state.lastSpectrum.dbs.length) {
      return state.lastSpectrum.dbs[bestIdx];
    }
    const mag = state.lastSpectrum.mags[bestIdx] || 1e-12;
    return 20 * Math.log10(mag);
  }

  function attachFftHoverHandlers() {
    const plot = document.getElementById("plot_fft");
    if (!plot || state.fftHoverShapeApplied) return;
    state.fftHoverShapeApplied = true;

    plot.on("plotly_hover", (evt) => {
      const pt = evt.points?.[0];
      if (!pt) return;
      const freq = extractFreqFromPoint(pt);
      if (!Number.isFinite(freq)) return;
      const db = dbForFreq(freq);
      renderHoverReadout({ freq, db });
      if (window.handleToneHover) window.handleToneHover(freq);
    });

    plot.on("plotly_unhover", () => {
      renderHoverReadout({ freq: null, db: null });
      if (window.handleToneHover) window.handleToneHover(null);
    });

    plot.on("plotly_click", (evt) => {
      const pt = evt.points?.[0];
      if (!pt) return;
      const freq = extractFreqFromPoint(pt);
      if (!Number.isFinite(freq)) return;
      const clone = { ...pt, x: freq };
      window.addAnnotation?.(clone);
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

  function extractFreqFromPoint(pt) {
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

  function smoothSpectrum(spectrum, smoothHz) {
    if (!smoothHz || smoothHz <= 0) return spectrum;
    const { freqs, mags } = spectrum;
    const out = [];
    const bandwidth = smoothHz;
    for (let i = 0; i < freqs.length; i += 1) {
      const f = freqs[i];
      let acc = 0;
      let weight = 0;
      for (let j = 0; j < freqs.length; j += 1) {
        const df = Math.abs(freqs[j] - f);
        if (df <= bandwidth) {
          const w = 1 - (df / bandwidth);
          acc += mags[j] * w;
          weight += w;
        }
      }
      out.push(weight > 0 ? acc / weight : mags[i]);
    }
    return { freqs, mags: out };
  }

  function applyDb(spectrum) {
    const rawDb = spectrum.mags.map((m) => 20 * Math.log10(Math.max(m, 1e-12)));
    const maxDb = Math.max(...rawDb, -200);
    const floorDb = Math.max(maxDb - 80, -120);
    const dbs = rawDb.map((d) => Math.max(d, floorDb));
    return { ...spectrum, dbs, maxDb, floorDb };
  }

  window.FFTPlot = {
    makeFftPlot,
    smoothSpectrum,
    applyDb,
    renderHoverReadout,
  };
})();
