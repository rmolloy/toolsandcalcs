(function attachLengthUnitController(runtime) {
  function createLengthUnitController(preference, requestedUnit) {
    let unit = validUnit(requestedUnit) ? requestedUnit : preference.read();
    let adapter = null;
    const listeners = new Set();
    return Object.freeze({ register, select, read: () => unit || 'mm', subscribe });

    function register(candidate) {
      if (adapter && adapter !== candidate) throw Error('Only one length-unit adapter is allowed per page');
      const nextUnit = unit || candidate.readUnit();
      if (!validUnit(nextUnit)) return false;
      if (candidate.applyUnit(nextUnit) === false) return false;
      adapter = candidate;
      return accept(nextUnit);
    }

    function select(nextUnit) {
      if (!validUnit(nextUnit)) return false;
      if (adapter?.applyUnit(nextUnit) === false) return false;
      return accept(nextUnit);
    }

    function accept(nextUnit) {
      unit = nextUnit;
      preference.write(unit);
      listeners.forEach((listener) => listener({ unit, available: Boolean(adapter) }));
      return true;
    }

    function subscribe(listener) {
      listeners.add(listener);
      listener({ unit: unit || 'mm', available: Boolean(adapter) });
      return () => listeners.delete(listener);
    }
  }

  function validUnit(value) {
    return value === 'mm' || value === 'in';
  }

  function readStorage() {
    try { return runtime.localStorage; }
    catch { return null; }
  }

  function readRequestedUnit() {
    if (runtime.location.protocol !== 'file:') return null;
    return new URL(runtime.location.href).searchParams.get('tl-length-unit');
  }

  const api = Object.freeze({ createLengthUnitController });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (!runtime.document) return;
  const preference = runtime.ToolLengthUnitPreference.createLengthUnitPreference(readStorage());
  runtime.ToolLengthUnits = createLengthUnitController(preference, readRequestedUnit());
})(typeof window !== 'undefined' ? window : globalThis);
