import { lengthUnitPresentation } from "./length_units.mjs";

const STRING_LENGTH_FIELDS = new Set(["scaleLengthMm", "gaugeMm"]);
const LENGTH_INPUT_IDS = new Set([
  "simple_radius_mm",
  "nut_radius_mm",
  "bridge_radius_mm",
  "relief_amount_mm",
  "action_first_string_mm",
  "action_last_string_mm",
  "nut_action_first_string_mm",
  "nut_action_last_string_mm",
  "extra_string_length_mm",
]);
const INPUT_STEPS = Object.freeze({
  simple_radius_mm: { mm: 0.1, in: 0.01 },
  nut_radius_mm: { mm: 0.1, in: 0.01 },
  bridge_radius_mm: { mm: 0.1, in: 0.01 },
  relief_amount_mm: { mm: 0.01, in: 0.001 },
  action_first_string_mm: { mm: 0.01, in: 0.001 },
  action_last_string_mm: { mm: 0.01, in: 0.001 },
  sparse_action_clearance: { mm: 0.01, in: 0.001 },
  nut_action_first_string_mm: { mm: 0.01, in: 0.001 },
  nut_action_last_string_mm: { mm: 0.01, in: 0.001 },
  extra_string_length_mm: { mm: 1, in: 0.01 },
});

export function createLengthUnitController(document) {
  let unit = lengthUnitPresentation.defaultUnit;

  return Object.freeze({
    get unit() {
      return unit;
    },
    isSelected,
    select,
    display,
    read,
    format,
    formatSigned,
    formatRange: formatValues,
    formatSignedRange: formatSignedValues,
    label,
    inputStep,
    isStringField,
    isLengthInput,
    updatePresentation,
  });

  function isSelected(candidate) {
    return lengthUnitPresentation.normalize(candidate) === unit;
  }

  function select(candidate) {
    unit = lengthUnitPresentation.normalize(candidate);
  }

  function display(valueMm) {
    const value = lengthUnitPresentation.fromMillimetres(valueMm, unit);
    return Number(value.toFixed(unit === "in" ? 4 : 3));
  }

  function read(value) {
    return lengthUnitPresentation.toMillimetres(Number(value), unit);
  }

  function format(valueMm) {
    return lengthUnitPresentation.format(valueMm, unit);
  }

  function formatSigned(valueMm) {
    return lengthUnitPresentation.format(valueMm, unit, { signed: true });
  }

  function formatValues(valuesMm) {
    return formatRange(valuesMm, format);
  }

  function formatSignedValues(valuesMm) {
    return formatRange(valuesMm, formatSigned);
  }

  function label() {
    return lengthUnitPresentation.label(unit);
  }

  function inputStep(kind) {
    if (unit === "in") return kind === "scale" ? 0.01 : 0.001;
    return kind === "scale" ? 0.1 : 0.001;
  }

  function isStringField(field) {
    return STRING_LENGTH_FIELDS.has(field);
  }

  function isLengthInput(input) {
    return LENGTH_INPUT_IDS.has(input.id);
  }

  function updatePresentation() {
    document.querySelectorAll("[data-length-unit-button]").forEach((button) => {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.lengthUnitButton === unit),
      );
    });
    document.querySelectorAll("[data-length-label]").forEach((fieldLabel) => {
      fieldLabel.textContent = `${fieldLabel.dataset.lengthLabel} (${label()})`;
    });
    Object.entries(INPUT_STEPS).forEach(([id, steps]) => {
      document.getElementById(id).step = String(steps[unit]);
    });
    ["simple_radius_mm", "nut_radius_mm", "bridge_radius_mm"].forEach((id) => {
      document.getElementById(id).min = String(display(1));
    });
  }
}

function formatRange(valuesMm, formatValue) {
  const minimum = Math.min(...valuesMm);
  const maximum = Math.max(...valuesMm);
  if (Math.abs(maximum - minimum) < 0.005) return formatValue(minimum);
  return `${formatValue(minimum)} to ${formatValue(maximum)}`;
}
