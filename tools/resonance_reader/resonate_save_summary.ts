import { measureModeLabelBuild } from "./resonate_mode_config.js";

export type ResonanceSaveSummaryRow = {
  label: string;
  value: string;
  provenance?: string;
};

const SUMMARY_MODE_ROW_LIMIT = 6;

export function resonanceSaveSummaryBuild(
  state: Record<string, any>,
  recordingLabel: string,
): ResonanceSaveSummaryRow[] {
  return [
    ...contextRowsBuild(state, recordingLabel),
    ...modeRowsBuild(state),
  ];
}

function contextRowsBuild(state: Record<string, any>, recordingLabel: string): ResonanceSaveSummaryRow[] {
  const rows: ResonanceSaveSummaryRow[] = [];
  const recording = String(recordingLabel || "").trim();
  if (recording) rows.push({ label: "Recording", value: recording });
  rows.push({ label: "Measuring", value: measureModeLabelBuild(state?.measureMode) });
  return rows;
}

function modeRowsBuild(state: Record<string, any>): ResonanceSaveSummaryRow[] {
  const cards = Array.isArray(state?.lastModeCards) ? state.lastModeCards : [];
  return cards
    .filter(cardHasFrequency)
    .slice(0, SUMMARY_MODE_ROW_LIMIT)
    .map(modeRowBuild);
}

function cardHasFrequency(card: any): boolean {
  return Number.isFinite(Number(card?.freq)) && Number(card.freq) > 0;
}

function modeRowBuild(card: any): ResonanceSaveSummaryRow {
  return {
    label: String(card.label || card.key || "Mode"),
    value: modeValueFormat(card),
    provenance: "measured",
  };
}

function modeValueFormat(card: any): string {
  const frequency = `${Number(card.freq).toFixed(1)} Hz`;
  const note = String(card.note || "").trim();
  if (!note) return frequency;
  return `${frequency} · ${note}${centsSuffixFormat(card.cents)}`;
}

function centsSuffixFormat(cents: unknown): string {
  const value = Number(cents);
  if (!Number.isFinite(value)) return "";
  return ` ${value >= 0 ? "+" : ""}${Math.round(value)}¢`;
}
