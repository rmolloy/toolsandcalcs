import { analyzeModes, analyzeModesWithBands, smoothSpectrumFast } from "./resonate_mode_detection.js";
import { computeSeverity, estimateQFromDb, noteAndCentsFromFreq, wolfRiskFromSeverity, } from "./resonate_mode_metrics.js";
export const analysisBoundaryDefault = {
    smoothSpectrumFast,
    analyzeModes,
    analyzeModesWithBands,
    noteAndCentsFromFreq,
    estimateQFromDb,
    computeSeverity,
    wolfRiskFromSeverity,
};
