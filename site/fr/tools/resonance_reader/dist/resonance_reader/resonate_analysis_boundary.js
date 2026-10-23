import { analyzeModes, analyzeModesWithBands, analyzeModesWithBandsByQAndLevel, smoothSpectrumFast, smoothSpectrumGaussianBins, } from "./resonate_mode_detection.js?rev=77822e68554b";
import { computeSeverity, estimateQFromDb, noteAndCentsFromFreq, wolfRiskFromSeverity, } from "./resonate_mode_metrics.js?rev=77822e68554b";
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
