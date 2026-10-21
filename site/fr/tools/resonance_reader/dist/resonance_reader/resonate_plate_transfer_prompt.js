import { resonanceLocalizedMessages } from "./resonate_localized_messages.js?rev=90c36258c883";
const PLATE_TRANSFER_FIELDS = [
    { key: "panelLengthMm", label: resonanceLocalizedMessages.plateTransferLengthLabel, unit: "mm" },
    { key: "panelWidthMm", label: resonanceLocalizedMessages.plateTransferWidthLabel, unit: "mm" },
    { key: "panelHeightMm", label: resonanceLocalizedMessages.plateTransferThicknessLabel, unit: "mm" },
    { key: "panelMassG", label: resonanceLocalizedMessages.plateTransferMassLabel, unit: "g" },
];
export function plateTransferPromptOpen(defaults, modes = []) {
    return new Promise((resolve) => {
        const modal = plateTransferPromptElementBuild(defaults, modes);
        const closeWith = (result) => {
            modal.remove();
            resolve(result);
        };
        document.body.appendChild(modal);
        plateTransferPromptBindingsAttach(modal, closeWith);
        plateTransferFirstInputFocus(modal);
    });
}
function plateTransferPromptElementBuild(defaults, modes) {
    const modal = document.createElement("div");
    modal.className = "save-modal plate-transfer-modal";
    modal.innerHTML = `
    <div class="save-modal__backdrop" data-plate-transfer-cancel></div>
    <div class="save-modal__panel plate-transfer-modal__panel" role="dialog" aria-modal="true" aria-label="${resonanceLocalizedMessages.plateTransferDialogLabel}">
      <header>
        <h2>${resonanceLocalizedMessages.plateTransferTitle}</h2>
        <button type="button" class="ghost-btn btn-small" data-plate-transfer-cancel>${resonanceLocalizedMessages.plateTransferClose}</button>
      </header>
      <form class="save-modal__form plate-transfer-modal__form">
        <section class="save-modal__section">
          <h3>${resonanceLocalizedMessages.plateTransferModesTitle} <span class="muted">${resonanceLocalizedMessages.plateTransferFromMeasurement}</span></h3>
          <div class="plate-transfer-mode-list">
            ${modes.map(plateTransferModeMarkupBuild).join("")}
          </div>
        </section>
        <section class="save-modal__section">
          <h3>${resonanceLocalizedMessages.plateTransferAdditionalMeasurementsTitle} <span class="muted">${resonanceLocalizedMessages.plateTransferOptional}</span></h3>
          <div class="plate-transfer-grid">
            ${PLATE_TRANSFER_FIELDS.map((field) => plateTransferFieldMarkupBuild(field, defaults[field.key])).join("")}
          </div>
        </section>
        <footer class="save-modal__footer plate-transfer-modal__footer">
          <button type="button" class="ghost-btn" data-plate-transfer-skip>${resonanceLocalizedMessages.plateTransferSkip}</button>
          <button type="submit" class="primary-btn">${resonanceLocalizedMessages.plateTransferContinue}</button>
        </footer>
      </form>
    </div>
  `;
    return modal;
}
function plateTransferModeMarkupBuild(mode) {
    return `
    <div class="plate-transfer-mode-row" data-plate-transfer-mode="${mode.key}">
      <span>${mode.label}</span>
      <strong>${plateTransferFrequencyFormat(mode.frequencyHz)}</strong>
      <span class="plate-transfer-mode-status" aria-hidden="true">${Number.isFinite(mode.frequencyHz) ? "✓" : "–"}</span>
    </div>
  `;
}
function plateTransferFieldMarkupBuild(field, value) {
    return `
    <label class="plate-material-field plate-transfer-field">
      <span class="plate-material-label">${field.label}</span>
      <input class="plate-material-input" name="${field.key}" type="number" inputmode="decimal" min="0.1" step="0.1" value="${plateTransferNumberFormat(value)}">
      <span class="plate-material-unit">${field.unit}</span>
    </label>
  `;
}
function plateTransferPromptBindingsAttach(modal, closeWith) {
    modal.querySelectorAll("[data-plate-transfer-cancel]").forEach((element) => {
        element.addEventListener("click", () => closeWith(null));
    });
    modal.querySelector("[data-plate-transfer-skip]")?.addEventListener("click", () => {
        closeWith({ action: "skip" });
    });
    modal.querySelector("form")?.addEventListener("submit", (event) => {
        event.preventDefault();
        closeWith({ action: "continue", measurements: plateTransferMeasurementsRead(modal) });
    });
}
function plateTransferMeasurementsRead(modal) {
    return {
        panelLengthMm: plateTransferNumberRead(modal, "panelLengthMm"),
        panelWidthMm: plateTransferNumberRead(modal, "panelWidthMm"),
        panelHeightMm: plateTransferNumberRead(modal, "panelHeightMm"),
        panelMassG: plateTransferNumberRead(modal, "panelMassG"),
    };
}
function plateTransferNumberRead(modal, name) {
    const input = modal.querySelector(`input[name="${name}"]`);
    const value = Number.parseFloat(input?.value || "");
    return Number.isFinite(value) && value > 0 ? value : Number.NaN;
}
function plateTransferFirstInputFocus(modal) {
    modal.querySelector("input")?.focus();
}
function plateTransferNumberFormat(value) {
    if (!Number.isFinite(value))
        return "";
    const fixed = value.toFixed(2);
    return fixed.replace(/\.?0+$/, "");
}
function plateTransferFrequencyFormat(value) {
    if (!Number.isFinite(value))
        return resonanceLocalizedMessages.plateTransferNotDetected;
    return `${value.toFixed(1)} Hz`;
}
