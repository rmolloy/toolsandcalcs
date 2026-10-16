export function createPitchErrorPlot({ comparison, fretCount, messages }) {
  const curves = [comparison.saddleOnly.centsErrorByFret, comparison.nutAndSaddle.centsErrorByFret];
  const displayedLastFret = Math.max(24, fretCount);
  return {
    data: createPitchErrorTraces(curves, messages),
    layout: createPitchErrorLayout(curves, fretCount, displayedLastFret, messages),
    config: { responsive: true, displayModeBar: false, displaylogo: false, scrollZoom: false },
  };
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

function createPitchErrorLayout(curves, fretCount, displayedLastFret, messages) {
  return {
    paper_bgcolor: "transparent", plot_bgcolor: "transparent",
    font: { color: "#c7d4e2", family: "system-ui, sans-serif", size: 12 },
    margin: { l: 58, r: 18, t: 18, b: 48 }, height: 300,
    showlegend: false, dragmode: false, hovermode: "x unified",
    xaxis: createFretAxis(displayedLastFret, messages),
    yaxis: createCentsAxis(curves, messages),
    shapes: createUnavailableFretRegion(fretCount, displayedLastFret),
    annotations: createPitchDirectionLabels(messages),
  };
}

function createFretAxis(displayedLastFret, messages) {
  return {
    title: { text: messages.fret, standoff: 8 }, range: [-0.3, displayedLastFret + 0.3],
    dtick: 4, fixedrange: true, showgrid: false, zeroline: false,
    showline: true, linecolor: "#617286", ticks: "outside", tickcolor: "#617286",
  };
}

function createCentsAxis(curves, messages) {
  const limit = Math.ceil(Math.max(5, ...curves.flat().map(Math.abs)) * 1.15 / 5) * 5;
  return {
    title: { text: messages.cents, standoff: 8 }, range: [-limit, limit],
    fixedrange: true, gridcolor: "rgba(137,157,180,0.12)",
    zeroline: true, zerolinecolor: "#b7c7d7", zerolinewidth: 1.5,
    tickformat: "+.0f", nticks: 5,
  };
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
