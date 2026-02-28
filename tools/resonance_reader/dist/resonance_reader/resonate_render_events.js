export const RESONATE_RENDER_EVENT_FLAG = {
    name: "resonate_render_from_events",
    owner: "resonate",
    defaultValue: true,
    rolloutMode: "on",
    removalCondition: "after parity is proven",
    removalTask: "remove render-from-events flag once event rendering is default",
};
export function renderPayloadBuildFromState(state) {
    if (!state?.lastSpectrum)
        return null;
    const freqs = Array.isArray(state.lastSpectrum.freqs) ? state.lastSpectrum.freqs : [];
    const mags = Array.isArray(state.lastSpectrum.dbs)
        ? state.lastSpectrum.dbs
        : Array.isArray(state.lastSpectrum.mags)
            ? state.lastSpectrum.mags
            : [];
    const overlay = Array.isArray(state.lastOverlay) ? state.lastOverlay : null;
    const modes = Array.isArray(state.lastModesDetected) ? state.lastModesDetected : [];
    const cards = Array.isArray(state.lastModeCards) ? state.lastModeCards : [];
    if (!freqs.length || !mags.length)
        return null;
    return { freqs, mags, overlay, modes, cards };
}
export function renderPayloadBuildFromEvent(event) {
    if (!event || event.eventType !== "artifact.emitted")
        return null;
    return event.payload?.renderPayload || null;
}
if (typeof window !== "undefined") {
    window.ResonateRenderEvents = {
        RESONATE_RENDER_EVENT_FLAG,
        renderPayloadBuildFromState,
        renderPayloadBuildFromEvent,
    };
}
