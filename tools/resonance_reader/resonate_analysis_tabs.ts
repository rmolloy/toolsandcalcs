import { plateMaterialPanelVisibleForMeasureMode } from "./resonate_plate_material_panel.js";

export type AnalysisTab = "peak_analysis" | "material_properties";

const DEFAULT_ANALYSIS_TAB: AnalysisTab = "peak_analysis";

export function analysisTabsInitialize(state: Record<string, any>) {
  analysisTabSeedIntoState(state);
  analysisTabsBindOnce(state);
  analysisTabsRenderFromState(state);
}

export function analysisTabsRenderFromState(state: Record<string, any>) {
  analysisTabSeedIntoState(state);
  analysisTabNormalizeForState(state);
  analysisTabsRenderButtonsFromState(state);
  analysisTabsRenderPanelsFromState(state);
}

export function analysisTabActivatePeakAnalysis(state: Record<string, any>) {
  analysisTabWrite(state, DEFAULT_ANALYSIS_TAB);
  analysisTabsRenderFromState(state);
}

export function analysisTabMaterialVisibleForMeasureMode(measureMode: unknown) {
  return plateMaterialPanelVisibleForMeasureMode(measureMode);
}

function analysisTabSeedIntoState(state: Record<string, any>) {
  if (analysisTabValid(state.analysisActiveTab)) return;
  state.analysisActiveTab = DEFAULT_ANALYSIS_TAB;
}

function analysisTabsBindOnce(state: Record<string, any>) {
  const root = analysisSurfaceElementGet();
  if (!root || root.dataset.bound === "true") return;
  root.dataset.bound = "true";
  analysisTabButtonsBuild().forEach((button) => {
    button.addEventListener("click", () => analysisTabClickHandle(state, button));
  });
}

function analysisTabClickHandle(state: Record<string, any>, button: HTMLButtonElement) {
  const nextTab = analysisTabFromButton(button);
  if (!nextTab) return;
  if (nextTab === "material_properties" && !analysisTabMaterialVisibleForMeasureMode(state.measureMode)) return;
  analysisTabWrite(state, nextTab);
  analysisTabsRenderFromState(state);
}

function analysisTabNormalizeForState(state: Record<string, any>) {
  if (!analysisTabMaterialVisibleForMeasureMode(state.measureMode) && state.analysisActiveTab === "material_properties") {
    analysisTabWrite(state, DEFAULT_ANALYSIS_TAB);
  }
}

function analysisTabsRenderButtonsFromState(state: Record<string, any>) {
  const activeTab = analysisTabReadFromState(state);
  const materialVisible = analysisTabMaterialVisibleForMeasureMode(state.measureMode);
  analysisTabButtonsBuild().forEach((button) => {
    const tab = analysisTabFromButton(button);
    if (!tab) return;
    const visible = tab !== "material_properties" || materialVisible;
    button.hidden = !visible;
    button.setAttribute("aria-selected", String(visible && tab === activeTab));
    button.classList.toggle("is-active", visible && tab === activeTab);
  });
}

function analysisTabsRenderPanelsFromState(state: Record<string, any>) {
  const activeTab = analysisTabReadFromState(state);
  const materialVisible = analysisTabMaterialVisibleForMeasureMode(state.measureMode);
  const peakPanel = document.getElementById("peak_analysis_panel") as HTMLElement | null;
  if (peakPanel) peakPanel.hidden = activeTab !== "peak_analysis";
  const materialPanel = document.getElementById("plate_material_card") as HTMLElement | null;
  if (materialPanel) materialPanel.hidden = !materialVisible || activeTab !== "material_properties";
}

function analysisTabReadFromState(state: Record<string, any>): AnalysisTab {
  return analysisTabValid(state.analysisActiveTab) ? state.analysisActiveTab : DEFAULT_ANALYSIS_TAB;
}

function analysisTabWrite(state: Record<string, any>, nextTab: AnalysisTab) {
  state.analysisActiveTab = nextTab;
}

function analysisTabButtonsBuild() {
  return Array.from(document.querySelectorAll<HTMLButtonElement>("[data-analysis-tab]"));
}

function analysisTabFromButton(button: HTMLButtonElement): AnalysisTab | null {
  return analysisTabValid(button.dataset.analysisTab) ? button.dataset.analysisTab : null;
}

function analysisTabValid(raw: unknown): raw is AnalysisTab {
  return raw === "peak_analysis" || raw === "material_properties";
}

function analysisSurfaceElementGet() {
  return document.getElementById("analysis_surface") as HTMLElement | null;
}
