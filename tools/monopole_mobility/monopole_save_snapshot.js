(function (globalScope) {
  function buildMonopoleSnapshotApplyPlan(snapshot, defaults, messages) {
    var source = snapshot || {};
    var fallback = defaults || {};
    return {
      name: readMonopoleSnapshotName(source, fallback, messages || {}),
      type: readMonopoleSnapshotType(source, fallback),
      mode: readMonopoleSnapshotMode(source),
      staticInputs: readMonopoleStaticSnapshotInputs(source, fallback),
      dynamicInputs: readMonopoleDynamicSnapshotInputs(source, fallback),
    };
  }

  function readMonopoleSnapshotName(source, fallback, messages) {
    var untitledSample = messages.untitledSample || "Untitled sample";
    return String(source.name || fallback.name || untitledSample).trim() || untitledSample;
  }

  function readMonopoleSnapshotType(source, fallback) {
    var value = String(source.type || fallback.type || "other").trim();
    return value === "steel" || value === "classical" || value === "other" ? value : "other";
  }

  function readMonopoleSnapshotMode(source) {
    return String(source.mode || "").trim() === "dynamic" ? "dynamic" : "static";
  }

  function readMonopoleStaticSnapshotInputs(source, fallback) {
    var inputs = source.inputs || {};
    var staticDefaults = fallback.static || {};
    return {
      freqHz: readMonopoleSnapshotValue(inputs.freqHz, staticDefaults.freq),
      deflectionMm: readMonopoleSnapshotValue(inputs.deflectionMm, staticDefaults.deflection),
      testMassKg: readMonopoleSnapshotValue(inputs.testMassKg, staticDefaults.mass),
    };
  }

  function readMonopoleDynamicSnapshotInputs(source, fallback) {
    var inputs = source.inputs || {};
    var dynamicDefaults = fallback.dynamic || {};
    return {
      unloadedFrequencyHz: readMonopoleSnapshotValue(inputs.unloadedFrequencyHz, dynamicDefaults.f0),
      loadedFrequencyHz: readMonopoleSnapshotValue(inputs.loadedFrequencyHz, dynamicDefaults.f1),
      addedMassG: readMonopoleSnapshotValue(inputs.addedMassG, dynamicDefaults.addedMass),
    };
  }

  function readMonopoleSnapshotValue(value, fallback) {
    var text = String(value || "").trim();
    return text || String(fallback || "").trim();
  }

  var api = {
    buildMonopoleSnapshotApplyPlan: buildMonopoleSnapshotApplyPlan,
  };

  globalScope.MonopoleSaveSnapshot = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
