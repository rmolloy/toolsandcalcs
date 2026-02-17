import { noteAndCentsFromFreq } from "./resonate_mode_metrics.js";
import { emitModeOverrideRequested } from "./resonate_override_commands.js";
import { toneControllerCreateFromWindow } from "./resonate_tone_controller.js";
import { resolveColorHexFromRole, resolveColorRgbaFromRole } from "./resonate_color_roles.js";
const MOCK_OVERLAY = {
    min: 85,
    max: 260,
    feather: 60,
    widths: { thin: 1.0, mid: 2.0, thick: 3.0 },
    opacities: { thin: 0.25, mid: 0.8, thick: 0.9 },
};
let overlayToggleBound = false;
let modeOverrideLabelBound = false;
let toneHoverBound = false;
export function renderSpectrum(payload, deps) {
    const plot = spectrumPlotElementSelect();
    if (!plot)
        return;
    const priorRanges = spectrumAxisRangesReadFromPlot(plot);
    const preserveRanges = spectrumRangesPreserveNextRenderConsumeFromState();
    resetModeOverrideLabelBindState();
    const { freqs, mags, overlay, modes, secondarySpectrum } = payload;
    const { overlaySegments, overlayVisible, toggle } = overlayContextResolve(freqs, overlay);
    const hoverNoteData = hoverNoteDataResolveFromFreqs(freqs);
    const { plotData, layout, modeAnnotationKeys, modeAnnotationAnchorX, modeTraceIndexByKey, modeAnnotationIndexByKey, toneTraceIndex, } = spectrumRenderModelAssemble({
        freqs,
        mags,
        modes,
        overlaySegments,
        overlayVisible,
        hoverNoteData,
        secondarySpectrum: secondarySpectrum || null,
        deps,
    });
    if (preserveRanges)
        spectrumLayoutApplyAxisRanges(layout, priorRanges);
    renderSpectrumPlot(plot, plotData, layout);
    modeOverrideLabelBind(plot, modeAnnotationKeys, modeAnnotationAnchorX);
    bindFftHomeResetToDefaultRange(plot, deps);
    const plotAny = plot;
    seedModePreviewState(plotAny, freqs, mags, modeAnnotationKeys, deps.modeMeta, modeTraceIndexByKey, modeAnnotationIndexByKey);
    seedModePreviewRelayoutState(plotAny);
    bindFftOverlayToggleSyncAndRerender(toggle);
    bindFftToneHoverFollow(plot, toneTraceIndex, mags);
}
function bindFftHomeResetToDefaultRange(plot, deps) {
    const plotAny = plot;
    if (!plotAny?.on || plotAny.__fftHomeResetBound)
        return;
    plotAny.__fftHomeResetBound = true;
    plotAny.__fftHomeResetLock = false;
    plotAny.on("plotly_relayout", (evt) => {
        if (plotAny.__fftHomeResetLock)
            return;
        if (!spectrumRelayoutRequestsAutorange(evt))
            return;
        plotAny.__fftHomeResetLock = true;
        const patch = {
            "xaxis.range": [deps.freqMin, deps.freqAxisMax],
            "xaxis.autorange": false,
            "yaxis.autorange": true,
        };
        const relayout = window.Plotly?.relayout?.(plot, patch);
        if (relayout && typeof relayout.finally === "function") {
            relayout.finally(() => {
                plotAny.__fftHomeResetLock = false;
            });
            return;
        }
        plotAny.__fftHomeResetLock = false;
    });
}
function spectrumRelayoutRequestsAutorange(evt) {
    if (!evt)
        return false;
    return evt["xaxis.autorange"] === true || evt["yaxis.autorange"] === true;
}
function spectrumAxisRangesReadFromPlot(plot) {
    const fullLayout = plot?._fullLayout;
    return {
        x: spectrumAxisRangeRead(fullLayout?.xaxis?.range),
        y: spectrumAxisRangeRead(fullLayout?.yaxis?.range),
    };
}
function spectrumAxisRangeRead(value) {
    if (!Array.isArray(value) || value.length < 2)
        return null;
    const min = Number(value[0]);
    const max = Number(value[1]);
    if (!Number.isFinite(min) || !Number.isFinite(max))
        return null;
    return [min, max];
}
function spectrumLayoutApplyAxisRanges(layout, ranges) {
    if (ranges.x) {
        layout.xaxis = { ...(layout.xaxis || {}), range: ranges.x, autorange: false };
    }
    if (ranges.y) {
        layout.yaxis = { ...(layout.yaxis || {}), range: ranges.y, autorange: false };
    }
}
function spectrumPlotElementSelect() {
    return document.getElementById("plot_fft");
}
function resetModeOverrideLabelBindState() {
    modeOverrideLabelBound = false;
    toneHoverBound = false;
}
function overlayToggleSelect() {
    return document.getElementById("toggle_overlay");
}
function overlayToggleChecked(toggle) {
    return Boolean(toggle?.checked);
}
function overlayVisibleResolveAndSyncClass(toggle) {
    const overlayVisible = overlayToggleChecked(toggle);
    pipelineOverlayClassSync(overlayVisible);
    return overlayVisible;
}
function hoverNoteDataResolveFromFreqs(freqs) {
    return spectrumHoverNoteDataBuild(freqs);
}
function overlayContextResolve(freqs, overlay) {
    const overlaySegments = spectrumOverlaySegmentsResolve(freqs, overlay);
    const toggle = overlayToggleSelect();
    const overlayVisible = overlayVisibleResolveAndSyncClass(toggle);
    return { overlaySegments, overlayVisible, toggle };
}
function buildMeasuredTrace(freqs, mags, hoverNoteData) {
    return {
        x: freqs,
        y: mags,
        type: "scatter",
        mode: "lines",
        line: { color: resolveColorHexFromRole("fftLine"), width: 3 },
        name: "Measured",
        customdata: hoverNoteData,
        hovertemplate: "%{x:.1f} Hz<br>%{y:.1f} dB<br>%{customdata[0]} %{customdata[1]}<extra></extra>",
    };
}
function buildSecondaryMeasuredTrace(secondarySpectrum, shouldRender) {
    if (!shouldRender || !secondarySpectrum?.freqs?.length || !secondarySpectrum?.mags?.length)
        return null;
    return {
        x: secondarySpectrum.freqs,
        y: secondarySpectrum.mags,
        type: "scatter",
        mode: "lines",
        line: { color: resolveColorHexFromRole("waveNoteSelection"), width: 2.5 },
        name: "Selected Note Window",
        hovertemplate: "%{x:.1f} Hz<br>%{y:.1f} dB<extra></extra>",
    };
}
function buildOverlayTraces(overlaySegments, overlayVisible) {
    return overlaySegments.map((seg) => ({
        x: seg.x,
        y: seg.y,
        type: "scatter",
        mode: "lines",
        line: { color: resolveColorRgbaFromRole("modelOverlay", seg.opacity), width: seg.width, dash: "dash" },
        name: "Model",
        showlegend: false,
        hovertemplate: "%{x:.1f} Hz<br>%{y:.1f} dB<extra></extra>",
        hoverlabel: {
            bgcolor: "rgba(14,17,25,0.95)",
            bordercolor: resolveColorRgbaFromRole("modelOverlay", 0.6),
            font: { family: "Inter, system-ui, -apple-system, Segoe UI, sans-serif", size: 14, color: "rgba(255,255,255,0.95)" },
        },
        visible: overlayVisible,
        meta: { kind: "overlay" },
    }));
}
function buildModeTracesAndAnnotations(freqs, mags, modes, modeMetaByKey) {
    const modeAnnotations = [];
    const modeAnnotationKeys = [];
    const modeAnnotationAnchorX = {};
    const modeTraces = (modes || [])
        .filter((m) => Number.isFinite(m.peakFreq))
        .map((m) => {
        const f0 = m.peakFreq;
        let bestIdx = 0;
        for (let i = 1; i < freqs.length; i += 1) {
            if (Math.abs(freqs[i] - f0) < Math.abs(freqs[bestIdx] - f0))
                bestIdx = i;
        }
        const y0 = Number.isFinite(m.peakDb) ? m.peakDb : mags[bestIdx];
        const meta = modeMetaByKey[m.mode] || {
            label: m.mode,
            aliasHtml: "",
            aliasText: m.mode,
            tooltip: m.mode,
            color: resolveColorRgbaFromRole("fftLine", 0.75),
        };
        const noteLabel = typeof m.note === "string" ? m.note : "—";
        const centsLabel = Number.isFinite(m.cents)
            ? `${m.cents >= 0 ? "+" : ""}${Math.round(m.cents)}¢`
            : "—";
        const aliasLabel = meta.aliasText ? ` ${meta.aliasText}` : "";
        if (Number.isFinite(y0)) {
            modeAnnotationKeys.push(m.mode);
            modeAnnotationAnchorX[m.mode] = f0;
            modeAnnotations.push({
                x: f0,
                y: y0,
                xref: "x",
                yref: "y",
                text: modeAnnotationTextBuild(meta, aliasLabel, f0, noteLabel, centsLabel),
                showarrow: true,
                arrowhead: 0,
                arrowwidth: 2,
                arrowcolor: meta.color,
                ax: 0,
                ay: -44,
                xanchor: "center",
                yanchor: "bottom",
                standoff: 6,
                align: "center",
                font: { family: "Inter, system-ui, -apple-system, Segoe UI, sans-serif", size: 12, color: "#eef1ff" },
                bgcolor: "rgba(10,14,24,0.85)",
                bordercolor: "rgba(255,255,255,0.15)",
                borderpad: 4,
                borderwidth: 1,
            });
        }
        return {
            traces: [
                {
                    x: [f0],
                    y: [y0],
                    type: "scatter",
                    mode: "markers",
                    marker: { size: 28, color: spectrumColorWithAlpha(meta.color, 0.22), line: { color: "rgba(0,0,0,0)", width: 0 } },
                    hoverinfo: "skip",
                    showlegend: false,
                },
                {
                    x: [f0],
                    y: [y0],
                    type: "scatter",
                    mode: "markers",
                    marker: { size: 10, color: "rgba(255,248,238,0.95)", line: { color: meta.color, width: 2 } },
                    cliponaxis: false,
                    hovertemplate: `<b>${meta.label}${aliasLabel}</b><br><span style="color:${meta.color}; font-weight:700;">%{x:.1f} Hz</span> · %{y:.1f} dB<br>${noteLabel} ${centsLabel}<extra></extra>`,
                    hoverlabel: {
                        bgcolor: "rgba(10,14,24,0.9)",
                        bordercolor: "rgba(255,255,255,0.18)",
                        font: { family: "Inter, system-ui, -apple-system, Segoe UI, sans-serif", size: 14, color: "#eef1ff" },
                        align: "left",
                    },
                    showlegend: false,
                },
            ],
        };
    });
    return { modeTraces, modeAnnotations, modeAnnotationKeys, modeAnnotationAnchorX };
}
function buildSpectrumLayout(deps, modeAnnotations) {
    return {
        margin: { l: 40, r: 20, t: 20, b: 50 },
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        hovermode: "closest",
        xaxis: {
            title: "",
            showgrid: true,
            gridcolor: "rgba(255,255,255,0.035)",
            gridwidth: 1,
            range: [deps.freqMin, deps.freqAxisMax],
            tickmode: "auto",
            color: "rgba(255,255,255,0.75)",
            zeroline: false,
        },
        yaxis: {
            title: "",
            showgrid: true,
            gridcolor: "rgba(255,255,255,0.04)",
            gridwidth: 1,
            color: "rgba(255,255,255,0.75)",
            autorange: true,
            zeroline: false,
        },
        showlegend: false,
        annotations: modeAnnotations,
    };
}
function buildSpectrumPlotData(measuredTrace, secondaryMeasuredTrace, overlayTraces, modeTraces, toneTrace) {
    const flatModeTraces = modeTraces.flatMap((m) => m.traces);
    return [measuredTrace, ...(secondaryMeasuredTrace ? [secondaryMeasuredTrace] : []), ...overlayTraces, ...flatModeTraces, toneTrace];
}
function buildModeTraceIndexByKey(modeTraces, modes, overlayTraces, hasSecondaryMeasuredTrace) {
    const baseOverlayCount = overlayTraces.length;
    const measuredTraceCount = 1 + (hasSecondaryMeasuredTrace ? 1 : 0);
    const modeTraceIndexByKey = {};
    modeTraces.forEach((_, idx) => {
        const base = measuredTraceCount + baseOverlayCount + idx * 2;
        const modeKey = modes?.[idx]?.mode;
        if (modeKey)
            modeTraceIndexByKey[modeKey] = { dotBig: base, dotSmall: base + 1 };
    });
    return modeTraceIndexByKey;
}
function buildModeAnnotationIndexByKey(modeAnnotationKeys) {
    const modeAnnotationIndexByKey = {};
    modeAnnotationKeys.forEach((key, idx) => {
        modeAnnotationIndexByKey[key] = idx;
    });
    return modeAnnotationIndexByKey;
}
function renderSpectrumPlot(plot, plotData, layout) {
    window.Plotly.newPlot(plot, plotData, layout, {
        displayModeBar: true,
        displaylogo: false,
        responsive: true,
        editable: true,
        edits: {
            annotationPosition: true,
            annotationText: false,
            axisTitleText: false,
            colorbarPosition: false,
            colorbarTitleText: false,
            legendPosition: false,
            legendText: false,
            shapePosition: false,
            titleText: false,
        },
    });
}
function seedModePreviewState(plotAny, freqs, mags, modeAnnotationKeys, modeMetaByKey, modeTraceIndexByKey, annotationIndexByKey) {
    plotAny.__modePreview = {
        freqs,
        mags,
        modeKeys: modeAnnotationKeys,
        modeMetaByKey,
        traceIndexByKey: modeTraceIndexByKey,
        annotationIndexByKey,
    };
}
function seedModePreviewRelayoutState(plotAny) {
    plotAny.__modePreviewRelayoutLock = false;
    plotAny.__modePreviewRelayoutOrigin = false;
    plotAny.__modePreviewRelayoutUntil = 0;
}
function bindFftOverlayToggleSyncAndRerender(toggle) {
    if (!toggle || overlayToggleBound)
        return;
    overlayToggleBound = true;
    toggle.addEventListener("change", () => {
        const state = window.FFTState;
        spectrumRangesPreserveNextRenderMarkOnState();
        if (typeof state?.rerenderFromLastSpectrum === "function") {
            state.rerenderFromLastSpectrum();
        }
        pipelineOverlayClassSync(Boolean(toggle.checked));
    });
}
function bindFftToneHoverFollow(plot, toneTraceIndex, mags) {
    const plotAny = plot;
    if (!plotAny?.on || toneHoverBound)
        return;
    toneHoverBound = true;
    plotAny.on("plotly_hover", (evt) => {
        toneHoverApplyFromEvent(evt, plot, toneTraceIndex, mags);
    });
    plotAny.on("plotly_unhover", () => {
        toneHoverClear(plot, toneTraceIndex);
    });
}
function toneHoverApplyFromEvent(evt, plot, toneTraceIndex, mags) {
    const state = window.FFTState;
    if (!state?.toneEnabled)
        return;
    const freqHz = toneFreqResolveFromHoverEvent(evt);
    if (!Number.isFinite(freqHz))
        return;
    state.toneFreqHz = freqHz;
    const tone = toneControllerCreateFromWindow(window);
    tone.toneFrequencySetHz(freqHz);
    toneSpikeTraceUpdate(plot, toneTraceIndex, freqHz, mags);
}
function toneHoverClear(plot, toneTraceIndex) {
    const state = window.FFTState;
    if (!state?.toneEnabled)
        return;
    state.toneFreqHz = null;
    const tone = toneControllerCreateFromWindow(window);
    tone.toneStop();
    toneSpikeTraceVisibilitySet(plot, toneTraceIndex, false);
}
function toneFreqResolveFromHoverEvent(evt) {
    const point = evt?.points?.[0];
    const freqHz = Number(point?.x);
    if (!Number.isFinite(freqHz))
        return null;
    return freqHz;
}
function spectrumRangesPreserveNextRenderMarkOnState() {
    const state = window.FFTState;
    if (!state)
        return;
    state.preserveSpectrumRangesOnNextRender = true;
}
function spectrumRangesPreserveNextRenderConsumeFromState() {
    const state = window.FFTState;
    if (!state?.preserveSpectrumRangesOnNextRender)
        return false;
    state.preserveSpectrumRangesOnNextRender = false;
    return true;
}
function buildOverlaySegments(freqs, overlay) {
    const { min, max, feather, widths, opacities } = MOCK_OVERLAY;
    const pickBucket = (w) => {
        if (w > 0.66)
            return { width: widths.thick, opacity: opacities.thick };
        if (w > 0.33)
            return { width: widths.mid, opacity: opacities.mid };
        return { width: widths.thin, opacity: opacities.thin };
    };
    const segments = [];
    let cur = null;
    freqs.forEach((f, i) => {
        let w = 0;
        if (f >= min && f <= max)
            w = 1;
        else if (f >= min - feather && f < min)
            w = 1 - (min - f) / feather;
        else if (f > max && f <= max + feather)
            w = 1 - (f - max) / feather;
        if (w <= 0) {
            cur = null;
            return;
        }
        const bucket = pickBucket(w);
        const same = cur && cur.width === bucket.width && cur.opacity === bucket.opacity;
        if (!same) {
            cur = { x: [], y: [], width: bucket.width, opacity: bucket.opacity };
            segments.push(cur);
        }
        cur.x.push(f);
        cur.y.push(overlay[i]);
    });
    return segments;
}
function spectrumOverlaySegmentsResolve(freqs, overlay) {
    return overlay ? buildOverlaySegments(freqs, overlay) : [];
}
function spectrumHoverNoteDataBuild(freqs) {
    return freqs.map((freq) => {
        const out = noteAndCentsFromFreq(freq);
        const noteLabel = out.note ?? "—";
        const centsLabel = spectrumHoverCentsLabelBuild(out.cents);
        return [noteLabel, centsLabel];
    });
}
function spectrumHoverCentsLabelBuild(cents) {
    if (!Number.isFinite(cents))
        return "—";
    const sign = cents >= 0 ? "+" : "";
    return `${sign}${Math.round(cents)}¢`;
}
function modeAnnotationTextBuild(meta, aliasLabel, freqHz, noteLabel, centsLabel) {
    return `${meta.label}${aliasLabel}<br><span style="color:${meta.color}; font-weight:600;">${freqHz.toFixed(1)} Hz</span> · ${noteLabel} ${centsLabel}`;
}
function modeAnnotationPreviewTextFromFreq(meta, aliasLabel, freqHz) {
    const noteData = noteAndCentsFromFreq(freqHz);
    const noteLabel = noteData.note ?? "—";
    const centsLabel = spectrumHoverCentsLabelBuild(noteData.cents);
    return modeAnnotationTextBuild(meta, aliasLabel, freqHz, noteLabel, centsLabel);
}
function dragPreviewSnapFromFreq(freqs, mags, freqHz) {
    if (!Number.isFinite(freqHz) || !freqs.length || !mags.length)
        return null;
    const idx = nearestSpectrumIndexFromFreq(freqs, freqHz);
    if (!Number.isFinite(idx))
        return null;
    const x = freqs[idx];
    const y = mags[idx];
    if (!Number.isFinite(x) || !Number.isFinite(y))
        return null;
    return { idx: idx, x, y };
}
function spectrumRenderModelAssemble(args) {
    const measuredTrace = buildMeasuredTrace(args.freqs, args.mags, args.hoverNoteData);
    const secondaryMeasuredTrace = buildSecondaryMeasuredTrace(args.secondarySpectrum, spectrumSecondaryTraceShouldRenderForMeasureMode());
    const overlayTraces = buildOverlayTraces(args.overlaySegments, args.overlayVisible);
    const toneTrace = toneSpikeTraceBuild(args.freqs, args.mags);
    const { modeTraces, modeAnnotations, modeAnnotationKeys, modeAnnotationAnchorX } = buildModeTracesAndAnnotations(args.freqs, args.mags, args.modes, args.deps.modeMeta);
    const layout = buildSpectrumLayout(args.deps, modeAnnotations);
    const plotData = buildSpectrumPlotData(measuredTrace, secondaryMeasuredTrace, overlayTraces, modeTraces, toneTrace);
    const modeTraceIndexByKey = buildModeTraceIndexByKey(modeTraces, args.modes, overlayTraces, Boolean(secondaryMeasuredTrace));
    const modeAnnotationIndexByKey = buildModeAnnotationIndexByKey(modeAnnotationKeys);
    const toneTraceIndex = plotData.length - 1;
    return {
        plotData,
        layout,
        modeAnnotationKeys,
        modeAnnotationAnchorX,
        modeTraceIndexByKey,
        modeAnnotationIndexByKey,
        toneTraceIndex,
    };
}
function spectrumSecondaryTraceShouldRenderForMeasureMode() {
    const measureMode = document.getElementById("measure_mode")?.value;
    return measureMode === "played_note";
}
function toneSpikeTraceBuild(freqs, mags) {
    const yBottom = toneSpikeFloorDbResolve(mags);
    const yTop = toneSpikeCeilingDbResolve(mags);
    const fallbackX = toneSpikeFallbackFreqResolve(freqs);
    return {
        x: [fallbackX, fallbackX],
        y: [yBottom, yTop],
        type: "scatter",
        mode: "lines",
        line: { color: resolveColorRgbaFromRole("modelOverlay", 0.95), width: 2, dash: "dot" },
        hoverinfo: "skip",
        showlegend: false,
        visible: false,
        meta: { kind: "tone-spike" },
    };
}
function toneSpikeFallbackFreqResolve(freqs) {
    if (!Array.isArray(freqs) || !freqs.length)
        return 0;
    return Number.isFinite(freqs[0]) ? freqs[0] : 0;
}
function toneSpikeFloorDbResolve(mags) {
    const finiteMags = mags.filter((value) => Number.isFinite(value));
    if (!finiteMags.length)
        return -90;
    return Math.min(...finiteMags) - 3;
}
function toneSpikeCeilingDbResolve(mags) {
    const finiteMags = mags.filter((value) => Number.isFinite(value));
    if (!finiteMags.length)
        return -20;
    return Math.max(...finiteMags);
}
function toneSpikeTraceUpdate(plot, toneTraceIndex, freqHz, mags) {
    if (!Number.isFinite(freqHz) || toneTraceIndex < 0)
        return;
    const yBottom = toneSpikeFloorDbResolve(mags);
    const yTop = toneSpikeCeilingDbResolve(mags);
    window.Plotly?.restyle?.(plot, { x: [[freqHz, freqHz]], y: [[yBottom, yTop]], visible: true }, toneTraceIndex);
}
function toneSpikeTraceVisibilitySet(plot, toneTraceIndex, visible) {
    if (toneTraceIndex < 0)
        return;
    window.Plotly?.restyle?.(plot, { visible }, toneTraceIndex);
}
function modeOverrideLabelBind(plot, modeAnnotationKeys, modeAnnotationAnchorX) {
    const plotAny = plot;
    plotAny.__modeAnnotationKeys = modeAnnotationKeys;
    plotAny.__modeAnnotationAnchorX = modeAnnotationAnchorX;
    if (!plotAny.on || modeOverrideLabelBound)
        return;
    modeOverrideLabelBound = true;
    const handler = (evt, commit) => {
        if (plotAny.__modePreviewRelayoutOrigin)
            return;
        const move = modeOverrideLabelMoveExtract(evt, plotAny.__modeAnnotationKeys || []);
        if (!move)
            return;
        if (commit && modeOverridePreviewRelayoutInFlight(plotAny))
            return;
        const snap = modeOverrideSnapFromPreview(plotAny, move);
        if (!snap) {
            if (!(plotAny.__modePreviewSkipLogAt && performance.now() - plotAny.__modePreviewSkipLogAt < 500)) {
                plotAny.__modePreviewSkipLogAt = performance.now();
                console.warn("[Resonance Reader] drag preview skipped", { evt });
            }
            return;
        }
        if (commit) {
            emitModeOverrideRequested(snap.modeKey, snap.freqHz);
            return;
        }
        modeOverridePreviewUpdate(plotAny, snap, false);
    };
    plotAny.on("plotly_relayouting", (evt) => handler(evt, false));
    plotAny.on("plotly_relayout", (evt) => handler(evt, true));
}
function modeOverrideLabelMoveExtract(evt, modeKeys) {
    if (!evt || !Array.isArray(modeKeys) || !modeKeys.length)
        return null;
    for (const [key, value] of Object.entries(evt)) {
        const match = key.match(/^annotations\[(\d+)\]\.x$/);
        if (!match)
            continue;
        const idx = Number(match[1]);
        if (!Number.isInteger(idx))
            continue;
        const modeKey = modeKeys[idx];
        if (!modeKey)
            continue;
        const freqHz = Number(value);
        if (!Number.isFinite(freqHz))
            continue;
        return { modeKey, freqHz };
    }
    return null;
}
function modeOverrideSnapFromPreview(plot, move) {
    const preview = plot?.__modePreview;
    if (!preview)
        return null;
    const { freqs, mags } = preview;
    if (!Array.isArray(freqs) || !Array.isArray(mags) || !freqs.length || !mags.length)
        return null;
    const snap = dragPreviewSnapFromFreq(freqs, mags, move.freqHz);
    if (!snap)
        return null;
    return { modeKey: move.modeKey, freqHz: snap.x, x: snap.x, y: snap.y };
}
function modeOverridePreviewUpdate(plot, move, commit) {
    const preview = plot?.__modePreview;
    if (!preview)
        return;
    const { modeMetaByKey, traceIndexByKey, annotationIndexByKey } = preview;
    const { x, y } = move;
    const traces = traceIndexByKey[move.modeKey];
    if (!traces)
        return;
    if (typeof window.Plotly?.restyle !== "function")
        return;
    window.Plotly.restyle(plot, { x: [[x]], y: [[y]] }, traces.dotBig);
    window.Plotly.restyle(plot, { x: [[x]], y: [[y]] }, traces.dotSmall);
    if (plot?.__modeAnnotationAnchorX) {
        plot.__modeAnnotationAnchorX[move.modeKey] = x;
    }
    const annotationIndex = annotationIndexByKey[move.modeKey];
    const meta = modeMetaByKey[move.modeKey];
    if (!Number.isInteger(annotationIndex) || !meta)
        return;
    const aliasLabel = meta.aliasText ? ` ${meta.aliasText}` : "";
    const text = modeAnnotationPreviewTextFromFreq(meta, aliasLabel, x);
    modeOverridePreviewRelayoutApply(plot, annotationIndex, traces, x, y, text, commit);
}
function modeOverridePreviewRelayoutApply(plot, annotationIndex, traces, x, y, text, commit) {
    if (plot.__modePreviewRelayoutLock)
        return;
    const relayoutPatch = modeOverridePreviewRelayoutPatchBuild(annotationIndex, traces, x, y, text);
    modeOverridePreviewRelayoutCommit(plot, relayoutPatch);
}
function modeOverridePreviewRelayoutPatchBuild(annotationIndex, traces, x, y, text) {
    const relayoutPatch = {
        [`annotations[${annotationIndex}].x`]: x,
        [`annotations[${annotationIndex}].y`]: y,
        [`annotations[${annotationIndex}].ax`]: 0,
        [`annotations[${annotationIndex}].ay`]: -44,
        [`annotations[${annotationIndex}].text`]: text,
    };
    return relayoutPatch;
}
function modeOverridePreviewRelayoutUntilStamp() {
    if (typeof performance?.now === "function")
        return performance.now() + 150;
    return Date.now() + 150;
}
function modeOverridePreviewRelayoutInFlight(plot) {
    const until = plot?.__modePreviewRelayoutUntil ?? 0;
    const now = typeof performance?.now === "function" ? performance.now() : Date.now();
    return now < until;
}
function modeOverridePreviewRelayoutCommit(plot, relayoutPatch) {
    plot.__modePreviewRelayoutLock = true;
    plot.__modePreviewRelayoutOrigin = true;
    plot.__modePreviewRelayoutUntil = modeOverridePreviewRelayoutUntilStamp();
    const relayout = window.Plotly.relayout(plot, relayoutPatch);
    if (relayout && typeof relayout.finally === "function") {
        relayout.finally(() => {
            plot.__modePreviewRelayoutLock = false;
            plot.__modePreviewRelayoutOrigin = false;
        });
    }
    else {
        plot.__modePreviewRelayoutLock = false;
        plot.__modePreviewRelayoutOrigin = false;
    }
}
function nearestSpectrumIndexFromFreq(freqs, targetHz) {
    if (!freqs.length || !Number.isFinite(targetHz))
        return null;
    let bestIdx = 0;
    for (let i = 1; i < freqs.length; i += 1) {
        if (Math.abs(freqs[i] - targetHz) < Math.abs(freqs[bestIdx] - targetHz))
            bestIdx = i;
    }
    return bestIdx;
}
function spectrumColorWithAlpha(color, alpha) {
    const rgb = spectrumRgbFromHex(color);
    if (!rgb)
        return color;
    return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
}
function spectrumRgbFromHex(color) {
    const hex = color.startsWith("#") ? color.slice(1) : color;
    if (hex.length !== 6)
        return null;
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    if (![r, g, b].every((v) => Number.isFinite(v)))
        return null;
    return { r, g, b };
}
function pipelineOverlayClassSync(overlayVisible) {
    if (!document?.body)
        return;
    document.body.classList.toggle("overlay-off", !overlayVisible);
}
