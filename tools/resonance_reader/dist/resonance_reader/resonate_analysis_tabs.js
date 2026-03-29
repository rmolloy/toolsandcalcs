import { plateMaterialPanelVisibleForMeasureMode } from "./resonate_plate_material_panel.js";
const DEFAULT_ANALYSIS_TAB = "peak_analysis";
export function analysisTabsInitialize(state) {
    analysisTabSeedIntoState(state);
    analysisTabsBindOnce(state);
    analysisTabsRenderFromState(state);
}
export function analysisTabsRenderFromState(state) {
    analysisTabSeedIntoState(state);
    analysisTabNormalizeForState(state);
    analysisTabsRenderButtonsFromState(state);
    analysisTabsRenderPanelsFromState(state);
}
export function analysisTabActivatePeakAnalysis(state) {
    analysisTabWrite(state, DEFAULT_ANALYSIS_TAB);
    analysisTabsRenderFromState(state);
}
export function analysisTabMaterialVisibleForMeasureMode(measureMode) {
    return plateMaterialPanelVisibleForMeasureMode(measureMode);
}
function analysisTabSeedIntoState(state) {
    if (analysisTabValid(state.analysisActiveTab))
        return;
    state.analysisActiveTab = DEFAULT_ANALYSIS_TAB;
}
function analysisTabsBindOnce(state) {
    const root = analysisSurfaceElementGet();
    if (!root || root.dataset.bound === "true")
        return;
    root.dataset.bound = "true";
    analysisTabButtonsBuild().forEach((button) => {
        button.addEventListener("click", () => analysisTabClickHandle(state, button));
    });
}
function analysisTabClickHandle(state, button) {
    const nextTab = analysisTabFromButton(button);
    if (!nextTab)
        return;
    if (nextTab === "material_properties" && !analysisTabMaterialVisibleForMeasureMode(state.measureMode))
        return;
    analysisTabWrite(state, nextTab);
    analysisTabsRenderFromState(state);
}
function analysisTabNormalizeForState(state) {
    if (!analysisTabMaterialVisibleForMeasureMode(state.measureMode) && state.analysisActiveTab === "material_properties") {
        analysisTabWrite(state, DEFAULT_ANALYSIS_TAB);
    }
}
function analysisTabsRenderButtonsFromState(state) {
    const activeTab = analysisTabReadFromState(state);
    const materialVisible = analysisTabMaterialVisibleForMeasureMode(state.measureMode);
    analysisTabButtonsBuild().forEach((button) => {
        const tab = analysisTabFromButton(button);
        if (!tab)
            return;
        const visible = tab !== "material_properties" || materialVisible;
        button.hidden = !visible;
        button.setAttribute("aria-selected", String(visible && tab === activeTab));
        button.classList.toggle("is-active", visible && tab === activeTab);
    });
}
function analysisTabsRenderPanelsFromState(state) {
    const activeTab = analysisTabReadFromState(state);
    const materialVisible = analysisTabMaterialVisibleForMeasureMode(state.measureMode);
    const peakPanel = document.getElementById("peak_analysis_panel");
    if (peakPanel)
        peakPanel.hidden = activeTab !== "peak_analysis";
    const materialPanel = document.getElementById("plate_material_card");
    if (materialPanel)
        materialPanel.hidden = !materialVisible || activeTab !== "material_properties";
}
function analysisTabReadFromState(state) {
    return analysisTabValid(state.analysisActiveTab) ? state.analysisActiveTab : DEFAULT_ANALYSIS_TAB;
}
function analysisTabWrite(state, nextTab) {
    state.analysisActiveTab = nextTab;
}
function analysisTabButtonsBuild() {
    return Array.from(document.querySelectorAll("[data-analysis-tab]"));
}
function analysisTabFromButton(button) {
    return analysisTabValid(button.dataset.analysisTab) ? button.dataset.analysisTab : null;
}
function analysisTabValid(raw) {
    return raw === "peak_analysis" || raw === "material_properties";
}
function analysisSurfaceElementGet() {
    return document.getElementById("analysis_surface");
}
