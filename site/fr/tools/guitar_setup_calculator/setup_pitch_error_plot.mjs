export function createPitchErrorPlot({ comparison, fretCount, messages, width = 1024 }) {
  const curves = [comparison.saddleOnly.centsErrorByFret, comparison.nutAndSaddle.centsErrorByFret];
  const displayedLastFret = Math.max(24, fretCount);
  return {
    data: createPitchErrorTraces(curves, messages),
    layout: createPitchErrorLayout(curves, fretCount, displayedLastFret, messages, width),
    config: {
      responsive: true, displayModeBar: true, displaylogo: false, scrollZoom: false,
      locale: 'intonation', locales: { intonation: { dictionary: createControlDictionary(messages) } },
    },
  };
}

function createControlDictionary(messages) {
  return Object.fromEntries([
    ['Download plot as a png', messages.download], ['Zoom', messages.zoom], ['Pan', messages.pan],
    ['Box Select', messages.boxSelect], ['Lasso Select', messages.lassoSelect],
    ['Zoom in', messages.zoomIn], ['Zoom out', messages.zoomOut],
    ['Autoscale', messages.autoscale], ['Reset axes', messages.resetAxes],
  ].filter(([, value]) => value));
}

function createPitchErrorTraces(curves, messages) {
  return [
    createFrettedErrorTrace(curves[0], messages.saddleOnly, "#ffb454", "solid", messages),
    createFrettedErrorTrace(curves[1], messages.nutAndSaddle, "#73c9e6", "dash", messages),
    createOpenStringReferenceTrace(messages),
  ];
}

function createFrettedErrorTrace(errors, name, color, dash, messages) {
  return {
    type: "scatter", mode: "lines+markers", name,
    x: errors.map((_, index) => index + 1), y: [...errors],
    line: { color, dash, width: 2 }, marker: { color, size: 4 },
    hovertemplate: `${messages.fret} %{x}<br>%{y:+.2f} ${messages.cents}<extra>%{fullData.name}</extra>`,
  };
}

function createOpenStringReferenceTrace(messages) {
  return {
    type: "scatter", mode: "markers", name: messages.openReference,
    x: [0], y: [0], showlegend: false,
    marker: { color: "#e4edf5", size: 8, symbol: "circle-open", line: { width: 2 } },
    hovertemplate: `${messages.openReference}<extra></extra>`,
  };
}

export function createPitchErrorSpacing(width, range = [-0.3, 24.3]) {
  const intervals = Math.max(2, Math.floor((width - 62) / 64));
  const rawStep = Math.max(1, (Math.floor(range[1]) - Math.ceil(range[0])) / intervals);
  return { top: width <= 600 ? 112 : 72, fretStep: 2 ** Math.ceil(Math.log2(rawStep)) };
}

function createPitchErrorLayout(curves, fretCount, displayedLastFret, messages, width) {
  return {
    paper_bgcolor: "transparent", plot_bgcolor: "transparent",
    font: { color: "#c7d4e2", family: "system-ui, sans-serif", size: 12 },
    margin: { l: 44, r: 18, t: createPitchErrorSpacing(width).top, b: 42 }, height: 380,
    showlegend: true, legend: { orientation: "h", x: 0, y: 1.04, yanchor: "bottom" },
    dragmode: "zoom", hovermode: "x unified",
    xaxis: createFretAxis(displayedLastFret, messages, width),
    yaxis: createCentsAxis(curves, messages),
    shapes: createUnavailableFretRegion(fretCount, displayedLastFret),
    annotations: createPitchDirectionLabels(messages),
  };
}

function createFretAxis(displayedLastFret, messages, width) {
  return {
    title: { text: messages.fret, standoff: 8 }, range: [-0.3, displayedLastFret + 0.3],
    tickmode: "linear", dtick: createPitchErrorSpacing(width, [-0.3, displayedLastFret + 0.3]).fretStep, tickformat: "d",
    fixedrange: false, automargin: true, showgrid: false, zeroline: false,
    showline: true, linecolor: "#617286", ticks: "outside", tickcolor: "#617286",
  };
}

function createCentsAxis(curves, messages) {
  return {
    title: { text: messages.cents, standoff: 8 }, range: calculateCentsRangeFromCurves(curves),
    fixedrange: false, automargin: true, gridcolor: "rgba(137,157,180,0.12)",
    zeroline: true, zerolinecolor: "#b7c7d7", zerolinewidth: 1.5,
    tickformat: "+.3~g", nticks: 5,
  };
}

function calculateCentsRangeFromCurves(curves) {
  const values = curves.flat().filter(Number.isFinite);
  const minimum = Math.min(0, ...values);
  const maximum = Math.max(0, ...values);
  const padding = Math.max(1, maximum - minimum) * 0.2;
  return [minimum - padding, maximum + padding];
}

function createUnavailableFretRegion(fretCount, displayedLastFret) {
  if (fretCount >= displayedLastFret) return [];
  return [{
    type: "rect", xref: "x", yref: "paper", layer: "below",
    x0: fretCount + 0.5, x1: displayedLastFret + 0.3, y0: 0, y1: 1,
    fillcolor: "rgba(137,157,180,0.13)", line: { width: 0 },
  }];
}

function createPitchDirectionLabels(messages) {
  return [
    createPitchDirectionLabel(messages.sharp, 1),
    createPitchDirectionLabel(messages.flat, 0),
  ];
}

function createPitchDirectionLabel(text, verticalPosition) {
  return {
    text, xref: "paper", yref: "paper", x: 0.01, y: verticalPosition,
    xanchor: "left", showarrow: false, font: { color: "#9cafc3", size: 11 },
  };
}
