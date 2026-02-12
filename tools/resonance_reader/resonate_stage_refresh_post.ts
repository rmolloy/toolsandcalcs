import type { ModeDetection } from "./resonate_mode_detection.js";
import type { ModeCard } from "./resonate_types.js";
import { customMeasurementCardsBuildFromState } from "./resonate_custom_measurements.js";

type AnalysisShape = {
  noteAndCentsFromFreq: (freq: number | null) => { note: string | null; cents: number | null };
  estimateQFromDb: (freqs: number[], dbs: number[], peak: { freq: number; db: number }) => number | null;
  computeSeverity: (prominenceDb: number, centsAbs: number) => unknown;
  wolfRiskFromSeverity: (severity: unknown) => "None" | "Low" | "Med" | "High" | null;
};

export function stageRefreshPostApply(args: {
  state: Record<string, any>;
  analysis: AnalysisShape;
  modeMeta: Record<string, { label: string }>;
  modesDetected: ModeDetection[];
  freqs: number[];
  dbs: number[];
}) {
  const cards = stageRefreshCardsBuild({
    analysis: args.analysis,
    modeMeta: args.modeMeta,
    modesDetected: args.modesDetected,
    freqs: args.freqs,
    dbs: args.dbs,
    modeTargets: args.state.modeTargets || (args.state.modeTargets = {}),
    modeOverrides: args.state.modePeakOverrides || (args.state.modePeakOverrides = {}),
  });
  const customCards = customMeasurementCardsBuildFromState(args.state);
  args.state.lastModesDetected = args.modesDetected;
  args.state.lastModeCards = [...cards, ...customCards];
}

function stageRefreshCardsBuild(args: {
  analysis: AnalysisShape;
  modeMeta: Record<string, { label: string }>;
  modesDetected: ModeDetection[];
  freqs: number[];
  dbs: number[];
  modeTargets: Record<string, number>;
  modeOverrides: Record<string, number>;
}): ModeCard[] {
  const noteCache = new Map<string, { note: string | null; cents: number | null }>();
  const qCache = new Map<string, number | null>();
  const getNote = (f: number | null) => {
    const key = Number.isFinite(f) ? (f as number).toFixed(3) : "null";
    if (!noteCache.has(key)) noteCache.set(key, args.analysis.noteAndCentsFromFreq(f));
    return noteCache.get(key)!;
  };
  const getQ = (f: number | null, db: number | null) => {
    const key = `${Number.isFinite(f) ? (f as number).toFixed(3) : "null"}|${Number.isFinite(db) ? (db as number).toFixed(2) : "null"}`;
    if (!qCache.has(key) && Number.isFinite(f) && Number.isFinite(db)) {
      qCache.set(key, args.analysis.estimateQFromDb(args.freqs, args.dbs, { freq: f as number, db: db as number }));
    }
    return qCache.get(key) ?? null;
  };
  const getTarget = (key: string) =>
    (typeof args.modeTargets[key] === "number" && Number.isFinite(args.modeTargets[key]) ? args.modeTargets[key] : null);
  return args.modesDetected.map((m) => {
    const note = getNote(m.peakFreq);
    const q = getQ(m.peakFreq, m.peakDb);
    const centsAbs = Number.isFinite(note.cents) ? Math.abs(note.cents as number) : 999;
    const sev = (Number.isFinite(m.prominenceDb) ? args.analysis.computeSeverity(m.prominenceDb as number, centsAbs) : null);
    const tgt = getTarget(m.mode);
    const deltaHz = Number.isFinite(m.peakFreq) && Number.isFinite(tgt) ? (m.peakFreq as number) - (tgt as number) : null;
    const overrideHz = Number.isFinite(args.modeOverrides[m.mode]) ? (args.modeOverrides[m.mode] as number) : null;
    return {
      kind: "built-in",
      key: m.mode as "air" | "top" | "back",
      label: args.modeMeta[m.mode]?.label || (m.mode === "air" ? "Air" : m.mode === "top" ? "Top" : "Back"),
      freq: m.peakFreq,
      note: note.note,
      cents: note.cents,
      q,
      wolfRisk: args.analysis.wolfRiskFromSeverity(sev),
      deltaHz,
      targetHz: tgt,
      peakOverrideHz: overrideHz,
    } satisfies ModeCard;
  });
}
