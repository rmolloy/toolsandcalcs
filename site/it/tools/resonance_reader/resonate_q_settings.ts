import { DEFAULT_Q_AGGREGATION, type QAggregation } from "./resonate_q_aggregation.js";

export type QSettings = { method: "spectral" | "decay"; aggregation: QAggregation };

export function qSettingsResolve(state: Record<string, any>): QSettings {
  return {
    method: state.qSettings?.method === "decay" ? "decay" : "spectral",
    aggregation: qAggregationResolve(state.qSettings?.aggregation),
  };
}

function qAggregationResolve(value: unknown): QAggregation {
  if (value === "median" || value === "max" || value === "p75") return value;
  return DEFAULT_Q_AGGREGATION;
}
