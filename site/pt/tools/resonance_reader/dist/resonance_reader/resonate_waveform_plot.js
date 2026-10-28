const renderedPresentations = new WeakMap();
export function renderWaveformPlot(plotly, plot, trace, layout, config) {
    const presentation = waveformPresentationSignature(trace, layout, config);
    if (plotly.relayout && unchangedWaveformIsRendered(plot, trace, presentation))
        return plotly.relayout(plot, waveformOverlaysFromLayout(plot, layout));
    return replaceWaveformPlot(plotly, plot, trace, layout, config, presentation);
}
function waveformOverlaysFromLayout(plot, layout) {
    const annotationsChanged = JSON.stringify(layout.annotations) !== JSON.stringify(plot.layout?.annotations);
    return Object.fromEntries(Object.entries(layout).filter(([property]) => property === "shapes" || (property === "annotations" && annotationsChanged)));
}
function replaceWaveformPlot(plotly, plot, trace, layout, config, presentation) {
    const result = plotly.newPlot(plot, [trace], layout, config);
    renderedPresentations.set(plot, presentation);
    return result;
}
function unchangedWaveformIsRendered(plot, trace, presentation) {
    const previous = plot.data?.[0];
    return Boolean(previous && renderedPresentations.get(plot) === presentation
        && coordinatesMatchExactly(trace.x, previous.x) && coordinatesMatchExactly(trace.y, previous.y));
}
function waveformPresentationSignature(trace, layout, config) {
    const { x: unusedX, y: unusedY, ...presentation } = trace;
    const { shapes: unusedShapes, annotations: unusedAnnotations, ...staticLayout } = layout;
    return JSON.stringify([presentation, staticLayout, config]);
}
function coordinatesMatchExactly(current, previous) {
    return Array.isArray(previous) && previous.length === current.length
        && current.every((value, index) => Object.is(value, previous[index]));
}
