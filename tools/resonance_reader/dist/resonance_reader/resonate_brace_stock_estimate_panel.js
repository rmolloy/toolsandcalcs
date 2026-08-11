import { braceStockEstimateResolveFromState } from "./resonate_brace_stock_estimate.js";
import { braceStockDetailsPromptOpen } from "./resonate_brace_stock_details_prompt.js";
import { braceStockLongModeConfirmationApply, braceStockLongModeConfirmationClear, } from "./resonate_brace_stock_confirmation.js";
import { measureModeNormalize, peakAnalysisSourceMeasureModeResolve } from "./resonate_mode_config.js";
export function braceStockEstimatePresentationBuild(state, selectedPeak) {
    const estimate = braceStockEstimateResolveFromState(state);
    if (estimate.status === "incomplete") {
        return {
            status: "incomplete",
            summary: "Add the stock length, width, height, and mass to characterize this piece.",
            metrics: [],
            primaryAction: "set-measurements",
            primaryLabel: "Set measurements",
            transferAvailable: false,
        };
    }
    if (estimate.status === "needs-confirmation") {
        return {
            status: "needs-confirmation",
            summary: "Measurements are ready. Confirm the selected peak as the Long mode.",
            metrics: [],
            primaryAction: "confirm-long",
            primaryLabel: "Use selected as Long",
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
        summary: "Brace stock estimate",
        metrics: [
            { label: "Long", value: `${estimate.confirmation.frequencyHz.toFixed(1)} Hz` },
            { label: "Density", value: `${Math.round(estimate.material.densityKgM3)} kg/m³` },
            { label: "E", value: `${estimate.material.dynamicYoungsModulusGPa.toFixed(2)} GPa` },
            { label: "Sound speed", value: `${Math.round(estimate.material.longitudinalSoundSpeedMps).toLocaleString()} m/s` },
        ],
        primaryAction: "open-details",
        primaryLabel: "Edit measurements",
        replaceLongLabel: inspectedPeakDiffers
            ? `Use inspected ${inspectedFrequencyHz.toFixed(1)} Hz as Long`
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
        ? '<button class="ghost-btn btn-small" type="button" data-brace-stock-action="transfer">Match in Flexural Rigidity</button>'
        : "";
    const replaceLong = presentation.replaceLongLabel
        ? `<button class="ghost-btn btn-small" type="button" data-brace-stock-action="confirm-long">${presentation.replaceLongLabel}</button>`
        : "";
    const clearLong = presentation.clearLongAvailable
        ? '<button class="ghost-btn btn-small" type="button" data-brace-stock-action="clear-long">Clear Long</button>'
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
