document.addEventListener("DOMContentLoaded", () => {
  const spanInput = /** @type {HTMLInputElement|null} */ (document.getElementById("top_span_input"));
  const thicknessInput = /** @type {HTMLInputElement|null} */ (document.getElementById("top_thickness_input"));
  const previewTargets = [
    readPreviewTarget("aa_view", "viz_axis_x", "viz_axis_y", "viz_span_line", "viz_top", "viz_braces", "viz_centroid", "viz_status"),
    readPreviewTarget("edit_aa_view", "edit_viz_axis_x", "edit_viz_axis_y", "edit_viz_span_line", "edit_viz_top", "edit_viz_braces", "edit_viz_centroid", "top_profile_meta"),
  ].filter(Boolean);
  if (!spanInput || !thicknessInput || !previewTargets.length) return;

  let bracesFromLayout = readInitialVizBraces();
  const placeholderBraces = [
    {
      offset: 0,
      width: 10,
      centroid: null,
      segments: [
        { shape: "rect", height: 4, breadth: 10 },
        { shape: "tri", height: 8, breadth: 10 }
      ]
    }
  ];

  function readInitialVizBraces() {
    if (Array.isArray(window.FlexuralDefaultLayout?.braces)) {
      return window.FlexuralDefaultLayout.braces;
    }
    if (Array.isArray(window.braceLayoutCache?.braces)) {
      return window.braceLayoutCache.braces;
    }
    return [];
  }

  function normalizeShape(value) {
    const str = (value ?? "").toString().toLowerCase();
    if (str.includes("tri")) return "tri";
    if (str.includes("para")) return "para";
    return "rect";
  }

  function readPreviewTarget(svgId, axisXId, axisYId, spanLineId, topId, bracesId, centroidId, statusId) {
    const svg = document.getElementById(svgId);
    const axisX = document.getElementById(axisXId);
    const axisY = document.getElementById(axisYId);
    const spanLine = document.getElementById(spanLineId);
    const topRect = document.getElementById(topId);
    const bracesGroup = document.getElementById(bracesId);
    const centroidLine = document.getElementById(centroidId);
    const status = document.getElementById(statusId);
    if (!svg || !axisX || !axisY || !spanLine || !topRect || !bracesGroup || !centroidLine || !status) return null;
    return { svg, axisX, axisY, spanLine, topRect, bracesGroup, centroidLine, status };
  }

  function getVizBraces(spanValue) {
    if (bracesFromLayout.length) {
      const span = Math.max(Number(spanValue) || 500, 1);
      const count = bracesFromLayout.length;
      const spacing = span / (count + 1);
      const start = -span / 2 + spacing;
      return bracesFromLayout.map((brace, idx) => {
        const segments = Array.isArray(brace.segments) ? brace.segments : [];
        const width = Number(segments[segments.length - 1]?.breadth ?? brace.width ?? brace.breadth) || 10;
        return {
          offset: start + idx * spacing,
          width,
          segments: segments.map((seg) => ({
            shape: normalizeShape(seg.shape),
            height: Number(seg.height) || 0,
            breadth: Number(seg.breadth ?? seg.width ?? seg.b) || undefined,
          })).filter((seg) => seg.height > 0),
        };
      });
    }
    return placeholderBraces;
  }

  function renderAaPreview() {
    const width = 700;
    const padding = 24;
    const span = Math.max(Number(spanInput.value) || 500, 1);
    const topHeight = Math.max(Number(thicknessInput.value) || 4, 0.5);
    const braces = getVizBraces(span);
    const maxBraceH = braces.reduce((max, brace) => Math.max(max, brace.segments.reduce((sum, seg) => sum + seg.height, 0)), 0);
    const totalH = Math.max(topHeight + maxBraceH, 1);

    previewTargets.forEach((target) => renderAaPreviewTarget(target, { width, padding, span, topHeight, braces, totalH }));
  }

  function renderAaPreviewTarget(target, state) {
    const { width, padding, span, topHeight, braces, totalH } = state;
    const svgWidth = target.svg.clientWidth || width;
    const spanDraw = Math.max(svgWidth - 2 * padding, 1);
    const scaleX = spanDraw / span;
    const scaleY = scaleX; // lock Y to X so proportions stay true
    const offsetX = padding;
    const viewHeight = padding * 2 + Math.max(totalH * scaleY, padding);
    target.svg.setAttribute("viewBox", `0 0 ${svgWidth} ${viewHeight}`);
    target.svg.style.height = `${viewHeight}px`;
    const baseY = viewHeight - padding;

    target.spanLine.setAttribute("x1", "0");
    target.spanLine.setAttribute("x2", "0");
    target.spanLine.setAttribute("y1", "0");
    target.spanLine.setAttribute("y2", "0");
    target.axisX.setAttribute("x1", offsetX.toString());
    target.axisX.setAttribute("x2", (offsetX + spanDraw).toString());
    target.axisX.setAttribute("y1", baseY.toString());
    target.axisX.setAttribute("y2", baseY.toString());
    target.axisY.setAttribute("x1", offsetX.toString());
    target.axisY.setAttribute("x2", offsetX.toString());
    target.axisY.setAttribute("y1", baseY.toString());
    target.axisY.setAttribute("y2", (baseY - totalH * scaleY).toString());

    const topY = baseY - topHeight * scaleY;
    target.topRect.setAttribute("x", offsetX.toString());
    target.topRect.setAttribute("y", topY.toString());
    target.topRect.setAttribute("width", spanDraw.toString());
    target.topRect.setAttribute("height", Math.max(topHeight * scaleY, 1).toString());
    target.topRect.setAttribute("fill", "var(--border-soft)");
    target.topRect.setAttribute("stroke", "rgba(255,255,255,0.7)");
    target.topRect.setAttribute("stroke-width", "1.4");

    target.bracesGroup.replaceChildren();
    const centerX = offsetX + spanDraw / 2;
    const svgNS = "http://www.w3.org/2000/svg";
    braces.forEach((brace) => {
      const maxSegBreadthMm = brace.segments.reduce((max, seg) => Math.max(max, Number(seg.breadth) || 0), 0);
      const braceWidthMm = Math.max(brace.width, maxSegBreadthMm || brace.width, 1);
      const braceWidthPx = braceWidthMm * scaleX;
      let currentY = baseY - topHeight * scaleY;
      brace.segments.forEach((segment) => {
        const segHeightPx = segment.height * scaleY;
        const segY = currentY - segHeightPx;
        const segBreadthMm = Math.max(Number(segment.breadth) || braceWidthMm, 0.1);
        const segWidthPx = segBreadthMm * scaleX;
        const segX = centerX + brace.offset * scaleX - segWidthPx / 2;
        let element;
        if (segment.shape === "tri") {
          element = document.createElementNS(svgNS, "path");
          element.setAttribute("d", `M${segX} ${currentY} L${segX + segWidthPx} ${currentY} L${segX + segWidthPx / 2} ${segY} Z`);
        } else if (segment.shape === "para") {
          element = document.createElementNS(svgNS, "path");
          const left = segX;
          const right = left + segWidthPx;
          const mid = (left + right) / 2;
          element.setAttribute("d", `M${left} ${currentY} L${right} ${currentY} Q${mid} ${segY} ${left} ${currentY} Z`);
        } else {
          element = document.createElementNS(svgNS, "rect");
          element.setAttribute("x", segX.toString());
          element.setAttribute("y", segY.toString());
          element.setAttribute("width", Math.max(segWidthPx, 1).toString());
          element.setAttribute("height", Math.max(segHeightPx, 1).toString());
        }
        element.setAttribute("fill", segment.shape === "tri" ? "var(--orange)" : "var(--blue)");
        target.bracesGroup.appendChild(element);
        const outline = element.cloneNode(false);
        outline.setAttribute("fill", "none");
        outline.setAttribute("stroke", "rgba(255,255,255,0.7)");
        outline.setAttribute("stroke-width", "1.2");
        target.bracesGroup.appendChild(outline);
        currentY = segY;
      });
    });

    const centroidVal = Number.isFinite(window.vizCentroidMm) && window.vizCentroidMm > 0
      ? window.vizCentroidMm
      : topHeight / 2;
    const centroidY = baseY - centroidVal * scaleY;
    target.centroidLine.setAttribute("x1", offsetX.toString());
    target.centroidLine.setAttribute("x2", (offsetX + spanDraw).toString());
    target.centroidLine.setAttribute("y1", centroidY.toString());
    target.centroidLine.setAttribute("y2", centroidY.toString());
    target.status.textContent = `Span: ${span.toFixed(0)} mm · Top thickness: ${topHeight.toFixed(1)} mm · Braces: ${braces.length}`;
  }

  spanInput.addEventListener("input", renderAaPreview);
  thicknessInput.addEventListener("input", renderAaPreview);
  window.addEventListener("braceLayoutChanged", (event) => {
    const detail = event.detail || {};
    const incomingBraces = Array.isArray(detail.braces) ? detail.braces : Array.isArray(detail) ? detail : [];
    bracesFromLayout = incomingBraces;
    if (detail.top) {
      const { span, thickness } = detail.top;
      if (spanInput && Number.isFinite(span)) spanInput.value = String(span);
      if (thicknessInput && Number.isFinite(thickness)) thicknessInput.value = String(thickness);
    }
    renderAaPreview();
  });
  window.addEventListener("centroidUpdated", (event) => {
    const detail = event.detail || {};
    const value = Number(detail.centroidMm);
    if (Number.isFinite(value)) {
      window.vizCentroidMm = value;
      renderAaPreview();
    }
  });
  renderAaPreview();
});

