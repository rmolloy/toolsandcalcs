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

const MODE_ROWS: Array<{ key: keyof DofSaveSummaryPeaks; label: string }> = [
  { key: "air", label: "Air T(1,1)₁" },
  { key: "top", label: "Top T(1,1)₂" },
  { key: "back", label: "Back T(1,1)₃" },
];

export function dofSaveSummaryBuild(args: {
  peaks?: DofSaveSummaryPeaks | null;
  modelOrder?: number;
  taskMode?: string;
}): DofSaveSummaryRow[] {
  return [modelRow(args.modelOrder, args.taskMode), ...peakRows(args.peaks)];
}

function modelRow(modelOrder: unknown, taskMode: unknown): DofSaveSummaryRow {
  const order = Number.isFinite(Number(modelOrder)) && Number(modelOrder) > 0 ? Number(modelOrder) : 4;
  return { label: "Model", value: `${order}-DOF${taskModeSuffix(taskMode)}` };
}

function taskModeSuffix(taskMode: unknown): string {
  return String(taskMode || "") === "fit" ? " · fitted to targets" : "";
}

function peakRows(peaks: DofSaveSummaryPeaks | null | undefined): DofSaveSummaryRow[] {
  if (!peaks) return [];
  return MODE_ROWS
    .filter((row) => Number.isFinite(Number(peaks[row.key])) && Number(peaks[row.key]) > 0)
    .map((row) => ({
      label: row.label,
      value: `${Number(peaks[row.key]).toFixed(1)} Hz`,
      provenance: "modeled",
    }));
}
