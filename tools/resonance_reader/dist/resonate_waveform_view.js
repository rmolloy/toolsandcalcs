import { waveformLabelResolveFromContext } from "./resonate_waveform_label.js";
import { noteWindowRangeBuildFromSlice, noteWindowSliceFindByTime, noteSelectionWindowRequestedFromPlotlyClick, } from "./resonate_note_window_selection.js";
import { resolveColorHexFromRole, resolveColorRgbaFromRole } from "./resonate_color_roles.js";
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
function buildWaveAnnotations(noteSlices, noteResults, deps) {
    const annotations = [];
    noteSlices.forEach((note) => {
        const result = noteResults.find((n) => n.id === note.id);
        const label = resolveWaveLabelFromContext(result?.f0 ?? null, note, deps);
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
        });
    });
    return annotations;
}
function buildWaveShapes(sampleRate, primaryRange, noteSelectionRange, tapSegments, noteSlices) {
    const shapes = [];
    shapes.push(...buildNoteSliceShapes(noteSlices || [], primaryRange));
    shapes.push(...buildTapSegmentShapes(tapSegments || [], sampleRate));
    shapes.push(...buildNoteSelectionShapes(noteSelectionRange));
    shapes.push(...buildSelectionShapes(primaryRange));
    return shapes;
}
function renderWaveSelection(primaryRange, noteSelectionRange, deps, slice) {
    const plot = document.getElementById("plot_waveform");
    if (!plot)
        return;
    const Plotly = window.Plotly;
    if (!Plotly)
        return;
    const shapes = buildWaveShapes(slice.sampleRate, primaryRange, noteSelectionRange, deps.state.tapSegments, deps.state.noteSlices);
    waveUpdatingShapes = true;
    Promise.resolve(Plotly.relayout(plot, { shapes })).finally(() => {
        waveUpdatingShapes = false;
    });
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
        shapes: buildWaveShapes(slice.sampleRate, deps.state.viewRangeMs || null, deps.state.noteSelectionRangeMs || null, deps.state.tapSegments, deps.state.noteSlices),
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
    }
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
    if (state.noteSelectionRangeMs)
        return null;
    const noteSlices = Array.isArray(state.noteSlices) ? state.noteSlices : [];
    if (!noteSlices.length)
        return fallbackRangeOnRightFromDuration(waveDurationMsResolve(state, slice));
    const range = largestContiguousRangeClusterBuild(noteSlices.map((entry) => ({ start: entry.startMs, end: entry.endMs })), NOTE_CLUSTER_GAP_MS);
    return range || fallbackRangeOnRightFromDuration(waveDurationMsResolve(state, slice));
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
