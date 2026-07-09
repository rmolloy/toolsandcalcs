import { peakAnalysisSourceMeasureModeResolve } from "./resonate_mode_config.js";
import { externalModelDestinationResolveFromMeasureMode } from "./resonate_model_destination.js";
import { resonanceSpectrumSmoothingEnabled, resonanceTapAveragingEnabled, } from "./resonate_debug_flags.js";
import { resolveColorHexFromRole, resolveColorRgbaFromRole } from "./resonate_color_roles.js";
const PEAK_RINGDOWN_WINDOW_MS = 1200;
const PEAK_RINGDOWN_PRE_ONSET_MS = 20;
const PEAK_RINGDOWN_ATTACK_SKIP_MS = 40;
const PEAK_RINGDOWN_SMOOTH_MS = 5;
const PEAK_RINGDOWN_FIT_FLOOR_DB = 26;
const PEAK_ANALYSIS_WAVEFORM_COLOR = resolveColorHexFromRole("peakAnalysisWaveform");
const PEAK_ANALYSIS_PROJECTION_COLOR = resolveColorHexFromRole("peakAnalysisProjection");
export function peakAnalysisPanelInitialize(state) {
    peakAnalysisActionListenersAttach(state);
    peakAnalysisSelectionSyncFromState(state);
    peakAnalysisPanelRenderFromState(state);
}
export function peakAnalysisPanelRenderFromState(state) {
    const selectedMode = peakAnalysisSelectionSyncFromState(state);
    const ringdownData = peakAnalysisRingdownDataBuild(state, selectedMode);
    peakAnalysisPlotRender(state, selectedMode);
    peakAnalysisRingdownRender(selectedMode, ringdownData);
    peakAnalysisActionsRender(state, selectedMode, ringdownData);
}
export function peakAnalysisSelectionApplyFromModeKey(state, modeKey) {
    state.peakAnalysisSelectedKey = modeKey;
}
export function peakAnalysisNextModeReview(state) {
    const cards = peakAnalysisCardsReadFromState(state).filter((card) => Number.isFinite(card.freq));
    if (!cards.length)
        return null;
    const currentIndex = cards.findIndex((card) => card.key === state.peakAnalysisSelectedKey);
    const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % cards.length;
    state.peakAnalysisSelectedKey = cards[nextIndex].key;
    return cards[nextIndex];
}
export function peakAnalysisSpectrumReadFromState(state) {
    return state.lastSpectrum || state.lastSpectrumRaw || null;
}
export function peakAnalysisSelectionSyncFromState(state) {
    const cards = peakAnalysisCardsReadFromState(state);
    const current = peakAnalysisCardFindByKey(cards, state.peakAnalysisSelectedKey);
    if (current)
        return current;
    const fallback = peakAnalysisCardPreferredResolve(cards);
    state.peakAnalysisSelectedKey = fallback?.key ?? null;
    return fallback;
}
export function peakAnalysisWidthHzResolveFromMode(mode) {
    if (!Number.isFinite(mode?.freq) || !Number.isFinite(mode?.q) || mode?.q <= 0)
        return null;
    return mode?.freq / mode?.q;
}
export function peakAnalysisRingdownDataBuild(state, selectedMode) {
    const api = peakAnalysisRingdownApiResolve();
    const input = peakAnalysisRingdownInputBuild(state, selectedMode);
    if (!api || !input)
        return null;
    try {
        return {
            result: api.analyzeModeRingdown({
                buffer: input.buffer,
                sampleRate: input.provenance.sampleRate,
                targetFrequencyHz: selectedMode.freq,
                spectrum: peakAnalysisSpectrumReadFromState(state),
                modeBandwidthHz: input.provenance.bandwidthHz,
                smoothWindowMs: PEAK_RINGDOWN_SMOOTH_MS,
                attackSkipMs: PEAK_RINGDOWN_ATTACK_SKIP_MS,
                fitFloorDb: PEAK_RINGDOWN_FIT_FLOOR_DB,
            }),
            provenance: input.provenance,
        };
    }
    catch {
        return null;
    }
}
function peakAnalysisRingdownInputBuild(state, selectedMode) {
    if (!Number.isFinite(selectedMode?.freq))
        return null;
    const wave = peakAnalysisWaveReadFromState(state);
    const sampleRate = Number(state.currentWave?.sampleRate);
    if (!wave?.length || !Number.isFinite(sampleRate) || sampleRate <= 0)
        return null;
    const tap = peakAnalysisTapWindowResolve(state, sampleRate);
    const sampleWindow = peakAnalysisRingdownSampleWindowBuild(wave, sampleRate, tap?.start ?? 0);
    if (!sampleWindow.buffer.length)
        return null;
    return {
        buffer: sampleWindow.buffer,
        provenance: {
            tapCount: Array.isArray(state.tapSegments) ? state.tapSegments.length : 0,
            tapIndex: tap?.index ?? null,
            windowMs: PEAK_RINGDOWN_WINDOW_MS,
            preOnsetMs: PEAK_RINGDOWN_PRE_ONSET_MS,
            sampleRate,
            sampleCount: sampleWindow.buffer.length,
            bandwidthHz: peakAnalysisWidthHzResolveFromMode(selectedMode),
        },
    };
}
function peakAnalysisContextAveragingLabelBuild() {
    return resonanceTapAveragingEnabled() ? "power mean tap average" : "single tap";
}
function peakAnalysisContextSmoothingLabelBuild() {
    return resonanceSpectrumSmoothingEnabled() ? "smoothing on" : "smoothing off";
}
function peakAnalysisQLabelBuild(q) {
    if (!Number.isFinite(q))
        return "—";
    return `Q ${Math.round(q)}`;
}
function peakAnalysisWidthLabelBuild(mode) {
    const widthHz = peakAnalysisWidthHzResolveFromMode(mode);
    if (!Number.isFinite(widthHz))
        return "—";
    return `${widthHz.toFixed(2)} Hz`;
}
function peakAnalysisPlotRender(state, selectedMode) {
    const plot = peakAnalysisPlotElementGet();
    if (!plot)
        return;
    const windowData = peakAnalysisWindowDataBuild(peakAnalysisSpectrumReadFromState(state), selectedMode);
    if (!windowData) {
        plot.hidden = true;
        peakAnalysisPlotClear(plot);
        return;
    }
    plot.hidden = false;
    peakAnalysisPlotApply(plot, windowData);
}
function peakAnalysisWindowDataBuild(spectrum, selectedMode) {
    if (!selectedMode || !Number.isFinite(selectedMode.freq))
        return null;
    const freqs = Array.isArray(spectrum?.freqs) ? spectrum?.freqs : [];
    const dbs = peakAnalysisDbsResolveFromSpectrum(spectrum);
    if (!freqs.length || freqs.length !== dbs.length)
        return null;
    const centerHz = selectedMode.freq;
    const halfWindowHz = peakAnalysisHalfWindowHzResolve(centerHz);
    const points = freqs.reduce((rows, freq, index) => {
        const db = dbs[index];
        if (!Number.isFinite(freq) || !Number.isFinite(db))
            return rows;
        if (freq < centerHz - halfWindowHz || freq > centerHz + halfWindowHz)
            return rows;
        rows.push({ freq, db });
        return rows;
    }, []);
    if (!points.length)
        return null;
    const selectedPoint = peakAnalysisPointNearestResolve(points, centerHz);
    return {
        x: points.map((point) => point.freq),
        y: points.map((point) => point.db),
        selectedX: selectedPoint.freq,
        selectedY: selectedPoint.db,
        selectedQ: selectedMode.q,
        widthHz: peakAnalysisWidthHzResolveFromMode(selectedMode),
    };
}
function peakAnalysisDbsResolveFromSpectrum(spectrum) {
    if (Array.isArray(spectrum?.dbs))
        return spectrum.dbs;
    const mags = Array.isArray(spectrum?.mags) ? spectrum.mags : [];
    return mags.map((magnitude) => 20 * Math.log10(Math.max(Number(magnitude) || 0, 1e-12)));
}
function peakAnalysisHalfWindowHzResolve(centerHz) {
    return Math.max(18, Math.min(120, centerHz * 0.25));
}
function peakAnalysisPointNearestResolve(points, centerHz) {
    return points.reduce((best, point) => {
        if (!best)
            return point;
        return Math.abs(point.freq - centerHz) < Math.abs(best.freq - centerHz) ? point : best;
    }, null);
}
function peakAnalysisPlotApply(plot, data) {
    const Plotly = peakAnalysisPlotlyResolve();
    if (!Plotly?.react)
        return;
    const plotAny = plot;
    plotAny.__peakAnalysisLatestData = data;
    plotAny.__peakAnalysisPlotNeedsRedraw = true;
    if (plotAny.__peakAnalysisPlotDrawing)
        return;
    plotAny.__peakAnalysisPlotReady = peakAnalysisPlotDrainLatest(plot, Plotly);
}
function peakAnalysisPlotDraw(plot, Plotly, data) {
    const drawResult = Plotly.react(plot, peakAnalysisTracesBuild(data), peakAnalysisLayoutBuild(data), { displayModeBar: false, responsive: true });
    return Promise.resolve(drawResult)
        .catch(() => undefined)
        .then(() => peakAnalysisPlotResize(plot, Plotly));
}
async function peakAnalysisPlotDrainLatest(plot, Plotly) {
    const plotAny = plot;
    plotAny.__peakAnalysisPlotDrawing = true;
    try {
        while (plotAny.__peakAnalysisPlotNeedsRedraw) {
            plotAny.__peakAnalysisPlotNeedsRedraw = false;
            await peakAnalysisPlotDraw(plot, Plotly, plotAny.__peakAnalysisLatestData);
        }
    }
    finally {
        plotAny.__peakAnalysisPlotDrawing = false;
    }
}
function peakAnalysisPlotResize(plot, Plotly) {
    try {
        const resizeResult = Plotly.Plots?.resize?.(plot);
        return Promise.resolve(resizeResult).catch(() => undefined);
    }
    catch {
        return undefined;
    }
}
function peakAnalysisRingdownRender(selectedMode, data) {
    const provenance = peakAnalysisProvenanceElementGet();
    const interpretation = peakAnalysisInterpretationElementGet();
    const plot = peakAnalysisRingdownPlotElementGet();
    if (!data) {
        if (provenance)
            provenance.textContent = "";
        if (interpretation)
            interpretation.textContent = "";
        if (plot) {
            plot.hidden = true;
            peakAnalysisPlotClear(plot);
        }
        return;
    }
    if (provenance)
        provenance.textContent = peakAnalysisProvenanceTextBuild(data.provenance);
    if (interpretation)
        interpretation.textContent = peakAnalysisDecisionTextBuild(selectedMode, data);
    peakAnalysisRingdownPlotRender(plot, data);
}
function peakAnalysisActionsRender(state, selectedMode, data) {
    const actions = peakAnalysisActionsElementGet();
    if (!actions)
        return;
    const enabled = Boolean(selectedMode && data);
    peakAnalysisActionButtonsSetEnabled(actions, enabled);
    peakAnalysisModelLinkRender(state);
}
function peakAnalysisActionListenersAttach(state) {
    peakAnalysisActionButtonListen("peak_analysis_review_next", () => peakAnalysisReviewNextApply(state));
    peakAnalysisActionButtonListen("peak_analysis_use_interpretation", () => peakAnalysisInterpretationUseApply(state));
    peakAnalysisActionButtonListen("peak_analysis_compare_peak", () => peakAnalysisComparePeakApply(state));
    peakAnalysisActionButtonListen("peak_analysis_export_data", () => peakAnalysisEvidenceExport(state));
}
function peakAnalysisActionButtonListen(id, listener) {
    const button = document.getElementById(id);
    const buttonAny = button;
    if (!buttonAny || buttonAny.__peakAnalysisListenerAttached)
        return;
    buttonAny.__peakAnalysisListenerAttached = true;
    buttonAny.addEventListener("click", listener);
}
function peakAnalysisReviewNextApply(state) {
    const next = peakAnalysisNextModeReview(state);
    if (!next)
        return;
    peakAnalysisStatusSet(`Reviewing ${next.label || "next"} peak.`);
    peakAnalysisPanelRenderFromState(state);
}
function peakAnalysisInterpretationUseApply(state) {
    const selectedMode = peakAnalysisSelectionSyncFromState(state);
    const data = peakAnalysisRingdownDataBuild(state, selectedMode);
    if (!selectedMode || !data)
        return;
    state.peakAnalysisAcceptedInterpretation = {
        modeKey: selectedMode.key,
        text: peakAnalysisInterpretationTextBuild(selectedMode, data),
    };
    peakAnalysisStatusSet("Peak/Q interpretation marked for use.");
}
function peakAnalysisComparePeakApply(state) {
    const selectedMode = peakAnalysisSelectionSyncFromState(state);
    if (!selectedMode)
        return;
    state.peakAnalysisCompareKey = selectedMode.key;
    peakAnalysisStatusSet(`Comparison anchor set to ${selectedMode.label || "selected"} peak.`);
}
function peakAnalysisEvidenceExport(state) {
    const selectedMode = peakAnalysisSelectionSyncFromState(state);
    const data = peakAnalysisRingdownDataBuild(state, selectedMode);
    if (!selectedMode || !data)
        return;
    peakAnalysisJsonDownload(peakAnalysisEvidenceFilenameBuild(selectedMode), peakAnalysisEvidencePayloadBuild(state, selectedMode, data));
    peakAnalysisStatusSet("Peak/Q evidence exported.");
}
function peakAnalysisEvidencePayloadBuild(state, selectedMode, data) {
    return {
        selectedMode,
        interpretation: peakAnalysisInterpretationTextBuild(selectedMode, data),
        provenance: data.provenance,
        spectral: {
            widthHz: peakAnalysisWidthHzResolveFromMode(selectedMode),
            smoothing: peakAnalysisContextSmoothingLabelBuild(),
            averaging: peakAnalysisContextAveragingLabelBuild(),
            sourceMode: peakAnalysisSourceMeasureModeResolve(state),
        },
        decay: {
            tau: data.result.tau,
            Q: data.result.Q,
            deltaF: data.result.deltaF,
            confidence: peakAnalysisRingdownConfidenceLabelBuild(data.result),
            envelopeR2: data.result.envelopeR2,
            fitStartSec: data.result.fitStartSec ?? null,
            fitEndSec: data.result.fitEndSec ?? null,
            flags: data.result.flags,
        },
    };
}
function peakAnalysisEvidenceFilenameBuild(selectedMode) {
    const label = String(selectedMode.label || selectedMode.key || "peak").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return `peak-q-${label || "peak"}.json`;
}
function peakAnalysisJsonDownload(filename, payload) {
    const scope = window;
    if (typeof Blob === "undefined" || !scope.URL?.createObjectURL)
        return;
    const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: "application/json" });
    const url = scope.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    scope.URL.revokeObjectURL?.(url);
}
function peakAnalysisActionButtonsSetEnabled(actions, enabled) {
    actions.querySelectorAll("button").forEach((button) => {
        button.disabled = !enabled;
    });
}
function peakAnalysisModelLinkRender(state) {
    const link = peakAnalysisModelLinkElementGet();
    if (!link)
        return;
    const destination = externalModelDestinationResolveFromMeasureMode(peakAnalysisSourceMeasureModeResolve(state));
    link.hidden = !destination.showModelRow;
    link.href = destination.href;
    link.textContent = destination.label;
}
function peakAnalysisStatusSet(text) {
    const status = window.ResonateStatus;
    if (typeof status?.setStatus === "function")
        status.setStatus(text);
}
function peakAnalysisRingdownDescriptionTextBuild(result, confidence) {
    const evidence = `Q ${peakAnalysisQNumberLabelBuild(result.Q)}, tau ${peakAnalysisSecondsLabelBuild(result.tau)}, fit ${peakAnalysisPercentLabelBuild(result.envelopeR2)}`;
    const caution = peakAnalysisRingdownCautionTextBuild(result.flags);
    const support = `${peakAnalysisSentenceStartBuild(confidence)} decay support`;
    return `${support}: ${evidence}. ${caution}`;
}
function peakAnalysisQNumberLabelBuild(q) {
    if (!Number.isFinite(q))
        return "—";
    return Math.round(q).toString();
}
function peakAnalysisRingdownCautionTextBuild(flags) {
    const flagText = peakAnalysisRingdownFlagListTextBuild(flags);
    if (!flagText)
        return "Use it as a check against spectral Q, not a separate authority.";
    return `${flagText}; use it as a check against spectral Q, not a separate authority.`;
}
function peakAnalysisRingdownFlagListTextBuild(flags) {
    const labels = (flags || []).map(peakAnalysisRingdownFlagLabelBuild).filter(Boolean);
    if (!labels.length)
        return "";
    if (labels.length === 1)
        return peakAnalysisSentenceStartBuild(labels[0]);
    return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}
function peakAnalysisRingdownFlagLabelBuild(flag) {
    const label = String(flag || "").replace(/_/g, " ").trim();
    if (label === "low Q")
        return "low Q";
    return label;
}
function peakAnalysisSentenceStartBuild(text) {
    if (!text)
        return "";
    return text.charAt(0).toUpperCase() + text.slice(1);
}
function peakAnalysisSecondsLabelBuild(seconds) {
    if (!Number.isFinite(seconds))
        return "—";
    return `${(seconds * 1000).toFixed(0)} ms`;
}
function peakAnalysisPercentLabelBuild(value) {
    if (!Number.isFinite(value))
        return "—";
    return `${Math.round(value * 100)}%`;
}
function peakAnalysisRingdownConfidenceLabelBuild(result) {
    if (!Number.isFinite(result.envelopeR2) || !Number.isFinite(result.Q))
        return "weak";
    if (result.envelopeR2 >= 0.92)
        return "strong";
    if (result.envelopeR2 >= 0.85)
        return "usable";
    return "weak";
}
function peakAnalysisProvenanceTextBuild(provenance) {
    const tapLabel = provenance.tapIndex === null
        ? "full file start"
        : `tap ${provenance.tapIndex + 1} of ${Math.max(provenance.tapCount, provenance.tapIndex + 1)}`;
    const bandwidth = Number.isFinite(provenance.bandwidthHz) ? `${provenance.bandwidthHz.toFixed(2)} Hz band` : "automatic band";
    return `Ring-down source: ${tapLabel} · ${provenance.windowMs} ms window · ${provenance.preOnsetMs} ms pre-onset · ${bandwidth} · ${provenance.sampleRate.toLocaleString()} Hz`;
}
function peakAnalysisDecisionTextBuild(selectedMode, data) {
    const confidence = peakAnalysisRingdownConfidenceLabelBuild(data.result);
    return [
        peakAnalysisRingdownDescriptionTextBuild(data.result, confidence),
        peakAnalysisInterpretationTextBuild(selectedMode, data),
    ].join(" ");
}
function peakAnalysisInterpretationTextBuild(selectedMode, data) {
    const peak = peakAnalysisSelectedPeakLabelBuild(selectedMode);
    const spectralWidth = peakAnalysisWidthLabelBuild(selectedMode || { freq: null, q: null });
    const confidence = peakAnalysisRingdownConfidenceLabelBuild(data.result);
    if (confidence === "weak") {
        return `${peak} has a ${spectralWidth} spectral width, but the decay fit is weak; treat the decay Q as a check, not authority.`;
    }
    return `${peak} has a ${spectralWidth} spectral width and ${confidence} decay support; use both views together before trusting the Q.`;
}
function peakAnalysisSelectedPeakLabelBuild(selectedMode) {
    if (!selectedMode?.label)
        return "Selected peak";
    return `${selectedMode.label} peak`;
}
function peakAnalysisRingdownPlotRender(plot, data) {
    if (!plot)
        return;
    const Plotly = peakAnalysisPlotlyResolve();
    const plotData = peakAnalysisRingdownPlotDataBuild(data.result);
    if (!Plotly?.react || !plotData) {
        plot.hidden = true;
        peakAnalysisPlotClear(plot);
        return;
    }
    plot.hidden = false;
    const plotAny = plot;
    plotAny.__peakAnalysisRingdownLatestData = { plotData, result: data.result };
    plotAny.__peakAnalysisRingdownNeedsRedraw = true;
    if (plotAny.__peakAnalysisRingdownDrawing)
        return;
    plotAny.__peakAnalysisRingdownReady = peakAnalysisRingdownPlotDrainLatest(plot, Plotly);
}
function peakAnalysisRingdownPlotDraw(plot, Plotly, data) {
    const drawResult = Plotly.react(plot, peakAnalysisRingdownTracesBuild(data.plotData), peakAnalysisRingdownLayoutBuild(data.plotData, data.result), { displayModeBar: false, responsive: true });
    return Promise.resolve(drawResult)
        .catch(() => undefined)
        .then(() => peakAnalysisPlotResize(plot, Plotly));
}
async function peakAnalysisRingdownPlotDrainLatest(plot, Plotly) {
    const plotAny = plot;
    plotAny.__peakAnalysisRingdownDrawing = true;
    try {
        while (plotAny.__peakAnalysisRingdownNeedsRedraw) {
            plotAny.__peakAnalysisRingdownNeedsRedraw = false;
            await peakAnalysisRingdownPlotDraw(plot, Plotly, plotAny.__peakAnalysisRingdownLatestData);
        }
    }
    finally {
        plotAny.__peakAnalysisRingdownDrawing = false;
    }
}
function peakAnalysisRingdownPlotDataBuild(result) {
    if (!Array.isArray(result.envelope) || !result.envelope.length || !Number.isFinite(result.sampleRate))
        return null;
    const envelope = result.envelope.map((value) => Math.max(0, Number(value) || 0));
    const x = peakAnalysisRingdownTimeAxisBuild(result, envelope.length);
    const response = peakAnalysisRingdownResponseBuild(result, envelope.length);
    const fit = peakAnalysisRingdownFitLineBuild({ x, envelope, result });
    return { x, response, envelope, fit };
}
function peakAnalysisRingdownTimeAxisBuild(result, sampleCount) {
    if (Array.isArray(result.timeAxis) && result.timeAxis.length === sampleCount) {
        return result.timeAxis.map((value) => Number(value) || 0);
    }
    const durationSec = (sampleCount * Math.max(1, Math.floor(((result.sampleRate || 1) * PEAK_RINGDOWN_WINDOW_MS) / 1000 / sampleCount))) / result.sampleRate;
    return Array.from({ length: sampleCount }, (_value, index) => durationSec * (index / Math.max(1, sampleCount - 1)));
}
function peakAnalysisRingdownResponseBuild(result, sampleCount) {
    if (!Array.isArray(result.response) || result.response.length !== sampleCount)
        return [];
    return result.response.map((value) => Number(value) || 0);
}
function peakAnalysisRingdownFitLineBuild(args) {
    const { x, envelope, result } = args;
    if (!Number.isFinite(result.slope) || x.length < 2 || envelope.length < 2)
        return null;
    const fitWindow = peakAnalysisRingdownFitWindowResolve(x, result);
    const foundStartIndex = x.findIndex((value) => value >= fitWindow.start);
    const startIndex = foundStartIndex >= 0 ? foundStartIndex : 0;
    const foundEndIndex = peakAnalysisRingdownFitEndIndexResolve(x, fitWindow.end);
    const endIndex = Math.max(startIndex, foundEndIndex >= 0 ? foundEndIndex : x.length - 1);
    if (endIndex - startIndex < 1)
        return null;
    const y0 = Math.max(envelope[startIndex] ?? envelope[0] ?? 0, 1e-6);
    const x0 = x[startIndex] ?? x[0] ?? 0;
    const slope = result.slope;
    const fitX = x.slice(startIndex, endIndex + 1);
    return {
        x: fitX,
        y: fitX.map((value) => y0 * Math.exp(slope * (value - x0))),
    };
}
function peakAnalysisRingdownFitEndIndexResolve(x, fitEndSec) {
    for (let index = x.length - 1; index >= 0; index -= 1) {
        if (x[index] <= fitEndSec)
            return index;
    }
    return -1;
}
function peakAnalysisRingdownFitWindowResolve(x, result) {
    const fallbackStart = Math.max(0, (result.attackSkipMs || PEAK_RINGDOWN_ATTACK_SKIP_MS) / 1000);
    const fallbackEnd = x[x.length - 1] ?? fallbackStart;
    const start = Number(result.fitStartSec);
    const end = Number(result.fitEndSec);
    if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
        return { start: Math.max(0, start), end: Math.min(fallbackEnd, end) };
    }
    return { start: fallbackStart, end: fallbackEnd };
}
function peakAnalysisRingdownTracesBuild(data) {
    const traces = [
        ...(data.response.length
            ? [
                {
                    x: data.x,
                    y: data.response,
                    type: "scatter",
                    mode: "lines",
                    line: { color: PEAK_ANALYSIS_WAVEFORM_COLOR, width: 1.4 },
                    hovertemplate: "%{x:.3f} s<br>%{y:.3f}<extra></extra>",
                    name: "Selected tap response",
                },
            ]
            : []),
        {
            x: data.x,
            y: data.envelope,
            type: "scatter",
            mode: "lines",
            line: { color: PEAK_ANALYSIS_PROJECTION_COLOR, width: 1.4 },
            hovertemplate: "%{x:.3f} s<br>%{y:.3f}<extra></extra>",
            name: "Envelope",
        },
    ];
    if (data.fit) {
        traces.push({
            x: data.fit.x,
            y: data.fit.y,
            type: "scatter",
            mode: "lines",
            line: { color: PEAK_ANALYSIS_PROJECTION_COLOR, width: 1.7, dash: "dash" },
            hovertemplate: "Fit<br>%{x:.3f} s<br>%{y:.3f}<extra></extra>",
            name: "Decay fit",
        });
    }
    return traces;
}
function peakAnalysisRingdownLayoutBuild(data, result) {
    return {
        margin: { l: 54, r: 18, t: 18, b: 42 },
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        font: { color: "rgba(230, 233, 239, 0.85)" },
        xaxis: {
            title: "Seconds",
            gridcolor: "rgba(255,255,255,0.08)",
            zeroline: false,
        },
        yaxis: {
            title: "Amplitude",
            gridcolor: "rgba(255,255,255,0.08)",
            zeroline: false,
            ...(data.response.length ? { range: [-1.05, 1.05] } : {}),
        },
        showlegend: false,
        shapes: peakAnalysisRingdownFitWindowShapesBuild(data.x, result),
        annotations: peakAnalysisRingdownFitWindowAnnotationsBuild(data.x, result),
    };
}
function peakAnalysisRingdownFitWindowShapesBuild(x, result) {
    if (!x.length || !Number.isFinite(result.slope))
        return [];
    const fitWindow = peakAnalysisRingdownFitWindowResolve(x, result);
    return [
        {
            type: "rect",
            x0: fitWindow.start,
            x1: fitWindow.end,
            y0: 0,
            y1: 1,
            yref: "paper",
            fillcolor: resolveColorRgbaFromRole("peakAnalysisProjection", 0.08),
            line: { width: 0 },
            layer: "below",
        },
    ];
}
function peakAnalysisRingdownFitWindowAnnotationsBuild(x, result) {
    if (!x.length || !Number.isFinite(result.slope))
        return [];
    const fitWindow = peakAnalysisRingdownFitWindowResolve(x, result);
    return [
        peakAnalysisRingdownWindowAnnotationBuild(fitWindow.start, peakAnalysisRingdownFitStartLabelBuild(fitWindow.start)),
        peakAnalysisRingdownWindowAnnotationBuild(fitWindow.end, "fit ends"),
    ];
}
function peakAnalysisRingdownFitStartLabelBuild(fitStartSec) {
    return fitStartSec > 0 ? "attack excluded / fit starts" : "fit starts";
}
function peakAnalysisRingdownWindowAnnotationBuild(x, text) {
    return {
        x,
        y: 1,
        yref: "paper",
        yanchor: "top",
        text,
        showarrow: false,
        bgcolor: "rgba(15, 17, 24, 0.74)",
        bordercolor: resolveColorRgbaFromRole("peakAnalysisProjection", 0.24),
        borderwidth: 1,
        borderpad: 3,
        font: { color: "rgba(230, 233, 239, 0.82)", size: 10 },
    };
}
function peakAnalysisTracesBuild(data) {
    return [
        {
            x: data.x,
            y: data.y,
            type: "scatter",
            mode: "lines",
            line: { color: "#8ecbff", width: 2.2 },
            hovertemplate: "%{x:.1f} Hz<br>%{y:.2f} dB<extra></extra>",
            name: "Local spectrum",
        },
        {
            x: [data.selectedX],
            y: [data.selectedY],
            type: "scatter",
            mode: "markers",
            marker: { color: "#f5c46f", size: 9, line: { color: "rgba(15, 17, 24, 0.9)", width: 1.5 } },
            hovertemplate: "Selected peak<br>%{x:.1f} Hz<br>%{y:.2f} dB<extra></extra>",
            name: "Selected peak",
        },
    ];
}
function peakAnalysisLayoutBuild(data) {
    const halfWidth = Number.isFinite(data.widthHz) ? data.widthHz / 2 : null;
    return {
        margin: { l: 54, r: 18, t: 24, b: 42 },
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        font: { color: "rgba(230, 233, 239, 0.85)" },
        xaxis: {
            title: "Hz",
            gridcolor: "rgba(255,255,255,0.08)",
            zeroline: false,
        },
        yaxis: {
            title: "dB",
            gridcolor: "rgba(255,255,255,0.08)",
            zeroline: false,
        },
        showlegend: false,
        shapes: halfWidth
            ? [
                peakAnalysisBandwidthShapeBuild(data.selectedX - halfWidth, data.selectedX + halfWidth),
                peakAnalysisBandEdgeShapeBuild(data.selectedX - halfWidth),
                peakAnalysisBandEdgeShapeBuild(data.selectedX + halfWidth),
                peakAnalysisReferenceLineShapeBuild(data.selectedY - 3),
            ]
            : [],
        annotations: peakAnalysisQAnnotationsBuild(data),
    };
}
function peakAnalysisBandwidthShapeBuild(leftHz, rightHz) {
    return {
        type: "rect",
        x0: leftHz,
        x1: rightHz,
        y0: 0,
        y1: 1,
        yref: "paper",
        fillcolor: "rgba(245, 196, 111, 0.12)",
        line: { width: 0 },
        layer: "below",
    };
}
function peakAnalysisBandEdgeShapeBuild(x) {
    return {
        type: "line",
        x0: x,
        x1: x,
        y0: 0,
        y1: 1,
        yref: "paper",
        line: { color: "rgba(245, 196, 111, 0.36)", width: 1.2, dash: "dot" },
    };
}
function peakAnalysisWaveReadFromState(state) {
    const wave = state.currentWave?.wave || state.currentWave?.samples;
    return wave?.length ? wave : null;
}
function peakAnalysisTapWindowResolve(state, sampleRate) {
    const taps = Array.isArray(state.tapSegments) ? state.tapSegments : [];
    const selectedIndex = peakAnalysisSelectedTapIndexResolve(state, taps, sampleRate);
    if (selectedIndex !== null)
        return peakAnalysisTapWindowBuild(taps[selectedIndex], selectedIndex, sampleRate);
    for (let index = 0; index < taps.length; index += 1) {
        const tap = peakAnalysisTapWindowBuild(taps[index], index, sampleRate);
        if (tap)
            return tap;
    }
    return null;
}
function peakAnalysisSelectedTapIndexResolve(state, taps, sampleRate) {
    const selectedIndex = Number(state.peakAnalysisSelectedTapIndex);
    if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex >= taps.length)
        return null;
    return peakAnalysisTapWindowBuild(taps[selectedIndex], selectedIndex, sampleRate) ? selectedIndex : null;
}
function peakAnalysisTapWindowBuild(tap, index, sampleRate) {
    const start = Number(tap?.start);
    if (Number.isFinite(start) && start >= 0)
        return { start, index };
    const startMs = Number(tap?.startMs);
    if (Number.isFinite(startMs) && startMs >= 0)
        return { start: Math.round((startMs / 1000) * sampleRate), index };
    return null;
}
function peakAnalysisRingdownSampleWindowBuild(wave, sampleRate, tapStartSample) {
    const preOnsetSamples = Math.round((PEAK_RINGDOWN_PRE_ONSET_MS / 1000) * sampleRate);
    const windowSamples = Math.round((PEAK_RINGDOWN_WINDOW_MS / 1000) * sampleRate);
    const start = Math.max(0, Math.round(tapStartSample) - preOnsetSamples);
    const end = Math.min(wave.length, start + windowSamples);
    const buffer = new Float32Array(Math.max(0, end - start));
    for (let index = 0; index < buffer.length; index += 1) {
        buffer[index] = Number(wave[start + index]) || 0;
    }
    return { buffer };
}
function peakAnalysisReferenceLineShapeBuild(referenceDb) {
    return {
        type: "line",
        x0: 0,
        x1: 1,
        xref: "paper",
        y0: referenceDb,
        y1: referenceDb,
        line: { color: "rgba(245, 196, 111, 0.62)", width: 1.2, dash: "dash" },
    };
}
function peakAnalysisQAnnotationsBuild(data) {
    if (!Number.isFinite(data.selectedQ))
        return [];
    return [
        {
            x: data.selectedX,
            y: data.selectedY,
            text: peakAnalysisQAnnotationTextBuild(data.selectedQ, data.widthHz),
            showarrow: true,
            arrowhead: 2,
            ax: 0,
            ay: -34,
            bgcolor: "rgba(15, 17, 24, 0.82)",
            bordercolor: "rgba(245, 196, 111, 0.45)",
            borderwidth: 1,
            borderpad: 5,
            font: { color: "rgba(255,255,255,0.92)", size: 13 },
        },
        {
            x: 1,
            xref: "paper",
            xanchor: "right",
            y: data.selectedY - 3,
            text: "-3 dB",
            showarrow: false,
            bgcolor: "rgba(15, 17, 24, 0.74)",
            bordercolor: "rgba(245, 196, 111, 0.28)",
            borderwidth: 1,
            borderpad: 3,
            font: { color: "rgba(245, 196, 111, 0.86)", size: 11 },
        },
    ];
}
function peakAnalysisQAnnotationTextBuild(q, widthHz) {
    const qText = `Q ${Math.round(q)}`;
    if (!Number.isFinite(widthHz))
        return qText;
    return `${qText} · ${widthHz.toFixed(2)} Hz`;
}
function peakAnalysisPlotClear(plot) {
    const Plotly = peakAnalysisPlotlyResolve();
    Plotly?.purge?.(plot);
}
function peakAnalysisCardsReadFromState(state) {
    return Array.isArray(state.lastModeCards) ? state.lastModeCards : [];
}
function peakAnalysisCardFindByKey(cards, key) {
    if (typeof key !== "string" || !key)
        return null;
    return cards.find((card) => card.key === key) || null;
}
function peakAnalysisCardPreferredResolve(cards) {
    return cards.find((card) => Number.isFinite(card.freq)) || cards[0] || null;
}
function peakAnalysisPlotElementGet() {
    return document.getElementById("plot_peak_analysis");
}
function peakAnalysisRingdownPlotElementGet() {
    return document.getElementById("plot_peak_ringdown");
}
function peakAnalysisProvenanceElementGet() {
    return document.getElementById("peak_analysis_provenance");
}
function peakAnalysisInterpretationElementGet() {
    return document.getElementById("peak_analysis_interpretation");
}
function peakAnalysisActionsElementGet() {
    return document.getElementById("peak_analysis_actions");
}
function peakAnalysisModelLinkElementGet() {
    return document.getElementById("peak_analysis_open_model");
}
function peakAnalysisPlotlyResolve() {
    const scope = window;
    return scope.Plotly || null;
}
function peakAnalysisRingdownApiResolve() {
    const scope = (typeof window !== "undefined" ? window : globalThis);
    return scope.ModalRingdown || null;
}
