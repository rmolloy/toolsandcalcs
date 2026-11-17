import { analyzeModes, analyzeModesWithBands, analyzeModesWithBandsByQAndLevel, smoothSpectrumFast, smoothSpectrumGaussianBins, } from "./resonate_mode_detection.js?rev=287f3b1752f9";
import { computeSeverity, estimateQFromDb, noteAndCentsFromFreq, wolfRiskFromSeverity, } from "./resonate_mode_metrics.js?rev=287f3b1752f9";
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
