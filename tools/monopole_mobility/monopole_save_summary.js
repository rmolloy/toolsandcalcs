(function (globalScope) {
  var RESULT_ROWS = [
    { key: "mobilityScore", label: "Mobility score", unit: "" },
    { key: "stiffnessNPerM", label: "Top stiffness K", unit: " N/m" },
    { key: "effectiveMassG", label: "Effective mass", unit: " g" },
  ];

  var STATIC_INPUT_ROWS = [
    { key: "freqHz", label: "Frequency", unit: " Hz" },
    { key: "deflectionMm", label: "Deflection", unit: " mm" },
    { key: "testMassKg", label: "Test mass", unit: " kg" },
  ];

  var DYNAMIC_INPUT_ROWS = [
    { key: "unloadedFrequencyHz", label: "Unloaded frequency", unit: " Hz" },
    { key: "loadedFrequencyHz", label: "Loaded frequency", unit: " Hz" },
    { key: "addedMassG", label: "Added mass", unit: " g" },
  ];

  function buildMonopoleSaveSummary(args) {
    var settings = args || {};
    return [methodRow(settings.mode)]
      .concat(valueRows(RESULT_ROWS, settings.outputs, "calculated"))
      .concat(valueRows(inputRowsForMode(settings.mode), settings.inputs, settings.defaultsMatch ? "default" : "measured"));
  }

  function methodRow(mode) {
    return {
      label: "Method",
      value: mode === "dynamic" ? "Dynamic mass loading" : "Static deflection",
    };
  }

  function inputRowsForMode(mode) {
    return mode === "dynamic" ? DYNAMIC_INPUT_ROWS : STATIC_INPUT_ROWS;
  }

  function valueRows(definitions, source, provenance) {
    var values = source || {};
    return definitions
      .filter(function (definition) { return hasValue(values[definition.key]); })
      .map(function (definition) {
        return {
          label: definition.label,
          value: String(values[definition.key]).trim() + definition.unit,
          provenance: provenance,
        };
      });
  }

  function hasValue(value) {
    var text = String(value === undefined || value === null ? "" : value).trim();
    return text !== "" && text !== "--";
  }

  var api = {
    buildMonopoleSaveSummary: buildMonopoleSaveSummary,
  };

  globalScope.MonopoleSaveSummary = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
