import { stockMaterialEstimateResolve } from "./resonate_stock_material_estimate.js?rev=de0830708801";
import { stockLongConfirmationResolve } from "./resonate_stock_long_confirmation.js?rev=de0830708801";
import { braceStockMeasurementsValid } from "./resonate_brace_stock_material.js?rev=de0830708801";
import { resonanceLocalizedMessages } from "./resonate_localized_messages.js?rev=de0830708801";
import { stockKindResolve, stockMeasurementsDraftApply, stockMeasurementsDraftBuild } from "./resonate_stock_measurements.js?rev=de0830708801";
const FIELDS = [
    ["stockLengthMm", resonanceLocalizedMessages.stockMeasurementsLengthLabel],
    ["stockWidthMm", resonanceLocalizedMessages.stockMeasurementsWidthLabel],
    ["stockHeightMm", resonanceLocalizedMessages.stockMeasurementsPlateHeightLabel],
    ["stockMassG", resonanceLocalizedMessages.stockMeasurementsMassLabel],
];
export function stockMeasurementsPromptOpen(state) {
    const draft = stockMeasurementsDraftBuild(state);
    const dialog = stockMeasurementsDialogBuild(draft);
    const opener = document.activeElement;
    return new Promise((resolve) => {
        let result = null;
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
            if (!draft.kind || !braceStockMeasurementsValid(draft.measurements))
                return;
            result = draft;
            dialog.close();
        });
        document.body.append(dialog);
        stockMeasurementsDraftRefresh(dialog, state, draft);
        dialog.showModal();
    });
}
function stockMeasurementsDialogBuild(draft) {
    const dialog = document.createElement("dialog");
    dialog.className = "settings-dialog stock-measurements-dialog";
    dialog.setAttribute("aria-labelledby", "stock_measurements_title");
    dialog.innerHTML = `
    <div class="save-modal__panel">
      <h2 id="stock_measurements_title">${resonanceLocalizedMessages.stockMeasurementsTitle}</h2>
      <form class="save-modal__form">
        <div class="row" data-kind-summary ${draft.kind ? "" : "hidden"}>
          <strong>${draft.kind === "brace_stock" ? resonanceLocalizedMessages.stockMeasurementsBraceKind : resonanceLocalizedMessages.stockMeasurementsPlateKind}</strong>
          <button class="ghost-btn btn-small" type="button" data-change-kind>${resonanceLocalizedMessages.stockMeasurementsChange}</button>
        </div>
        <label data-kind-choice ${draft.kind ? "hidden" : ""}>${resonanceLocalizedMessages.stockMeasurementsSpecimenLabel}
          <select class="plate-material-input" name="kind" required>
            <option value="">${resonanceLocalizedMessages.stockMeasurementsChooseKind}</option>
            <option value="plate_stock">${resonanceLocalizedMessages.stockMeasurementsPlateKind}</option>
            <option value="brace_stock">${resonanceLocalizedMessages.stockMeasurementsBraceKind}</option>
          </select>
        </label>
        <div class="plate-transfer-grid">
          ${FIELDS.map(([key, label]) => `<label><span data-label="${key}">${label}</span><input class="plate-material-input" name="${key}" type="number" inputmode="decimal" min="0.001" step="any" required></label>`).join("")}
        </div>
        <p class="muted small" data-assumption></p>
        <p class="muted small" data-kind-consequence aria-live="polite" hidden></p>
        <div class="muted small" data-measurement-preview aria-live="polite"></div>
        <footer class="save-modal__footer plate-transfer-modal__footer">
          <button type="button" class="ghost-btn" data-cancel>${resonanceLocalizedMessages.stockMeasurementsCancel}</button>
          <button type="submit" class="primary-btn">${resonanceLocalizedMessages.stockMeasurementsApply}</button>
        </footer>
      </form>
    </div>`;
    dialog.querySelector("select").value = draft.kind ?? "";
    for (const [key] of FIELDS) {
        const value = draft.measurements[key];
        dialog.querySelector(`[name="${key}"]`).value = Number.isFinite(value) ? String(value) : "";
    }
    return dialog;
}
function stockKindChoiceReveal(dialog) {
    dialog.querySelector("[data-kind-summary]").hidden = true;
    dialog.querySelector("[data-kind-choice]").hidden = false;
    dialog.querySelector("select").focus();
}
function stockMeasurementsDraftRefresh(dialog, state, draft) {
    draft.kind = dialog.querySelector("select").value || null;
    for (const [key] of FIELDS)
        draft.measurements[key] = dialog.querySelector(`[name="${key}"]`).valueAsNumber;
    dialog.querySelector("[data-label=stockHeightMm]").textContent = draft.kind === "brace_stock"
        ? resonanceLocalizedMessages.stockMeasurementsBraceHeightLabel
        : resonanceLocalizedMessages.stockMeasurementsPlateHeightLabel;
    dialog.querySelector("[data-assumption]").textContent = draft.kind === "brace_stock"
        ? resonanceLocalizedMessages.stockMeasurementsBraceAssumption
        : resonanceLocalizedMessages.stockMeasurementsPlateAssumption;
    dialog.querySelector("[type=submit]").disabled = !draft.kind || !braceStockMeasurementsValid(draft.measurements);
    const consequence = dialog.querySelector("[data-kind-consequence]");
    consequence.hidden = !stockLongConfirmationResolve(state) || draft.kind === stockKindResolve(state);
    consequence.textContent = consequence.hidden
        ? ""
        : resonanceLocalizedMessages.stockMeasurementsKindChangeConsequence;
    dialog.querySelector("[data-measurement-preview]").textContent = stockMeasurementsPreviewBuild(state, draft);
}
function stockMeasurementsPreviewBuild(state, draft) {
    if (!braceStockMeasurementsValid(draft.measurements)) {
        return resonanceLocalizedMessages.stockMeasurementsEnterPositive;
    }
    if (!draft.kind) {
        return resonanceLocalizedMessages.stockMeasurementsChooseKindPreview;
    }
    const previewState = { ...state };
    stockMeasurementsDraftApply(previewState, draft);
    const estimate = stockMaterialEstimateResolve(previewState);
    if (estimate.status !== "ready") {
        return resonanceLocalizedMessages.stockMeasurementsLongModeUnconfirmed;
    }
    return resonanceLocalizedMessages.stockMeasurementsReadyPreviewTemplate
        .replace("{frequencyHz}", estimate.confirmation.frequencyHz.toFixed(1))
        .replace("{soundSpeedMps}", Math.round(estimate.material.longitudinalSoundSpeedMps).toLocaleString())
        .replace("{youngsModulusGPa}", estimate.material.dynamicYoungsModulusGPa.toFixed(2))
        .replace("{densityKgM3}", String(Math.round(estimate.material.densityKgM3)));
}
