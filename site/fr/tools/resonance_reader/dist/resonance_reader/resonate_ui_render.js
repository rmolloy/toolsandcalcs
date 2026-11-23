import { renderModes as renderModesBase } from "./resonate_mode_cards.js?rev=dae658f6289e";
import { renderSpectrum as renderSpectrumBase } from "./resonate_spectrum_render.js?rev=dae658f6289e";
import { renderEnergyTransferFromState as renderEnergyTransferFromStateBase } from "./resonate_energy_transfer.js?rev=dae658f6289e";
export function renderModesFromState(modes, deps) {
    renderModesBase(modes, { state: deps.state, modeMeta: deps.modeMeta });
}
export function renderSpectrumFromConfig(payload, deps) {
    renderSpectrumBase(payload, { modeMeta: deps.modeMeta, freqMin: deps.freqMin, freqAxisMax: deps.freqAxisMax });
}
export function setStatusText(text) {
    const el = document.getElementById("wave_status");
    if (el)
        el.textContent = text;
}
export function renderEnergyTransferFromState(state) {
    renderEnergyTransferFromStateBase(state);
}
