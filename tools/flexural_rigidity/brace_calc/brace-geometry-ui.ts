type BraceGeometryAPI = typeof import("./brace-geometry").BraceGeometry;
type BraceGeometryResult = import("./brace-geometry").BraceGeometryResult;
type ShapeKind = typeof import("../calculator").Shapes[keyof typeof import("../calculator").Shapes];

export {};

declare global {
  interface Window {
    BraceGeometry?: BraceGeometryAPI;
  }
}

interface StackSegment {
  id: string;
  label: string;
  shape: ShapeKind;
  height: number;
  breadth: number;
  density: number;
  modulus: number;
}

interface BraceConfig {
  id: string;
  name: string;
  segments: StackSegment[];
}

interface BraceRenderInfo {
  result?: BraceGeometryResult;
  error?: string;
}

(function initBraceGeometryUI() {
  const braceGeometry = window.BraceGeometry;
  if (!braceGeometry) {
    throw new Error("BraceGeometry calculator is unavailable. Ensure brace-geometry.js is loaded first.");
  }
  const api = braceGeometry;

  const galleryEl = requireElement<HTMLDivElement>("brace_gallery");
  const summaryEl = requireElement<HTMLDivElement>("brace_summary");
  const addBraceBtn = requireElement<HTMLButtonElement>("add_brace");
  const saveBtn = requireElement<HTMLButtonElement>("save_braces");
  const loadBtn = requireElement<HTMLButtonElement>("load_braces");
  const loadInput = requireElement<HTMLInputElement>("brace_file_input");

  const shapeSet = new Set<ShapeKind>(Object.values(api.Shapes));

  const DEFAULT_DENSITY = 420;
  const DEFAULT_MODULUS = 11;
  let braceCounter = 0;
  let segmentCounter = 0;
  let showAdvanced = false;
  const braceDom = new Map<string, {
    preview: HTMLElement;
    metrics: HTMLElement;
    info: HTMLElement;
    summary: HTMLElement;
  }>();
  let braces: BraceConfig[] = [createBrace("Brace 1")];

  function nextBraceId(): string {
    braceCounter += 1;
    return `brace-${braceCounter}`;
  }

  function nextSegmentId(): string {
    segmentCounter += 1;
    return `segment-${segmentCounter}`;
  }

  function createDefaultStack(): StackSegment[] {
    return [
      {
        id: nextSegmentId(),
        label: "Base",
        shape: api.Shapes.RECTANGLE,
        height: 4,
        breadth: 10,
        density: DEFAULT_DENSITY,
        modulus: DEFAULT_MODULUS
      },
      {
        id: nextSegmentId(),
        label: "Cap",
        shape: api.Shapes.TRIANGLE,
        height: 8,
        breadth: 10,
        density: DEFAULT_DENSITY,
        modulus: DEFAULT_MODULUS
      }
    ];
  }

  function createBrace(name: string): BraceConfig {
    return {
      id: nextBraceId(),
      name,
      segments: createDefaultStack()
    };
  }

  function format(value: number, digits = 2): string {
    if (!Number.isFinite(value)) return "—";
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    }).format(value);
  }

  function buildStackField(labelText: string, control: HTMLElement): HTMLElement {
    const wrapper = document.createElement("label");
    wrapper.className = "stack-field";
    const text = document.createElement("span");
    text.textContent = labelText;
    wrapper.append(text, control);
    return wrapper;
  }

  function run(fullRebuild = false): void {
    const renderInfo: Record<string, BraceRenderInfo> = {};
    const totalHeights: number[] = [];
    const breadths: number[] = [];
    braces.forEach(brace => {
      const stack = brace.segments
        .map(segment => ({
          label: segment.label,
          shape: segment.shape,
          height: Math.max(0, segment.height),
          breadth: Math.max(0.5, segment.breadth ?? 10),
          density: segment.density ?? DEFAULT_DENSITY,
          modulus: segment.modulus ?? DEFAULT_MODULUS
        }))
        .filter(segment => segment.height > 0);
      const totalHeight = stack.reduce((sum, segment) => sum + segment.height, 0);
      totalHeights.push(totalHeight);
      const representativeBreadth = stack.length ? stack[stack.length - 1].breadth : 10;
      breadths.push(representativeBreadth);
      try {
        const result = api.computeBraceGeometry(stack[0]?.breadth ?? 10, stack);
        renderInfo[brace.id] = { result };
      } catch (error) {
        renderInfo[brace.id] = { error: error instanceof Error ? error.message : String(error) };
      }
    });

    const referenceBreadth = Math.max(10, Math.max(...breadths, 10) * 1.2);
    const maxHeight = Math.max(...totalHeights, 10);
    if (
      fullRebuild ||
      braceDom.size !== braces.length ||
      !updateBraceVisuals(renderInfo, { referenceBreadth, maxHeight })
    ) {
      renderBraces(renderInfo, { referenceBreadth, maxHeight });
    }
    renderSummary(renderInfo);
    emitBraceLayout();
  }

  function renderBraces(
    renderInfo: Record<string, BraceRenderInfo>,
    scales: { referenceBreadth: number; maxHeight: number }
  ): void {
    galleryEl.replaceChildren();
    braceDom.clear();
    if (braces.length === 0) {
      braces = [createBrace("Brace 1")];
    }

    braces.forEach((brace, index) => {
      const info = renderInfo[brace.id];
      const card = document.createElement("div");
      card.className = "brace-card";

      const header = document.createElement("header");
      const nameInput = document.createElement("input");
      nameInput.value = brace.name;
      nameInput.placeholder = `Brace ${index + 1}`;
      nameInput.addEventListener("input", () => updateBrace(brace.id, { name: nameInput.value.trim() || `Brace ${index + 1}` }));
      header.append(nameInput);

      const previewContainer = document.createElement("div");
      previewContainer.className = "brace-preview";
      renderPreviewContent(previewContainer, brace, info?.result, scales);

      const infoRow = document.createElement("div");
      infoRow.className = "brace-info-row";
      const widthSpan = document.createElement("span");
      widthSpan.className = "brace-info-width";
      const heightSpan = document.createElement("span");
      heightSpan.className = "brace-info-height";
      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.textContent = "Remove";
      deleteBtn.disabled = braces.length === 1;
      deleteBtn.addEventListener("click", () => removeBrace(brace.id));
      infoRow.append(widthSpan, heightSpan, deleteBtn);
      updateBraceInfoRow(infoRow, brace);

      const metrics = document.createElement("div");
      metrics.className = "brace-meta-grid";
      renderMetricsContent(metrics, info);

      const stack = renderStackEditor(brace);
      const designDetails = document.createElement("details");
      designDetails.className = "brace-design";
      const designSummary = document.createElement("summary");
      designSummary.className = "brace-design-summary";
      updateDesignSummary(designSummary, brace);
      const stackHint = document.createElement("div");
      stackHint.className = "brace-design-hint";
      stackHint.textContent = "Click to expand and edit segments.";
      const designBody = document.createElement("div");
      designBody.className = "brace-design-body";
      designBody.append(stackHint, stack);
      designDetails.append(designSummary, designBody);

      braceDom.set(brace.id, { preview: previewContainer, metrics, info: infoRow, summary: designSummary });

      card.append(header, previewContainer, infoRow, metrics, designDetails);
      galleryEl.append(card);
    });
  }

  function updateBraceVisuals(
    renderInfo: Record<string, BraceRenderInfo>,
    scales: { referenceBreadth: number; maxHeight: number }
  ): boolean {
    for (const brace of braces) {
      const dom = braceDom.get(brace.id);
      if (!dom) return false;
      const info = renderInfo[brace.id];
      renderPreviewContent(dom.preview, brace, info?.result, scales);
      renderMetricsContent(dom.metrics, info);
      updateBraceInfoRow(dom.info, brace);
      updateDesignSummary(dom.summary, brace);
    }
    return true;
  }

  function updateBraceInfoRow(row: HTMLElement, brace: BraceConfig): void {
    const widthEl = row.querySelector(".brace-info-width");
    const heightEl = row.querySelector(".brace-info-height");
    const width = brace.segments[brace.segments.length - 1]?.breadth ?? 10;
    const height = brace.segments.reduce((sum, s) => sum + Math.max(0, s.height), 0);
    if (widthEl) widthEl.textContent = `Width: ${format(width, 1)} mm`;
    if (heightEl) heightEl.textContent = `Height: ${format(height, 1)} mm`;
  }

  function updateDesignSummary(summary: HTMLElement, brace: BraceConfig): void {
    const labels = brace.segments.map((seg) => seg.label || "").filter(Boolean).join(" / ");
    const detail = labels.length
      ? `Segments (${brace.segments.length}) — ${labels}`
      : `Segments (${brace.segments.length})`;
    summary.innerHTML = `
      <span class="design-label">Design</span>
      <span class="design-detail">${detail}</span>
    `;
  }

  function renderPreviewContent(
    container: HTMLElement,
    brace: BraceConfig,
    result: BraceGeometryResult | undefined,
    scales: { referenceBreadth: number; maxHeight: number }
  ): void {
    container.replaceChildren();
    const previewWidth = 140;
    const mmScale = previewWidth / Math.max(scales.referenceBreadth, 1);
    const previewHeight = Math.max(scales.maxHeight, 1) * mmScale;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${previewWidth} ${previewHeight}`);
    svg.classList.add("brace-preview-svg");
    svg.style.width = `${previewWidth}px`;
    svg.style.height = `${previewHeight}px`;
    let currentY = previewHeight;
    const totalHeight = brace.segments.reduce((sum, segment) => sum + Math.max(0, segment.height), 0);
    brace.segments.forEach(segment => {
      const segHeight = Math.max(0, segment.height);
      if (segHeight <= 0) return;
      const segHeightPx = segHeight * mmScale;
      const topY = currentY - segHeightPx;
      const segWidthMm = segment.breadth ?? 10;
      const segWidthPx = Math.max(2, segWidthMm * mmScale);
      const x = (previewWidth - segWidthPx) / 2;
      let element: SVGElement;
      if (segment.shape === api.Shapes.TRIANGLE) {
        element = document.createElementNS("http://www.w3.org/2000/svg", "path");
        element.setAttribute(
          "d",
          `M${x} ${currentY} L${x + segWidthPx} ${currentY} L${x + segWidthPx / 2} ${topY} Z`
        );
      } else if (segment.shape === api.Shapes.PARABOLIC) {
        element = document.createElementNS("http://www.w3.org/2000/svg", "path");
        const left = x;
        const right = x + segWidthPx;
        const mid = left + segWidthPx / 2;
        element.setAttribute(
          "d",
          `M${left} ${currentY} L${right} ${currentY} Q${mid} ${topY} ${left} ${currentY} Z`
        );
      } else {
        element = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        element.setAttribute("x", String(x));
        element.setAttribute("y", String(topY));
        element.setAttribute("width", String(segWidthPx));
        element.setAttribute("height", String(segHeightPx));
      }
      element.setAttribute("class", `preview-shape segment-${segment.shape}`);
      svg.append(element);
      const outline = element.cloneNode(false) as SVGElement;
      outline.setAttribute("class", "preview-outline");
      svg.append(outline);
      currentY = topY;
    });

    const meta = document.createElement("div");
    meta.className = "brace-preview-meta";
    const repBreadth = brace.segments.length ? brace.segments[brace.segments.length - 1].breadth : 10;
    const heightValue = result?.height ?? totalHeight;
    meta.textContent = `${format(repBreadth ?? 10, 1)} × ${format(heightValue, 1)} mm`;

    container.append(svg, meta);
  }

  function renderMetricsContent(metrics: HTMLElement, info: BraceRenderInfo | undefined): void {
    if (info?.result) {
      const massDisplay = `${format(info.result.massPerLength * 1000, 1)} g/m`;
      metrics.innerHTML = `
        <div class="metric-row"><span class="metric-label">Area</span><span class="metric-value">${format(info.result.area, 1)} mm²</span></div>
        <div class="metric-row"><span class="metric-label">Mass</span><span class="metric-value">${massDisplay}</span></div>
        <div class="metric-row"><span class="metric-label">Centroid</span><span class="metric-value">${format(info.result.centroid, 2)} mm</span></div>
        <div class="metric-row"><span class="metric-label">I</span><span class="metric-value">${format(info.result.I, 2)} mm⁴</span></div>
        <div class="metric-row"><span class="metric-label">EI</span><span class="metric-value primary">${format(info.result.EI, 2)} N·m²</span></div>
      `;
    } else if (info?.error) {
      metrics.innerHTML = `<div class="empty-state">${info.error}</div>`;
    } else {
      metrics.innerHTML = `<div class="empty-state">Add segments to compute geometry.</div>`;
    }
  }

  function renderStackEditor(brace: BraceConfig): HTMLElement {
    const container = document.createElement("div");
    container.className = "brace-stack";

    brace.segments.forEach((segment, index) => {
      const row = document.createElement("div");
      row.className = "brace-stack-row";

      const segmentChip = document.createElement("span");
      segmentChip.className = `segment-chip segment-chip-${segment.shape}`;
      segmentChip.textContent = segment.label || `Segment ${index + 1}`;

      const labelInput = document.createElement("input");
      labelInput.type = "text";
      labelInput.value = segment.label;
      labelInput.placeholder = `Segment ${index + 1}`;
      labelInput.addEventListener("input", () =>
        updateSegment(brace.id, segment.id, { label: labelInput.value.trim() || `Segment ${index + 1}` })
      );

      const shapeSelect = document.createElement("select");
      [
        { value: api.Shapes.RECTANGLE, label: "Rectangle" },
        { value: api.Shapes.TRIANGLE, label: "Triangle" },
        { value: api.Shapes.PARABOLIC, label: "Parabolic" }
      ].forEach(option => {
        const opt = document.createElement("option");
        opt.value = option.value;
        opt.textContent = option.label;
        shapeSelect.append(opt);
      });
      shapeSelect.value = segment.shape;
      shapeSelect.addEventListener("change", () => updateSegment(brace.id, segment.id, { shape: shapeSelect.value as ShapeKind }));

      const heightInput = document.createElement("input");
      heightInput.type = "number";
      heightInput.min = "0";
      heightInput.step = "0.1";
      heightInput.value = String(segment.height);
      heightInput.addEventListener("input", () =>
        updateSegment(brace.id, segment.id, { height: Number(heightInput.value) })
      );

      const widthInput = document.createElement("input");
      widthInput.type = "number";
      widthInput.min = "0.5";
      widthInput.step = "0.5";
      widthInput.value = String(segment.breadth ?? 10);
      widthInput.addEventListener("input", () =>
        updateSegment(brace.id, segment.id, { breadth: Number(widthInput.value) })
      );

      const densityInput = document.createElement("input");
      densityInput.type = "number";
      densityInput.min = "50";
      densityInput.step = "5";
      densityInput.value = String(segment.density ?? DEFAULT_DENSITY);
      densityInput.addEventListener("input", () =>
        updateSegment(brace.id, segment.id, { density: Number(densityInput.value) })
      );

      const modulusInput = document.createElement("input");
      modulusInput.type = "number";
      modulusInput.min = "0.1";
      modulusInput.step = "0.1";
      modulusInput.value = String(segment.modulus ?? DEFAULT_MODULUS);
      modulusInput.addEventListener("input", () =>
        updateSegment(brace.id, segment.id, { modulus: Number(modulusInput.value) })
      );

      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.textContent = "Remove";
      removeButton.disabled = brace.segments.length === 1;
      removeButton.addEventListener("click", () => removeSegment(brace.id, segment.id));

      const nameField = buildStackField("Segment label", labelInput);
      const shapeField = buildStackField("Shape", shapeSelect);
      const heightField = buildStackField("Height (mm)", heightInput);
      const widthField = buildStackField("Width (mm)", widthInput);
      const densityField = buildStackField("Density (kg/m³)", densityInput);
      const modulusField = buildStackField("Modulus E (GPa)", modulusInput);

      if (showAdvanced) {
        row.append(segmentChip, nameField, shapeField, heightField, widthField, densityField, modulusField, removeButton);
      } else {
        row.append(segmentChip, nameField, shapeField, heightField, widthField, removeButton);
      }
      container.append(row);
    });

    const actions = document.createElement("div");
    actions.className = "brace-stack-actions";
      const addSegmentBtn = document.createElement("button");
      addSegmentBtn.type = "button";
      addSegmentBtn.textContent = "+ Add segment";
      addSegmentBtn.addEventListener("click", () => addSegment(brace.id));

      const advancedBtn = document.createElement("button");
      advancedBtn.type = "button";
      advancedBtn.textContent = showAdvanced ? "Hide advanced" : "Show advanced";
      advancedBtn.addEventListener("click", () => toggleAdvanced());

      actions.append(addSegmentBtn, advancedBtn);
      container.append(actions);

      return container;
    }

  function renderSummary(renderInfo: Record<string, BraceRenderInfo>): void {
    summaryEl.replaceChildren();
    const entries = braces
      .map(brace => {
        const info = renderInfo[brace.id];
        return info?.result
          ? { brace, result: info.result }
          : null;
      })
      .filter((entry): entry is { brace: BraceConfig; result: BraceGeometryResult } => Boolean(entry));

    if (entries.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "Set at least one brace to compute comparisons.";
      summaryEl.append(empty);
      return;
    }

    const referenceMass = entries[0].result.massPerLength || 1;
    const referenceEI = entries[0].result.EI || 1;
    const referenceArea = entries[0].result.area || 1;
    const referenceI = entries[0].result.I || 1;

    entries.forEach(entry => {
      const card = document.createElement("div");
      card.className = "brace-summary-card";
      const relMass = (entry.result.massPerLength / referenceMass) * 100;
      const relEI = (entry.result.EI / referenceEI) * 100;
      const relArea = (entry.result.area / referenceArea) * 100;
      const relI = (entry.result.I / referenceI) * 100;
      card.innerHTML = `
        <h4>${entry.brace.name}</h4>
        <div class="metric"><span>Relative stiffness (EI)</span>${format(relEI, 1)}%</div>
        <div class="metric"><span>Relative moment of inertia (I)</span>${format(relI, 1)}%</div>
        <div class="metric"><span>Relative mass</span>${format(relMass, 1)}%</div>
        <div class="metric"><span>Relative area</span>${format(relArea, 1)}%</div>
      `;
      summaryEl.append(card);
    });
  }

  function updateBrace(id: string, updates: Partial<BraceConfig>): void {
    braces = braces.map(brace => {
      if (brace.id !== id) return brace;
      return {
        ...brace,
        ...updates
      };
    });
    run();
  }

  function addBrace(): void {
    const nextIndex = braces.length + 1;
    braces = [...braces, createBrace(`Brace ${nextIndex}`)];
    run(true);
  }

  function removeBrace(id: string): void {
    if (braces.length === 1) return;
    braces = braces.filter(brace => brace.id !== id);
    run(true);
  }

  function addSegment(braceId: string): void {
    braces = braces.map(brace => {
      if (brace.id !== braceId) return brace;
      const last = brace.segments[brace.segments.length - 1];
      return {
        ...brace,
        segments: [
          ...brace.segments,
          {
            id: nextSegmentId(),
            label: `Segment ${brace.segments.length + 1}`,
            shape: api.Shapes.TRIANGLE,
            height: last ? last.height : 4,
            breadth: last ? last.breadth : 10,
            density: last ? last.density : DEFAULT_DENSITY,
            modulus: last ? last.modulus : DEFAULT_MODULUS
          }
        ]
      };
    });
    run(true);
  }

  function updateSegment(braceId: string, segmentId: string, updates: Partial<StackSegment>): void {
    braces = braces.map(brace => {
      if (brace.id !== braceId) return brace;
      return {
        ...brace,
        segments: brace.segments.map(segment => {
          if (segment.id !== segmentId) return segment;
          return {
            ...segment,
            ...updates,
            height:
              updates.height != null && Number.isFinite(updates.height) ? Math.max(0, updates.height) : segment.height,
            breadth:
              updates.breadth != null && Number.isFinite(updates.breadth) ? Math.max(0.5, updates.breadth) : segment.breadth,
            density:
              updates.density != null && Number.isFinite(updates.density) ? Math.max(1, updates.density) : segment.density,
            modulus:
              updates.modulus != null && Number.isFinite(updates.modulus) ? Math.max(0.1, updates.modulus) : segment.modulus
          };
        })
      };
    });
    run();
  }

  function removeSegment(braceId: string, segmentId: string): void {
    braces = braces.map(brace => {
      if (brace.id !== braceId) return brace;
      if (brace.segments.length === 1) return brace;
      return {
        ...brace,
        segments: brace.segments.filter(segment => segment.id !== segmentId)
      };
    });
    run(true);
  }

  function toggleAdvanced(): void {
    showAdvanced = !showAdvanced;
    run(true);
  }

  function saveBraceLayout(): void {
    const payload = braces.map(brace => ({
      name: brace.name,
      segments: brace.segments.map(segment => ({
        label: segment.label,
        shape: segment.shape,
        height: segment.height,
        breadth: segment.breadth,
        density: segment.density,
        modulus: segment.modulus
      }))
    }));
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
    link.href = url;
    link.download = `brace-layout-${timestamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function handleBraceFileSelect(): void {
    const file = loadInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        const loaded = sanitizeBraceLayout(data);
        if (!loaded.length) {
          alert("No valid braces found in file.");
        } else {
          braces = loaded;
          run(true);
          emitBraceLayoutLoaded(data, loaded);
        }
      } catch (error) {
        console.error("[BraceGeometry] Failed to load layout", error);
        alert("Unable to load brace layout.");
      } finally {
        loadInput.value = "";
      }
    };
    reader.readAsText(file);
  }

  function sanitizeBraceLayout(data: unknown): BraceConfig[] {
    const braceArray = Array.isArray(data)
      ? data
      : Array.isArray((data as any)?.braces)
        ? (data as any).braces
      : [];
    if (!braceArray.length) return [];
    const result: BraceConfig[] = [];
    braceArray.forEach((rawBrace: any, braceIndex: number) => {
      if (!rawBrace || typeof rawBrace !== "object") return;
      const rawSegments = Array.isArray((rawBrace as any).segments) ? (rawBrace as any).segments : [];
      const segments: StackSegment[] = rawSegments
        .map((rawSegment: any, segmentIndex: number) => sanitizeSegment(rawSegment, `Segment ${segmentIndex + 1}`))
        .filter((segment: StackSegment | null): segment is StackSegment => Boolean(segment));
      if (!segments.length) return;
      const name = typeof (rawBrace as any).name === "string" && (rawBrace as any).name.trim()
        ? (rawBrace as any).name.trim()
        : `Brace ${braceIndex + 1}`;
      result.push({ id: nextBraceId(), name, segments });
    });
    return result;
  }

  function emitBraceLayoutLoaded(raw: any, bracesLoaded: BraceConfig[]): void {
    try {
      const topRaw = raw?.top || {};
      const span = Number(topRaw.span);
      const thickness = Number(topRaw.thickness);
      const modulus = Number(topRaw.modulus);
      const detail: any = {
        braces: bracesLoaded.map((brace) => ({
          name: brace.name,
          segments: brace.segments.map((segment) => ({
            label: segment.label,
            shape: segment.shape,
            height: segment.height,
            breadth: segment.breadth,
            modulus: segment.modulus
          }))
        }))
      };
      if (Number.isFinite(span) && Number.isFinite(thickness)) {
        detail.top = {
          span,
          thickness,
          modulus: Number.isFinite(modulus) ? modulus : undefined
        };
      }
      window.dispatchEvent(new CustomEvent("braceLayoutChanged", { detail }));
    } catch (err) {
      console.warn("[BraceGeometry] emit layout failed", err);
    }
  }

  function sanitizeSegment(raw: any, fallbackLabel: string): StackSegment | null {
    if (!raw || typeof raw !== "object") return null;
    const height = Number(raw.height);
    if (!Number.isFinite(height) || height <= 0) return null;
    const breadth = Number(raw.breadth);
    const density = Number(raw.density);
    const modulus = Number(raw.modulus);
    const label = typeof raw.label === "string" && raw.label.trim() ? raw.label.trim() : fallbackLabel;
    const shape = shapeSet.has(raw.shape as ShapeKind) ? (raw.shape as ShapeKind) : api.Shapes.RECTANGLE;
    return {
      id: nextSegmentId(),
      label,
      shape,
      height,
      breadth: Number.isFinite(breadth) && breadth > 0 ? breadth : 10,
      density: Number.isFinite(density) && density > 0 ? density : DEFAULT_DENSITY,
      modulus: Number.isFinite(modulus) && modulus > 0 ? modulus : DEFAULT_MODULUS
    };
  }

  function requireElement<T extends Element>(id: string): T {
    const element = document.getElementById(id);
    if (!element) {
      throw new Error(`Missing element with id ${id}`);
    }
    return element as unknown as T;
  }

  saveBtn.addEventListener("click", () => saveBraceLayout());
  loadBtn.addEventListener("click", () => loadInput.click());
  loadInput.addEventListener("change", handleBraceFileSelect);
  addBraceBtn.addEventListener("click", () => addBrace());
  window.addEventListener("requestBraceLayout", () => emitBraceLayout());

  function emitBraceLayout(): void {
    try {
      const detail = braces.map((brace) => ({
        name: brace.name,
        segments: brace.segments.map((segment) => ({
          label: segment.label,
          shape: segment.shape,
          height: segment.height,
          breadth: segment.breadth,
        })),
      }));
      window.dispatchEvent(new CustomEvent("braceLayoutChanged", { detail }));
    } catch (err) {
      console.warn("[BraceGeometry] emit layout failed", err);
    }
  }

  run(true);
})();
