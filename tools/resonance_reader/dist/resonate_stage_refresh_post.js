import { customMeasurementCardsBuildFromState } from "./resonate_custom_measurements.js";
export function stageRefreshPostApply(args) {
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
function stageRefreshCardsBuild(args) {
    const noteCache = new Map();
    const qCache = new Map();
    const getNote = (f) => {
        const key = Number.isFinite(f) ? f.toFixed(3) : "null";
        if (!noteCache.has(key))
            noteCache.set(key, args.analysis.noteAndCentsFromFreq(f));
        return noteCache.get(key);
    };
    const getQ = (f, db) => {
        const key = `${Number.isFinite(f) ? f.toFixed(3) : "null"}|${Number.isFinite(db) ? db.toFixed(2) : "null"}`;
        if (!qCache.has(key) && Number.isFinite(f) && Number.isFinite(db)) {
            qCache.set(key, args.analysis.estimateQFromDb(args.freqs, args.dbs, { freq: f, db: db }));
        }
        return qCache.get(key) ?? null;
    };
    const getTarget = (key) => (typeof args.modeTargets[key] === "number" && Number.isFinite(args.modeTargets[key]) ? args.modeTargets[key] : null);
    return args.modesDetected.map((m) => {
        const note = getNote(m.peakFreq);
        const q = getQ(m.peakFreq, m.peakDb);
        const centsAbs = Number.isFinite(note.cents) ? Math.abs(note.cents) : 999;
        const sev = (Number.isFinite(m.prominenceDb) ? args.analysis.computeSeverity(m.prominenceDb, centsAbs) : null);
        const tgt = getTarget(m.mode);
        const deltaHz = Number.isFinite(m.peakFreq) && Number.isFinite(tgt) ? m.peakFreq - tgt : null;
        const overrideHz = Number.isFinite(args.modeOverrides[m.mode]) ? args.modeOverrides[m.mode] : null;
        return {
            kind: "built-in",
            key: m.mode,
            label: args.modeMeta[m.mode]?.label || (m.mode === "air" ? "Air" : m.mode === "top" ? "Top" : "Back"),
            freq: m.peakFreq,
            note: note.note,
            cents: note.cents,
            q,
            wolfRisk: args.analysis.wolfRiskFromSeverity(sev),
            deltaHz,
            targetHz: tgt,
            peakOverrideHz: overrideHz,
        };
    });
}
