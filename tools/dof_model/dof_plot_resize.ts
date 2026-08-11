export type DofResizablePlot = {
  clientWidth?: number;
  getBoundingClientRect?: () => { width?: number };
  _fullLayout?: { width?: number };
};

export type DofPlotlyResizeApi = {
  Plots?: {
    resize?: (plotElement: DofResizablePlot) => unknown;
  };
  relayout?: (
    plotElement: DofResizablePlot,
    layout: { width: number },
  ) => unknown;
};

const DOF_PLOT_RESIZE_TOLERANCE_PX = 1;

export function readDofPlotContainerWidth(
  plotElement: DofResizablePlot | null | undefined,
) {
  const width = plotElement?.getBoundingClientRect?.().width
    ?? plotElement?.clientWidth
    ?? null;
  return normalizeDofPlotWidth(width);
}

export function readDofPlotGraphWidth(
  plotElement: DofResizablePlot | null | undefined,
) {
  return normalizeDofPlotWidth(plotElement?._fullLayout?.width ?? null);
}

export function dofPlotNeedsResize(
  plotElement: DofResizablePlot | null | undefined,
) {
  const containerWidth = readDofPlotContainerWidth(plotElement);
  const graphWidth = readDofPlotGraphWidth(plotElement);
  if (containerWidth === null || graphWidth === null) return false;
  return Math.abs(containerWidth - graphWidth) > DOF_PLOT_RESIZE_TOLERANCE_PX;
}

export function applyDofPlotResize(
  plotly: DofPlotlyResizeApi | null | undefined,
  plotElement: DofResizablePlot | null | undefined,
): Promise<boolean> {
  if (!dofPlotNeedsResize(plotElement)) return Promise.resolve(false);
  const width = readDofPlotContainerWidth(plotElement) as number;
  const resize = plotly?.Plots?.resize;
  if (typeof resize === "function") {
    return Promise.resolve(resize(plotElement as DofResizablePlot)).then(() => true);
  }
  if (typeof plotly?.relayout === "function") {
    return Promise.resolve(
      plotly.relayout(plotElement as DofResizablePlot, { width }),
    ).then(() => true);
  }
  return Promise.resolve(false);
}

function normalizeDofPlotWidth(width: unknown) {
  return typeof width === "number" && Number.isFinite(width) && width > 0
    ? width
    : null;
}
