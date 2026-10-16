(function attachLengthUnitPreference(runtime) {
  const KEY = 'tonelab.length-unit.v1';

  function createLengthUnitPreference(storage) {
    return Object.freeze({ read: () => readPreference(storage), write: (unit) => writePreference(storage, unit) });
  }

  function readPreference(storage) {
    try {
      const value = storage?.getItem(KEY);
      return isLengthUnit(value) ? value : null;
    } catch {
      return null;
    }
  }

  function writePreference(storage, unit) {
    if (!storage || !isLengthUnit(unit)) return false;
    try {
      storage.setItem(KEY, unit);
      return true;
    } catch {
      return false;
    }
  }

  function isLengthUnit(value) {
    return value === 'mm' || value === 'in';
  }

  const api = Object.freeze({ createLengthUnitPreference, isLengthUnit });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  runtime.ToolLengthUnitPreference = api;
})(typeof window !== 'undefined' ? window : globalThis);
