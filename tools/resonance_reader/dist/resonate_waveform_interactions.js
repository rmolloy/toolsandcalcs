export const RESONATE_PLOTLY_WAVE_TOOLS_FLAG = {
    name: "resonate_plotly_wave_tools",
    owner: "resonate",
    defaultValue: false,
    rolloutMode: "off",
    removalCondition: "after parity is proven",
    removalTask: "remove plotly wave tools flag once interaction mode is finalized",
};
export function plotlyWaveToolsEnabledResolve(runtimeValue, fallback = RESONATE_PLOTLY_WAVE_TOOLS_FLAG.defaultValue) {
    if (typeof runtimeValue === "boolean")
        return runtimeValue;
    return fallback;
}
if (typeof window !== "undefined") {
    window.ResonateWaveformInteractions = {
        RESONATE_PLOTLY_WAVE_TOOLS_FLAG,
        plotlyWaveToolsEnabledResolve,
    };
}
