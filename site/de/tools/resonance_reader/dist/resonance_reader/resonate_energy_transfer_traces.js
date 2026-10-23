import { resolveColorRgbaFromRole } from "./resonate_color_roles.js?rev=77822e68554b";
import { resonanceSpectrumLineWidthResolve } from "./resonate_debug_flags.js?rev=77822e68554b";
import { resonanceLocalizedMessages } from "./resonate_localized_messages.js?rev=77822e68554b";
const ENERGY_COLORS = {
    fundamental: resolveColorRgbaFromRole("stringFundamental", 0.9),
    secondPartial: resolveColorRgbaFromRole("secondPartial", 0.9),
    thirdPartial: resolveColorRgbaFromRole("thirdPartial", 0.9),
    thirdPartialFill: resolveColorRgbaFromRole("thirdPartial", 0.3),
};
const ENERGY_NOTE_TRACE_LINE_WIDTH = 1;
export function energyTracesBuildFromSeries(series, hoverDescriptors) {
    const elapsedTimes = energyElapsedTimesBuildFromSeries(series);
    const fundamentalHoverData = hoverDescriptors.map((entry) => (hoverPointBuildFromFrequency(entry.f0Hz, entry.noteOverrideLabel)));
    const secondPartialHoverData = hoverDescriptors.map((entry) => (hoverPointBuildFromFrequency(entry.f0Hz * 2)));
    const thirdPartialHoverData = hoverDescriptors.map((entry) => (hoverPointBuildFromFrequency(entry.f0Hz * 3)));
    const noteTraceWidth = energyNoteTraceLineWidthResolve();
    const traces = [
        {
            x: elapsedTimes,
            y: applyLevelScale(series.partialShares.f0 || [], series.levelScale),
            type: "scatter",
            mode: "lines",
            name: resonanceLocalizedMessages.energyTransferFundamentalTrace,
            line: { color: ENERGY_COLORS.fundamental, width: noteTraceWidth, dash: "solid" },
            fill: "tozeroy",
            fillcolor: resolveColorRgbaFromRole("stringFundamental", 0.25),
            customdata: fundamentalHoverData,
            hovertemplate: hoverTemplateBuildFromCustomData(),
            hoverlabel: hoverLabelStyleBuild(),
        },
        {
            x: elapsedTimes,
            y: applyLevelScale(series.partialShares.secondPartial || [], series.levelScale),
            type: "scatter",
            mode: "lines",
            name: resonanceLocalizedMessages.energyTransferSecondPartialTrace,
            line: { color: ENERGY_COLORS.secondPartial, width: noteTraceWidth, dash: "solid" },
            fill: "none",
            customdata: secondPartialHoverData,
            hovertemplate: hoverTemplateBuildFromCustomData(),
            hoverlabel: hoverLabelStyleBuild(),
        },
        {
            x: elapsedTimes,
            y: applyLevelScale(series.partialShares.thirdPartial || [], series.levelScale),
            type: "scatter",
            mode: "lines",
            name: resonanceLocalizedMessages.energyTransferThirdPartialTrace,
            line: { color: ENERGY_COLORS.thirdPartial, width: noteTraceWidth, dash: "solid" },
            fill: "none",
            fillcolor: ENERGY_COLORS.thirdPartialFill,
            customdata: thirdPartialHoverData,
            hovertemplate: hoverTemplateBuildFromCustomData(),
            hoverlabel: hoverLabelStyleBuild(),
        },
    ];
    series.bodyModes.forEach((mode) => {
        traces.push({
            x: elapsedTimes,
            y: applyLevelScale(series.bodyShares[mode.id] || [], series.levelScale),
            type: "scatter",
            mode: "lines",
            name: resonanceLocalizedMessages.energyTransferBodyTraceTemplate
                .replace("{mode}", mode.label),
            line: { color: mode.color, width: 2, dash: "dash" },
            fill: "none",
            fillcolor: hexToRgba(mode.color, 0.3),
            hovertemplate: hoverTemplateBuild(mode.peakFreq),
            hoverlabel: hoverLabelStyleBuild(),
        });
    });
    return traces;
}
export function energyElapsedTimesBuildFromSeries(series) {
    return series.t.map((timeSec) => (Number.isFinite(timeSec) ? timeSec - series.xWindowSec.start : timeSec));
}
function applyLevelScale(seriesValues, levelScale) {
    return seriesValues.map((value, index) => {
        const scale = Number.isFinite(levelScale[index]) ? levelScale[index] : 0;
        return value * 100 * scale;
    });
}
function hoverPointBuildFromFrequency(frequencyHz, noteOverrideLabel = null) {
    const note = noteLabelResolve(frequencyHz);
    if (noteOverrideLabel) {
        return [frequencyLabelResolve(frequencyHz), noteOverrideLabel, note.deviation, note.cents];
    }
    return [frequencyLabelResolve(frequencyHz), note.note, note.deviation, note.cents];
}
function frequencyLabelResolve(frequencyHz) {
    return `${frequencyHz.toFixed(1)} Hz`;
}
function noteLabelResolve(frequencyHz) {
    const fftUtils = window.FFTUtils;
    const note = fftUtils?.freqToNoteCents?.(frequencyHz);
    if (!note || typeof note.name !== "string") {
        return { note: "—", deviation: "—", cents: "—" };
    }
    const centsNumber = Number.isFinite(note.centsNum) ? note.centsNum : null;
    return {
        note: note.name || "—",
        deviation: note.cents || "—",
        cents: centsNumber === null ? "—" : `${Math.abs(centsNumber)}c`,
    };
}
function hoverTemplateBuild(frequencyHz) {
    const frequency = frequencyLabelResolve(frequencyHz);
    const note = noteLabelResolve(frequencyHz);
    return [
        "<b>%{fullData.name}</b>",
        `${frequency} · ${note.note} ${note.deviation}`,
        `${resonanceLocalizedMessages.energyTransferHoverCentsLabel}: ${note.cents}`,
        "%{x:.2f} s",
        `${resonanceLocalizedMessages.energyTransferHoverAmplitudeLabel}: %{y:.1f}`,
        "<extra></extra>",
    ].join("<br>");
}
function hoverTemplateBuildFromCustomData() {
    return [
        "<b>%{fullData.name}</b>",
        "%{customdata[0]} · %{customdata[1]} %{customdata[2]}",
        `${resonanceLocalizedMessages.energyTransferHoverCentsLabel}: %{customdata[3]}`,
        "%{x:.2f} s",
        `${resonanceLocalizedMessages.energyTransferHoverAmplitudeLabel}: %{y:.1f}`,
        "<extra></extra>",
    ].join("<br>");
}
function hoverLabelStyleBuild() {
    return {
        bgcolor: "rgba(10,14,24,0.9)",
        bordercolor: "rgba(255,255,255,0.18)",
        font: {
            family: "Inter, system-ui, -apple-system, Segoe UI, sans-serif",
            size: 14,
            color: "#eef1ff",
        },
        align: "left",
    };
}
function energyNoteTraceLineWidthResolve() {
    return resonanceSpectrumLineWidthResolve(ENERGY_NOTE_TRACE_LINE_WIDTH);
}
function hexToRgba(hex, alpha) {
    if (!hex || typeof hex !== "string")
        return resolveColorRgbaFromRole("secondPartial", alpha);
    let normalizedHex = hex.trim();
    if (normalizedHex.startsWith("#"))
        normalizedHex = normalizedHex.slice(1);
    if (normalizedHex.length === 3) {
        normalizedHex = normalizedHex.split("").map((character) => character + character).join("");
    }
    if (normalizedHex.length !== 6)
        return resolveColorRgbaFromRole("secondPartial", alpha);
    const red = parseInt(normalizedHex.slice(0, 2), 16);
    const green = parseInt(normalizedHex.slice(2, 4), 16);
    const blue = parseInt(normalizedHex.slice(4, 6), 16);
    if ([red, green, blue].some((value) => Number.isNaN(value))) {
        return resolveColorRgbaFromRole("secondPartial", alpha);
    }
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}
