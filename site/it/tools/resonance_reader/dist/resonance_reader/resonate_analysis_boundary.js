import { analyzeModes, analyzeModesWithBands, analyzeModesWithBandsByQAndLevel, smoothSpectrumFast, smoothSpectrumGaussianBins, } from "./resonate_mode_detection.js?rev=9b7373dc94f1";
import { computeSeverity, estimateQFromDb, noteAndCentsFromFreq, wolfRiskFromSeverity, } from "./resonate_mode_metrics.js?rev=9b7373dc94f1";
export const analysisBoundaryDefault = {
    smoothSpectrumFast,
    smoothSpectrumGaussianBins,
    analyzeModes,
    analyzeModesWithBands,
    analyzeModesWithBandsByQAndLevel,
    noteAndCentsFromFreq,
    estimateQFromDb,
    computeSeverity,
    wolfRiskFromSeverity,
};
