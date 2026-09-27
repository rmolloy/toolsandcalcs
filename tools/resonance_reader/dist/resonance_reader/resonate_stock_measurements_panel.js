import { stockMeasurementsDraftApply, stockMeasurementsDraftBuild, stockKindResolve } from "./resonate_stock_measurements.js";
import { stockMeasurementsPromptOpen } from "./resonate_stock_measurements_prompt.js";
import { braceStockEstimateResolveFromState } from "./resonate_brace_stock_estimate.js";
import { braceStockMeasurementsValid } from "./resonate_brace_stock_material.js";
import { stockLongConfirmationApply, stockLongConfirmationClear, stockLongConfirmationResolve } from "./resonate_stock_long_confirmation.js";
import { stockMaterialEstimateResolve } from "./resonate_stock_material_estimate.js";
import { stockPeakContextDiffers } from "./resonate_stock_peak_context.js";
export function stockMeasurementsPanelInitialize(state, dependencies) {
    const panel = document.getElementById("stock_measurements");
    if (!panel || panel.dataset.bound)
        return;
    panel.dataset.bound = "true";
    panel.addEventListener("click", (event) => {
        const action = event.target?.closest("[data-stock-action]")?.dataset.stockAction;
        if (action)
            void stockMeasurementsActionApply(state, action, dependencies);
    });
}
export function stockMeasurementsPanelRender(state, selectedPeak) {
    const modeGrid = document.getElementById("mode_grid");
    if (modeGrid)
        modeGrid.hidden = stockPeakContextDiffers(state);
    const panel = document.getElementById("stock_measurements");
    const content = document.getElementById("stock_measurements_content");
    if (!panel || !content)
        return;
    panel.hidden = !["plate_stock", "brace_stock", "peak_analysis"].includes(state.measureMode);
    if (panel.hidden)
        return;
    const detailsOpen = content.querySelector("details")?.open;
    const draft = stockMeasurementsDraftBuild(state);
    const complete = braceStockMeasurementsValid(draft.measurements);
    const kindLabel = draft.kind === "plate_stock" ? "Plate" : draft.kind === "brace_stock" ? "Brace stock" : "Stock measurements";
    content.innerHTML = `<span class="brace-stock-estimate__summary">${kindLabel}${complete ? ` · ${stockMeasurementsSummaryBuild(draft.measurements)}` : ""}</span>
    <div class="brace-stock-estimate__actions">
      ${stockActionMarkupBuild("edit", complete ? "Edit measurements" : "Add measurements")}
      ${draft.kind ? stockLongActionsBuild(state, stockLongCandidateResolve(state, selectedPeak)) : ""}
    </div>
    ${draft.kind ? stockMaterialDetailsBuild(state) : ""}`;
    const details = content.querySelector("details");
    if (details)
        details.open = Boolean(detailsOpen);
}
export function stockLongCandidateResolve(state, selectedPeak) {
    if (state.measureMode === "peak_analysis")
        return selectedPeak ?? null;
    if (!["brace_stock", "plate_stock"].includes(state.measureMode) || stockKindResolve(state) !== state.measureMode)
        return null;
    const long = state.lastModeCards?.find((mode) => mode.key === "long");
    if (long)
        return { key: "long", freq: long.freq };
    return { key: "long", freq: state.lastModesDetected?.find((mode) => mode.mode === "long")?.peakFreq ?? null };
}
async function stockMeasurementsActionApply(state, action, dependencies) {
    if (action === "edit") {
        const draft = await stockMeasurementsPromptOpen(state);
        if (draft)
            stockMeasurementsDraftApply(state, draft);
    }
    if (action === "confirm")
        stockLongConfirm(state, stockLongCandidateResolve(state, dependencies.selectedPeak()));
    if (action === "clear")
        stockLongConfirmationClear(state);
    if (action === "transfer")
        dependencies.transfer();
    dependencies.render();
}
function stockLongConfirm(state, selected) {
    stockLongConfirmationApply(state, {
        peakKey: selected?.key, frequencyHz: selected?.freq,
        tapIndex: state.peakAnalysisSelectedTapIndex, sourceLabel: state.recordingLabel,
    });
}
function stockLongActionsBuild(state, selected) {
    const confirmation = stockLongConfirmationResolve(state);
    const frequency = selected?.freq;
    const different = confirmation?.peakKey !== selected?.key || confirmation?.frequencyHz !== frequency;
    const confirm = Number.isFinite(frequency) && Number(frequency) > 0 && different
        ? stockActionMarkupBuild("confirm", `Use ${Number(frequency).toFixed(1)} Hz as Long`) : "";
    const clear = confirmation ? stockActionMarkupBuild("clear", "Clear Long") : "";
    const transfer = stockKindResolve(state) === "brace_stock" && braceStockEstimateResolveFromState(state).status === "ready"
        ? stockActionMarkupBuild("transfer", "Match in Flexural Rigidity") : "";
    return confirm + clear + transfer;
}
function stockMaterialDetailsBuild(state) {
    const estimate = stockMaterialEstimateResolve(state);
    if (estimate.status !== "ready") {
        const frequency = stockLongConfirmationResolve(state)?.frequencyHz;
        return `<span class="muted small">${Number.isFinite(frequency) ? `Confirmed Long ${frequency.toFixed(1)} Hz` : "Long mode not confirmed"}</span>`;
    }
    const { material, confirmation } = estimate;
    const rigidity = material.flexuralRigidityNm2 == null ? "" : ` · Specimen EI ${material.flexuralRigidityNm2.toFixed(3)} N·m²`;
    return `<details class="stock-measurements-properties">
    <summary>Confirmed Long ${confirmation.frequencyHz.toFixed(1)} Hz · Calculated longitudinal sound speed ${Math.round(material.longitudinalSoundSpeedMps).toLocaleString()} m/s · Calculated E ${material.dynamicYoungsModulusGPa.toFixed(2)} GPa · Free-free bending</summary>
    <p class="muted small">Free-free bending assumption · Calculated density ${Math.round(material.densityKgM3)} kg/m³${rigidity}</p>
  </details>`;
}
function stockActionMarkupBuild(action, label) {
    return `<button class="ghost-btn btn-small" type="button" data-stock-action="${action}">${label}</button>`;
}
function stockMeasurementsSummaryBuild(measurements) {
    return `L ${measurements.stockLengthMm} × W ${measurements.stockWidthMm} × H ${measurements.stockHeightMm} mm · ${measurements.stockMassG} g`;
}
