// Compute EI/I results using the current top inputs and loaded braces.
(function initFlexuralResults() {
  const calc = window.FlexuralRigidity;
  if (!calc) return;

  // localized-runtime-messages:start
  const flexuralResultsMessages = Object.freeze({
    awaitingBraceLayout: "En attente du barrage.",
    errorTemplate: "Erreur : {message}",
    liveComputedFromInputs: "En direct : calculé à partir des données actuelles."
  });
  // localized-runtime-messages:end

  const spanInput = /** @type {HTMLInputElement|null} */ (document.getElementById("top_span_input"));
  const thicknessInput = /** @type {HTMLInputElement|null} */ (document.getElementById("top_thickness_input"));
  const modulusInput = /** @type {HTMLInputElement|null} */ (document.getElementById("top_modulus_input"));
  const resultEI = document.getElementById("result_ei");
  const resultI = document.getElementById("result_I");
  const resultCentroid = document.getElementById("result_centroid");
  const resultHeight = document.getElementById("result_height");
  const editResultEI = document.getElementById("edit_result_ei");
  const editResultI = document.getElementById("edit_result_I");
  const editResultCentroid = document.getElementById("edit_result_centroid");
  const statusEl = document.getElementById("result_status");
  if (!spanInput || !thicknessInput || !modulusInput || !resultEI || !resultI || !resultCentroid || !resultHeight || !editResultEI || !editResultI || !editResultCentroid || !statusEl) return;

  // The page's own (localized) opening status, shown again while a top input is blank.
  const readyForInputsStatus = statusEl.textContent;
  let braceLayouts = [];

  function format(value, digits = 2) {
    if (!Number.isFinite(value)) return "—";
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    }).format(value);
  }

  function writeResultValues(ei, transformedI, centroid, height) {
    resultEI.textContent = ei;
    resultI.textContent = transformedI;
    resultCentroid.textContent = centroid;
    resultHeight.textContent = height;
    editResultEI.textContent = ei;
    editResultI.textContent = transformedI;
    editResultCentroid.textContent = centroid;
  }

  function topInputsEntered() {
    return [spanInput, thicknessInput, modulusInput].every((input) => Number(input.value) > 0);
  }

  // The engine's result for the luthier's own top inputs, for a notebook save to keep as measurements.
  function publishSavedResults(slice) {
    window.FlexuralLatestResults = slice ? calc.savedResultsFromSlice(slice) : null;
  }

  function run() {
    publishSavedResults(null);
    // No result is shown for a top the luthier has not fully described.
    if (!topInputsEntered()) {
      statusEl.textContent = readyForInputsStatus;
      writeResultValues("—", "—", "—", "—");
      return;
    }
    try {
      const braces = calc.braceSpecsFromLayout(braceLayouts);
      if (!braces.length) {
        statusEl.textContent = flexuralResultsMessages.awaitingBraceLayout;
        writeResultValues("—", "—", "—", "—");
        return;
      }
      const slice = calc.computeSlice({
        ...calc.sliceTopFromLayout({
          span: Number(spanInput.value),
          thickness: Number(thicknessInput.value),
          modulus: Number(modulusInput.value)
        }),
        braces
      });
      publishSavedResults(slice);
      const firstBrace = slice.braces[0];
      writeResultValues(
        `${format(slice.EI / 1e6, 3)}`,
        format(slice.transformedI, 1),
        `${format(slice.centroid, 2)} mm`,
        firstBrace ? `${format(firstBrace.height, 1)} mm` : "—"
      );
      statusEl.textContent = flexuralResultsMessages.liveComputedFromInputs;
    } catch (error) {
      writeResultValues("—", "—", "—", "—");
      const message = error instanceof Error ? error.message : String(error);
      statusEl.textContent = flexuralResultsMessages.errorTemplate.replace("{message}", message);
    }
  }

  [spanInput, thicknessInput, modulusInput].forEach(input => {
    input.addEventListener("input", run);
  });
  window.addEventListener("braceLayoutChanged", (event) => {
    const detail = event.detail || {};
    const incoming = Array.isArray(detail.braces) ? detail.braces : Array.isArray(detail) ? detail : [];
    braceLayouts = incoming;
    if (detail.top) {
      const { span, thickness, modulus } = detail.top;
      if (Number.isFinite(span)) spanInput.value = String(span);
      if (Number.isFinite(thickness)) thicknessInput.value = String(thickness);
      if (Number.isFinite(modulus) && modulusInput) modulusInput.value = String(modulus);
    }
    run();
  });

  run();
  // Request the current brace layout after listeners are attached.
  window.dispatchEvent(new CustomEvent("requestBraceLayout"));
})();
