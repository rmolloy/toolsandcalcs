export function energyPanelVisibleSet(visible: boolean) {
  const panel = energyPanelElementGet();
  if (!panel) return;

  panel.hidden = !visible;
  if (visible) {
    panel.style.removeProperty("display");
    return;
  }
  panel.style.display = "none";
}

export function energyPlotPurge() {
  const plot = energyPlotElementGet();
  if (!plot) return;
  (window as any).Plotly?.purge?.(plot);
}

function energyPanelElementGet() {
  return document.getElementById("energy_nav");
}

function energyPlotElementGet() {
  return document.getElementById("plot_energy_transfer");
}
