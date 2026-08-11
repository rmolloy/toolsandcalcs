// Compute EI/I results using the current top inputs and loaded braces.
(function initFlexuralResults() {
  const calc = window.FlexuralRigidity;
  if (!calc) return;

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

  const DEFAULT_MODULUS = 12; // GPa
  let braceLayouts = [];

  function format(value, digits = 2) {
    if (!Number.isFinite(value)) return "—";
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    }).format(value);
  }

  function normalizeShape(shape) {
    const s = (shape || "").toString().toLowerCase();
    if (s.includes("tri")) return calc.Shapes.TRIANGLE;
    if (s.includes("para")) return calc.Shapes.PARABOLIC;
    if (s.includes("rect")) return calc.Shapes.RECTANGLE;
    return calc.Shapes.RECTANGLE;
  }

  function buildBraceSpecs() {
    return braceLayouts
      .map((brace, idx) => {
        const segs = Array.isArray(brace.segments) ? brace.segments : [];
        const normalized = segs
          .map((seg, segIdx) => {
            const height = Number(seg.height);
            if (!Number.isFinite(height) || height <= 0) return null;
            const breadth = Number(seg.breadth ?? seg.width ?? seg.b) || 0;
            const modulusGPa = Number(seg.modulus);
            const materialE = (Number.isFinite(modulusGPa) && modulusGPa > 0 ? modulusGPa : DEFAULT_MODULUS) * 1000;
            return {
              label: seg.label || `Segment ${segIdx + 1}`,
              shape: normalizeShape(seg.shape),
              h: height,
              material: { E: materialE },
              breadth
            };
          })
          .filter(Boolean);
        if (!normalized.length) return null;
        const maxBreadth = normalized.reduce((max, seg) => Math.max(max, seg.breadth || 0), 0) || 10;
        return {
          b: maxBreadth,
          segments: normalized
        };
      })
      .filter(Boolean);
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

  function run() {
    try {
      const span = Number(spanInput.value) || 500;
      const thickness = Number(thicknessInput.value) || 4;
      const modulusTop = (Number(modulusInput.value) || DEFAULT_MODULUS) * 1000;
      const braces = buildBraceSpecs();
      if (!braces.length) {
        statusEl.textContent = "Awaiting brace layout.";
        writeResultValues("—", "—", "—", "—");
        return;
      }
      const slice = calc.computeSlice({
        spanAA: span,
        topThickness: thickness,
        topModulus: modulusTop,
        braces
      });
      const firstBrace = slice.braces[0];
      writeResultValues(
        `${format(slice.EI / 1e6, 3)}`,
        format(slice.transformedI, 1),
        `${format(slice.centroid, 2)} mm`,
        firstBrace ? `${format(firstBrace.height, 1)} mm` : "—"
      );
      statusEl.textContent = "Live: computed from current inputs.";
    } catch (error) {
      writeResultValues("—", "—", "—", "—");
      const message = error instanceof Error ? error.message : String(error);
      statusEl.textContent = `Error: ${message}`;
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
