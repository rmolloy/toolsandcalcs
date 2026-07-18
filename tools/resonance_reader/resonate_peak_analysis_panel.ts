import type { ModeCard } from "./resonate_types.js";
import { peakAnalysisSourceMeasureModeResolve } from "./resonate_mode_config.js";
import { externalModelDestinationResolveFromMeasureMode } from "./resonate_model_destination.js";
import {
  resonanceSpectrumSmoothingEnabled,
  resonanceSpectrumLineWidthResolve,
  resonanceTapAveragingEnabled,
} from "./resonate_debug_flags.js";
import { resolveColorHexFromRole, resolveColorRgbaFromRole } from "./resonate_color_roles.js";

type SpectrumLike = {
  freqs?: number[];
  dbs?: number[];
  mags?: number[];
};

type PlotlyLike = {
  react: (element: HTMLElement, data: unknown[], layout: Record<string, unknown>, config?: Record<string, unknown>) => unknown;
  purge?: (element: HTMLElement) => unknown;
  Plots?: { resize?: (element: HTMLElement) => unknown };
};

type RingdownApi = {
  analyzeModeRingdown: (args: {
    buffer: ArrayLike<number>;
    sampleRate: number;
    targetFrequencyHz: number;
    spectrum?: SpectrumLike | null;
    modeBandwidthHz?: number | null;
    smoothWindowMs?: number;
    attackSkipMs?: number;
    fitFloorDb?: number;
  }) => PeakAnalysisRingdownResult;
};

type PeakAnalysisRingdownResult = {
  f0: number | null;
  tau: number | null;
  Q: number | null;
  deltaF: number | null;
  envelopeR2: number | null;
  slope: number | null;
  fitStartSec?: number | null;
  fitEndSec?: number | null;
  flags: string[];
  envelope: number[];
  response?: number[];
  timeAxis?: number[];
  sampleRate: number;
  attackSkipMs: number;
  smoothWindowMs: number;
};

type PeakAnalysisRingdownData = {
  result: PeakAnalysisRingdownResult;
  provenance: PeakAnalysisRingdownProvenance;
};

type PeakAnalysisRingdownProvenance = {
  tapCount: number;
  tapIndex: number | null;
  windowMs: number;
  expectedWindowMs: number;
  limit: "expected" | "next_tap" | "recording_end";
  preOnsetMs: number;
  sampleRate: number;
  sampleCount: number;
  bandwidthHz: number | null;
};

const PEAK_RINGDOWN_DEFAULT_WINDOW_MS = 1200;
const PEAK_RINGDOWN_MIN_WINDOW_MS = 400;
const PEAK_RINGDOWN_MAX_WINDOW_MS = 3000;
const PEAK_RINGDOWN_PRE_ONSET_MS = 20;
const PEAK_RINGDOWN_NEXT_TAP_GUARD_MS = 20;
const PEAK_RINGDOWN_ATTACK_SKIP_MS = 40;
const PEAK_RINGDOWN_SMOOTH_MS = 5;
const PEAK_RINGDOWN_FIT_FLOOR_DB = 26;
const PEAK_ANALYSIS_FULL_RESPONSE_MAX_HZ = 500;
const PEAK_ANALYSIS_CANDIDATE_PROMINENCE_DB = 4.5;
const PEAK_ANALYSIS_CANDIDATE_NEIGHBOR_COUNT = 6;
const PEAK_ANALYSIS_CANDIDATE_MODE_MATCH_HZ = 3;
const PEAK_ANALYSIS_MEASURED_TRACE_LINE_WIDTH = 1;
const PEAK_ANALYSIS_WAVEFORM_COLOR = resolveColorHexFromRole("peakAnalysisWaveform");
const PEAK_ANALYSIS_PROJECTION_COLOR = resolveColorHexFromRole("peakAnalysisProjection");

type PeakAnalysisCandidate = ModeCard & {
  db: number;
};

export function peakAnalysisPanelInitialize(state: Record<string, any>) {
  peakAnalysisActionListenersAttach(state);
}

export function peakAnalysisPanelRenderFromState(state: Record<string, any>) {
  const selectedMode = peakAnalysisSelectionSyncFromState(state);
  const ringdownData = peakAnalysisRingdownDataBuild(state, selectedMode);
  peakAnalysisPlotRender(state, selectedMode);
  peakAnalysisRingdownRender(ringdownData);
  peakAnalysisActionsRender(state, selectedMode, ringdownData);
}

export function peakAnalysisSelectionApplyFromModeKey(state: Record<string, any>, modeKey: string) {
  state.peakAnalysisSelectedKey = modeKey;
}

export function peakAnalysisCandidateSelectionApply(state: Record<string, any>, modeKey: string) {
  const candidate = peakAnalysisCardFindByKey(peakAnalysisCandidatesReadFromState(state), modeKey);
  if (!Number.isFinite(candidate?.freq)) return;
  peakAnalysisSelectionApplyFromModeKey(state, modeKey);
  if (typeof state.rerenderFromLastSpectrum === "function") {
    state.rerenderFromLastSpectrum({ skipDof: true });
    return;
  }
  peakAnalysisPanelRenderFromState(state);
}

export function peakAnalysisNextModeReview(state: Record<string, any>) {
  const candidates = peakAnalysisCandidatesReadFromState(state);
  if (!candidates.length) return null;
  const currentIndex = candidates.findIndex((candidate) => candidate.key === state.peakAnalysisSelectedKey);
  const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % candidates.length;
  state.peakAnalysisSelectedKey = candidates[nextIndex].key;
  return candidates[nextIndex];
}

export function peakAnalysisPreviousModeReview(state: Record<string, any>) {
  const candidates = peakAnalysisCandidatesReadFromState(state);
  if (!candidates.length) return null;
  const currentIndex = candidates.findIndex((candidate) => candidate.key === state.peakAnalysisSelectedKey);
  const previousIndex = currentIndex <= 0 ? candidates.length - 1 : currentIndex - 1;
  state.peakAnalysisSelectedKey = candidates[previousIndex].key;
  return candidates[previousIndex];
}

export function peakAnalysisSpectrumReadFromState(state: Record<string, any>) {
  return state.lastSpectrum || state.lastSpectrumRaw || null;
}

export function peakAnalysisSelectionSyncFromState(state: Record<string, any>) {
  const candidates = peakAnalysisCandidatesReadFromState(state);
  const current = peakAnalysisCardFindByKey(candidates, state.peakAnalysisSelectedKey);
  if (current) return current;
  const cards = peakAnalysisCardsReadFromState(state);
  const fallback = peakAnalysisCardPreferredResolve(cards);
  state.peakAnalysisSelectedKey = fallback?.key ?? null;
  return peakAnalysisCardFindByKey(candidates, fallback?.key) || fallback;
}

export function peakAnalysisWidthHzResolveFromMode(mode: Pick<ModeCard, "freq" | "q"> | null | undefined) {
  if (!Number.isFinite(mode?.freq) || !Number.isFinite(mode?.q) || (mode?.q as number) <= 0) return null;
  return (mode?.freq as number) / (mode?.q as number);
}

export function peakAnalysisRingdownDataBuild(state: Record<string, any>, selectedMode: ModeCard | null): PeakAnalysisRingdownData | null {
  const api = peakAnalysisRingdownApiResolve();
  const input = peakAnalysisRingdownInputBuild(state, selectedMode);
  if (!api || !input) return null;
  try {
    return {
      result: api.analyzeModeRingdown({
        buffer: input.buffer,
        sampleRate: input.provenance.sampleRate,
        targetFrequencyHz: selectedMode!.freq as number,
        spectrum: peakAnalysisSpectrumReadFromState(state),
        modeBandwidthHz: input.provenance.bandwidthHz,
        smoothWindowMs: PEAK_RINGDOWN_SMOOTH_MS,
        attackSkipMs: PEAK_RINGDOWN_ATTACK_SKIP_MS,
        fitFloorDb: PEAK_RINGDOWN_FIT_FLOOR_DB,
      }),
      provenance: input.provenance,
    };
  } catch {
    return null;
  }
}

function peakAnalysisRingdownInputBuild(state: Record<string, any>, selectedMode: ModeCard | null) {
  if (!Number.isFinite(selectedMode?.freq)) return null;
  const wave = peakAnalysisWaveReadFromState(state);
  const sampleRate = Number(state.currentWave?.sampleRate);
  if (!wave?.length || !Number.isFinite(sampleRate) || sampleRate <= 0) return null;
  const tap = peakAnalysisTapWindowResolve(state, sampleRate);
  const expectedWindowMs = peakAnalysisRingdownExpectedWindowMsResolve(selectedMode);
  const sampleWindow = peakAnalysisRingdownSampleWindowBuild(wave, sampleRate, tap?.start ?? 0, tap?.nextStart ?? null, expectedWindowMs);
  if (!sampleWindow.buffer.length) return null;
  return {
    buffer: sampleWindow.buffer,
    provenance: {
      tapCount: Array.isArray(state.tapSegments) ? state.tapSegments.length : 0,
      tapIndex: tap?.index ?? null,
      windowMs: sampleWindow.windowMs,
      expectedWindowMs,
      limit: sampleWindow.limit,
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

function peakAnalysisQLabelBuild(q: number | null) {
  if (!Number.isFinite(q)) return "—";
  return `Q ${Math.round(q as number)}`;
}

function peakAnalysisPlotRender(state: Record<string, any>, selectedMode: ModeCard | null) {
  const plot = peakAnalysisPlotElementGet();
  if (!plot) return;
  const responseData = peakAnalysisFullResponseDataBuild(
    peakAnalysisSpectrumReadFromState(state),
    selectedMode,
    peakAnalysisCandidatesReadFromState(state),
  );
  if (!responseData) {
    plot.hidden = true;
    peakAnalysisPlotClear(plot);
    return;
  }
  plot.hidden = false;
  peakAnalysisPlotApply(plot, responseData, state);
}

function peakAnalysisFullResponseDataBuild(
  spectrum: SpectrumLike | null | undefined,
  selectedMode: ModeCard | null,
  candidates: PeakAnalysisCandidate[],
) {
  if (!selectedMode || !Number.isFinite(selectedMode.freq)) return null;
  const freqs = Array.isArray(spectrum?.freqs) ? spectrum?.freqs : [];
  const dbs = peakAnalysisDbsResolveFromSpectrum(spectrum);
  if (!freqs.length || freqs.length !== dbs.length) return null;
  const centerHz = selectedMode.freq as number;
  const points = freqs.reduce<Array<{ freq: number; db: number }>>((rows, freq, index) => {
    const db = dbs[index];
    if (!Number.isFinite(freq) || !Number.isFinite(db)) return rows;
    if (freq < 0 || freq > PEAK_ANALYSIS_FULL_RESPONSE_MAX_HZ) return rows;
    rows.push({ freq, db });
    return rows;
  }, []);
  if (!points.length) return null;
  const selectedPoint = peakAnalysisPointNearestResolve(points, centerHz);
  const candidatePoints = candidates.reduce<Array<{ key: string; label: string; x: number; y: number; q: number | null; widthHz: number | null }>>((rows, candidate) => {
    if (candidate.key === selectedMode.key || !Number.isFinite(candidate.freq)) return rows;
    const point = peakAnalysisPointNearestResolve(points, candidate.freq as number);
    rows.push({
      key: candidate.key,
      label: candidate.label,
      x: point.freq,
      y: point.db,
      q: candidate.q,
      widthHz: peakAnalysisWidthHzResolveFromMode(candidate),
    });
    return rows;
  }, []);
  return {
    x: points.map((point) => point.freq),
    y: points.map((point) => point.db),
    selectedX: selectedPoint.freq,
    selectedY: selectedPoint.db,
    selectedQ: selectedMode.q,
    widthHz: peakAnalysisWidthHzResolveFromMode(selectedMode),
    candidates: candidatePoints,
  };
}

export function peakAnalysisCandidatesBuild(
  spectrum: SpectrumLike | null | undefined,
  modeCards: ModeCard[],
  estimateQ: ((freqs: number[], dbs: number[], peak: { freq: number; db: number }) => number | null) | null = null,
) {
  const points = peakAnalysisSpectrumPointsBuild(spectrum);
  if (!points.length) return peakAnalysisModeCandidatesBuild(modeCards, []);
  const detected = peakAnalysisDetectedCandidatesBuild(points, modeCards, estimateQ);
  const resolved = peakAnalysisNearbyCandidatesConsolidate(detected);
  return peakAnalysisModeCandidatesBuild(modeCards, resolved).sort((left, right) => (left.freq || 0) - (right.freq || 0));
}

function peakAnalysisCandidatesReadFromState(state: Record<string, any>) {
  return peakAnalysisCandidatesBuild(
    peakAnalysisSpectrumReadFromState(state),
    peakAnalysisCardsReadFromState(state),
    state.analysisBoundary?.estimateQFromDb || null,
  );
}

function peakAnalysisSpectrumPointsBuild(spectrum: SpectrumLike | null | undefined) {
  const freqs = Array.isArray(spectrum?.freqs) ? spectrum.freqs : [];
  const dbs = peakAnalysisDbsResolveFromSpectrum(spectrum);
  if (freqs.length !== dbs.length) return [];
  return freqs.reduce<Array<{ freq: number; db: number }>>((rows, freq, index) => {
    const db = dbs[index];
    if (!Number.isFinite(freq) || !Number.isFinite(db)) return rows;
    if (freq < 0 || freq > PEAK_ANALYSIS_FULL_RESPONSE_MAX_HZ) return rows;
    rows.push({ freq, db });
    return rows;
  }, []);
}

function peakAnalysisDetectedCandidatesBuild(
  points: Array<{ freq: number; db: number }>,
  modeCards: ModeCard[],
  estimateQ: ((freqs: number[], dbs: number[], peak: { freq: number; db: number }) => number | null) | null,
) {
  const freqs = points.map((point) => point.freq);
  const dbs = points.map((point) => point.db);
  return points.reduce<PeakAnalysisCandidate[]>((candidates, point, index) => {
    if (!peakAnalysisLocalPeakIsDetected(points, index)) return candidates;
    const mode = peakAnalysisModeNearFrequencyResolve(modeCards, point.freq);
    candidates.push({
      key: mode?.key || `spectrum-peak-${index}`,
      kind: mode?.kind || "custom",
      label: mode?.label || "Peak",
      freq: point.freq,
      note: mode?.note || null,
      cents: mode?.cents || null,
      q: mode?.q ?? estimateQ?.(freqs, dbs, point) ?? null,
      wolfRisk: mode?.wolfRisk || null,
      db: point.db,
    });
    return candidates;
  }, []);
}

function peakAnalysisNearbyCandidatesConsolidate(candidates: PeakAnalysisCandidate[]) {
  return [...candidates]
    .sort((left, right) => (left.freq || 0) - (right.freq || 0))
    .reduce<PeakAnalysisCandidate[]>((resolved, candidate) => {
      const previous = resolved[resolved.length - 1];
      const previousWidthHz = peakAnalysisWidthHzResolveFromMode(previous);
      const candidateWidthHz = peakAnalysisWidthHzResolveFromMode(candidate);
      const samePeak = Number.isFinite(previousWidthHz)
        && Number.isFinite(candidateWidthHz)
        && (candidate.freq as number) - (previous?.freq as number) <= Math.min(previousWidthHz as number, candidateWidthHz as number) / 2;
      if (!previous || !samePeak) {
        resolved.push(candidate);
        return resolved;
      }
      if (candidate.db > previous.db) resolved[resolved.length - 1] = candidate;
      return resolved;
    }, []);
}

function peakAnalysisLocalPeakIsDetected(points: Array<{ freq: number; db: number }>, index: number) {
  if (index <= 0 || index >= points.length - 1) return false;
  const point = points[index];
  if (!(point.db > points[index - 1].db && point.db > points[index + 1].db)) return false;
  return peakAnalysisLocalProminenceDbResolve(points, index) >= PEAK_ANALYSIS_CANDIDATE_PROMINENCE_DB;
}

function peakAnalysisLocalProminenceDbResolve(points: Array<{ freq: number; db: number }>, index: number) {
  const start = Math.max(0, index - PEAK_ANALYSIS_CANDIDATE_NEIGHBOR_COUNT);
  const end = Math.min(points.length - 1, index + PEAK_ANALYSIS_CANDIDATE_NEIGHBOR_COUNT);
  const neighbors = points
    .slice(start, end + 1)
    .filter((_point, neighborIndex) => neighborIndex !== index - start)
    .map((point) => point.db)
    .sort((left, right) => left - right);
  if (!neighbors.length) return 0;
  const middle = Math.floor(neighbors.length / 2);
  const baseline = neighbors.length % 2 ? neighbors[middle] : (neighbors[middle - 1] + neighbors[middle]) / 2;
  return points[index].db - baseline;
}

function peakAnalysisModeCandidatesBuild(
  modeCards: ModeCard[],
  candidates: PeakAnalysisCandidate[],
) {
  return modeCards.reduce<PeakAnalysisCandidate[]>((rows, mode) => {
    if (!Number.isFinite(mode.freq) || rows.some((candidate) => candidate.key === mode.key)) return rows;
    rows.push({
      ...mode,
      kind: mode.kind || "built-in",
      freq: mode.freq,
      q: mode.q ?? null,
      db: 0,
    });
    return rows;
  }, [...candidates]);
}

function peakAnalysisModeNearFrequencyResolve(modeCards: ModeCard[], frequencyHz: number) {
  return modeCards.find((mode) => Number.isFinite(mode.freq) && Math.abs((mode.freq as number) - frequencyHz) <= PEAK_ANALYSIS_CANDIDATE_MODE_MATCH_HZ) || null;
}

function peakAnalysisDbsResolveFromSpectrum(spectrum: SpectrumLike | null | undefined) {
  if (Array.isArray(spectrum?.dbs)) return spectrum.dbs as number[];
  const mags = Array.isArray(spectrum?.mags) ? spectrum.mags : [];
  return mags.map((magnitude) => 20 * Math.log10(Math.max(Number(magnitude) || 0, 1e-12)));
}

function peakAnalysisPointNearestResolve(points: Array<{ freq: number; db: number }>, centerHz: number) {
  return points.reduce((best, point) => {
    if (!best) return point;
    return Math.abs(point.freq - centerHz) < Math.abs(best.freq - centerHz) ? point : best;
  }, null as { freq: number; db: number } | null)!;
}

function peakAnalysisPlotApply(
  plot: HTMLElement,
  data: {
    x: number[];
    y: number[];
    selectedX: number;
    selectedY: number;
    selectedQ: number | null;
    widthHz: number | null;
    candidates: Array<{ key: string; label: string; x: number; y: number; q: number | null; widthHz: number | null }>;
  },
  state: Record<string, any>,
) {
  const Plotly = peakAnalysisPlotlyResolve();
  if (!Plotly?.react) return;
  const plotAny = plot as any;
  plotAny.__peakAnalysisState = state;
  plotAny.__peakAnalysisLatestData = data;
  plotAny.__peakAnalysisPlotNeedsRedraw = true;
  if (plotAny.__peakAnalysisPlotDrawing) return;
  plotAny.__peakAnalysisPlotReady = peakAnalysisPlotDrainLatest(plot, Plotly);
}

function peakAnalysisPlotDraw(
  plot: HTMLElement,
  Plotly: PlotlyLike,
  data: {
    x: number[];
    y: number[];
    selectedX: number;
    selectedY: number;
    selectedQ: number | null;
    widthHz: number | null;
    candidates: Array<{ key: string; label: string; x: number; y: number; q: number | null; widthHz: number | null }>;
  },
) {
  const drawResult = Plotly.react(
    plot,
    peakAnalysisTracesBuild(data),
    peakAnalysisLayoutBuild(data),
    { displayModeBar: false, responsive: true },
  );
  const plotAny = plot as any;
  if (typeof plotAny.removeAllListeners === "function") plotAny.removeAllListeners("plotly_click");
  if (typeof plotAny.on === "function") {
    plotAny.__peakAnalysisCandidateSelectionListener = (event: any) => {
      const modeKey = event?.points?.[0]?.customdata;
      if (typeof modeKey !== "string") return;
      peakAnalysisCandidateSelectionApply(plotAny.__peakAnalysisState, modeKey);
    };
    plotAny.on("plotly_click", plotAny.__peakAnalysisCandidateSelectionListener);
  }
  return Promise.resolve(drawResult)
    .catch(() => undefined)
    .then(() => peakAnalysisPlotResize(plot, Plotly));
}

async function peakAnalysisPlotDrainLatest(plot: HTMLElement, Plotly: PlotlyLike) {
  const plotAny = plot as any;
  plotAny.__peakAnalysisPlotDrawing = true;
  try {
    while (plotAny.__peakAnalysisPlotNeedsRedraw) {
      plotAny.__peakAnalysisPlotNeedsRedraw = false;
      await peakAnalysisPlotDraw(plot, Plotly, plotAny.__peakAnalysisLatestData);
    }
  } finally {
    plotAny.__peakAnalysisPlotDrawing = false;
  }
}

function peakAnalysisPlotResize(plot: HTMLElement, Plotly: PlotlyLike) {
  try {
    const resizeResult = Plotly.Plots?.resize?.(plot);
    return Promise.resolve(resizeResult).catch(() => undefined);
  } catch {
    return undefined;
  }
}

function peakAnalysisRingdownRender(data: PeakAnalysisRingdownData | null) {
  const provenance = peakAnalysisProvenanceElementGet();
  const plot = peakAnalysisRingdownPlotElementGet();
  if (!data) {
    if (provenance) provenance.textContent = "";
    if (plot) {
      plot.hidden = true;
      peakAnalysisPlotClear(plot);
    }
    return;
  }
  if (provenance) provenance.textContent = peakAnalysisProvenanceTextBuild(data.provenance);
  peakAnalysisRingdownPlotRender(plot, data);
}

function peakAnalysisActionsRender(
  state: Record<string, any>,
  selectedMode: ModeCard | null,
  data: PeakAnalysisRingdownData | null,
) {
  const actions = peakAnalysisActionsElementGet();
  if (!actions) return;
  const enabled = Boolean(selectedMode && data);
  peakAnalysisActionButtonsSetEnabled(actions, enabled);
  const candidates = peakAnalysisCandidatesReadFromState(state);
  const selectedIndex = candidates.findIndex((candidate) => candidate.key === selectedMode?.key);
  const position = document.getElementById("peak_analysis_position");
  if (position) position.textContent = selectedIndex < 0 ? "Peak -" : `Peak ${selectedIndex + 1} of ${candidates.length}`;
  peakAnalysisModelLinkRender(state);
}

function peakAnalysisActionListenersAttach(state: Record<string, any>) {
  peakAnalysisActionButtonListen("peak_analysis_previous", () => {
    const previous = peakAnalysisPreviousModeReview(state);
    if (!previous) return;
    peakAnalysisStatusSet(`Reviewing ${previous.label || "previous"} peak.`);
    peakAnalysisPanelRenderFromState(state);
  });
  peakAnalysisActionButtonListen("peak_analysis_next", () => peakAnalysisReviewNextApply(state));
  peakAnalysisActionButtonListen("peak_analysis_export_data", () => peakAnalysisEvidenceExport(state));
}

function peakAnalysisActionButtonListen(id: string, listener: () => void) {
  const button = document.getElementById(id) as HTMLButtonElement | null;
  const buttonAny = button as (HTMLButtonElement & { __peakAnalysisListenerAttached?: boolean }) | null;
  if (!buttonAny || buttonAny.__peakAnalysisListenerAttached) return;
  buttonAny.__peakAnalysisListenerAttached = true;
  buttonAny.addEventListener("click", listener);
}

function peakAnalysisReviewNextApply(state: Record<string, any>) {
  const next = peakAnalysisNextModeReview(state);
  if (!next) return;
  peakAnalysisStatusSet(`Reviewing ${next.label || "next"} peak.`);
  peakAnalysisPanelRenderFromState(state);
}

function peakAnalysisEvidenceExport(state: Record<string, any>) {
  const selectedMode = peakAnalysisSelectionSyncFromState(state);
  const data = peakAnalysisRingdownDataBuild(state, selectedMode);
  if (!selectedMode || !data) return;
  peakAnalysisJsonDownload(
    peakAnalysisEvidenceFilenameBuild(selectedMode),
    peakAnalysisEvidencePayloadBuild(state, selectedMode, data),
  );
  peakAnalysisStatusSet("Peak/Q evidence exported.");
}

function peakAnalysisEvidencePayloadBuild(
  state: Record<string, any>,
  selectedMode: ModeCard,
  data: PeakAnalysisRingdownData,
) {
  return {
    selectedMode,
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

function peakAnalysisEvidenceFilenameBuild(selectedMode: ModeCard) {
  const label = String(selectedMode.label || selectedMode.key || "peak").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `peak-q-${label || "peak"}.json`;
}

function peakAnalysisJsonDownload(filename: string, payload: Record<string, unknown>) {
  const scope = window as typeof window & { URL?: typeof URL };
  if (typeof Blob === "undefined" || !scope.URL?.createObjectURL) return;
  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: "application/json" });
  const url = scope.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  scope.URL.revokeObjectURL?.(url);
}

function peakAnalysisActionButtonsSetEnabled(actions: HTMLElement, enabled: boolean) {
  actions.querySelectorAll<HTMLButtonElement>("button").forEach((button) => {
    button.disabled = !enabled;
  });
}

function peakAnalysisModelLinkRender(state: Record<string, any>) {
  const link = peakAnalysisModelLinkElementGet();
  if (!link) return;
  const destination = externalModelDestinationResolveFromMeasureMode(peakAnalysisSourceMeasureModeResolve(state));
  link.hidden = !destination.showModelRow;
  link.href = destination.href;
  link.textContent = destination.label;
}

function peakAnalysisStatusSet(text: string) {
  const status = (window as any).ResonateStatus;
  if (typeof status?.setStatus === "function") status.setStatus(text);
}

function peakAnalysisRingdownConfidenceLabelBuild(result: PeakAnalysisRingdownResult) {
  if (!Number.isFinite(result.envelopeR2) || !Number.isFinite(result.Q)) return "weak";
  if ((result.envelopeR2 as number) >= 0.92) return "strong";
  if ((result.envelopeR2 as number) >= 0.85) return "usable";
  return "weak";
}

function peakAnalysisProvenanceTextBuild(provenance: PeakAnalysisRingdownProvenance) {
  const tapLabel = provenance.tapIndex === null
    ? "full file start"
    : `tap ${provenance.tapIndex + 1} of ${Math.max(provenance.tapCount, provenance.tapIndex + 1)}`;
  const bandwidth = Number.isFinite(provenance.bandwidthHz) ? `${(provenance.bandwidthHz as number).toFixed(2)} Hz band` : "automatic band";
  const limit = provenance.limit === "next_tap" ? " (next tap)" : provenance.limit === "recording_end" ? " (recording ends)" : "";
  const window = provenance.windowMs < provenance.expectedWindowMs
    ? `${provenance.windowMs} ms observed of ${provenance.expectedWindowMs} ms expected${limit}`
    : `${provenance.expectedWindowMs} ms expected observation`;
  return `Ring-down source: ${tapLabel} · ${window} · ${provenance.preOnsetMs} ms pre-onset · ${bandwidth} · ${provenance.sampleRate.toLocaleString()} Hz`;
}

function peakAnalysisRingdownPlotRender(plot: HTMLElement | null, data: PeakAnalysisRingdownData) {
  if (!plot) return;
  const Plotly = peakAnalysisPlotlyResolve();
  const plotData = peakAnalysisRingdownPlotDataBuild(data.result);
  if (!Plotly?.react || !plotData) {
    plot.hidden = true;
    peakAnalysisPlotClear(plot);
    return;
  }
  plot.hidden = false;
  const plotAny = plot as any;
  plotAny.__peakAnalysisRingdownLatestData = { plotData, result: data.result };
  plotAny.__peakAnalysisRingdownNeedsRedraw = true;
  if (plotAny.__peakAnalysisRingdownDrawing) return;
  plotAny.__peakAnalysisRingdownReady = peakAnalysisRingdownPlotDrainLatest(plot, Plotly);
}

function peakAnalysisRingdownPlotDraw(
  plot: HTMLElement,
  Plotly: PlotlyLike,
  data: {
    plotData: {
      x: number[];
      response: number[];
      envelope: number[];
      fit: { x: number[]; y: number[] } | null;
    };
    result: PeakAnalysisRingdownResult;
  },
) {
  const drawResult = Plotly.react(
    plot,
    peakAnalysisRingdownTracesBuild(data.plotData),
    peakAnalysisRingdownLayoutBuild(data.plotData, data.result),
    { displayModeBar: false, responsive: true },
  );
  return Promise.resolve(drawResult)
    .catch(() => undefined)
    .then(() => peakAnalysisPlotResize(plot, Plotly));
}

async function peakAnalysisRingdownPlotDrainLatest(plot: HTMLElement, Plotly: PlotlyLike) {
  const plotAny = plot as any;
  plotAny.__peakAnalysisRingdownDrawing = true;
  try {
    while (plotAny.__peakAnalysisRingdownNeedsRedraw) {
      plotAny.__peakAnalysisRingdownNeedsRedraw = false;
      await peakAnalysisRingdownPlotDraw(plot, Plotly, plotAny.__peakAnalysisRingdownLatestData);
    }
  } finally {
    plotAny.__peakAnalysisRingdownDrawing = false;
  }
}

function peakAnalysisRingdownPlotDataBuild(result: PeakAnalysisRingdownResult) {
  if (!Array.isArray(result.envelope) || !result.envelope.length || !Number.isFinite(result.sampleRate)) return null;
  const envelope = result.envelope.map((value) => Math.max(0, Number(value) || 0));
  const x = peakAnalysisRingdownTimeAxisBuild(result, envelope.length);
  const response = peakAnalysisRingdownResponseBuild(result, envelope.length);
  const fit = peakAnalysisRingdownFitLineBuild({ x, envelope, result });
  return { x, response, envelope, fit };
}

function peakAnalysisRingdownTimeAxisBuild(result: PeakAnalysisRingdownResult, sampleCount: number) {
  if (Array.isArray(result.timeAxis) && result.timeAxis.length === sampleCount) {
    return result.timeAxis.map((value) => Number(value) || 0);
  }
  const durationSec = (sampleCount * Math.max(1, Math.floor(((result.sampleRate || 1) * PEAK_RINGDOWN_DEFAULT_WINDOW_MS) / 1000 / sampleCount))) / result.sampleRate;
  return Array.from({ length: sampleCount }, (_value, index) => durationSec * (index / Math.max(1, sampleCount - 1)));
}

function peakAnalysisRingdownResponseBuild(result: PeakAnalysisRingdownResult, sampleCount: number) {
  if (!Array.isArray(result.response) || result.response.length !== sampleCount) return [];
  return result.response.map((value) => Number(value) || 0);
}

function peakAnalysisRingdownFitLineBuild(args: { x: number[]; envelope: number[]; result: PeakAnalysisRingdownResult }) {
  const { x, envelope, result } = args;
  if (!Number.isFinite(result.slope) || x.length < 2 || envelope.length < 2) return null;
  const fitWindow = peakAnalysisRingdownFitWindowResolve(x, result);
  const foundStartIndex = x.findIndex((value) => value >= fitWindow.start);
  const startIndex = foundStartIndex >= 0 ? foundStartIndex : 0;
  const foundEndIndex = peakAnalysisRingdownFitEndIndexResolve(x, fitWindow.end);
  const endIndex = Math.max(startIndex, foundEndIndex >= 0 ? foundEndIndex : x.length - 1);
  if (endIndex - startIndex < 1) return null;
  const y0 = Math.max(envelope[startIndex] ?? envelope[0] ?? 0, 1e-6);
  const x0 = x[startIndex] ?? x[0] ?? 0;
  const slope = result.slope as number;
  const fitX = x.slice(startIndex, endIndex + 1);
  return {
    x: fitX,
    y: fitX.map((value) => y0 * Math.exp(slope * (value - x0))),
  };
}

function peakAnalysisRingdownFitEndIndexResolve(x: number[], fitEndSec: number) {
  for (let index = x.length - 1; index >= 0; index -= 1) {
    if (x[index] <= fitEndSec) return index;
  }
  return -1;
}

function peakAnalysisRingdownFitWindowResolve(x: number[], result: PeakAnalysisRingdownResult) {
  const fallbackStart = Math.max(0, (result.attackSkipMs || PEAK_RINGDOWN_ATTACK_SKIP_MS) / 1000);
  const fallbackEnd = x[x.length - 1] ?? fallbackStart;
  const start = Number(result.fitStartSec);
  const end = Number(result.fitEndSec);
  if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
    return { start: Math.max(0, start), end: Math.min(fallbackEnd, end) };
  }
  return { start: fallbackStart, end: fallbackEnd };
}

function peakAnalysisRingdownTracesBuild(data: {
  x: number[];
  response: number[];
  envelope: number[];
  fit: { x: number[]; y: number[] } | null;
}) {
  const traces: Record<string, unknown>[] = [
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

function peakAnalysisRingdownLayoutBuild(data: { x: number[]; response: number[] }, result: PeakAnalysisRingdownResult) {
  return {
    margin: { l: 54, r: 18, t: 24, b: 42 },
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
      ...(data.response.length ? { range: [-1.35, 1.35] } : {}),
    },
    showlegend: false,
    shapes: peakAnalysisRingdownFitWindowShapesBuild(data.x, result),
    annotations: peakAnalysisRingdownFitWindowAnnotationsBuild(data.x, result),
  };
}

function peakAnalysisRingdownFitWindowShapesBuild(x: number[], result: PeakAnalysisRingdownResult) {
  if (!x.length || !Number.isFinite(result.slope)) return [];
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

function peakAnalysisRingdownFitWindowAnnotationsBuild(x: number[], result: PeakAnalysisRingdownResult) {
  if (!x.length || !Number.isFinite(result.slope)) return [];
  const fitWindow = peakAnalysisRingdownFitWindowResolve(x, result);
  return [
    peakAnalysisRingdownWindowAnnotationBuild(fitWindow.start, peakAnalysisRingdownFitStartLabelBuild(fitWindow.start)),
    peakAnalysisRingdownWindowAnnotationBuild(fitWindow.end, "fit ends"),
  ];
}

function peakAnalysisRingdownFitStartLabelBuild(fitStartSec: number) {
  return fitStartSec > 0 ? "attack excluded / fit starts" : "fit starts";
}

function peakAnalysisRingdownWindowAnnotationBuild(x: number, text: string) {
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

function peakAnalysisTracesBuild(data: {
  x: number[];
  y: number[];
  selectedX: number;
  selectedY: number;
  candidates: Array<{ key: string; label: string; x: number; y: number; q: number | null; widthHz: number | null }>;
}) {
  return [
    {
      x: data.x,
      y: data.y,
      type: "scatter",
      mode: "lines",
      line: { color: resolveColorHexFromRole("fftLine"), width: resonanceSpectrumLineWidthResolve(PEAK_ANALYSIS_MEASURED_TRACE_LINE_WIDTH) },
      hovertemplate: "%{x:.1f} Hz<br>%{y:.2f} dB<extra></extra>",
      name: "Frequency response",
    },
    {
      x: data.candidates.map((candidate) => candidate.x),
      y: data.candidates.map((candidate) => candidate.y),
      customdata: data.candidates.map((candidate) => candidate.key),
      text: data.candidates.map((candidate) => {
        const q = peakAnalysisQLabelBuild(candidate.q);
        const width = Number.isFinite(candidate.widthHz) ? ` · BW ${(candidate.widthHz as number).toFixed(2)} Hz` : "";
        return `${candidate.label}<br>${candidate.x.toFixed(1)} Hz<br>${q}${width}`;
      }),
      type: "scatter",
      mode: "markers",
      marker: { color: "rgba(198, 205, 216, 0.76)", size: 8, line: { color: "rgba(15, 17, 24, 0.9)", width: 1.25 } },
      hovertemplate: "%{text}<extra></extra>",
      name: "Peak candidates",
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

function peakAnalysisLayoutBuild(data: { selectedX: number; selectedY: number; selectedQ: number | null; widthHz: number | null }) {
  const halfWidth = Number.isFinite(data.widthHz) ? (data.widthHz as number) / 2 : null;
  return {
    margin: { l: 54, r: 18, t: 24, b: 42 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { color: "rgba(230, 233, 239, 0.85)" },
    xaxis: {
      title: "Hz",
      gridcolor: "rgba(255,255,255,0.08)",
      zeroline: false,
      range: [0, PEAK_ANALYSIS_FULL_RESPONSE_MAX_HZ],
      fixedrange: true,
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

function peakAnalysisBandwidthShapeBuild(leftHz: number, rightHz: number) {
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

function peakAnalysisBandEdgeShapeBuild(x: number) {
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

function peakAnalysisWaveReadFromState(state: Record<string, any>) {
  const wave = state.currentWave?.wave || state.currentWave?.samples;
  return wave?.length ? wave as ArrayLike<number> : null;
}

function peakAnalysisTapWindowResolve(state: Record<string, any>, sampleRate: number) {
  const taps = Array.isArray(state.tapSegments) ? state.tapSegments : [];
  const selectedIndex = peakAnalysisSelectedTapIndexResolve(state, taps, sampleRate);
  const eligibleIndexes = selectedIndex === null ? taps.map((_tap, index) => index) : [selectedIndex];
  for (const index of eligibleIndexes) {
    const tap = peakAnalysisTapWindowBuild(taps[index], index, sampleRate);
    if (!tap) continue;
    const nextTap = peakAnalysisTapWindowBuild(taps[index + 1], index + 1, sampleRate);
    return { ...tap, nextStart: nextTap?.start ?? null };
  }
  return null;
}

function peakAnalysisSelectedTapIndexResolve(state: Record<string, any>, taps: unknown[], sampleRate: number) {
  const selectedIndex = Number(state.peakAnalysisSelectedTapIndex);
  if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex >= taps.length) return null;
  return peakAnalysisTapWindowBuild(taps[selectedIndex], selectedIndex, sampleRate) ? selectedIndex : null;
}

function peakAnalysisTapWindowBuild(tap: any, index: number, sampleRate: number) {
  const start = Number(tap?.start);
  if (Number.isFinite(start) && start >= 0) return { start, index };
  const startMs = Number(tap?.startMs);
  if (Number.isFinite(startMs) && startMs >= 0) return { start: Math.round((startMs / 1000) * sampleRate), index };
  return null;
}

function peakAnalysisRingdownExpectedWindowMsResolve(selectedMode: ModeCard | null) {
  if (!Number.isFinite(selectedMode?.freq) || !Number.isFinite(selectedMode?.q) || (selectedMode?.q as number) <= 0) {
    return PEAK_RINGDOWN_DEFAULT_WINDOW_MS;
  }
  const tauSec = (selectedMode?.q as number) / (Math.PI * (selectedMode?.freq as number));
  const floorDecaySec = tauSec * Math.log(10) * (PEAK_RINGDOWN_FIT_FLOOR_DB / 20);
  const captureMs = PEAK_RINGDOWN_PRE_ONSET_MS + PEAK_RINGDOWN_ATTACK_SKIP_MS + floorDecaySec * 1000;
  return Math.min(PEAK_RINGDOWN_MAX_WINDOW_MS, Math.max(PEAK_RINGDOWN_MIN_WINDOW_MS, Math.round(captureMs)));
}

function peakAnalysisRingdownSampleWindowBuild(
  wave: ArrayLike<number>,
  sampleRate: number,
  tapStartSample: number,
  nextTapStartSample: number | null,
  windowMs: number,
) {
  const preOnsetSamples = Math.round((PEAK_RINGDOWN_PRE_ONSET_MS / 1000) * sampleRate);
  const nextTapGuardSamples = Math.round((PEAK_RINGDOWN_NEXT_TAP_GUARD_MS / 1000) * sampleRate);
  const windowSamples = Math.round((windowMs / 1000) * sampleRate);
  const start = Math.max(0, Math.round(tapStartSample) - preOnsetSamples);
  const expectedEnd = start + windowSamples;
  const nextTapEnd = Number.isFinite(nextTapStartSample)
    ? Math.max(start, Math.round(nextTapStartSample as number) - nextTapGuardSamples)
    : Infinity;
  const end = Math.min(wave.length, expectedEnd, nextTapEnd);
  const buffer = new Float32Array(Math.max(0, end - start));
  for (let index = 0; index < buffer.length; index += 1) {
    buffer[index] = Number(wave[start + index]) || 0;
  }
  const limit: PeakAnalysisRingdownProvenance["limit"] = end === expectedEnd ? "expected" : end === nextTapEnd ? "next_tap" : "recording_end";
  return { buffer, windowMs: Math.round((buffer.length / sampleRate) * 1000), limit };
}

function peakAnalysisReferenceLineShapeBuild(referenceDb: number) {
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

function peakAnalysisQAnnotationsBuild(data: { selectedX: number; selectedY: number; selectedQ: number | null; widthHz: number | null }) {
  if (!Number.isFinite(data.selectedQ)) return [];
  return [
    {
      x: data.selectedX,
      y: data.selectedY,
      text: peakAnalysisQAnnotationTextBuild(data.selectedX, data.selectedQ as number, data.widthHz),
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

function peakAnalysisQAnnotationTextBuild(frequencyHz: number, q: number, widthHz: number | null) {
  const frequencyText = `${frequencyHz.toFixed(1)} Hz`;
  const qText = `Q ${Math.round(q)}`;
  if (!Number.isFinite(widthHz)) return `${frequencyText}<br>${qText}`;
  return `${frequencyText}<br>${qText} · BW ${(widthHz as number).toFixed(2)} Hz`;
}

function peakAnalysisPlotClear(plot: HTMLElement) {
  const Plotly = peakAnalysisPlotlyResolve();
  Plotly?.purge?.(plot);
}

function peakAnalysisCardsReadFromState(state: Record<string, any>) {
  return Array.isArray(state.lastModeCards) ? state.lastModeCards as ModeCard[] : [];
}

function peakAnalysisCardFindByKey(cards: ModeCard[], key: unknown) {
  if (typeof key !== "string" || !key) return null;
  return cards.find((card) => card.key === key) || null;
}

function peakAnalysisCardPreferredResolve(cards: ModeCard[]) {
  return cards.find((card) => Number.isFinite(card.freq)) || cards[0] || null;
}

function peakAnalysisPlotElementGet() {
  return document.getElementById("plot_peak_analysis") as HTMLElement | null;
}

function peakAnalysisRingdownPlotElementGet() {
  return document.getElementById("plot_peak_ringdown") as HTMLElement | null;
}

function peakAnalysisProvenanceElementGet() {
  return document.getElementById("peak_analysis_provenance") as HTMLElement | null;
}

function peakAnalysisActionsElementGet() {
  return document.getElementById("peak_analysis_actions") as HTMLElement | null;
}

function peakAnalysisModelLinkElementGet() {
  return document.getElementById("peak_analysis_open_model") as HTMLAnchorElement | null;
}

function peakAnalysisPlotlyResolve() {
  const scope = window as typeof window & { Plotly?: PlotlyLike };
  return scope.Plotly || null;
}

function peakAnalysisRingdownApiResolve() {
  const scope = (typeof window !== "undefined" ? window : globalThis) as typeof globalThis & { ModalRingdown?: RingdownApi };
  return scope.ModalRingdown || null;
}
