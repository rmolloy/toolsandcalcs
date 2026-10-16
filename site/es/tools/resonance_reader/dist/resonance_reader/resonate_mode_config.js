import { resolveColorHexFromRole } from "./resonate_color_roles.js?rev=3f87131f64e6";
import { resonanceLocalizedMessages } from "./resonate_localized_messages.js?rev=3f87131f64e6";
const GUITAR_BANDS = {
    air: { low: 75, high: 115 },
    top: { low: 150, high: 205 },
    back: { low: 210, high: 260 },
};
const GUITAR_META = {
    air: {
        label: resonanceLocalizedMessages.modeAirLabel,
        aliasHtml: "T(1,1)<sub>1</sub>",
        aliasText: "T(1,1)₁",
        tooltip: resonanceLocalizedMessages.modeAirTooltip,
        color: resolveColorHexFromRole("airMode"),
    },
    top: {
        label: resonanceLocalizedMessages.modeTopLabel,
        aliasHtml: "T(1,1)<sub>2</sub>",
        aliasText: "T(1,1)₂",
        tooltip: resonanceLocalizedMessages.modeTopTooltip,
        color: resolveColorHexFromRole("topMode"),
    },
    back: {
        label: resonanceLocalizedMessages.modeBackLabel,
        aliasHtml: "T(1,1)<sub>3</sub>",
        aliasText: "T(1,1)₃",
        tooltip: resonanceLocalizedMessages.modeBackTooltip,
        color: resolveColorHexFromRole("backMode"),
    },
};
const PLATE_STOCK_BANDS = {
    long: { low: 65, high: 100 },
    cross: { low: 110, high: 140 },
    transverse: { low: 24, high: 55 },
};
const PLATE_STOCK_META = {
    long: {
        label: resonanceLocalizedMessages.modeLongLabel,
        aliasHtml: "L",
        aliasText: "L",
        tooltip: resonanceLocalizedMessages.modePlateLongTooltip,
        color: resolveColorHexFromRole("plateLongMode"),
    },
    cross: {
        label: resonanceLocalizedMessages.modeCrossLabel,
        aliasHtml: "C",
        aliasText: "C",
        tooltip: resonanceLocalizedMessages.modeCrossTooltip,
        color: resolveColorHexFromRole("plateCrossMode"),
    },
    transverse: {
        label: resonanceLocalizedMessages.modeTransverseLabel,
        aliasHtml: "T",
        aliasText: "T",
        tooltip: resonanceLocalizedMessages.modeTransverseTooltip,
        color: resolveColorHexFromRole("plateTransverseMode"),
    },
};
const BRACE_STOCK_BANDS = {
    long: { low: 100, high: 500 },
};
const BRACE_STOCK_META = {
    long: {
        label: resonanceLocalizedMessages.modeLongLabel,
        aliasHtml: "L",
        aliasText: "L",
        tooltip: resonanceLocalizedMessages.modeBraceLongTooltip,
        color: resolveColorHexFromRole("plateLongMode"),
    },
};
const MODE_PROFILES = {
    guitar: { bands: GUITAR_BANDS, meta: GUITAR_META },
    played_note: { bands: GUITAR_BANDS, meta: GUITAR_META },
    peak_analysis: { bands: GUITAR_BANDS, meta: GUITAR_META },
    plate_stock: { bands: PLATE_STOCK_BANDS, meta: PLATE_STOCK_META },
    brace_stock: { bands: BRACE_STOCK_BANDS, meta: BRACE_STOCK_META },
};
export const modeBands = GUITAR_BANDS;
export const MODE_META = GUITAR_META;
export function measureModeNormalize(input) {
    if (input === "played_note")
        return "played_note";
    if (input === "peak_analysis")
        return "peak_analysis";
    if (input === "plate_stock" || input === "top")
        return "plate_stock";
    if (input === "back")
        return "brace_stock";
    if (input === "brace_stock")
        return "brace_stock";
    return "guitar";
}
export function modeProfileResolveFromMeasureMode(measureMode) {
    return MODE_PROFILES[measureModeNormalize(measureMode)];
}
export function peakAnalysisSourceMeasureModeResolve(state) {
    const measureMode = measureModeNormalize(state?.measureMode);
    if (measureMode !== "peak_analysis")
        return measureMode;
    const sourceMode = measureModeNormalize(state?.peakAnalysisSourceMeasureMode);
    return sourceMode === "peak_analysis" ? "guitar" : sourceMode;
}
export function measureModeLabelBuild(measureMode) {
    const normalized = measureModeNormalize(measureMode);
    if (normalized === "played_note")
        return resonanceLocalizedMessages.measureModePlayedNote;
    if (normalized === "peak_analysis")
        return resonanceLocalizedMessages.measureModePeakAnalysis;
    if (normalized === "plate_stock")
        return resonanceLocalizedMessages.measureModePlateStock;
    if (normalized === "brace_stock")
        return resonanceLocalizedMessages.measureModeBraceStock;
    return resonanceLocalizedMessages.measureModeGuitar;
}
export function modeProfileResolveFromState(state) {
    return modeProfileResolveFromMeasureMode(peakAnalysisSourceMeasureModeResolve(state));
}
