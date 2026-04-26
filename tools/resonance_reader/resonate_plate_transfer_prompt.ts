import type { PlateMaterialMeasurements } from "./resonate_plate_material_panel.js";

export type PlateTransferPromptResult = {
  action: "continue" | "skip";
  measurements?: PlateMaterialMeasurements;
};

export type PlateTransferModeSummary = {
  key: string;
  label: string;
  frequencyHz: number | null;
};

type PlateTransferField = {
  key: keyof PlateMaterialMeasurements;
  label: string;
  unit: string;
};

const PLATE_TRANSFER_FIELDS: PlateTransferField[] = [
  { key: "panelLengthMm", label: "Length", unit: "mm" },
  { key: "panelWidthMm", label: "Width", unit: "mm" },
  { key: "panelHeightMm", label: "Thickness", unit: "mm" },
  { key: "panelMassG", label: "Mass", unit: "g" },
];

export function plateTransferPromptOpen(
  defaults: PlateMaterialMeasurements,
  modes: PlateTransferModeSummary[] = [],
): Promise<PlateTransferPromptResult | null> {
  return new Promise((resolve) => {
    const modal = plateTransferPromptElementBuild(defaults, modes);
    const closeWith = (result: PlateTransferPromptResult | null) => {
      modal.remove();
      resolve(result);
    };
    document.body.appendChild(modal);
    plateTransferPromptBindingsAttach(modal, closeWith);
    plateTransferFirstInputFocus(modal);
  });
}

function plateTransferPromptElementBuild(defaults: PlateMaterialMeasurements, modes: PlateTransferModeSummary[]) {
  const modal = document.createElement("div");
  modal.className = "save-modal plate-transfer-modal";
  modal.innerHTML = `
    <div class="save-modal__backdrop" data-plate-transfer-cancel></div>
    <div class="save-modal__panel plate-transfer-modal__panel" role="dialog" aria-modal="true" aria-label="Prepare transfer to Plate Calculator">
      <header>
        <h2>Prepare Transfer -> Plate Calculator</h2>
        <button type="button" class="ghost-btn btn-small" data-plate-transfer-cancel>Close</button>
      </header>
      <form class="save-modal__form plate-transfer-modal__form">
        <section class="save-modal__section">
          <h3>Modes <span class="muted">(from measurement)</span></h3>
          <div class="plate-transfer-mode-list">
            ${modes.map(plateTransferModeMarkupBuild).join("")}
          </div>
        </section>
        <section class="save-modal__section">
          <h3>Additional Measurements <span class="muted">(optional)</span></h3>
          <div class="plate-transfer-grid">
            ${PLATE_TRANSFER_FIELDS.map((field) => plateTransferFieldMarkupBuild(field, defaults[field.key])).join("")}
          </div>
        </section>
        <footer class="save-modal__footer plate-transfer-modal__footer">
          <button type="button" class="ghost-btn" data-plate-transfer-skip>Skip for now</button>
          <button type="submit" class="primary-btn">Continue to Plate Calculator</button>
        </footer>
      </form>
    </div>
  `;
  return modal;
}

function plateTransferModeMarkupBuild(mode: PlateTransferModeSummary) {
  return `
    <div class="plate-transfer-mode-row" data-plate-transfer-mode="${mode.key}">
      <span>${mode.label}</span>
      <strong>${plateTransferFrequencyFormat(mode.frequencyHz)}</strong>
      <span class="plate-transfer-mode-status" aria-hidden="true">${Number.isFinite(mode.frequencyHz) ? "✓" : "–"}</span>
    </div>
  `;
}

function plateTransferFieldMarkupBuild(field: PlateTransferField, value: number) {
  return `
    <label class="plate-material-field plate-transfer-field">
      <span class="plate-material-label">${field.label}</span>
      <input class="plate-material-input" name="${field.key}" type="number" inputmode="decimal" min="0.1" step="0.1" value="${plateTransferNumberFormat(value)}">
      <span class="plate-material-unit">${field.unit}</span>
    </label>
  `;
}

function plateTransferPromptBindingsAttach(
  modal: HTMLElement,
  closeWith: (result: PlateTransferPromptResult | null) => void,
) {
  modal.querySelectorAll<HTMLElement>("[data-plate-transfer-cancel]").forEach((element) => {
    element.addEventListener("click", () => closeWith(null));
  });
  modal.querySelector<HTMLElement>("[data-plate-transfer-skip]")?.addEventListener("click", () => {
    closeWith({ action: "skip" });
  });
  modal.querySelector("form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    closeWith({ action: "continue", measurements: plateTransferMeasurementsRead(modal) });
  });
}

function plateTransferMeasurementsRead(modal: HTMLElement): PlateMaterialMeasurements {
  return {
    panelLengthMm: plateTransferNumberRead(modal, "panelLengthMm"),
    panelWidthMm: plateTransferNumberRead(modal, "panelWidthMm"),
    panelHeightMm: plateTransferNumberRead(modal, "panelHeightMm"),
    panelMassG: plateTransferNumberRead(modal, "panelMassG"),
  };
}

function plateTransferNumberRead(modal: HTMLElement, name: keyof PlateMaterialMeasurements) {
  const input = modal.querySelector<HTMLInputElement>(`input[name="${name}"]`);
  const value = Number.parseFloat(input?.value || "");
  return Number.isFinite(value) && value > 0 ? value : Number.NaN;
}

function plateTransferFirstInputFocus(modal: HTMLElement) {
  modal.querySelector<HTMLInputElement>("input")?.focus();
}

function plateTransferNumberFormat(value: number) {
  if (!Number.isFinite(value)) return "";
  const fixed = value.toFixed(2);
  return fixed.replace(/\.?0+$/, "");
}

function plateTransferFrequencyFormat(value: number | null) {
  if (!Number.isFinite(value)) return "Not detected";
  return `${(value as number).toFixed(1)} Hz`;
}
