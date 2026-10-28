type WaveformTrace = { x: number[]; y: number[]; [property: string]: unknown };
type PlotRenderer = (plot: HTMLElement, data: WaveformTrace[], layout: object, config: object) => unknown;
type WaveformPlotApi = { newPlot: PlotRenderer; relayout?: (plot: HTMLElement, layout: object) => unknown };
type WaveformPlotElement = HTMLElement & { data?: Array<{ x?: unknown; y?: unknown }>; layout?: { annotations?: unknown } };
const renderedPresentations = new WeakMap<HTMLElement, string>();

export function renderWaveformPlot(plotly: WaveformPlotApi, plot: WaveformPlotElement, trace: WaveformTrace, layout: object, config: object) {
  const presentation = waveformPresentationSignature(trace, layout, config);
  if (plotly.relayout && unchangedWaveformIsRendered(plot, trace, presentation)) return plotly.relayout(plot, waveformOverlaysFromLayout(plot, layout));
  return replaceWaveformPlot(plotly, plot, trace, layout, config, presentation);
}

function waveformOverlaysFromLayout(plot: WaveformPlotElement, layout: object): object {
  const annotationsChanged = JSON.stringify((layout as Record<string, unknown>).annotations) !== JSON.stringify(plot.layout?.annotations);
  return Object.fromEntries(Object.entries(layout).filter(([property]) => property === "shapes" || (property === "annotations" && annotationsChanged)));
}

function replaceWaveformPlot(plotly: WaveformPlotApi, plot: HTMLElement, trace: WaveformTrace, layout: object, config: object, presentation: string) {
  const result = plotly.newPlot(plot, [trace], layout, config);
  renderedPresentations.set(plot, presentation);
  return result;
}

function unchangedWaveformIsRendered(plot: WaveformPlotElement, trace: WaveformTrace, presentation: string): boolean {
  const previous = plot.data?.[0];
  return Boolean(previous && renderedPresentations.get(plot) === presentation
    && coordinatesMatchExactly(trace.x, previous.x) && coordinatesMatchExactly(trace.y, previous.y));
}

function waveformPresentationSignature(trace: WaveformTrace, layout: object, config: object): string {
  const { x: unusedX, y: unusedY, ...presentation } = trace;
  const { shapes: unusedShapes, annotations: unusedAnnotations, ...staticLayout } = layout as Record<string, unknown>;
  return JSON.stringify([presentation, staticLayout, config]);
}

function coordinatesMatchExactly(current: number[], previous: unknown): boolean {
  return Array.isArray(previous) && previous.length === current.length
    && current.every((value, index) => Object.is(value, previous[index]));
}
