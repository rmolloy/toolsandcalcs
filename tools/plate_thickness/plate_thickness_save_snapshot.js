(function (globalScope) {
  function buildPlateThicknessSnapshotApplyPlan(snapshot, defaults) {
    var source = snapshot || {};
    var fallback = defaults || {};
    var inputs = source.inputs || {};
    return {
      fields: {
        target_freq: readPlateThicknessSnapshotValue(inputs.target_freq, fallback.targetFreq, 1),
        lower_bout: readPlateThicknessSnapshotValue(inputs.lower_bout, fallback.lowerBout, 1000),
        body_length: readPlateThicknessSnapshotValue(inputs.body_length, fallback.bodyLength, 1000),
        panel_length: readPlateThicknessSnapshotValue(inputs.panel_length, fallback.panelLength, 1000),
        panel_width: readPlateThicknessSnapshotValue(inputs.panel_width, fallback.panelWidth, 1000),
        panel_height: readPlateThicknessSnapshotValue(inputs.panel_height, fallback.panelHeight, 1000),
        panel_mass: readPlateThicknessSnapshotValue(inputs.panel_mass, fallback.panelMass, 1000),
        long_freq: readPlateThicknessSnapshotValue(inputs.long_freq, fallback.longFreq, 1),
        cross_freq: readPlateThicknessSnapshotValue(inputs.cross_freq, fallback.crossFreq, 1),
        twist_freq: readPlateThicknessSnapshotValue(inputs.twist_freq, fallback.twistFreq, 1),
      },
    };
  }

  function readPlateThicknessSnapshotValue(value, fallback, scale) {
    var text = String(value || "").trim();

    if (text) {
      return text;
    }

    var number = Number(fallback) * Number(scale || 1);
    return Number.isFinite(number) ? formatPlateThicknessSnapshotNumber(number) : "";
  }

  function formatPlateThicknessSnapshotNumber(value) {
    return String(Number(value.toFixed(2))).trim();
  }

  var api = {
    buildPlateThicknessSnapshotApplyPlan: buildPlateThicknessSnapshotApplyPlan,
  };

  globalScope.PlateThicknessSaveSnapshot = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
