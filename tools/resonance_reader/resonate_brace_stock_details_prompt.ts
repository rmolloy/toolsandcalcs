import type { BraceStockMeasurements } from "./resonate_brace_stock_material.js";
import { braceStockEstimateResolveFromState } from "./resonate_brace_stock_estimate.js";

export type BraceStockDetailsPromptResult = {
  measurements: BraceStockMeasurements;
};

const BRACE_STOCK_FIELDS: Array<{
  key: keyof BraceStockMeasurements;
  label: string;
  unit: string;
}> = [
  { key: "stockLengthMm", label: "Length", unit: "mm" },
  { key: "stockWidthMm", label: "Width", unit: "mm" },
  { key: "stockHeightMm", label: "Height", unit: "mm" },
  { key: "stockMassG", label: "Mass", unit: "g" },
];

export function braceStockDetailsPromptOpen(
  state: Record<string, any>,
): Promise<BraceStockDetailsPromptResult | null> {
  return new Promise((resolve) => {
    const modal = braceStockDetailsPromptElementBuild(state);
    const closeWith = (result: BraceStockDetailsPromptResult | null) => {
      modal.remove();
      resolve(result);
    };
    document.body.appendChild(modal);
    braceStockDetailsPromptBindingsAttach(modal, closeWith);
    modal.querySelector<HTMLInputElement>("input")?.focus();
  });
}

function braceStockDetailsPromptElementBuild(state: Record<string, any>) {
  const estimate = braceStockEstimateResolveFromState(state);
  const modal = document.createElement("div");
  modal.className = "save-modal plate-transfer-modal brace-stock-details-modal";
  modal.innerHTML = `
    <div class="save-modal__backdrop" data-brace-stock-details-close></div>
    <div class="save-modal__panel plate-transfer-modal__panel" role="dialog" aria-modal="true" aria-label="Brace stock details">
      <header>
        <div>
          <h2>Brace stock details</h2>
          <p class="muted small">Free-free stock characterization. These are specimen dimensions, not finished brace dimensions.</p>
        </div>
        <button type="button" class="ghost-btn btn-small" data-brace-stock-details-close>Close</button>
      </header>
      <form class="save-modal__form">
        <section class="save-modal__section">
          <h3>Measurements</h3>
          <div class="plate-transfer-grid">
            ${BRACE_STOCK_FIELDS.map((field) => braceStockDetailsFieldMarkupBuild(field, state.braceStockMeasurements?.[field.key])).join("")}
          </div>
        </section>
        ${braceStockDetailsEvidenceMarkupBuild(estimate)}
        <footer class="save-modal__footer plate-transfer-modal__footer">
          <button type="button" class="ghost-btn" data-brace-stock-details-close>Cancel</button>
          <button type="submit" class="primary-btn">Save measurements</button>
        </footer>
      </form>
    </div>
  `;
  return modal;
}

function braceStockDetailsFieldMarkupBuild(
  field: typeof BRACE_STOCK_FIELDS[number],
  value: unknown,
) {
  return `
    <label class="plate-material-field plate-transfer-field">
      <span class="plate-material-label">${field.label}</span>
      <input class="plate-material-input" name="${field.key}" type="number" inputmode="decimal" min="0.1" step="0.1" value="${braceStockDetailsNumberFormat(value)}">
      <span class="plate-material-unit">${field.unit}</span>
    </label>
  `;
}

function braceStockDetailsEvidenceMarkupBuild(
  estimate: ReturnType<typeof braceStockEstimateResolveFromState>,
) {
  if (estimate.status !== "ready") {
    return `
      <section class="save-modal__section">
        <h3>Long mode</h3>
        <p class="muted small">Save the measurements, then confirm the selected Peak/Q candidate as Long.</p>
      </section>
    `;
  }
  const material = estimate.material;
  return `
    <section class="save-modal__section">
      <h3>Confirmed Long evidence</h3>
      <div class="brace-stock-details-results">
        ${braceStockDetailsResultMarkupBuild("Long", `${estimate.confirmation.frequencyHz.toFixed(1)} Hz`)}
        ${braceStockDetailsResultMarkupBuild("Density", `${Math.round(material.densityKgM3)} kg/m³`)}
        ${braceStockDetailsResultMarkupBuild("Section I", `${material.sectionMomentOfInertiaM4.toExponential(3)} m⁴`)}
        ${braceStockDetailsResultMarkupBuild("EI", `${material.flexuralRigidityNm2.toFixed(3)} N·m²`)}
        ${braceStockDetailsResultMarkupBuild("E", `${material.dynamicYoungsModulusGPa.toFixed(2)} GPa`)}
        ${braceStockDetailsResultMarkupBuild("Sound speed", `${Math.round(material.longitudinalSoundSpeedMps).toLocaleString()} m/s`)}
      </div>
    </section>
  `;
}

function braceStockDetailsResultMarkupBuild(label: string, value: string) {
  return `<div><span class="muted small">${label}</span><strong>${value}</strong></div>`;
}

function braceStockDetailsPromptBindingsAttach(
  modal: HTMLElement,
  closeWith: (result: BraceStockDetailsPromptResult | null) => void,
) {
  modal.querySelectorAll<HTMLElement>("[data-brace-stock-details-close]").forEach((element) => {
    element.addEventListener("click", () => closeWith(null));
  });
  modal.querySelector("form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    closeWith({ measurements: braceStockDetailsMeasurementsRead(modal) });
  });
}

function braceStockDetailsMeasurementsRead(modal: HTMLElement): BraceStockMeasurements {
  return {
    stockLengthMm: braceStockDetailsNumberRead(modal, "stockLengthMm"),
    stockWidthMm: braceStockDetailsNumberRead(modal, "stockWidthMm"),
    stockHeightMm: braceStockDetailsNumberRead(modal, "stockHeightMm"),
    stockMassG: braceStockDetailsNumberRead(modal, "stockMassG"),
  };
}

function braceStockDetailsNumberRead(modal: HTMLElement, name: keyof BraceStockMeasurements) {
  const input = modal.querySelector<HTMLInputElement>(`input[name="${name}"]`);
  const value = Number.parseFloat(input?.value || "");
  return Number.isFinite(value) && value > 0 ? value : Number.NaN;
}

function braceStockDetailsNumberFormat(value: unknown) {
  if (!Number.isFinite(value)) return "";
  return String(value);
}
