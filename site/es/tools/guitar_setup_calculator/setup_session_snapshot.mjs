const SPECIAL_NUMBERS = Object.freeze({ Infinity, '-Infinity': -Infinity, NaN });

export function createSetupSessionSnapshot({ setup, unit, userEntryGroups, step, view }) {
  return {
    version: 1,
    setupJson: JSON.stringify(setup, encodeSetupValue),
    unit,
    userEntryGroups: [...userEntryGroups],
    step,
    view,
  };
}

export function readSetupSessionSnapshot(snapshot) {
  if (snapshot?.version !== 1) return null;
  try {
    const setup = JSON.parse(snapshot.setupJson, decodeSetupValue);
    return hasRestorableSetupShape(setup) && hasRestorableViewShape(snapshot) ? { ...snapshot, setup } : null;
  } catch {
    return null;
  }
}

function encodeSetupValue(key, value) {
  if (key === 'tensionCatalog') return undefined;
  return typeof value === 'number' && !Number.isFinite(value)
    ? { setupNumber: String(value) } : value;
}

function decodeSetupValue(_key, value) {
  return value && Object.keys(value).length === 1 && Object.hasOwn(SPECIAL_NUMBERS, value.setupNumber)
    ? SPECIAL_NUMBERS[value.setupNumber] : value;
}

function hasRestorableSetupShape(setup) {
  return Boolean(hasRadiusShape(setup?.radiusProfile) && hasBenchTargets(setup?.benchActionTargets)
    && hasRestorableStrings(setup?.strings) && hasSetupNumbers(setup));
}

function hasBenchTargets(targets) {
  return hasNumbers(targets?.actionAtMeasurementWithCapoMm, ['firstStringMm', 'lastStringMm'])
    && hasNumbers(targets?.nutActionAtFirstFretMm, ['firstStringMm', 'lastStringMm']);
}

function hasRestorableStrings(strings) {
  return Array.isArray(strings) && strings.length > 0 && strings.length <= 16
    && strings.every(hasStringShape);
}

function hasStringShape(string) {
  return typeof string?.name === 'string' && hasNumbers(string,
    ['scaleLengthMm', 'gaugeMm', 'openMidiNote', 'courseIndex', 'unitMassKgPerMeter', 'axialStiffnessN']);
}

function hasSetupNumbers(setup) {
  return hasNumbers(setup, ['scaleLengthMm', 'fretCount', 'fanNeutralFret', 'reliefAmountMm', 'reliefPeakFret', 'extraStringLengthMm']);
}

function hasRadiusShape(radius) {
  return radius?.kind === 'compound' ? hasNumbers(radius, ['nutRadiusMm', 'bridgeRadiusMm'])
    : radius?.kind === 'simple' && hasNumbers(radius, ['radiusMm']);
}

function hasNumbers(record, keys) {
  return keys.every((key) => typeof record?.[key] === 'number');
}

function hasRestorableViewShape(snapshot) {
  return ['mm', 'in'].includes(snapshot.unit) && Array.isArray(snapshot.userEntryGroups)
    && Number.isInteger(snapshot.step) && snapshot.step >= 0 && snapshot.step < 6;
}
