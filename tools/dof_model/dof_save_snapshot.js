(function (globalScope) {
  function buildDofSnapshotApplyPlan(snapshot, defaults) {
    var source = snapshot || {};
    var baseline = defaults || {};
    return {
      params: { ...(baseline.params || {}), ...(source.params || {}) },
      modelOrder: readDofSnapshotOrder(source.modelOrder, baseline.modelOrder),
      taskMode: readDofSnapshotTaskMode(source.taskMode),
      overlayEnabled: Boolean(source.overlayEnabled),
      fitInputs: { ...(source.fitInputs || {}) },
      solveOptions: { ...(source.solveOptions || {}) },
    };
  }

  function readDofSnapshotOrder(value, fallback) {
    var order = Number(value);
    return order >= 1 && order <= 4 ? order : Number(fallback || 4);
  }

  function readDofSnapshotTaskMode(value) {
    var mode = String(value || "").trim();
    return mode === "fit" || mode === "solve" ? mode : "edit";
  }

  var api = { buildDofSnapshotApplyPlan: buildDofSnapshotApplyPlan };
  globalScope.DofSaveSnapshot = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
