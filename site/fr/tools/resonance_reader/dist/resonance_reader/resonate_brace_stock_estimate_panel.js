import { braceStockEstimateResolveFromState } from "./resonate_brace_stock_estimate.js?rev=957cdb0b4694";
import { braceStockDetailsPromptOpen } from "./resonate_brace_stock_details_prompt.js?rev=957cdb0b4694";
import { braceStockLongModeConfirmationApply, braceStockLongModeConfirmationClear, } from "./resonate_brace_stock_confirmation.js?rev=957cdb0b4694";
import { measureModeNormalize, peakAnalysisSourceMeasureModeResolve } from "./resonate_mode_config.js?rev=957cdb0b4694";
import { resonanceLocalizedMessages } from "./resonate_localized_messages.js?rev=957cdb0b4694";
export function braceStockEstimatePresentationBuild(state, selectedPeak) {
    const estimate = braceStockEstimateResolveFromState(state);
    if (estimate.status === "incomplete") {
        return {
            status: "incomplete",
            summary: resonanceLocalizedMessages.braceEstimateIncompleteSummary,
            metrics: [],
            primaryAction: "set-measurements",
            primaryLabel: resonanceLocalizedMessages.braceEstimateSetMeasurements,
            transferAvailable: false,
        };
    }
    if (estimate.status === "needs-confirmation") {
        return {
            status: "needs-confirmation",
            summary: resonanceLocalizedMessages.braceEstimateNeedsConfirmationSummary,
            metrics: [],
            primaryAction: "confirm-long",
            primaryLabel: resonanceLocalizedMessages.braceEstimateUseSelectedLong,
            transferAvailable: false,
        };
    }
    const inspectedFrequencyHz = Number(selectedPeak?.freq);
    const inspectedPeakDiffers = selectedPeak?.key
        && selectedPeak.key !== estimate.confirmation.peakKey
        && Number.isFinite(inspectedFrequencyHz)
        && inspectedFrequencyHz > 0;
    return {
        status: "ready",
        summary: resonanceLocalizedMessages.braceEstimateReadySummary,
        metrics: [
            { label: resonanceLocalizedMessages.braceEstimateLongLabel, value: `${estimate.confirmation.frequencyHz.toFixed(1)} Hz` },
            { label: resonanceLocalizedMessages.braceEstimateDensityLabel, value: `${Math.round(estimate.material.densityKgM3)} kg/m³` },
            { label: "E", value: `${estimate.material.dynamicYoungsModulusGPa.toFixed(2)} GPa` },
            { label: resonanceLocalizedMessages.braceEstimateSoundSpeedLabel, value: `${Math.round(estimate.material.longitudinalSoundSpeedMps).toLocaleString()} m/s` },
        ],
        primaryAction: "open-details",
        primaryLabel: resonanceLocalizedMessages.braceEstimateEditMeasurements,
        replaceLongLabel: inspectedPeakDiffers
            ? resonanceLocalizedMessages.braceEstimateUseInspectedLongTemplate.replace("{frequencyHz}", inspectedFrequencyHz.toFixed(1))
            : undefined,
        clearLongAvailable: true,
        transferAvailable: true,
    };
}
export function braceStockEstimatePanelRenderFromState(state, selectedPeak) {
    const panel = document.getElementById("brace_stock_estimate");
    const content = document.getElementById("brace_stock_estimate_content");
    if (!panel || !content)
        return;
    const visible = measureModeNormalize(state.measureMode) === "peak_analysis"
        && peakAnalysisSourceMeasureModeResolve(state) === "brace_stock";
    panel.hidden = !visible;
    if (!visible) {
        content.replaceChildren();
        return;
    }
    content.innerHTML = braceStockEstimateMarkupBuild(braceStockEstimatePresentationBuild(state, selectedPeak));
}
export function braceStockEstimatePanelInitialize(state, dependencies) {
    const panel = document.getElementById("brace_stock_estimate");
    if (!panel || panel.__braceStockEstimateListenerAttached)
        return;
    panel.__braceStockEstimateListenerAttached = true;
    panel.addEventListener("click", (event) => {
        const action = event.target?.closest("[data-brace-stock-action]")?.dataset.braceStockAction;
        if (!action)
            return;
        void braceStockEstimateActionApply(state, action, dependencies);
    });
}
async function braceStockEstimateActionApply(state, action, dependencies) {
    if (action === "set-measurements" || action === "open-details") {
        const result = await braceStockDetailsPromptOpen(state);
        if (!result)
            return;
        state.braceStockMeasurements = result.measurements;
        dependencies.render();
        return;
    }
    if (action === "confirm-long") {
        const selected = dependencies.selectedPeakResolve();
        braceStockLongModeConfirmationApply(state, {
            peakKey: selected?.key,
            frequencyHz: selected?.freq,
            tapIndex: state.peakAnalysisSelectedTapIndex,
            sourceLabel: state.recordingLabel,
        });
        dependencies.render();
        return;
    }
    if (action === "clear-long") {
        braceStockLongModeConfirmationClear(state);
        dependencies.render();
        return;
    }
    if (action === "transfer")
        dependencies.transfer?.();
}
function braceStockEstimateMarkupBuild(presentation) {
    const metrics = presentation.metrics
        .map(({ label, value }) => `
      <span class="brace-stock-estimate__metric">
        <span class="brace-stock-estimate__label">${label}</span>
        <strong>${value}</strong>
      </span>
    `)
        .join("");
    const transfer = presentation.transferAvailable
        ? `<button class="ghost-btn btn-small" type="button" data-brace-stock-action="transfer">${resonanceLocalizedMessages.braceEstimateMatchFlexuralRigidity}</button>`
        : "";
    const replaceLong = presentation.replaceLongLabel
        ? `<button class="ghost-btn btn-small" type="button" data-brace-stock-action="confirm-long">${presentation.replaceLongLabel}</button>`
        : "";
    const clearLong = presentation.clearLongAvailable
        ? `<button class="ghost-btn btn-small" type="button" data-brace-stock-action="clear-long">${resonanceLocalizedMessages.braceEstimateClearLong}</button>`
        : "";
    return `
    <span class="brace-stock-estimate__summary">${presentation.summary}</span>
    <div class="brace-stock-estimate__metrics">${metrics}</div>
    <div class="brace-stock-estimate__actions">
      <button class="ghost-btn btn-small" type="button" data-brace-stock-action="${presentation.primaryAction}">${presentation.primaryLabel}</button>
      ${replaceLong}
      ${clearLong}
      ${transfer}
    </div>
  `;
}
