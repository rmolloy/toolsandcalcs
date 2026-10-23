import { DEFAULT_Q_AGGREGATION } from "./resonate_q_aggregation.js?rev=77822e68554b";
export function qSettingsResolve(state) {
    return {
        method: state.qSettings?.method === "decay" ? "decay" : "spectral",
        aggregation: qAggregationResolve(state.qSettings?.aggregation),
    };
}
function qAggregationResolve(value) {
    if (value === "median" || value === "max" || value === "p75")
        return value;
    return DEFAULT_Q_AGGREGATION;
}
