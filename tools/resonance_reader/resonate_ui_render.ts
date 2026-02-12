import { renderModes as renderModesBase } from "./resonate_mode_cards.js";
import { renderSpectrum as renderSpectrumBase } from "./resonate_spectrum_render.js";
import type { ModeCard, SpectrumPayload } from "./resonate_types.js";

export function renderModesFromState(modes: ModeCard[], deps: { state: Record<string, any>; modeMeta: Record<string, any> }) {
  renderModesBase(modes, { state: deps.state, modeMeta: deps.modeMeta });
}

export function renderSpectrumFromConfig(
  payload: SpectrumPayload,
  deps: { modeMeta: Record<string, any>; freqMin: number; freqAxisMax: number },
) {
  renderSpectrumBase(payload, { modeMeta: deps.modeMeta, freqMin: deps.freqMin, freqAxisMax: deps.freqAxisMax });
}

export function setStatusText(text: string) {
  const el = document.getElementById("wave_status");
  if (el) el.textContent = text;
}
