import { createPitchErrorPlot, createPitchErrorSpacing } from './setup_pitch_error_plot.mjs?rev=37b595148646';
import { createPitchErrorView } from './setup_pitch_error_view.mjs?rev=37b595148646';

export function createSetupPitchErrorChart({ document, plotly, calculateComparison, messages }) {
  const selector = document.getElementById('pitch_error_string');
  const plot = document.getElementById('pitch_error_plot');
  const scope = document.getElementById('pitch_error_scope');
  const readings = document.getElementById('pitch_error_readings');
  let validSetup;
  const view = createPitchErrorView({ document, plotly, plot, messages, redraw: renderSelectedString });

  function render(setup) {
    validSetup = structuredClone({ ...setup, tensionCatalog: null });
    renderStringChoices();
    renderSelectedString();
  }

  function renderStringChoices() {
    const selectedIndex = validSetup.strings[Number(selector.value)] ? Number(selector.value) : 0;
    selector.replaceChildren(...validSetup.strings.map(createStringOption));
    selector.value = String(selectedIndex);
  }

  function createStringOption(string, stringIndex) {
    const option = document.createElement('option');
    option.value = String(stringIndex);
    option.textContent = messages.courseStringLabel
      .replace('{courseNumber}', String(string.courseIndex + 1)).replace('{stringName}', string.name);
    return option;
  }

  function renderSelectedString() {
    const comparison = calculateComparison({ string: validSetup.strings[Number(selector.value)], sharedSetup: validSetup });
    scope.textContent = messages.scope.replace('{lastFret}', String(validSetup.fretCount));
    renderReadings(comparison);
    renderPlot(comparison);
  }

  function renderReadings(comparison) {
    readings.replaceChildren(...comparison.saddleOnly.centsErrorByFret.map((error, index) => (
      createReadingRow(index + 1, error, comparison.nutAndSaddle.centsErrorByFret[index])
    )));
  }

  function createReadingRow(fretNumber, saddleError, jointError) {
    const row = document.createElement('tr');
    row.replaceChildren(createReadingCell('th', fretNumber), createReadingCell('td', saddleError.toFixed(2)), createReadingCell('td', jointError.toFixed(2)));
    row.firstElementChild.scope = 'row';
    return row;
  }

  function createReadingCell(tagName, value) {
    const cell = document.createElement(tagName);
    cell.textContent = String(value);
    return cell;
  }

  function renderPlot(comparison) {
    if (!plotly?.react) return showPlotUnavailable();
    const figure = createPitchErrorPlot({ comparison, fretCount: validSetup.fretCount, messages,
      width: plot.clientWidth || document.defaultView.innerWidth });
    view.apply(figure);
    figure.config.toImageButtonOptions = { filename: `pitch-error-string-${Number(selector.value) + 1}` };
    plotly.react(plot, figure.data, figure.layout, figure.config).then(view.bind).catch(showPlotUnavailable);
  }

  function showPlotUnavailable() {
    scope.textContent = messages.unavailable;
  }

  function resizeVisiblePlot() {
    if (plot.clientWidth <= 0 || !plot._fullLayout) return;
    const spacing = createPitchErrorSpacing(plot.clientWidth, plot._fullLayout.xaxis?.range);
    plotly.relayout?.(plot, { 'margin.t': spacing.top, 'xaxis.dtick': spacing.fretStep });
    plotly.Plots.resize(plot);
  }

  function handleStringSelection(event) {
    event.stopPropagation();
    renderSelectedString();
  }

  function clear() {
    plotly?.purge(plot);
    view.clear();
    readings.replaceChildren();
    scope.textContent = '';
  }

  selector.addEventListener('input', (event) => event.stopPropagation());
  selector.addEventListener('change', handleStringSelection);
  const resizeObserver = new document.defaultView.ResizeObserver(resizeVisiblePlot);
  resizeObserver.observe(plot);
  return { render, clear };
}
