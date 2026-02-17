function pipelineBusEventEmit(
  eventType: string,
  payload: Record<string, unknown>,
  stageId?: string,
) {
  const bus = (window as any).ResonatePipelineBus;
  if (typeof bus?.emit !== "function") return false;
  void bus.emit(eventType, { ...payload, stageId });
  return true;
}

export function emitArtifactEventFromState(state: Record<string, any>) {
  const renderEvents = (window as any).ResonateRenderEvents;
  if (!renderEvents?.renderPayloadBuildFromState) return false;
  if (!renderEvents?.RESONATE_RENDER_EVENT_FLAG?.defaultValue) return false;
  const renderPayload = renderEvents.renderPayloadBuildFromState(state);
  if (!renderPayload) return false;
  const spectrum = state.lastSpectrum || null;
  const secondarySpectrum = state.lastSpectrumNoteSelection || null;
  if (spectrum?.freqs && spectrum?.mags) {
    const freqs = Array.from(spectrum.freqs as ArrayLike<number>);
    const mags = Array.from(spectrum.mags as ArrayLike<number>);
    const dbs = Array.isArray(spectrum.dbs) ? Array.from(spectrum.dbs as ArrayLike<number>) : null;
    const secondary = secondarySpectrum?.freqs && secondarySpectrum?.mags
      ? {
          freqs: Array.from(secondarySpectrum.freqs as ArrayLike<number>),
          mags: Array.from(secondarySpectrum.mags as ArrayLike<number>),
        }
      : null;
    pipelineBusEventEmit("spectrum.ready", { spectrum: { freqs, mags, dbs }, secondarySpectrum: secondary }, "spectrum");
  }
  const modes = Array.isArray(state.lastModesDetected) ? state.lastModesDetected : null;
  const cards = Array.isArray(state.lastModeCards) ? state.lastModeCards : null;
  if (modes || cards) {
    pipelineBusEventEmit("modes.ready", { modes: modes || [], cards: cards || [] }, "modes");
  }
  return pipelineBusEventEmit("artifact.emitted", { renderPayload }, "render");
}
