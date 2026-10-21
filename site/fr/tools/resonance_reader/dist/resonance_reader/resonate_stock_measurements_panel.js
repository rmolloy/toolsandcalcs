import { stockMeasurementsDraftApply, stockMeasurementsDraftBuild, stockKindResolve } from "./resonate_stock_measurements.js?rev=90c36258c883";
import { stockMeasurementsPromptOpen } from "./resonate_stock_measurements_prompt.js?rev=90c36258c883";
import { braceStockEstimateResolveFromState } from "./resonate_brace_stock_estimate.js?rev=90c36258c883";
import { braceStockMeasurementsValid } from "./resonate_brace_stock_material.js?rev=90c36258c883";
import { stockLongAssignmentCapture, stockLongConfirmationApply, stockLongConfirmationClear, stockLongConfirmationResolve } from "./resonate_stock_long_confirmation.js?rev=90c36258c883";
import { stockMaterialEstimateResolve } from "./resonate_stock_material_estimate.js?rev=90c36258c883";
import { stockPeakContextDiffers } from "./resonate_stock_peak_context.js?rev=90c36258c883";
import { resonanceLocalizedMessages } from "./resonate_localized_messages.js?rev=90c36258c883";
import { renderStockSupportGuidance } from "./resonate_stock_support_guidance.js?rev=90c36258c883";
import { stockLongAssignedModeResolve } from "./resonate_stock_long_assignment.js?rev=90c36258c883";
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
    const kindLabel = draft.kind === "plate_stock"
        ? resonanceLocalizedMessages.stockMeasurementsPlateKind
        : draft.kind === "brace_stock"
            ? resonanceLocalizedMessages.stockMeasurementsBraceKind
            : resonanceLocalizedMessages.stockMeasurementsTitle;
    content.innerHTML = `<span class="brace-stock-estimate__summary">${kindLabel}${complete ? ` · ${stockMeasurementsSummaryBuild(draft.measurements)}` : ""}</span>
    <div class="brace-stock-estimate__actions">
      ${stockActionMarkupBuild("edit", complete ? resonanceLocalizedMessages.stockMeasurementsEdit : resonanceLocalizedMessages.stockMeasurementsAdd)}
      ${draft.kind ? stockLongActionsBuild(state, stockLongCandidateResolve(state, selectedPeak)) : ""}
    </div>
    ${draft.kind ? stockMaterialDetailsBuild(state) : ""}`;
    content.querySelector(".brace-stock-estimate__actions")?.before(renderStockSupportGuidance(draft) ?? "");
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
        if (draft) {
            stockMeasurementsDraftApply(state, draft);
            stockLongAssignmentCapture(state);
        }
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
    return stockLongManualActionsBuild(state, selected) + stockLongTransferActionBuild(state);
}
function stockLongManualActionsBuild(state, selected) {
    if (stockLongAssignedModeResolve(state))
        return "";
    const confirmation = stockLongConfirmationResolve(state);
    const frequency = selected?.freq;
    const different = confirmation?.peakKey !== selected?.key || confirmation?.frequencyHz !== frequency;
    const confirm = Number.isFinite(frequency) && Number(frequency) > 0 && different
        ? stockActionMarkupBuild("confirm", resonanceLocalizedMessages.stockMeasurementsUseAsLongTemplate.replace("{frequencyHz}", Number(frequency).toFixed(1))) : "";
    const clear = confirmation
        ? stockActionMarkupBuild("clear", resonanceLocalizedMessages.stockMeasurementsClearLong)
        : "";
    return confirm + clear;
}
function stockLongTransferActionBuild(state) {
    return stockKindResolve(state) === "brace_stock" && braceStockEstimateResolveFromState(state).status === "ready"
        ? stockActionMarkupBuild("transfer", resonanceLocalizedMessages.stockMeasurementsMatchFlexuralRigidity)
        : "";
}
function stockMaterialDetailsBuild(state) {
    const estimate = stockMaterialEstimateResolve(state);
    if (estimate.status !== "ready") {
        const frequency = stockLongConfirmationResolve(state)?.frequencyHz;
        const status = Number.isFinite(frequency)
            ? resonanceLocalizedMessages.stockMeasurementsConfirmedLongTemplate.replace("{frequencyHz}", frequency.toFixed(1))
            : resonanceLocalizedMessages.stockMeasurementsLongModeUnconfirmedPanel;
        return `<span class="muted small">${status}</span>`;
    }
    const { material, confirmation } = estimate;
    const rigidity = material.flexuralRigidityNm2 == null
        ? ""
        : resonanceLocalizedMessages.stockMeasurementsRigidityTemplate.replace("{rigidityNm2}", material.flexuralRigidityNm2.toFixed(3));
    const summary = resonanceLocalizedMessages.stockMeasurementsReadySummaryTemplate
        .replace("{frequencyHz}", confirmation.frequencyHz.toFixed(1))
        .replace("{soundSpeedMps}", Math.round(material.longitudinalSoundSpeedMps).toLocaleString())
        .replace("{youngsModulusGPa}", material.dynamicYoungsModulusGPa.toFixed(2));
    const details = resonanceLocalizedMessages.stockMeasurementsReadyDetailsTemplate
        .replace("{densityKgM3}", String(Math.round(material.densityKgM3)))
        .replace("{rigidity}", rigidity);
    return `<details class="stock-measurements-properties">
    <summary>${summary}</summary>
    <p class="muted small">${details}</p>
  </details>`;
}
function stockActionMarkupBuild(action, label) {
    return `<button class="ghost-btn btn-small" type="button" data-stock-action="${action}">${label}</button>`;
}
function stockMeasurementsSummaryBuild(measurements) {
    return resonanceLocalizedMessages.stockMeasurementsSummaryTemplate
        .replace("{lengthMm}", String(measurements.stockLengthMm))
        .replace("{widthMm}", String(measurements.stockWidthMm))
        .replace("{heightMm}", String(measurements.stockHeightMm))
        .replace("{massG}", String(measurements.stockMassG));
}
