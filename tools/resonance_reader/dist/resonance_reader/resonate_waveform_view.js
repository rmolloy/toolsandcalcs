import { waveformLabelResolveFromContext } from "./resonate_waveform_label.js";
import { noteWindowRangeBuildFromSlice, noteWindowSliceFindByTime, noteSelectionWindowRequestedFromPlotlyClick, } from "./resonate_note_window_selection.js";
import { resolveColorHexFromRole, resolveColorRgbaFromRole } from "./resonate_color_roles.js";
import { measureModeNormalize } from "./resonate_mode_config.js";
let waveUpdatingShapes = false;
const TAP_CLUSTER_GAP_MS = 950;
const NOTE_CLUSTER_GAP_MS = 2600;
const TAP_CLUSTER_OUTLIER_MIN_RATIO = 0.6;
const TAP_CLUSTER_OUTLIER_MAX_RATIO = 1.8;
const FALLBACK_WINDOW_MIN_MS = 900;
const FALLBACK_WINDOW_MAX_MS = 3000;
const FALLBACK_WINDOW_RATIO = 0.22;
const RANGE_DRAG_EDGE_TOLERANCE_PX = 10;
const RANGE_DRAG_MIN_WIDTH_MS = 80;
const NOTE_EDITOR_POPOVER_ID = "wave_note_override_editor";
function waveRangeFingerprint(range) {
    if (!range)
        return "none";
    return `${range.start}:${range.end}`;
}
function primaryRangePipelineShouldTriggerFromRangeChange(state, nextRange) {
    const nextFingerprint = waveRangeFingerprint(nextRange);
    if (state.lastPrimaryRangePipelineFingerprint === nextFingerprint)
        return false;
    state.lastPrimaryRangePipelineFingerprint = nextFingerprint;
    return true;
}
function noteRangePipelineShouldTriggerFromRangeChange(state, nextRange) {
    const nextFingerprint = waveRangeFingerprint(nextRange);
    if (state.lastNoteRangePipelineFingerprint === nextFingerprint)
        return false;
    state.lastNoteRangePipelineFingerprint = nextFingerprint;
    return true;
}
function buildSelectionShapes(range) {
    if (!range)
        return [];
    return [
        {
            type: "rect",
            xref: "x",
            yref: "paper",
            x0: range.start,
            x1: range.end,
            y0: 0,
            y1: 1,
            line: { color: resolveColorRgbaFromRole("wavePrimarySelection", 0.95), width: 2 },
            fillcolor: resolveColorRgbaFromRole("wavePrimarySelection", 0.1),
        },
        {
            type: "line",
            xref: "x",
            yref: "paper",
            x0: range.start,
            x1: range.start,
            y0: 0,
            y1: 1,
            line: { color: resolveColorRgbaFromRole("wavePrimarySelection", 0.95), width: 6 },
        },
        {
            type: "line",
            xref: "x",
            yref: "paper",
            x0: range.end,
            x1: range.end,
            y0: 0,
            y1: 1,
            line: { color: resolveColorRgbaFromRole("wavePrimarySelection", 0.95), width: 6 },
        },
    ];
}
function buildNoteSelectionShapes(range) {
    if (!range)
        return [];
    return [
        {
            type: "rect",
            xref: "x",
            yref: "paper",
            x0: range.start,
            x1: range.end,
            y0: 0,
            y1: 1,
            line: { color: resolveColorRgbaFromRole("waveNoteSelection", 0.95), width: 2 },
            fillcolor: resolveColorRgbaFromRole("waveNoteSelection", 0.1),
        },
        {
            type: "line",
            xref: "x",
            yref: "paper",
            x0: range.start,
            x1: range.start,
            y0: 0,
            y1: 1,
            line: { color: resolveColorRgbaFromRole("waveNoteSelection", 0.95), width: 6 },
        },
        {
            type: "line",
            xref: "x",
            yref: "paper",
            x0: range.end,
            x1: range.end,
            y0: 0,
            y1: 1,
            line: { color: resolveColorRgbaFromRole("waveNoteSelection", 0.95), width: 6 },
        },
    ];
}
function buildTapSegmentShapes(tapSegments, sampleRate) {
    const shapes = [];
    tapSegments.forEach((tap) => {
        const midMs = ((tap.start + tap.end) / 2 / sampleRate) * 1000;
        shapes.push({
            type: "line",
            xref: "x",
            yref: "paper",
            x0: midMs,
            x1: midMs,
            y0: 0,
            y1: 1,
            line: { color: resolveColorRgbaFromRole("waveTapMarker", 0.55), width: 2 },
        });
    });
    return shapes;
}
function buildNoteSliceShapes(noteSlices, activeRange) {
    const shapes = [];
    noteSlices.forEach((note) => {
        const isSelected = activeRange && note.startMs >= activeRange.start && note.endMs <= activeRange.end;
        shapes.push({
            type: "rect",
            xref: "x",
            yref: "paper",
            x0: note.startMs,
            x1: note.endMs,
            y0: 0,
            y1: 1,
            fillcolor: isSelected
                ? resolveColorRgbaFromRole("wavePrimarySelection", 0.2)
                : resolveColorRgbaFromRole("fftLine", 0.12),
            line: {
                color: isSelected
                    ? resolveColorRgbaFromRole("wavePrimarySelection", 0.8)
                    : resolveColorRgbaFromRole("fftLine", 0.25),
                width: 1,
            },
        });
    });
    return shapes;
}
function noteLabelFromFreq(freq) {
    if (!Number.isFinite(freq))
        return null;
    const FFTUtils = window.FFTUtils;
    if (!FFTUtils?.freqToNoteCents)
        return null;
    try {
        const out = FFTUtils.freqToNoteCents(freq);
        const name = typeof out?.name === "string" ? out.name : null;
        return name;
    }
    catch {
        return null;
    }
}
export function noteLabelOverridesGetOrInit(state) {
    return (state.noteLabelOverrides || (state.noteLabelOverrides = {}));
}
export function noteLabelOverrideSet(state, noteSliceId, label) {
    const normalized = noteLabelOverrideNormalized(label);
    if (!normalized)
        return;
    const overrides = noteLabelOverridesGetOrInit(state);
    overrides[noteSliceId] = normalized;
}
export function noteLabelOverrideReset(state, noteSliceId) {
    const overrides = noteLabelOverridesGetOrInit(state);
    delete overrides[noteSliceId];
}
function noteLabelOverrideResolveFromState(state, noteSliceId) {
    if (!Number.isFinite(noteSliceId))
        return null;
    const overrides = noteLabelOverridesGetOrInit(state);
    const value = overrides[noteSliceId];
    return typeof value === "string" && value.length ? value : null;
}
function noteLabelOverrideNormalized(rawLabel) {
    const compact = String(rawLabel || "").trim().replace(/\s+/g, "");
    return compact ? compact.toUpperCase() : "";
}
function resolveWaveLabelFromContext(f0, noteSlice, deps) {
    return waveformLabelResolveFromContext({
        f0,
        measureMode: deps.state.measureMode,
        modesDetected: deps.state.lastModesDetected || [],
        noteSliceSampleCount: noteSlice?.samples?.length,
        noteSliceSampleRate: noteSlice?.sampleRate,
        debugMeta: {
            noteSliceId: noteSlice?.id,
            noteSliceStartMs: noteSlice?.startMs,
            noteSliceEndMs: noteSlice?.endMs,
            measureMode: deps.state.measureMode,
        },
        noteNameResolve: (freq) => noteLabelFromFreq(freq),
    });
}
function resolveWaveLabelFromStateOrContext(noteSlice, detectedF0, deps) {
    const override = noteLabelOverrideResolveFromState(deps.state, noteSlice?.id);
    if (override)
        return override;
    return resolveWaveLabelFromContext(detectedF0, noteSlice, deps);
}
function buildWaveAnnotations(noteSlices, noteResults, deps) {
    const annotations = [];
    noteSlices.forEach((note) => {
        const result = noteResults.find((n) => n.id === note.id);
        const label = resolveWaveLabelFromStateOrContext(note, result?.f0 ?? null, deps);
        if (!label)
            return;
        const mid = (note.startMs + note.endMs) / 2;
        annotations.push({
            x: mid,
            y: 0.95,
            xref: "x",
            yref: "paper",
            text: label,
            showarrow: false,
            font: { color: "rgba(255,255,255,0.7)", size: 11 },
            noteSliceId: note.id,
        });
    });
    return annotations;
}
function buildWaveShapes(sampleRate, primaryRange, noteSelectionRange, tapSegments, noteSlices, measureMode) {
    const shapes = [];
    shapes.push(...buildNoteSliceShapes(noteSlices || [], primaryRange));
    shapes.push(...buildTapSegmentShapes(tapSegments || [], sampleRate));
    if (noteSelectionRangeVisibleForMeasureMode(measureMode)) {
        shapes.push(...buildNoteSelectionShapes(noteSelectionRange));
    }
    shapes.push(...buildSelectionShapes(primaryRange));
    return shapes;
}
export function noteSelectionRangeVisibleForMeasureMode(measureMode) {
    return measureModeNormalize(measureMode) === "played_note";
}
function renderWaveSelection(primaryRange, noteSelectionRange, deps, slice) {
    const plot = document.getElementById("plot_waveform");
    if (!plot)
        return;
    const Plotly = window.Plotly;
    if (!Plotly)
        return;
    const shapes = buildWaveShapes(slice.sampleRate, primaryRange, noteSelectionRange, deps.state.tapSegments, deps.state.noteSlices, deps.state.measureMode);
    waveUpdatingShapes = true;
    Promise.resolve(Plotly.relayout(plot, { shapes })).finally(() => {
        waveUpdatingShapes = false;
    });
}
function renderWaveAnnotations(deps, slice) {
    const plot = document.getElementById("plot_waveform");
    if (!plot)
        return;
    const Plotly = window.Plotly;
    if (!Plotly)
        return;
    const annotations = buildWaveAnnotations(deps.state.noteSlices || [], deps.state.noteResults || [], deps);
    void Plotly.relayout(plot, { annotations });
}
function makeWaveNavigatorPlot(slice, deps, onPrimaryRangeChange, onNoteSelectionRangeChange) {
    const plot = document.getElementById("plot_waveform");
    if (!plot)
        return;
    const Plotly = window.Plotly;
    if (!Plotly)
        return;
    const absWave = Array.from(slice.wave, (v) => Math.abs(v));
    const timeMs = Array.isArray(slice.timeMs)
        ? slice.timeMs
        : Array.from({ length: absWave.length }, (_, i) => (i / slice.sampleRate) * 1000);
    const maxAbs = absWave.reduce((max, v) => (Number.isFinite(v) && v > max ? v : max), 0);
    const yMax = maxAbs > 0 ? maxAbs * 1.05 : 1;
    const plotlyWaveToolsEnabled = plotlyWaveToolsEnabledResolve();
    deps.state.waveRenderDebug = { maxAbs, yMax };
    const trace = {
        x: timeMs,
        y: absWave,
        type: "scatter",
        mode: "lines",
        fill: "tozeroy",
        fillcolor: resolveColorRgbaFromRole("fftLine", 0.16),
        line: { color: resolveColorHexFromRole("fftLine"), width: 1.5 },
        hovertemplate: "%{x:.0f} ms<extra></extra>",
    };
    const layout = {
        margin: { l: 40, r: 10, t: 6, b: 26 },
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        showlegend: false,
        xaxis: {
            showgrid: false,
            zeroline: false,
            color: "rgba(255,255,255,0.45)",
            title: "",
            fixedrange: !plotlyWaveToolsEnabled,
        },
        yaxis: {
            showgrid: false,
            zeroline: false,
            showticklabels: false,
            fixedrange: true,
        },
        shapes: buildWaveShapes(slice.sampleRate, deps.state.viewRangeMs || null, deps.state.noteSelectionRangeMs || null, deps.state.tapSegments, deps.state.noteSlices, deps.state.measureMode),
        annotations: buildWaveAnnotations(deps.state.noteSlices || [], deps.state.noteResults || [], deps),
    };
    Plotly.newPlot(plot, [trace], layout, {
        displayModeBar: plotlyWaveToolsEnabled,
        displaylogo: false,
        responsive: true,
        modeBarButtonsToRemove: plotlyWaveToolsEnabled
            ? ["select2d", "lasso2d"]
            : ["zoom2d", "pan2d", "select2d", "lasso2d", "zoomIn2d", "zoomOut2d", "autoScale2d"],
    });
    if (typeof plot.removeAllListeners === "function") {
        plot.removeAllListeners("plotly_relayout");
        plot.removeAllListeners("plotly_click");
        plot.removeAllListeners("plotly_clickannotation");
    }
    bindWaveNoteOverrideDismissInteractions(plot);
    bindWaveNoteOverrideModifierClickInteractions(plot, deps, slice);
    plot.on("plotly_click", (ev) => {
        if (plot.__resonateSuppressClick) {
            plot.__resonateSuppressClick = false;
            return;
        }
        const pt = ev?.points?.[0];
        if (!pt)
            return;
        const x = pt.x;
        if (!Number.isFinite(x))
            return;
        const note = noteWindowSliceFindByTime(deps.state.noteSlices || [], x);
        if (note) {
            if (waveNoteOverrideRequestedFromClickEvent(ev?.event)) {
                openWaveNoteOverrideEditorFromSlice(note.id, x, deps, slice);
                return;
            }
            const range = noteWindowRangeBuildFromSlice(note);
            if (noteSelectionWindowRequestedFromPlotlyClick(ev)) {
                deps.state.noteSelectionRangeMs = range;
                renderWaveSelection(deps.state.viewRangeMs || null, deps.state.noteSelectionRangeMs || null, deps, slice);
                onNoteSelectionRangeChange?.(range);
                return;
            }
            deps.state.viewRangeMs = range;
            renderWaveSelection(deps.state.viewRangeMs || null, deps.state.noteSelectionRangeMs || null, deps, slice);
            onPrimaryRangeChange?.(range);
            return;
        }
        const tap = (deps.state.tapSegments || []).find((seg) => {
            const startMs = (seg.start / slice.sampleRate) * 1000;
            const endMs = (seg.end / slice.sampleRate) * 1000;
            return x >= startMs && x <= endMs;
        });
        if (!tap)
            return;
        const range = {
            start: (tap.start / slice.sampleRate) * 1000,
            end: (tap.end / slice.sampleRate) * 1000,
        };
        deps.state.viewRangeMs = range;
        renderWaveSelection(deps.state.viewRangeMs || null, deps.state.noteSelectionRangeMs || null, deps, slice);
        onPrimaryRangeChange?.(range);
    });
    plot.on("plotly_clickannotation", (ev) => {
        const anchorMs = Number(ev?.annotation?.x);
        if (!Number.isFinite(anchorMs))
            return;
        const note = noteWindowSliceFindByTime(deps.state.noteSlices || [], anchorMs);
        if (!note)
            return;
        openWaveNoteOverrideEditorFromSlice(note.id, anchorMs, deps, slice);
    });
    plot.on("plotly_relayout", (ev) => {
        if (waveUpdatingShapes)
            return;
        const range0 = ev["xaxis.range[0]"];
        const range1 = ev["xaxis.range[1]"];
        const auto = ev["xaxis.autorange"];
        if (auto || range0 === undefined || range1 === undefined) {
            if (plot.__resonateShiftDragActive) {
                deps.state.noteSelectionRangeMs = null;
                renderWaveSelection(deps.state.viewRangeMs || null, deps.state.noteSelectionRangeMs || null, deps, slice);
                onNoteSelectionRangeChange?.(null);
            }
            else {
                deps.state.viewRangeMs = null;
                renderWaveSelection(deps.state.viewRangeMs || null, deps.state.noteSelectionRangeMs || null, deps, slice);
                onPrimaryRangeChange?.(null);
            }
            return;
        }
        const start = Number(range0);
        const end = Number(range1);
        if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
            return;
        const range = { start, end };
        if (plot.__resonateShiftDragActive) {
            deps.state.noteSelectionRangeMs = range;
            renderWaveSelection(deps.state.viewRangeMs || null, deps.state.noteSelectionRangeMs || null, deps, slice);
            onNoteSelectionRangeChange?.(range);
        }
        else {
            deps.state.viewRangeMs = range;
            renderWaveSelection(deps.state.viewRangeMs || null, deps.state.noteSelectionRangeMs || null, deps, slice);
            onPrimaryRangeChange?.(range);
        }
    });
    renderWaveSelection(deps.state.viewRangeMs || null, deps.state.noteSelectionRangeMs || null, deps, slice);
    bindNoteSelectionResizeModifierTracking(plot);
    bindRangeDirectDragInteractions(plot, deps, slice, onPrimaryRangeChange, onNoteSelectionRangeChange);
}
function openWaveNoteOverrideEditorFromSlice(noteSliceId, anchorMs, deps, slice) {
    const noteSlice = (deps.state.noteSlices || []).find((entry) => entry.id === noteSliceId);
    if (!noteSlice)
        return;
    const detectedLabel = waveDetectedLabelResolveForNoteSlice(noteSlice, deps);
    if (!detectedLabel || detectedLabel === "Tap") {
        deps.setStatus("Tap labels are automatic; note override is available on note slices.");
        return;
    }
    const plot = document.getElementById("plot_waveform");
    if (!(plot instanceof HTMLElement))
        return;
    const editor = waveNoteOverrideEditorGetOrCreate(plot);
    const header = editor.querySelector("[data-wave-note-detected]");
    const quick = editor.querySelector("[data-wave-note-quick]");
    const input = editor.querySelector("[data-wave-note-input]");
    const applyBtn = editor.querySelector("[data-wave-note-apply]");
    const clearBtn = editor.querySelector("[data-wave-note-clear]");
    const closeBtn = editor.querySelector("[data-wave-note-close]");
    if (!header || !quick || !input || !applyBtn || !clearBtn || !closeBtn)
        return;
    const currentOverride = noteLabelOverrideResolveFromState(deps.state, noteSliceId);
    header.textContent = `Detected: ${detectedLabel}`;
    input.value = currentOverride || detectedLabel;
    waveNoteQuickChoicesRender(quick, detectedLabel, input);
    const apply = () => {
        const normalized = noteLabelOverrideNormalized(input.value);
        if (normalized)
            noteLabelOverrideSet(deps.state, noteSliceId, normalized);
        else
            noteLabelOverrideReset(deps.state, noteSliceId);
        renderWaveAnnotations(deps, slice);
        waveNoteOverrideEditorHide(plot);
    };
    const clear = () => {
        noteLabelOverrideReset(deps.state, noteSliceId);
        renderWaveAnnotations(deps, slice);
        waveNoteOverrideEditorHide(plot);
    };
    applyBtn.onclick = apply;
    clearBtn.onclick = clear;
    closeBtn.onclick = () => waveNoteOverrideEditorHide(plot);
    input.onkeydown = (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            apply();
            return;
        }
        if (event.key === "Escape") {
            event.preventDefault();
            waveNoteOverrideEditorHide(plot);
        }
    };
    waveNoteOverrideEditorPosition(plot, editor, anchorMs);
    editor.hidden = false;
    input.focus();
    input.select();
}
function waveDetectedLabelResolveForNoteSlice(noteSlice, deps) {
    const result = (deps.state.noteResults || []).find((entry) => entry.id === noteSlice.id);
    return resolveWaveLabelFromContext(result?.f0 ?? null, noteSlice, deps);
}
function waveNoteOverrideEditorGetOrCreate(plot) {
    const existing = document.getElementById(NOTE_EDITOR_POPOVER_ID);
    if (existing)
        return existing;
    const host = plot.closest(".wave-surface") || plot.parentElement || plot;
    const editor = document.createElement("div");
    editor.id = NOTE_EDITOR_POPOVER_ID;
    editor.className = "wave-note-override-popover";
    editor.hidden = true;
    editor.innerHTML = [
        '<div class="wave-note-override-header">',
        '  <span data-wave-note-detected>Detected:</span>',
        '  <button type="button" class="ghost-btn btn-small" data-wave-note-close>Close</button>',
        "</div>",
        '<div class="wave-note-override-row" data-wave-note-quick></div>',
        '<div class="wave-note-override-row">',
        '  <input type="text" class="wave-note-override-input" data-wave-note-input placeholder="Type note (e.g. E4)" />',
        "</div>",
        '<div class="wave-note-override-actions">',
        '  <button type="button" class="ghost-btn btn-small" data-wave-note-clear>Clear</button>',
        '  <button type="button" class="ghost-btn btn-small" data-wave-note-apply>Apply</button>',
        "</div>",
    ].join("");
    host.appendChild(editor);
    return editor;
}
function waveNoteOverrideEditorHide(plot) {
    const editor = document.getElementById(NOTE_EDITOR_POPOVER_ID);
    if (!editor)
        return;
    if (!plot.closest(".wave-surface")?.contains(editor))
        return;
    editor.hidden = true;
}
function bindWaveNoteOverrideDismissInteractions(plot) {
    const anyPlot = plot;
    if (anyPlot.__resonateWaveNoteOverrideDismissBound)
        return;
    const onPointerDown = (event) => {
        const editor = document.getElementById(NOTE_EDITOR_POPOVER_ID);
        if (!editor || editor.hidden)
            return;
        const target = event.target;
        if (!target)
            return;
        if (editor.contains(target))
            return;
        if (plot.contains(target))
            return;
        waveNoteOverrideEditorHide(plot);
    };
    document.addEventListener("mousedown", onPointerDown);
    anyPlot.__resonateWaveNoteOverrideDismissBound = true;
}
function bindWaveNoteOverrideModifierClickInteractions(plot, deps, slice) {
    const anyPlot = plot;
    if (anyPlot.__resonateWaveNoteOverrideModifierClickBound)
        return;
    const onMouseDown = (event) => {
        if (!waveNoteOverrideRequestedFromClickEvent(event))
            return;
        const cursorMs = waveformMsAtPointerResolve(plot, event);
        if (!Number.isFinite(cursorMs))
            return;
        const note = noteWindowSliceFindByTime(deps.state.noteSlices || [], cursorMs);
        if (!note)
            return;
        anyPlot.__resonateSuppressClick = true;
        event.preventDefault();
        event.stopPropagation();
        openWaveNoteOverrideEditorFromSlice(note.id, cursorMs, deps, slice);
    };
    plot.addEventListener("mousedown", onMouseDown);
    anyPlot.__resonateWaveNoteOverrideModifierClickBound = true;
}
function waveNoteOverrideEditorPosition(plot, editor, anchorMs) {
    const axis = waveformAxisRangeResolve(plot);
    if (!axis || !Number.isFinite(anchorMs)) {
        editor.style.left = "24px";
        editor.style.top = "16px";
        return;
    }
    const ratio = clamp01((anchorMs - axis.min) / (axis.max - axis.min));
    const anchorPx = axis.leftPx + ratio * axis.widthPx;
    const leftPx = Math.max(12, Math.min(axis.leftPx + axis.widthPx - 280, anchorPx - 130));
    editor.style.left = `${leftPx}px`;
    editor.style.top = "16px";
}
function waveNoteQuickChoicesRender(host, detectedLabel, input) {
    host.innerHTML = "";
    const candidates = waveNoteQuickChoiceLabelsResolve(detectedLabel);
    candidates.forEach((label) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "ghost-btn btn-small";
        button.textContent = label;
        button.onclick = () => {
            input.value = label;
            input.focus();
            input.select();
        };
        host.appendChild(button);
    });
}
export function waveNoteOverrideRequestedFromClickEvent(event) {
    if (!event)
        return false;
    return Boolean(event.altKey || event.metaKey);
}
export function waveNoteQuickChoiceLabelsResolve(detectedLabel) {
    const out = [];
    const previous = waveNoteLabelTransposeBySemitone(detectedLabel, -1);
    if (previous)
        out.push(previous);
    out.push(noteLabelOverrideNormalized(detectedLabel));
    const next = waveNoteLabelTransposeBySemitone(detectedLabel, 1);
    if (next)
        out.push(next);
    return Array.from(new Set(out));
}
function waveNoteLabelTransposeBySemitone(noteLabel, semitoneDelta) {
    const pitch = waveNotePitchParse(noteLabel);
    if (!pitch)
        return null;
    const absolute = pitch.octave * 12 + pitch.semitone + semitoneDelta;
    const nextSemitone = ((absolute % 12) + 12) % 12;
    const nextOctave = Math.floor((absolute - nextSemitone) / 12);
    return `${waveSemitoneNameResolve(nextSemitone)}${nextOctave}`;
}
function waveNotePitchParse(noteLabel) {
    const match = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(String(noteLabel || "").trim());
    if (!match)
        return null;
    const letter = match[1].toUpperCase();
    const accidental = match[2];
    const octave = Number(match[3]);
    if (!Number.isFinite(octave))
        return null;
    const base = waveNaturalSemitoneResolve(letter);
    if (base === null)
        return null;
    const accidentalOffset = accidental === "#" ? 1 : accidental === "b" ? -1 : 0;
    const semitone = ((base + accidentalOffset) % 12 + 12) % 12;
    return { semitone, octave };
}
function waveNaturalSemitoneResolve(letter) {
    if (letter === "C")
        return 0;
    if (letter === "D")
        return 2;
    if (letter === "E")
        return 4;
    if (letter === "F")
        return 5;
    if (letter === "G")
        return 7;
    if (letter === "A")
        return 9;
    if (letter === "B")
        return 11;
    return null;
}
function waveSemitoneNameResolve(semitone) {
    const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    return names[((semitone % 12) + 12) % 12];
}
export function renderWaveform(slice, deps) {
    const handlers = waveformRangeHandlersBuild(deps);
    const autoPrimaryRange = primaryRangeAutoSelectFromState(slice, deps.state);
    if (autoPrimaryRange) {
        handlers.onPrimaryRangeChange(autoPrimaryRange);
    }
    const autoNoteSelectionRange = noteSelectionRangeAutoSelectFromState(slice, deps.state);
    if (autoNoteSelectionRange) {
        handlers.onNoteSelectionRangeChange(autoNoteSelectionRange);
    }
    makeWaveNavigatorPlot(slice, deps, handlers.onPrimaryRangeChange, handlers.onNoteSelectionRangeChange);
}
export function noteSelectionRangeAutoSelectFromState(slice, state) {
    if (noteSelectionRangeShouldPreserveExistingFromState(slice, state))
        return null;
    const noteSlices = noteSlicesAfterPrimaryRangeResolve(noteSlicesAutoSelectionCandidatesResolve(state), state.viewRangeMs || null);
    if (!noteSlices.length)
        return fallbackRangeOnRightFromDuration(waveDurationMsResolve(state, slice));
    const range = largestContiguousRangeClusterBuild(noteSlices.map((entry) => ({ start: entry.startMs, end: entry.endMs })), NOTE_CLUSTER_GAP_MS);
    return range || fallbackRangeOnRightFromDuration(waveDurationMsResolve(state, slice));
}
function noteSelectionRangeShouldPreserveExistingFromState(slice, state) {
    const existingRange = state.noteSelectionRangeMs;
    if (!existingRange)
        return false;
    const fallbackRange = fallbackRangeOnRightFromDuration(waveDurationMsResolve(state, slice));
    const existingLooksLikeFallback = rangeMatchesExactly(existingRange, fallbackRange);
    if (!existingLooksLikeFallback)
        return true;
    const noteSlices = noteSlicesAutoSelectionCandidatesResolve(state);
    return !noteSlices.length;
}
function noteSlicesAutoSelectionCandidatesResolve(state) {
    const noteSlices = Array.isArray(state.noteSlices) ? state.noteSlices : [];
    if (!noteSlices.length)
        return [];
    const noteResults = Array.isArray(state.noteResults) ? state.noteResults : [];
    if (!noteResults.length)
        return noteSlices;
    const noteOnlySlices = noteSlices.filter((noteSlice) => !noteSliceClassifiedAsTap(noteSlice, noteResults, state));
    return noteOnlySlices.length ? noteOnlySlices : noteSlices;
}
function noteSlicesAfterPrimaryRangeResolve(noteSlices, primaryRange) {
    if (!primaryRange || !Number.isFinite(primaryRange.end))
        return noteSlices;
    const slicesAfterPrimaryRange = noteSlices.filter((slice) => Number(slice.startMs) >= Number(primaryRange.end));
    return slicesAfterPrimaryRange.length ? slicesAfterPrimaryRange : noteSlices;
}
function noteSliceClassifiedAsTap(noteSlice, noteResults, state) {
    const result = noteResults.find((entry) => entry.id === noteSlice.id);
    const label = waveformLabelResolveFromContext({
        f0: result?.f0 ?? null,
        measureMode: state.measureMode,
        modesDetected: state.lastModesDetected || [],
        noteSliceSampleCount: noteSlice?.samples?.length,
        noteSliceSampleRate: noteSlice?.sampleRate,
        noteNameResolve: () => "Note",
    });
    return label === "Tap";
}
export function primaryRangeAutoSelectFromState(slice, state) {
    if (state.viewRangeMs)
        return null;
    const taps = Array.isArray(state.tapSegments) ? state.tapSegments : [];
    if (!taps.length)
        return fallbackRangeOnLeftFromDuration(waveDurationMsResolve(state, slice));
    const ranges = taps
        .map((tap) => ({
        start: (tap.start / slice.sampleRate) * 1000,
        end: (tap.end / slice.sampleRate) * 1000,
    }))
        .filter((range) => Number.isFinite(range.start) && Number.isFinite(range.end) && range.end > range.start);
    const bestCluster = contiguousRangeClusterBestBuild(ranges, TAP_CLUSTER_GAP_MS, { preferCount: true });
    const normalizedRange = rangeClusterNormalizeByMedianDuration(bestCluster);
    return normalizedRange || fallbackRangeOnLeftFromDuration(waveDurationMsResolve(state, slice));
}
function waveDurationMsResolve(state, slice) {
    const fromSlice = Number(slice?.timeMs?.[slice.timeMs.length - 1]);
    if (Number.isFinite(fromSlice) && fromSlice > 0)
        return fromSlice;
    const fromCurrentWave = Number(state?.currentWave?.fullLengthMs);
    if (Number.isFinite(fromCurrentWave) && fromCurrentWave > 0)
        return fromCurrentWave;
    const fromState = Number(state?.endMs);
    if (Number.isFinite(fromState) && fromState > 0)
        return fromState;
    return 5000;
}
function fallbackWindowMsResolve(durationMs) {
    const scaled = durationMs * FALLBACK_WINDOW_RATIO;
    return Math.max(FALLBACK_WINDOW_MIN_MS, Math.min(FALLBACK_WINDOW_MAX_MS, scaled));
}
function fallbackRangeOnLeftFromDuration(durationMs) {
    const windowMs = fallbackWindowMsResolve(durationMs);
    const end = Math.min(durationMs, windowMs);
    return { start: 0, end };
}
function fallbackRangeOnRightFromDuration(durationMs) {
    const windowMs = fallbackWindowMsResolve(durationMs);
    const start = Math.max(0, durationMs - windowMs);
    return { start, end: Math.max(start, durationMs) };
}
function largestContiguousRangeClusterBuild(ranges, gapMs, options = {}) {
    const bestCluster = contiguousRangeClusterBestBuild(ranges, gapMs, options);
    if (!bestCluster)
        return null;
    return { start: bestCluster.start, end: bestCluster.end };
}
function contiguousRangeClusterBestBuild(ranges, gapMs, options = {}) {
    if (!ranges.length)
        return null;
    const sorted = ranges
        .slice()
        .sort((left, right) => left.start - right.start || left.end - right.end);
    const clusters = contiguousRangeClustersBuildFromSortedRanges(sorted, gapMs);
    return clusters.reduce((best, cluster) => {
        if (!best)
            return cluster;
        if (options.preferCount) {
            const bestCount = best.ranges?.length ?? 0;
            const clusterCount = cluster.ranges?.length ?? 0;
            if (clusterCount > bestCount)
                return cluster;
            if (clusterCount < bestCount)
                return best;
        }
        const bestWidth = best.end - best.start;
        const currentWidth = cluster.end - cluster.start;
        if (currentWidth > bestWidth)
            return cluster;
        if (currentWidth === bestWidth && cluster.start < best.start)
            return cluster;
        return best;
    }, null);
}
function contiguousRangeClustersBuildFromSortedRanges(sortedRanges, gapMs) {
    const clusters = [];
    sortedRanges.forEach((range) => {
        const current = clusters[clusters.length - 1];
        if (!current || range.start - current.end > gapMs) {
            clusters.push({ ...range, ranges: [{ ...range }] });
            return;
        }
        current.end = Math.max(current.end, range.end);
        current.ranges.push({ ...range });
    });
    return clusters;
}
function rangeClusterNormalizeByMedianDuration(range) {
    if (!range?.ranges?.length)
        return range ? { start: range.start, end: range.end } : null;
    const durations = range.ranges
        .map((entry) => rangeDurationMs(entry))
        .filter((duration) => Number.isFinite(duration) && duration > 0)
        .sort((left, right) => left - right);
    if (!durations.length)
        return { start: range.start, end: range.end };
    const median = durations[Math.floor(durations.length / 2)];
    const minDuration = median * TAP_CLUSTER_OUTLIER_MIN_RATIO;
    const maxDuration = median * TAP_CLUSTER_OUTLIER_MAX_RATIO;
    const normalized = range.ranges.filter((entry) => {
        const duration = rangeDurationMs(entry);
        return duration >= minDuration && duration <= maxDuration;
    });
    if (!normalized.length)
        return { start: range.start, end: range.end };
    return { start: normalized[0].start, end: normalized[normalized.length - 1].end };
}
function rangeDurationMs(range) {
    return range.end - range.start;
}
function bindNoteSelectionResizeModifierTracking(plot) {
    const anyPlot = plot;
    if (anyPlot.__resonateShiftDragBound)
        return;
    const onPointerDown = (event) => {
        anyPlot.__resonateShiftDragActive = Boolean(event.shiftKey);
    };
    const onPointerUp = () => {
        anyPlot.__resonateShiftDragActive = false;
    };
    plot.addEventListener("mousedown", onPointerDown);
    window.addEventListener("mouseup", onPointerUp);
    anyPlot.__resonateShiftDragBound = true;
    anyPlot.__resonateShiftDragActive = false;
}
function bindRangeDirectDragInteractions(plot, deps, slice, onPrimaryRangeChange, onNoteSelectionRangeChange) {
    const anyPlot = plot;
    if (anyPlot.__resonateRangeDragBound)
        return;
    const onPointerDown = (event) => {
        if (plotlyWaveToolsEnabledResolve())
            return;
        if (event.button !== 0)
            return;
        const cursorMs = waveformMsAtPointerResolve(plot, event);
        if (!Number.isFinite(cursorMs))
            return;
        const axis = waveformAxisRangeResolve(plot);
        if (!axis)
            return;
        const target = rangeDragTargetResolve(cursorMs, axis.min, axis.max, axis.widthPx, deps.state.viewRangeMs || null, deps.state.noteSelectionRangeMs || null);
        if (!target)
            return;
        const activeRange = target.rangeKind === "note"
            ? deps.state.noteSelectionRangeMs || null
            : deps.state.viewRangeMs || null;
        if (!activeRange)
            return;
        anyPlot.__resonateRangeDrag = {
            target,
            startCursorMs: cursorMs,
            startRange: { start: activeRange.start, end: activeRange.end },
        };
        anyPlot.__resonateSuppressClick = true;
        event.preventDefault();
    };
    const onPointerMove = (event) => {
        const session = anyPlot.__resonateRangeDrag;
        if (!session)
            return;
        const cursorMs = waveformMsAtPointerResolve(plot, event);
        if (!Number.isFinite(cursorMs))
            return;
        const axis = waveformAxisRangeResolve(plot);
        if (!axis)
            return;
        const nextRange = rangeDragApply(session.startRange, session.startCursorMs, cursorMs, session.target.dragMode, axis.min, axis.max);
        if (!nextRange)
            return;
        if (session.target.rangeKind === "note") {
            deps.state.noteSelectionRangeMs = nextRange;
        }
        else {
            deps.state.viewRangeMs = nextRange;
        }
        renderWaveSelection(deps.state.viewRangeMs || null, deps.state.noteSelectionRangeMs || null, deps, slice);
    };
    const onPointerUp = () => {
        const session = anyPlot.__resonateRangeDrag;
        if (!session)
            return;
        const range = session.target.rangeKind === "note"
            ? deps.state.noteSelectionRangeMs || null
            : deps.state.viewRangeMs || null;
        if (session.target.rangeKind === "note") {
            onNoteSelectionRangeChange(range);
        }
        else {
            onPrimaryRangeChange(range);
        }
        anyPlot.__resonateRangeDrag = null;
    };
    plot.addEventListener("mousedown", onPointerDown);
    window.addEventListener("mousemove", onPointerMove);
    window.addEventListener("mouseup", onPointerUp);
    anyPlot.__resonateRangeDragBound = true;
    anyPlot.__resonateRangeDrag = null;
}
function waveformMsAtPointerResolve(plot, event) {
    const axis = waveformAxisRangeResolve(plot);
    if (!axis)
        return NaN;
    const rect = plot.getBoundingClientRect();
    const localPx = event.clientX - rect.left - axis.leftPx;
    const ratio = clamp01(localPx / axis.widthPx);
    return axis.min + (axis.max - axis.min) * ratio;
}
function waveformAxisRangeResolve(plot) {
    const fullLayout = plot?._fullLayout;
    const size = fullLayout?._size;
    const xAxis = fullLayout?.xaxis;
    const range = Array.isArray(xAxis?.range) ? xAxis.range : null;
    if (!size || !range || range.length < 2)
        return null;
    const min = Number(range[0]);
    const max = Number(range[1]);
    if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min)
        return null;
    const widthPx = Number(size.w);
    const leftPx = Number(size.l);
    if (!Number.isFinite(widthPx) || widthPx <= 1 || !Number.isFinite(leftPx))
        return null;
    return { min, max, widthPx, leftPx };
}
function clamp01(value) {
    return Math.min(1, Math.max(0, value));
}
function rangeMatchesExactly(left, right) {
    if (!left || !right)
        return false;
    return left.start === right.start && left.end === right.end;
}
export function rangeDragTargetResolve(cursorMs, axisMinMs, axisMaxMs, axisWidthPx, primaryRange, noteRange) {
    const toleranceMs = ((axisMaxMs - axisMinMs) / axisWidthPx) * RANGE_DRAG_EDGE_TOLERANCE_PX;
    const noteTarget = rangeDragTargetForRangeResolve(cursorMs, noteRange, toleranceMs);
    if (noteTarget)
        return { rangeKind: "note", dragMode: noteTarget };
    const primaryTarget = rangeDragTargetForRangeResolve(cursorMs, primaryRange, toleranceMs);
    if (primaryTarget)
        return { rangeKind: "primary", dragMode: primaryTarget };
    return null;
}
function rangeDragTargetForRangeResolve(cursorMs, range, toleranceMs) {
    if (!range)
        return null;
    const leftDistance = Math.abs(cursorMs - range.start);
    const rightDistance = Math.abs(cursorMs - range.end);
    if (leftDistance <= toleranceMs && leftDistance <= rightDistance)
        return "resize-left";
    if (rightDistance <= toleranceMs)
        return "resize-right";
    if (cursorMs > range.start && cursorMs < range.end)
        return "move";
    return null;
}
export function rangeDragApply(startRange, startCursorMs, currentCursorMs, dragMode, axisMinMs, axisMaxMs) {
    if (dragMode === "resize-left") {
        const start = clampRange(currentCursorMs, axisMinMs, startRange.end - RANGE_DRAG_MIN_WIDTH_MS);
        return { start, end: startRange.end };
    }
    if (dragMode === "resize-right") {
        const end = clampRange(currentCursorMs, startRange.start + RANGE_DRAG_MIN_WIDTH_MS, axisMaxMs);
        return { start: startRange.start, end };
    }
    const width = startRange.end - startRange.start;
    const delta = currentCursorMs - startCursorMs;
    let start = startRange.start + delta;
    let end = startRange.end + delta;
    if (start < axisMinMs) {
        start = axisMinMs;
        end = start + width;
    }
    if (end > axisMaxMs) {
        end = axisMaxMs;
        start = end - width;
    }
    return { start, end };
}
function clampRange(value, min, max) {
    if (value < min)
        return min;
    if (value > max)
        return max;
    return value;
}
function plotlyWaveToolsEnabledResolve() {
    const api = window.ResonateWaveformInteractions;
    if (typeof api?.plotlyWaveToolsEnabledResolve === "function") {
        return api.plotlyWaveToolsEnabledResolve(window.__RESONATE_PLOTLY_WAVE_TOOLS__);
    }
    const runtime = window.__RESONATE_PLOTLY_WAVE_TOOLS__;
    return typeof runtime === "boolean" ? runtime : false;
}
export function waveformRangeHandlersBuild(deps) {
    return {
        onPrimaryRangeChange: (range) => {
            deps.state.viewRangeMs = range;
            deps.setStatus(range ? "Analyzing selected region" : "Analyzing full clip");
            if (!primaryRangePipelineShouldTriggerFromRangeChange(deps.state, range))
                return;
            deps.runResonatePipeline("range").catch((err) => console.error("[Resonance Reader] FFT refresh failed", err));
        },
        onNoteSelectionRangeChange: (range) => {
            deps.state.noteSelectionRangeMs = range;
            deps.setStatus(range ? "Analyzing selected tap window" : "Analyzing full clip");
            if (!noteRangePipelineShouldTriggerFromRangeChange(deps.state, range))
                return;
            deps.runResonatePipeline("tap-range").catch((err) => console.error("[Resonance Reader] FFT refresh failed", err));
        },
    };
}
