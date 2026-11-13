import { DEFAULT_Q_AGGREGATION } from "./resonate_q_aggregation.js?rev=a5f15a6afb2b";
export function qSettingsResolve(state) {
    return {
        method: state.qSettings?.method === "spectral" ? "spectral" : "decay",
        aggregation: qAggregationResolve(state.qSettings?.aggregation),
    };
}
function qAggregationResolve(value) {
    if (value === "median" || value === "max" || value === "p75")
        return value;
    return DEFAULT_Q_AGGREGATION;
}
