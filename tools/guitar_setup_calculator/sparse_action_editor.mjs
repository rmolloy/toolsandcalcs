export function createSparseActionEditor({
  document,
  lengthUnits,
  escapeMarkup,
  clearInputError,
  showInputError,
  onMeasurementsChanged,
  onError,
}) {
  const stringSelect = document.getElementById("sparse_action_string");
  const fretInput = document.getElementById("sparse_action_fret");
  const clearanceInput = document.getElementById("sparse_action_clearance");
  const readings = document.getElementById("sparse_action_readings");
  const addButton = document.getElementById("add_sparse_action");
  let readSetup;

  return Object.freeze({
    bind,
    contains,
    readDraftMillimetres,
    restoreDraftMillimetres,
    render,
  });

  function bind(setupReader) {
    readSetup = setupReader;
    addButton.addEventListener("click", addReading);
    readings.addEventListener("click", removeReading);
  }

  function contains(input) {
    return Boolean(input.closest(".sparse-action-editor"));
  }

  function readDraftMillimetres() {
    return clearanceInput.value === "" ? null : lengthUnits.read(clearanceInput.value);
  }

  function restoreDraftMillimetres(valueMm) {
    if (valueMm === null) return;
    clearanceInput.value = String(lengthUnits.display(valueMm));
  }

  function render(setup) {
    const selectedStringIndex = Math.min(
      Number(stringSelect.value || 0),
      setup.strings.length - 1,
    );
    stringSelect.innerHTML = setup.strings.map((string, stringIndex) => (
      `<option value="${stringIndex}">C${string.courseIndex + 1} · ${escapeMarkup(string.name)}</option>`
    )).join("");
    stringSelect.value = String(selectedStringIndex);
    fretInput.max = String(setup.fretCount);
    if (Number(fretInput.value) > setup.fretCount) {
      fretInput.value = String(setup.fretCount);
    }
    renderReadings(setup);
  }

  function renderReadings(setup) {
    const actionReadings = setup.strings.flatMap((string, stringIndex) => (
      (string.actionMeasurements ?? []).map((measurement) => ({
        string,
        stringIndex,
        measurement,
      }))
    ));
    readings.innerHTML = actionReadings.length === 0
      ? '<p class="step-note">No additional readings.</p>'
      : actionReadings.map(({ string, stringIndex, measurement }) => `
        <div class="sparse-action-reading">
          <span>C${string.courseIndex + 1} · ${escapeMarkup(string.name)}</span>
          <span>Fret ${measurement.fretNumber}</span>
          <strong>${lengthUnits.format(measurement.clearanceAboveFretMm)}</strong>
          <button type="button" data-remove-sparse-action="${stringIndex}:${measurement.fretNumber}" aria-label="Remove ${escapeMarkup(string.name)} fret ${measurement.fretNumber} reading" title="Remove reading">×</button>
        </div>
      `).join("");
  }

  function addReading() {
    clearInputError(fretInput);
    clearInputError(clearanceInput);
    try {
      const setup = readSetup();
      const entry = readEntry(setup);
      const string = setup.strings[entry.stringIndex];
      const existingMeasurements = string.actionMeasurements ?? [];
      string.actionMeasurements = [
        ...existingMeasurements.filter(({ fretNumber }) => fretNumber !== entry.fretNumber),
        {
          fretNumber: entry.fretNumber,
          clearanceAboveFretMm: entry.clearanceAboveFretMm,
        },
      ].sort((left, right) => left.fretNumber - right.fretNumber);
      render(setup);
      onMeasurementsChanged();
    } catch (error) {
      showInputError(clearanceInput, error.message);
      onError(error);
    }
  }

  function readEntry(setup) {
    const entry = {
      stringIndex: Number(stringSelect.value),
      fretNumber: Number(fretInput.value),
      clearanceAboveFretMm: lengthUnits.read(clearanceInput.value),
    };
    requireEntry(setup, entry);
    return entry;
  }

  function requireEntry(setup, { stringIndex, fretNumber, clearanceAboveFretMm }) {
    if (!Number.isInteger(stringIndex) || !setup.strings[stringIndex]) {
      throw new RangeError("Choose a physical string");
    }
    if (!Number.isInteger(fretNumber) || fretNumber < 0 || fretNumber > setup.fretCount) {
      throw new RangeError(`Fret must be a whole number from 0 to ${setup.fretCount}`);
    }
    if (!Number.isFinite(clearanceAboveFretMm) || clearanceAboveFretMm < 0) {
      throw new RangeError("Clearance must be zero or greater");
    }
  }

  function removeReading(event) {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest("[data-remove-sparse-action]");
    if (!button) return;
    const [stringIndex, fretNumber] = button.dataset.removeSparseAction
      .split(":")
      .map(Number);
    const setup = readSetup();
    const string = setup.strings[stringIndex];
    string.actionMeasurements = (string.actionMeasurements ?? [])
      .filter((measurement) => measurement.fretNumber !== fretNumber);
    render(setup);
    onMeasurementsChanged();
  }
}
