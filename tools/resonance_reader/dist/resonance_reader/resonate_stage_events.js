export const RESONATE_STAGE_EVENT_FLAG = {
    name: "resonate_stage_event",
    owner: "resonate",
    defaultValue: true,
    rolloutMode: "on",
    removalCondition: "after parity is proven",
    removalTask: "remove stage event flag once stage events are default",
};
export function stageEventSummaryBuildFromState(state) {
    const hasWave = Boolean(state?.currentWave);
    const tapCount = Array.isArray(state?.tapSegments) ? state?.tapSegments.length : 0;
    const freqs = Array.isArray(state?.lastSpectrum?.freqs) ? state?.lastSpectrum?.freqs : [];
    return {
        hasWave,
        tapCount,
        spectrumPoints: freqs.length,
    };
}
if (typeof window !== "undefined") {
    window.ResonateStageEvents = {
        RESONATE_STAGE_EVENT_FLAG,
        stageEventSummaryBuildFromState,
    };
}
