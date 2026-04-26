import { analyzeModes, analyzeModesWithBands, smoothSpectrumFast, smoothSpectrumGaussianBins } from "./resonate_mode_detection.js";
import { computeSeverity, estimateQFromDb, noteAndCentsFromFreq, wolfRiskFromSeverity, } from "./resonate_mode_metrics.js";
export const analysisBoundaryDefault = {
    smoothSpectrumFast,
    smoothSpectrumGaussianBins,
    analyzeModes,
    analyzeModesWithBands,
    noteAndCentsFromFreq,
    estimateQFromDb,
    computeSeverity,
    wolfRiskFromSeverity,
};
