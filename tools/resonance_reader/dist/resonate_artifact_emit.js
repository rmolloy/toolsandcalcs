function pipelineBusEventEmit(eventType, payload, stageId) {
    const bus = window.ResonatePipelineBus;
    if (typeof bus?.emit !== "function")
        return false;
    void bus.emit(eventType, { ...payload, stageId });
    return true;
}
export function emitArtifactEventFromState(state) {
    const renderEvents = window.ResonateRenderEvents;
    if (!renderEvents?.renderPayloadBuildFromState)
        return false;
    if (!renderEvents?.RESONATE_RENDER_EVENT_FLAG?.defaultValue)
        return false;
    const renderPayload = renderEvents.renderPayloadBuildFromState(state);
    if (!renderPayload)
        return false;
    const spectrum = state.lastSpectrum || null;
    if (spectrum?.freqs && spectrum?.mags) {
        const freqs = Array.from(spectrum.freqs);
        const mags = Array.from(spectrum.mags);
        const dbs = Array.isArray(spectrum.dbs) ? Array.from(spectrum.dbs) : null;
        pipelineBusEventEmit("spectrum.ready", { spectrum: { freqs, mags, dbs } }, "spectrum");
    }
    const modes = Array.isArray(state.lastModesDetected) ? state.lastModesDetected : null;
    const cards = Array.isArray(state.lastModeCards) ? state.lastModeCards : null;
    if (modes || cards) {
        pipelineBusEventEmit("modes.ready", { modes: modes || [], cards: cards || [] }, "modes");
    }
    return pipelineBusEventEmit("artifact.emitted", { renderPayload }, "render");
}
