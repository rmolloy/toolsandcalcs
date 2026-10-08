import { measureModeLabelBuild } from "./resonate_mode_config.js";
const SUMMARY_MODE_ROW_LIMIT = 6;
export function resonanceSaveSummaryBuild(state, recordingLabel) {
    return [
        ...contextRowsBuild(state, recordingLabel),
        ...modeRowsBuild(state),
    ];
}
function contextRowsBuild(state, recordingLabel) {
    const rows = [];
    const recording = String(recordingLabel || "").trim();
    if (recording)
        rows.push({ label: "Recording", value: recording });
    rows.push({ label: "Measuring", value: measureModeLabelBuild(state?.measureMode) });
    return rows;
}
function modeRowsBuild(state) {
    const cards = Array.isArray(state?.lastModeCards) ? state.lastModeCards : [];
    return cards
        .filter(cardHasFrequency)
        .slice(0, SUMMARY_MODE_ROW_LIMIT)
        .map(modeRowBuild);
}
function cardHasFrequency(card) {
    return Number.isFinite(Number(card?.freq)) && Number(card.freq) > 0;
}
function modeRowBuild(card) {
    return {
        label: String(card.label || card.key || "Mode"),
        value: modeValueFormat(card),
        provenance: "measured",
    };
}
function modeValueFormat(card) {
    const frequency = `${Number(card.freq).toFixed(1)} Hz`;
    const note = String(card.note || "").trim();
    if (!note)
        return frequency;
    return `${frequency} · ${note}${centsSuffixFormat(card.cents)}`;
}
function centsSuffixFormat(cents) {
    const value = Number(cents);
    if (!Number.isFinite(value))
        return "";
    return ` ${value >= 0 ? "+" : ""}${Math.round(value)}¢`;
}
