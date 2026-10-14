import { renderModes as renderModesBase } from "./resonate_mode_cards.js?rev=88a3838e0e5a";
import { renderSpectrum as renderSpectrumBase } from "./resonate_spectrum_render.js?rev=88a3838e0e5a";
import { renderEnergyTransferFromState as renderEnergyTransferFromStateBase } from "./resonate_energy_transfer.js?rev=88a3838e0e5a";
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
