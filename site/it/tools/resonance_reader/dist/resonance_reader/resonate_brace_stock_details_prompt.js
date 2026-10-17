import { braceStockEstimateResolveFromState } from "./resonate_brace_stock_estimate.js?rev=de0830708801";
import { resonanceLocalizedMessages } from "./resonate_localized_messages.js?rev=de0830708801";
const BRACE_STOCK_FIELDS = [
    { key: "stockLengthMm", label: resonanceLocalizedMessages.braceStockDetailsLengthLabel, unit: "mm" },
    { key: "stockWidthMm", label: resonanceLocalizedMessages.braceStockDetailsWidthLabel, unit: "mm" },
    { key: "stockHeightMm", label: resonanceLocalizedMessages.braceStockDetailsHeightLabel, unit: "mm" },
    { key: "stockMassG", label: resonanceLocalizedMessages.braceStockDetailsMassLabel, unit: "g" },
];
export function braceStockDetailsPromptOpen(state) {
    return new Promise((resolve) => {
        const modal = braceStockDetailsPromptElementBuild(state);
        const closeWith = (result) => {
            modal.remove();
            resolve(result);
        };
        document.body.appendChild(modal);
        braceStockDetailsPromptBindingsAttach(modal, closeWith);
        modal.querySelector("input")?.focus();
    });
}
function braceStockDetailsPromptElementBuild(state) {
    const estimate = braceStockEstimateResolveFromState(state);
    const modal = document.createElement("div");
    modal.className = "save-modal plate-transfer-modal brace-stock-details-modal";
    modal.innerHTML = `
    <div class="save-modal__backdrop" data-brace-stock-details-close></div>
    <div class="save-modal__panel plate-transfer-modal__panel" role="dialog" aria-modal="true" aria-label="${resonanceLocalizedMessages.braceStockDetailsDialogLabel}">
      <header>
        <div>
          <h2>${resonanceLocalizedMessages.braceStockDetailsTitle}</h2>
          <p class="muted small">${resonanceLocalizedMessages.braceStockDetailsIntroduction}</p>
        </div>
        <button type="button" class="ghost-btn btn-small" data-brace-stock-details-close>${resonanceLocalizedMessages.braceStockDetailsClose}</button>
      </header>
      <form class="save-modal__form">
        <section class="save-modal__section">
          <h3>${resonanceLocalizedMessages.braceStockDetailsMeasurementsTitle}</h3>
          <div class="plate-transfer-grid">
            ${BRACE_STOCK_FIELDS.map((field) => braceStockDetailsFieldMarkupBuild(field, state.braceStockMeasurements?.[field.key])).join("")}
          </div>
        </section>
        ${braceStockDetailsEvidenceMarkupBuild(estimate)}
        <footer class="save-modal__footer plate-transfer-modal__footer">
          <button type="button" class="ghost-btn" data-brace-stock-details-close>${resonanceLocalizedMessages.braceStockDetailsCancel}</button>
          <button type="submit" class="primary-btn">${resonanceLocalizedMessages.braceStockDetailsSave}</button>
        </footer>
      </form>
    </div>
  `;
    return modal;
}
function braceStockDetailsFieldMarkupBuild(field, value) {
    return `
    <label class="plate-material-field plate-transfer-field">
      <span class="plate-material-label">${field.label}</span>
      <input class="plate-material-input" name="${field.key}" type="number" inputmode="decimal" min="0.1" step="0.1" value="${braceStockDetailsNumberFormat(value)}">
      <span class="plate-material-unit">${field.unit}</span>
    </label>
  `;
}
function braceStockDetailsEvidenceMarkupBuild(estimate) {
    if (estimate.status !== "ready") {
        return `
      <section class="save-modal__section">
        <h3>${resonanceLocalizedMessages.braceStockDetailsLongModeTitle}</h3>
        <p class="muted small">${resonanceLocalizedMessages.braceStockDetailsInstructions}</p>
      </section>
    `;
    }
    const material = estimate.material;
    return `
    <section class="save-modal__section">
      <h3>${resonanceLocalizedMessages.braceStockDetailsConfirmedEvidenceTitle}</h3>
      <div class="brace-stock-details-results">
        ${braceStockDetailsResultMarkupBuild(resonanceLocalizedMessages.modeLongLabel, `${estimate.confirmation.frequencyHz.toFixed(1)} Hz`)}
        ${braceStockDetailsResultMarkupBuild(resonanceLocalizedMessages.braceStockDetailsDensityLabel, `${Math.round(material.densityKgM3)} kg/m³`)}
        ${braceStockDetailsResultMarkupBuild(resonanceLocalizedMessages.braceStockDetailsSectionMomentLabel, `${material.sectionMomentOfInertiaM4.toExponential(3)} m⁴`)}
        ${braceStockDetailsResultMarkupBuild("EI", `${material.flexuralRigidityNm2.toFixed(3)} N·m²`)}
        ${braceStockDetailsResultMarkupBuild("E", `${material.dynamicYoungsModulusGPa.toFixed(2)} GPa`)}
        ${braceStockDetailsResultMarkupBuild(resonanceLocalizedMessages.braceStockDetailsSoundSpeedLabel, `${Math.round(material.longitudinalSoundSpeedMps).toLocaleString()} m/s`)}
      </div>
    </section>
  `;
}
function braceStockDetailsResultMarkupBuild(label, value) {
    return `<div><span class="muted small">${label}</span><strong>${value}</strong></div>`;
}
function braceStockDetailsPromptBindingsAttach(modal, closeWith) {
    modal.querySelectorAll("[data-brace-stock-details-close]").forEach((element) => {
        element.addEventListener("click", () => closeWith(null));
    });
    modal.querySelector("form")?.addEventListener("submit", (event) => {
        event.preventDefault();
        closeWith({ measurements: braceStockDetailsMeasurementsRead(modal) });
    });
}
function braceStockDetailsMeasurementsRead(modal) {
    return {
        stockLengthMm: braceStockDetailsNumberRead(modal, "stockLengthMm"),
        stockWidthMm: braceStockDetailsNumberRead(modal, "stockWidthMm"),
        stockHeightMm: braceStockDetailsNumberRead(modal, "stockHeightMm"),
        stockMassG: braceStockDetailsNumberRead(modal, "stockMassG"),
    };
}
function braceStockDetailsNumberRead(modal, name) {
    const input = modal.querySelector(`input[name="${name}"]`);
    const value = Number.parseFloat(input?.value || "");
    return Number.isFinite(value) && value > 0 ? value : Number.NaN;
}
function braceStockDetailsNumberFormat(value) {
    if (!Number.isFinite(value))
        return "";
    return String(value);
}
