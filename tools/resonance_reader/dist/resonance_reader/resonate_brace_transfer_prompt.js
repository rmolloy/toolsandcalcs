const BRACE_TRANSFER_FIELDS = [
    { key: "stockLengthMm", label: "Length", unit: "mm" },
    { key: "stockWidthMm", label: "Width", unit: "mm" },
    { key: "stockHeightMm", label: "Height", unit: "mm" },
    { key: "stockMassG", label: "Mass", unit: "g" },
];
export function braceTransferPromptOpen(modes = []) {
    return new Promise((resolve) => {
        const modal = braceTransferPromptElementBuild(modes);
        const closeWith = (result) => {
            modal.remove();
            resolve(result);
        };
        document.body.appendChild(modal);
        braceTransferPromptBindingsAttach(modal, closeWith);
        braceTransferFirstInputFocus(modal);
    });
}
function braceTransferPromptElementBuild(modes) {
    const modal = document.createElement("div");
    modal.className = "save-modal plate-transfer-modal brace-transfer-modal";
    modal.innerHTML = `
    <div class="save-modal__backdrop" data-brace-transfer-cancel></div>
    <div class="save-modal__panel plate-transfer-modal__panel" role="dialog" aria-modal="true" aria-label="Prepare transfer to Brace Calculator">
      <header>
        <h2>Prepare Transfer -> Brace Calculator</h2>
        <button type="button" class="ghost-btn btn-small" data-brace-transfer-cancel>Close</button>
      </header>
      <form class="save-modal__form plate-transfer-modal__form">
        <section class="save-modal__section">
          <h3>Modes <span class="muted">(from measurement)</span></h3>
          <div class="plate-transfer-mode-list">
            ${modes.map(braceTransferModeMarkupBuild).join("")}
          </div>
        </section>
        <section class="save-modal__section">
          <h3>Additional Measurements <span class="muted">(optional)</span></h3>
          <div class="plate-transfer-grid">
            ${BRACE_TRANSFER_FIELDS.map(braceTransferFieldMarkupBuild).join("")}
          </div>
        </section>
        <footer class="save-modal__footer plate-transfer-modal__footer">
          <button type="button" class="ghost-btn" data-brace-transfer-skip>Skip for now</button>
          <button type="submit" class="primary-btn">Continue to Brace Calculator</button>
        </footer>
      </form>
    </div>
  `;
    return modal;
}
function braceTransferModeMarkupBuild(mode) {
    return `
    <div class="plate-transfer-mode-row" data-brace-transfer-mode="${mode.key}">
      <span>${mode.label}</span>
      <strong>${braceTransferFrequencyFormat(mode.frequencyHz)}</strong>
      <span class="plate-transfer-mode-status" aria-hidden="true">${Number.isFinite(mode.frequencyHz) ? "✓" : "–"}</span>
    </div>
  `;
}
function braceTransferFieldMarkupBuild(field) {
    return `
    <label class="plate-material-field plate-transfer-field">
      <span class="plate-material-label">${field.label}</span>
      <input class="plate-material-input" name="${field.key}" type="number" inputmode="decimal" min="0.1" step="0.1">
      <span class="plate-material-unit">${field.unit}</span>
    </label>
  `;
}
function braceTransferPromptBindingsAttach(modal, closeWith) {
    modal.querySelectorAll("[data-brace-transfer-cancel]").forEach((element) => {
        element.addEventListener("click", () => closeWith(null));
    });
    modal.querySelector("[data-brace-transfer-skip]")?.addEventListener("click", () => {
        closeWith({ action: "skip" });
    });
    modal.querySelector("form")?.addEventListener("submit", (event) => {
        event.preventDefault();
        closeWith({ action: "continue", measurements: braceTransferMeasurementsRead(modal) });
    });
}
function braceTransferMeasurementsRead(modal) {
    return {
        stockLengthMm: braceTransferNumberRead(modal, "stockLengthMm"),
        stockWidthMm: braceTransferNumberRead(modal, "stockWidthMm"),
        stockHeightMm: braceTransferNumberRead(modal, "stockHeightMm"),
        stockMassG: braceTransferNumberRead(modal, "stockMassG"),
    };
}
function braceTransferNumberRead(modal, name) {
    const input = modal.querySelector(`input[name="${name}"]`);
    const value = Number.parseFloat(input?.value || "");
    return Number.isFinite(value) && value > 0 ? value : Number.NaN;
}
function braceTransferFirstInputFocus(modal) {
    modal.querySelector("input")?.focus();
}
function braceTransferFrequencyFormat(value) {
    if (!Number.isFinite(value))
        return "Not detected";
    return `${value.toFixed(1)} Hz`;
}
