import { plateMaterialPanelVisibleForMeasureMode } from "./resonate_plate_material_panel.js";
import { measureModeNormalize } from "./resonate_mode_config.js";
const DEFAULT_ANALYSIS_TAB = "peak_analysis";
const WAVEFORM_NAVIGATOR_COPY = {
    title: "Frequency Response",
    description: "Drag yellow range for FFT analysis. Drag green range for note selection. Click a note label (or Option/Command-click a note slice) to override its note.",
};
const PEAK_ANALYSIS_TAP_NAVIGATOR_COPY = {
    title: "Tap Navigator",
    description: "Select a tap to inspect its Peak/Q ring-down. Solid taps are accepted and dotted taps are weak.",
};
export function analysisTabsInitialize(state) {
    analysisTabSeedIntoState(state);
    analysisTabsBindOnce(state);
    analysisTabsRenderFromState(state);
}
export function analysisTabsRenderFromState(state) {
    analysisTabSeedIntoState(state);
    analysisTabNormalizeForState(state);
    analysisSurfaceRenderFromState(state);
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
export function analysisSurfaceVisibleForMeasureMode(measureMode) {
    return measureModeNormalize(measureMode) === "peak_analysis";
}
export function waveformNavigatorCopyResolveForMeasureMode(measureMode) {
    return measureModeNormalize(measureMode) === "peak_analysis"
        ? PEAK_ANALYSIS_TAP_NAVIGATOR_COPY
        : WAVEFORM_NAVIGATOR_COPY;
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
function analysisSurfaceRenderFromState(state) {
    const surface = analysisSurfaceElementGet();
    if (!surface)
        return;
    const measureMode = measureModeNormalize(state.measureMode);
    analysisSurfaceParentModeWrite(surface, measureMode);
    waveformNavigatorCopyRenderForMeasureMode(measureMode);
    surface.hidden = !analysisSurfaceVisibleForMeasureMode(measureMode);
}
function waveformNavigatorCopyRenderForMeasureMode(measureMode) {
    const copy = waveformNavigatorCopyResolveForMeasureMode(measureMode);
    const title = document.getElementById("wave_nav_title");
    const description = document.getElementById("wave_nav_description");
    if (title)
        title.textContent = copy.title;
    if (description)
        description.textContent = copy.description;
}
function analysisSurfaceParentModeWrite(surface, measureMode) {
    const parent = surface.closest(".card-surface");
    if (!parent)
        return;
    parent.dataset.measureMode = measureMode;
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
