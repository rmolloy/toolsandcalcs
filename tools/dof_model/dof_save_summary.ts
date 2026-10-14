type DofSaveSummaryRow = {
  label: string;
  value: string;
  provenance?: string;
};

type DofSaveSummaryPeaks = {
  air?: number | null;
  top?: number | null;
  back?: number | null;
};

type DofSaveSummaryMessages = {
  airModeLabel?: string;
  backModeLabel?: string;
  fittedModelValueTemplate?: string;
  modelLabel?: string;
  modeledProvenance?: string;
  topModeLabel?: string;
};

const MODE_ROWS: Array<{
  key: keyof DofSaveSummaryPeaks;
  label: string;
  messageKey?: keyof DofSaveSummaryMessages;
}> = [
  { key: "air", label: "Air T(1,1)₁", messageKey: "airModeLabel" },
  { key: "top", label: "Top T(1,1)₂", messageKey: "topModeLabel" },
  { key: "back", label: "Back T(1,1)₃", messageKey: "backModeLabel" },
];

export function dofSaveSummaryBuild(args: {
  peaks?: DofSaveSummaryPeaks | null;
  modelOrder?: number;
  taskMode?: string;
  messages?: DofSaveSummaryMessages;
}): DofSaveSummaryRow[] {
  return [
    modelRow(args.modelOrder, args.taskMode, args.messages),
    ...peakRows(args.peaks, args.messages),
  ];
}

function modelRow(
  modelOrder: unknown,
  taskMode: unknown,
  messages: DofSaveSummaryMessages | undefined,
): DofSaveSummaryRow {
  const order = Number.isFinite(Number(modelOrder)) && Number(modelOrder) > 0 ? Number(modelOrder) : 4;
  return {
    label: messageValueRead(messages?.modelLabel, "Model"),
    value: modelValueRead(order, taskMode, messages),
  };
}

function messageValueRead(candidate: unknown, fallback: string): string {
  return typeof candidate === "string" && candidate.trim() ? candidate : fallback;
}

function modelValueRead(
  order: number,
  taskMode: unknown,
  messages: DofSaveSummaryMessages | undefined,
): string {
  if (String(taskMode || "") !== "fit") return `${order}-DOF`;
  return messageValueRead(
    messages?.fittedModelValueTemplate,
    "{order}-DOF · fitted to targets",
  ).replace("{order}", String(order));
}

function peakRows(
  peaks: DofSaveSummaryPeaks | null | undefined,
  messages: DofSaveSummaryMessages | undefined,
): DofSaveSummaryRow[] {
  if (!peaks) return [];
  return MODE_ROWS
    .filter((row) => Number.isFinite(Number(peaks[row.key])) && Number(peaks[row.key]) > 0)
    .map((row) => ({
      label: peakRowLabelRead(row, messages),
      value: `${Number(peaks[row.key]).toFixed(1)} Hz`,
      provenance: messageValueRead(messages?.modeledProvenance, "modeled"),
    }));
}

function peakRowLabelRead(
  row: (typeof MODE_ROWS)[number],
  messages: DofSaveSummaryMessages | undefined,
): string {
  if (!row.messageKey) return row.label;
  return messageValueRead(messages?.[row.messageKey], row.label);
}
