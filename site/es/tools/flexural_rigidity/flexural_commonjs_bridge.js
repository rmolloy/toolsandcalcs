if (typeof window !== "undefined") {
  window.exports = window.exports || {};
  window.module = window.module || { exports: window.exports };
  window.require =
    window.require ||
    function (name) {
      if (name === "../calculator.js") {
        return {
          ...window.FlexuralRigidity,
          FlexuralRigidity: window.FlexuralRigidity,
        };
      }
      if (name === "../calculator" || name === "./calculator") {
        return { FlexuralRigidity: window.FlexuralRigidity };
      }
      if (name === "./brace-geometry.js" || name === "./brace-geometry") {
        return {
          BraceGeometry: window.BraceGeometry,
          computeBraceGeometry: window.BraceGeometry?.computeBraceGeometry,
          calculateBraceRenderModel:
            window.BraceGeometry?.calculateBraceRenderModel,
          calculateBraceComparisonModel:
            window.BraceGeometry?.calculateBraceComparisonModel,
        };
      }
      if (name === "./brace-match-plan.js" || name === "./brace-match-plan") {
        return {
          BraceMatchPlan: window.BraceMatchPlan,
          braceMatchPlanSolve: window.BraceMatchPlan?.solve,
        };
      }
      return window[name] || {};
    };
}
