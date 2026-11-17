import { renderModes as renderModesBase } from "./resonate_mode_cards.js?rev=a9c4c0145336";
import { renderSpectrum as renderSpectrumBase } from "./resonate_spectrum_render.js?rev=a9c4c0145336";
import { renderEnergyTransferFromState as renderEnergyTransferFromStateBase } from "./resonate_energy_transfer.js?rev=a9c4c0145336";
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
