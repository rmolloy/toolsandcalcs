import { createPitchErrorSpacing } from './setup_pitch_error_plot.mjs?rev=4a9544c40f78';

export function createPitchErrorView({ document, plotly, plot, messages, redraw }) {
  const dialog = document.getElementById('pitch_error_settings');
  const fields = ['fret_min', 'fret_max', 'cents_min', 'cents_max']
    .map((name) => document.getElementById(`pitch_error_${name}`));
  let defaults;
  let bound = false;
  let restoring = false;
  let lastRanges;

  function apply(figure) {
    defaults = structuredClone(figure.layout);
    const ranges = readRanges() ?? lastRanges;
    lastRanges = ranges;
    if (ranges) {
      figure.layout.xaxis.range = ranges.x;
      figure.layout.yaxis.range = ranges.y;
      figure.layout.xaxis.dtick = createPitchErrorSpacing(plot.clientWidth || 1024, ranges.x).fretStep;
    }
    figure.config.modeBarButtonsToAdd = [createSettingsButton(messages.settings, open)];
    return figure;
  }

  function readRanges() {
    if (!defaults || fields.some((field) => !field)) return null;
    const values = fields.map((field) => field.value.trim() === '' ? null : Number(field.value));
    const x = [values[0] ?? defaults.xaxis.range[0], values[1] ?? defaults.xaxis.range[1]];
    const y = [values[2] ?? defaults.yaxis.range[0], values[3] ?? defaults.yaxis.range[1]];
    const valid = [...x, ...y].every(Number.isFinite) && x[0] < x[1] && y[0] < y[1];
    const error = document.getElementById('pitch_error_range_error');
    if (error) error.textContent = valid ? '' : messages.invalidRange;
    return valid ? { x, y } : null;
  }

  function bind() {
    enableKeyboardButtons(plot);
    if (bound || !plot.on) return;
    bound = true;
    plot.on('plotly_relayout', captureRangeChange);
  }

  function captureRangeChange(change) {
    if (restoring) return;
    if (change['xaxis.autorange'] || change['yaxis.autorange']) return reset();
    const edited = [writeAxisRange(change, 'xaxis', fields.slice(0, 2)), writeAxisRange(change, 'yaxis', fields.slice(2))].some(Boolean);
    if (!edited) return;
    const ranges = readRanges();
    if (ranges) lastRanges = ranges;
    updateFretTicks(ranges);
    dialog?.dispatchEvent(new document.defaultView.Event('change', { bubbles: true }));
  }

  function writeAxisRange(change, axis, controls) {
    const range = change[`${axis}.range`] ?? [change[`${axis}.range[0]`], change[`${axis}.range[1]`]];
    if (!range.every(Number.isFinite)) return;
    controls.forEach((field, index) => { if (field) field.value = String(range[index]); });
    return true;
  }

  function updateFretTicks(ranges) {
    if (!ranges || !plot._fullLayout) return;
    const spacing = createPitchErrorSpacing(plot.clientWidth, ranges.x);
    if (plot._fullLayout.xaxis.dtick === spacing.fretStep) return;
    plotly.relayout?.(plot, { 'xaxis.dtick': spacing.fretStep });
  }

  function reset() {
    if (!defaults) return;
    fields.forEach((field) => { if (field) field.value = ''; });
    lastRanges = readRanges();
    restoring = true;
    const result = plotly.relayout?.(plot, {
      'xaxis.range': defaults.xaxis.range, 'xaxis.autorange': false,
      'xaxis.dtick': createPitchErrorSpacing(plot.clientWidth || 1024, defaults.xaxis.range).fretStep,
      'yaxis.range': defaults.yaxis.range, 'yaxis.autorange': false,
    });
    Promise.resolve(result).finally(() => { restoring = false; });
    dialog?.dispatchEvent(new document.defaultView.Event('change', { bubbles: true }));
  }

  function open() { dialog?.showModal(); }
  function close() { dialog.close(); }

  function changeRange(event) {
    event.stopPropagation();
    if (readRanges()) redraw();
  }

  function clear() {
    bound = false;
    defaults = undefined;
    lastRanges = undefined;
  }

  fields.forEach((field) => {
    field?.addEventListener('input', (event) => event.stopPropagation());
    field?.addEventListener('change', changeRange);
  });
  dialog?.addEventListener('change', (event) => event.stopPropagation());
  document.getElementById('pitch_error_settings_open')?.addEventListener('click', open);
  document.getElementById('pitch_error_settings_close')?.addEventListener('click', close);
  document.getElementById('pitch_error_reset_view')?.addEventListener('click', reset);
  return { apply, bind, clear };
}

function enableKeyboardButtons(plot) {
  plot.querySelectorAll?.('.modebar-btn').forEach((button) => {
    if (button.hasAttribute('tabindex')) return;
    button.setAttribute('tabindex', '0');
    button.setAttribute('role', 'button');
    button.setAttribute('aria-label', button.getAttribute('data-title'));
    button.addEventListener('keydown', activateKeyboardButton);
  });
}

function activateKeyboardButton(event) {
  if (!['Enter', ' '].includes(event.key)) return;
  event.preventDefault();
  event.currentTarget.click();
}

function createSettingsButton(title, click) {
  return {
    name: 'pitch-error-settings', title, click,
    icon: { width: 24, height: 24,
      path: 'M19.4 13.5a7.8 7.8 0 0 0 .1-1.5 7.8 7.8 0 0 0-.1-1.5l2-1.5-2-3.5-2.4 1a7.2 7.2 0 0 0-2.6-1.5L14 2h-4l-.4 2.5A7.2 7.2 0 0 0 7 6L4.6 5l-2 3.5 2 1.5a7.8 7.8 0 0 0-.1 1.5 7.8 7.8 0 0 0 .1 1.5l-2 1.5 2 3.5 2.4-1a7.2 7.2 0 0 0 2.6 1.5L10 22h4l.4-2.5A7.2 7.2 0 0 0 17 18l2.4 1 2-3.5-2-1.5ZM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5Z' },
  };
}
