import { stockMaterialEstimateResolve } from "./resonate_stock_material_estimate.js";
import { stockLongConfirmationResolve } from "./resonate_stock_long_confirmation.js";
import { braceStockMeasurementsValid, type BraceStockMeasurements } from "./resonate_brace_stock_material.js";
import { stockKindResolve, stockMeasurementsDraftApply, stockMeasurementsDraftBuild, type StockMeasurementsDraft } from "./resonate_stock_measurements.js";

const FIELDS: Array<[keyof BraceStockMeasurements, string]> = [
  ["stockLengthMm", "Length (mm)"], ["stockWidthMm", "Width (mm)"],
  ["stockHeightMm", "Thickness (mm)"], ["stockMassG", "Mass (g)"],
];

export function stockMeasurementsPromptOpen(state: Record<string, any>): Promise<StockMeasurementsDraft | null> {
  const draft = stockMeasurementsDraftBuild(state);
  const dialog = stockMeasurementsDialogBuild(draft);
  const opener = document.activeElement as HTMLElement | null;
  return new Promise((resolve) => {
    let result: StockMeasurementsDraft | null = null;
    dialog.addEventListener("close", () => {
      dialog.remove();
      opener?.focus();
      resolve(result);
    }, { once: true });
    dialog.querySelector("[data-cancel]")?.addEventListener("click", () => dialog.close());
    dialog.querySelector("[data-change-kind]")?.addEventListener("click", () => stockKindChoiceReveal(dialog));
    dialog.addEventListener("input", () => stockMeasurementsDraftRefresh(dialog, state, draft));
    dialog.querySelector("form")?.addEventListener("submit", (event) => {
      event.preventDefault();
      stockMeasurementsDraftRefresh(dialog, state, draft);
      if (!draft.kind || !braceStockMeasurementsValid(draft.measurements)) return;
      result = draft;
      dialog.close();
    });
    document.body.append(dialog);
    stockMeasurementsDraftRefresh(dialog, state, draft);
    dialog.showModal();
  });
}

function stockMeasurementsDialogBuild(draft: StockMeasurementsDraft) {
  const dialog = document.createElement("dialog");
  dialog.className = "settings-dialog stock-measurements-dialog";
  dialog.setAttribute("aria-labelledby", "stock_measurements_title");
  dialog.innerHTML = `
    <div class="save-modal__panel">
      <h2 id="stock_measurements_title">Stock measurements</h2>
      <form class="save-modal__form">
        <div class="row" data-kind-summary ${draft.kind ? "" : "hidden"}>
          <strong>${draft.kind === "brace_stock" ? "Brace stock" : "Plate"}</strong>
          <button class="ghost-btn btn-small" type="button" data-change-kind>Change</button>
        </div>
        <label data-kind-choice ${draft.kind ? "hidden" : ""}>Specimen
          <select class="plate-material-input" name="kind" required>
            <option value="">Choose a specimen type</option>
            <option value="plate_stock">Plate</option>
            <option value="brace_stock">Brace stock</option>
          </select>
        </label>
        <div class="plate-transfer-grid">
          ${FIELDS.map(([key, label]) => `<label><span data-label="${key}">${label}</span><input class="plate-material-input" name="${key}" type="number" inputmode="decimal" min="0.001" step="any" required></label>`).join("")}
        </div>
        <p class="muted small" data-assumption></p>
        <p class="muted small" data-kind-consequence aria-live="polite" hidden></p>
        <div class="muted small" data-measurement-preview aria-live="polite"></div>
        <footer class="save-modal__footer plate-transfer-modal__footer">
          <button type="button" class="ghost-btn" data-cancel>Cancel</button>
          <button type="submit" class="primary-btn">Apply</button>
        </footer>
      </form>
    </div>`;
  dialog.querySelector<HTMLSelectElement>("select")!.value = draft.kind ?? "";
  for (const [key] of FIELDS) {
    const value = draft.measurements[key];
    dialog.querySelector<HTMLInputElement>(`[name="${key}"]`)!.value = Number.isFinite(value) ? String(value) : "";
  }
  return dialog;
}

function stockKindChoiceReveal(dialog: HTMLElement) {
  dialog.querySelector<HTMLElement>("[data-kind-summary]")!.hidden = true;
  dialog.querySelector<HTMLElement>("[data-kind-choice]")!.hidden = false;
  dialog.querySelector<HTMLSelectElement>("select")!.focus();
}

function stockMeasurementsDraftRefresh(dialog: HTMLElement, state: Record<string, any>, draft: StockMeasurementsDraft) {
  draft.kind = dialog.querySelector<HTMLSelectElement>("select")!.value as StockMeasurementsDraft["kind"] || null;
  for (const [key] of FIELDS) draft.measurements[key] = dialog.querySelector<HTMLInputElement>(`[name="${key}"]`)!.valueAsNumber;
  dialog.querySelector("[data-label=stockHeightMm]")!.textContent = draft.kind === "brace_stock" ? "Height in bending direction (mm)" : "Thickness (mm)";
  dialog.querySelector("[data-assumption]")!.textContent = draft.kind === "brace_stock"
    ? "Free-free bending assumption. Specimen dimensions, not finished brace dimensions."
    : "Free-free rectangular plate bending assumption. Length follows the grain; confirm the first Long bending mode.";
  dialog.querySelector<HTMLButtonElement>("[type=submit]")!.disabled = !draft.kind || !braceStockMeasurementsValid(draft.measurements);
  const consequence = dialog.querySelector<HTMLElement>("[data-kind-consequence]")!;
  consequence.hidden = !stockLongConfirmationResolve(state) || draft.kind === stockKindResolve(state);
  consequence.textContent = consequence.hidden ? "" : "Applying this specimen change clears confirmed Long.";
  dialog.querySelector("[data-measurement-preview]")!.textContent = stockMeasurementsPreviewBuild(state, draft);
}

function stockMeasurementsPreviewBuild(state: Record<string, any>, draft: StockMeasurementsDraft) {
  if (!braceStockMeasurementsValid(draft.measurements)) return "Enter four positive measurements.";
  if (!draft.kind) return "Choose a specimen type.";
  const previewState = { ...state };
  stockMeasurementsDraftApply(previewState, draft);
  const estimate = stockMaterialEstimateResolve(previewState);
  if (estimate.status !== "ready") return "Long mode not confirmed.";
  return `Draft calculation · Confirmed Long ${estimate.confirmation.frequencyHz.toFixed(1)} Hz · Calculated longitudinal sound speed ${Math.round(estimate.material.longitudinalSoundSpeedMps).toLocaleString()} m/s · Calculated E ${estimate.material.dynamicYoungsModulusGPa.toFixed(2)} GPa · Density ${Math.round(estimate.material.densityKgM3)} kg/m³`;
}
