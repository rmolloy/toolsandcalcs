(function (globalScope) {
  function buildMonopoleSaveSummary(args) {
    var settings = args || {};
    var messages = settings.messages || {};
    return [methodRow(settings.mode, messages)]
      .concat(valueRows(resultRows(messages), settings.outputs, "calculated"))
      .concat(valueRows(inputRowsForMode(settings.mode, messages), settings.inputs, settings.defaultsMatch ? "default" : "measured"));
  }

  function methodRow(mode, messages) {
    return {
      label: messages.method || "Method",
      value: mode === "dynamic"
        ? messages.dynamicMassLoading || "Dynamic mass loading"
        : messages.staticDeflection || "Static deflection",
    };
  }

  function resultRows(messages) {
    return [
      { key: "mobilityScore", label: messages.mobilityScore || "Mobility score", unit: "" },
      { key: "stiffnessNPerM", label: messages.topStiffness || "Top stiffness K", unit: " N/m" },
      { key: "effectiveMassG", label: messages.effectiveMass || "Effective mass", unit: " g" },
    ];
  }

  function inputRowsForMode(mode, messages) {
    return mode === "dynamic" ? dynamicInputRows(messages) : staticInputRows(messages);
  }

  function staticInputRows(messages) {
    return [
      { key: "freqHz", label: messages.frequency || "Frequency", unit: " Hz" },
      { key: "deflectionMm", label: messages.deflection || "Deflection", unit: " mm" },
      { key: "testMassKg", label: messages.testMass || "Test mass", unit: " kg" },
    ];
  }

  function dynamicInputRows(messages) {
    return [
      { key: "unloadedFrequencyHz", label: messages.unloadedFrequency || "Unloaded frequency", unit: " Hz" },
      { key: "loadedFrequencyHz", label: messages.loadedFrequency || "Loaded frequency", unit: " Hz" },
      { key: "addedMassG", label: messages.addedMass || "Added mass", unit: " g" },
    ];
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
