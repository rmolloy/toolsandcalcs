import type { BraceStockMeasurements } from "./resonate_brace_calculator_link.js";
import type { PlateTransferModeSummary } from "./resonate_plate_transfer_prompt.js";
import { resonanceLocalizedMessages } from "./resonate_localized_messages.js";

export type BraceTransferPromptResult = {
  action: "continue" | "skip";
  measurements?: BraceStockMeasurements;
};

type BraceTransferField = {
  key: keyof BraceStockMeasurements;
  label: string;
  unit: string;
};

const BRACE_TRANSFER_FIELDS: BraceTransferField[] = [
  { key: "stockLengthMm", label: resonanceLocalizedMessages.braceTransferLengthLabel, unit: "mm" },
  { key: "stockWidthMm", label: resonanceLocalizedMessages.braceTransferWidthLabel, unit: "mm" },
  { key: "stockHeightMm", label: resonanceLocalizedMessages.braceTransferHeightLabel, unit: "mm" },
  { key: "stockMassG", label: resonanceLocalizedMessages.braceTransferMassLabel, unit: "g" },
];

export function braceTransferPromptOpen(
  modes: PlateTransferModeSummary[] = [],
): Promise<BraceTransferPromptResult | null> {
  return new Promise((resolve) => {
    const modal = braceTransferPromptElementBuild(modes);
    const closeWith = (result: BraceTransferPromptResult | null) => {
      modal.remove();
      resolve(result);
    };
    document.body.appendChild(modal);
    braceTransferPromptBindingsAttach(modal, closeWith);
    braceTransferFirstInputFocus(modal);
  });
}

function braceTransferPromptElementBuild(modes: PlateTransferModeSummary[]) {
  const modal = document.createElement("div");
  modal.className = "save-modal plate-transfer-modal brace-transfer-modal";
  modal.innerHTML = `
    <div class="save-modal__backdrop" data-brace-transfer-cancel></div>
    <div class="save-modal__panel plate-transfer-modal__panel" role="dialog" aria-modal="true" aria-label="${resonanceLocalizedMessages.braceTransferDialogLabel}">
      <header>
        <h2>${resonanceLocalizedMessages.braceTransferTitle}</h2>
        <button type="button" class="ghost-btn btn-small" data-brace-transfer-cancel>${resonanceLocalizedMessages.braceTransferClose}</button>
      </header>
      <form class="save-modal__form plate-transfer-modal__form">
        <section class="save-modal__section">
          <h3>${resonanceLocalizedMessages.braceTransferModesTitle} <span class="muted">${resonanceLocalizedMessages.braceTransferFromMeasurement}</span></h3>
          <div class="plate-transfer-mode-list">
            ${modes.map(braceTransferModeMarkupBuild).join("")}
          </div>
        </section>
        <section class="save-modal__section">
          <h3>${resonanceLocalizedMessages.braceTransferAdditionalMeasurementsTitle} <span class="muted">${resonanceLocalizedMessages.braceTransferOptional}</span></h3>
          <div class="plate-transfer-grid">
            ${BRACE_TRANSFER_FIELDS.map(braceTransferFieldMarkupBuild).join("")}
          </div>
        </section>
        <footer class="save-modal__footer plate-transfer-modal__footer">
          <button type="button" class="ghost-btn" data-brace-transfer-skip>${resonanceLocalizedMessages.braceTransferSkip}</button>
          <button type="submit" class="primary-btn">${resonanceLocalizedMessages.braceTransferContinue}</button>
        </footer>
      </form>
    </div>
  `;
  return modal;
}

function braceTransferModeMarkupBuild(mode: PlateTransferModeSummary) {
  return `
    <div class="plate-transfer-mode-row" data-brace-transfer-mode="${mode.key}">
      <span>${mode.label}</span>
      <strong>${braceTransferFrequencyFormat(mode.frequencyHz)}</strong>
      <span class="plate-transfer-mode-status" aria-hidden="true">${Number.isFinite(mode.frequencyHz) ? "✓" : "–"}</span>
    </div>
  `;
}

function braceTransferFieldMarkupBuild(field: BraceTransferField) {
  return `
    <label class="plate-material-field plate-transfer-field">
      <span class="plate-material-label">${field.label}</span>
      <input class="plate-material-input" name="${field.key}" type="number" inputmode="decimal" min="0.1" step="0.1">
      <span class="plate-material-unit">${field.unit}</span>
    </label>
  `;
}

function braceTransferPromptBindingsAttach(
  modal: HTMLElement,
  closeWith: (result: BraceTransferPromptResult | null) => void,
) {
  modal.querySelectorAll<HTMLElement>("[data-brace-transfer-cancel]").forEach((element) => {
    element.addEventListener("click", () => closeWith(null));
  });
  modal.querySelector<HTMLElement>("[data-brace-transfer-skip]")?.addEventListener("click", () => {
    closeWith({ action: "skip" });
  });
  modal.querySelector("form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    closeWith({ action: "continue", measurements: braceTransferMeasurementsRead(modal) });
  });
}

function braceTransferMeasurementsRead(modal: HTMLElement): BraceStockMeasurements {
  return {
    stockLengthMm: braceTransferNumberRead(modal, "stockLengthMm"),
    stockWidthMm: braceTransferNumberRead(modal, "stockWidthMm"),
    stockHeightMm: braceTransferNumberRead(modal, "stockHeightMm"),
    stockMassG: braceTransferNumberRead(modal, "stockMassG"),
  };
}

function braceTransferNumberRead(modal: HTMLElement, name: keyof BraceStockMeasurements) {
  const input = modal.querySelector<HTMLInputElement>(`input[name="${name}"]`);
  const value = Number.parseFloat(input?.value || "");
  return Number.isFinite(value) && value > 0 ? value : Number.NaN;
}

function braceTransferFirstInputFocus(modal: HTMLElement) {
  modal.querySelector<HTMLInputElement>("input")?.focus();
}

function braceTransferFrequencyFormat(value: number | null) {
  if (!Number.isFinite(value)) return resonanceLocalizedMessages.braceTransferNotDetected;
  return `${(value as number).toFixed(1)} Hz`;
}
