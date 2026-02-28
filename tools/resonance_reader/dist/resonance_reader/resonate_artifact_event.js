export const RESONATE_ARTIFACT_EVENT_FLAG = {
    name: "resonate_artifact_event",
    owner: "resonate",
    defaultValue: true,
    rolloutMode: "on",
    removalCondition: "after parity is proven",
    removalTask: "remove artifact event flag once event is default",
};
export function artifactSummaryBuildFromState(state) {
    const spectrum = state?.lastSpectrum;
    const freqs = Array.isArray(spectrum?.freqs) ? spectrum.freqs : [];
    const modeCards = Array.isArray(state?.lastModeCards) ? state?.lastModeCards : [];
    return {
        spectrumPoints: freqs.length,
        modeCount: modeCards.length,
        hasSpectrum: freqs.length > 0,
    };
}
if (typeof window !== "undefined") {
    window.ResonateArtifactEvent = {
        RESONATE_ARTIFACT_EVENT_FLAG,
        artifactSummaryBuildFromState,
    };
}
