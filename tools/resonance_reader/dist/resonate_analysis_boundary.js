import { analyzeModes, smoothSpectrumFast } from "./resonate_mode_detection.js";
import { computeSeverity, estimateQFromDb, noteAndCentsFromFreq, wolfRiskFromSeverity, } from "./resonate_mode_metrics.js";
export const analysisBoundaryDefault = {
    smoothSpectrumFast,
    analyzeModes,
    noteAndCentsFromFreq,
    estimateQFromDb,
    computeSeverity,
    wolfRiskFromSeverity,
};
