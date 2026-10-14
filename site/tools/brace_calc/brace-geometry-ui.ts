type BraceGeometryAPI = typeof import("./brace-geometry").BraceGeometry;
type BraceGeometryResult = import("./brace-geometry").BraceGeometryResult;
type BraceLayoutStateAPI = typeof import("./brace-layout-state").BraceLayoutState;
type BraceStockTransferAPI = typeof import("./brace-stock-transfer").BraceStockTransfer;
type ShapeKind = typeof import("../calculator").Shapes[keyof typeof import("../calculator").Shapes];

export {};

declare global {
  interface Window {
    BraceGeometry?: BraceGeometryAPI;
    BraceLayoutState?: BraceLayoutStateAPI;
    BraceStockTransfer?: BraceStockTransferAPI;
    BraceMatchSystem?: typeof import("./brace-match-system").BraceMatchSystem;
    FlexuralDefaultLayout?: {
      top?: { span?: number; thickness?: number; modulus?: number };
      braces?: unknown[];
    };
    BraceSaveSurface?: {
      buildBraceSavePackage(braces: unknown[], now?: Date): { filename: string; text: string };
      downloadBraceSavePackage(runtime: unknown, savePackage: { filename: string; text: string }): void;
      readBraceSavePackageFile(file: { text(): Promise<string> }): Promise<unknown[]>;
      readBraceSaveSurface(): { label: string; hint: string };
    };
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

type BraceRenderInfo = import("./brace-geometry").BraceCalculationInfo;

(function initBraceGeometryUI() {
  const braceGeometry = window.BraceGeometry;
  if (!braceGeometry) {
    throw new Error("BraceGeometry calculator is unavailable. Ensure brace-geometry.js is loaded first.");
  }
  const api = braceGeometry;
  const braceLayoutState = requireBraceLayoutState();
  const braceStockTransfer = requireBraceStockTransfer();

  const galleryEl = requireElement<HTMLDivElement>("brace_gallery");
  const viewGalleryEl = document.getElementById("brace_gallery_view") as HTMLDivElement | null;
  const summaryEl = requireElement<HTMLDivElement>("brace_summary");
  const addBraceBtn = requireElement<HTMLButtonElement>("add_brace");
  const saveBtn = requireElement<HTMLButtonElement>("save_braces");
  const loadBtn = requireElement<HTMLButtonElement>("load_braces");
  const loadInput = requireElement<HTMLInputElement>("brace_file_input");
  const matchPlanButtons = [
    document.getElementById("match_brace_plan_view"),
  ].filter((element): element is HTMLButtonElement => element !== null);

  const shapeSet = new Set<ShapeKind>(Object.values(api.Shapes));

  const DEFAULT_DENSITY = 420;
  const DEFAULT_MODULUS = 11;
  let braceCounter = 0;
  let segmentCounter = 0;
  let showAdvanced = false;
  let suppressTopInputPersistence = false;
  const braceDom = new Map<string, {
    preview: HTMLElement;
    metrics: HTMLElement;
    info: HTMLElement;
    summary: HTMLElement;
  }>();
  const defaultLayout = readDefaultLayout();
  const activeBraceStock = readBraceStockCharacterizationFromQuery();
  const matchPlanMaterial = activeBraceStock || starterBraceStockCreate();
  let activeTop = readTopFromLayout(defaultLayout);
  let braces: BraceConfig[] = createInitialBraces();
  const perTabSession = readBracePerTabSession();

  function nextBraceId(): string {
    braceCounter += 1;
    return `brace-${braceCounter}`;
  }

  function nextSegmentId(): string {
    segmentCounter += 1;
    return `segment-${segmentCounter}`;
  }

  function createInitialBraces(): BraceConfig[] {
    return braceLayoutState.createInitialBraceLayout(
      readBraceStockMeasurementsFromQuery(),
      defaultLayout,
      {
        nextBraceId,
        nextSegmentId,
        validShapes: shapeSet,
        rectangleShape: api.Shapes.RECTANGLE,
        triangleShape: api.Shapes.TRIANGLE,
        defaultDensity: DEFAULT_DENSITY,
        defaultModulus: DEFAULT_MODULUS
      }
    );
  }

  function readDefaultLayout(): unknown {
    return window.FlexuralDefaultLayout || null;
  }

  function readTopFromLayout(layout: unknown): { span: number; thickness: number; modulus?: number } | null {
    return braceLayoutState.readBraceTopFromLayout(layout);
  }

  function readBraceStockMeasurementsFromQuery(): { height: number; breadth: number; density: number; modulus: number } | null {
    return braceStockTransfer.readBraceStockMeasurements(
      new URLSearchParams(window.location.search || ""),
      {
        height: 12,
        breadth: 10,
        density: DEFAULT_DENSITY,
        modulus: DEFAULT_MODULUS,
      },
    );
  }

  function readBraceStockCharacterizationFromQuery() {
    return braceStockTransfer.readBraceStockCharacterization?.(
      new URLSearchParams(window.location.search || ""),
    ) || null;
  }

  function starterBraceStockCreate() {
    return {
      version: 1 as const,
      method: "free-free" as const,
      sourceLabel: "Spruce brace stock",
      longFrequencyHz: 175.1,
      specimenLengthMm: 600,
      specimenWidthMm: 10,
      specimenHeightMm: 12,
      specimenMassG: 30.24,
      densityKgM3: DEFAULT_DENSITY,
      modulusGPa: DEFAULT_MODULUS,
      soundSpeedMps: Math.sqrt(DEFAULT_MODULUS * 1_000_000_000 / DEFAULT_DENSITY),
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
    braces = braceLayoutState.ensureBraceLayoutHasDefault(braces, {
      nextBraceId,
      nextSegmentId,
      rectangleShape: api.Shapes.RECTANGLE,
      triangleShape: api.Shapes.TRIANGLE,
      defaultDensity: DEFAULT_DENSITY,
      defaultModulus: DEFAULT_MODULUS
    });
    persistBracePerTabSession();
    renderBraceLayout(braces, fullRebuild);
    emitBraceLayout();
  }

  function renderBraceLayout(
    sourceBraces: BraceConfig[],
    fullRebuild: boolean,
  ): void {
    const { renderInfo, scales } = api.calculateBraceRenderModel(sourceBraces, {
      density: DEFAULT_DENSITY,
      modulus: DEFAULT_MODULUS,
    });
    if (
      fullRebuild ||
      braceDom.size !== sourceBraces.length ||
      !updateBraceVisuals(sourceBraces, renderInfo, scales)
    ) {
      renderBraces(sourceBraces, renderInfo, scales);
    }
    renderSummary(sourceBraces, renderInfo);
    renderViewGallery(sourceBraces, renderInfo, scales);
  }

  function openBraceMatchPlan(): void {
    if (!window.BraceMatchPlan || !window.BraceMatchPlanPrompt) return;
    const original = structuredClone(braces);
    const originalTop = readFlexuralTopInputs();
    const referenceTop = readTopFromLayout(defaultLayout);
    const actualTop = readFlexuralTopInputs();
    const systemMatchAvailable = Boolean(
      window.BraceMatchSystem &&
      referenceTop &&
      actualTop,
    );
    let systemResult: import("./brace-match-system").BraceMatchSystemResult | null = null;
    const plansResolve = (
      options: import("./brace-match-plan-prompt").BraceMatchPlanPromptOptions,
      material: import("./brace-match-plan-prompt").BraceMatchPlanMaterial,
      top?: import("./brace-match-plan-prompt").BraceMatchPlanTop,
      adjustableBraceIds?: readonly string[],
    ) => {
      const stock = {
        sourceLabel: material.sourceLabel,
        densityKgM3: material.densityKgM3,
        modulusGPa: material.modulusGPa,
      };
      if (
        systemMatchAvailable &&
        window.BraceMatchSystem &&
        referenceTop &&
        top
      ) {
        systemResult = window.BraceMatchSystem.solve(
          original,
          stock,
          {
            spanMm: referenceTop.span,
            thicknessMm: referenceTop.thickness,
            modulusGPa: referenceTop.modulus ?? DEFAULT_MODULUS,
          },
          {
            spanMm: referenceTop.span,
            thicknessMm: top.thicknessMm,
            modulusGPa: top.modulusGPa,
          },
          options,
          adjustableBraceIds,
        );
        return systemResult.plans;
      }
      systemResult = null;
      return original.map((brace) => window.BraceMatchPlan!.solve(brace, stock, options));
    };
    window.BraceMatchPlanPrompt.open({
      material: matchPlanMaterial,
      materialOrigin: activeBraceStock ? "transferred" : "starter",
      top: systemMatchAvailable && actualTop
        ? {
            thicknessMm: actualTop.thickness,
            modulusGPa: actualTop.modulus ?? DEFAULT_MODULUS,
          }
        : undefined,
      plansResolve,
      systemStateRead: systemMatchAvailable ? () => systemResult : undefined,
      preview(plans, top) {
        const proposedBraces = braceMatchPlanApplyToLayout(original, plans);
        writeFlexuralTopInputs(top, false);
        renderBraceLayout(proposedBraces, true);
        if (systemMatchAvailable) emitBraceLayoutFor(proposedBraces, activeTop);
      },
      commit(plans, _previewActive, top) {
        writeFlexuralTopInputs(top);
        braces = braceMatchPlanApplyToLayout(original, plans);
        run(true);
      },
      revert() {
        if (systemMatchAvailable) {
          writeFlexuralTopInputs(originalTop
            ? {
                thicknessMm: originalTop.thickness,
                modulusGPa: originalTop.modulus ?? DEFAULT_MODULUS,
              }
            : undefined, false);
        }
        renderBraceLayout(braces, true);
        if (systemMatchAvailable) emitBraceLayoutFor(braces, activeTop);
      },
    });
  }

  function braceMatchPlanApplyToLayout(
    source: BraceConfig[],
    plans: import("./brace-match-plan").BraceMatchPlanResult[],
  ) {
    const plansById = new Map(plans.map((plan) => [plan.id, plan]));
    return source.map((brace) => {
      const plan = plansById.get(brace.id);
      if (!plan) return structuredClone(brace);
      return {
        ...brace,
        segments: plan.proposedSegments.map((segment, index) => ({
          ...brace.segments[index],
          ...segment,
        })) as StackSegment[],
      };
    });
  }

  function renderBraces(
    sourceBraces: BraceConfig[],
    renderInfo: Record<string, BraceRenderInfo>,
    scales: { referenceBreadth: number; maxHeight: number }
  ): void {
    galleryEl.replaceChildren();
    braceDom.clear();
    sourceBraces.forEach((brace, index) => {
      const info = renderInfo[brace.id];
      const card = document.createElement("div");
      card.className = "brace-card";
      card.dataset.braceId = brace.id;

      const header = document.createElement("header");
      const nameInput = document.createElement("input");
      nameInput.value = brace.name;
      nameInput.placeholder = `Brace ${index + 1}`;
      nameInput.addEventListener("input", () => renameBrace(brace.id, nameInput.value.trim() || `Brace ${index + 1}`));
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
      deleteBtn.disabled = sourceBraces.length === 1;
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
    sourceBraces: BraceConfig[],
    renderInfo: Record<string, BraceRenderInfo>,
    scales: { referenceBreadth: number; maxHeight: number }
  ): boolean {
    for (const brace of sourceBraces) {
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

  function renderViewGallery(
    sourceBraces: BraceConfig[],
    renderInfo: Record<string, BraceRenderInfo>,
    scales: { referenceBreadth: number; maxHeight: number }
  ): void {
    if (!viewGalleryEl) return;

    viewGalleryEl.replaceChildren();
    sourceBraces.forEach((brace, index) => {
      const info = renderInfo[brace.id];
      const card = document.createElement("div");
      card.className = "brace-card readonly";
      card.dataset.braceId = brace.id;

      const header = document.createElement("header");
      const title = document.createElement("h4");
      title.textContent = brace.name || `Brace ${index + 1}`;
      const editButton = document.createElement("button");
      editButton.className = "brace-card-edit";
      editButton.type = "button";
      editButton.textContent = "Edit";
      editButton.addEventListener("click", () => focusEditableBrace(brace.id));
      header.append(title, editButton);

      const previewContainer = document.createElement("div");
      previewContainer.className = "brace-preview";
      renderPreviewContent(previewContainer, brace, info?.result, scales);

      const metrics = document.createElement("div");
      metrics.className = "brace-meta-grid";
      renderMetricsContent(metrics, info);

      card.append(header, previewContainer, metrics);
      viewGalleryEl.append(card);
    });
  }

  function focusEditableBrace(braceId: string): void {
    document.querySelector<HTMLButtonElement>('[data-flexural-mode-button="edit"]')?.click();
    const editableCard = Array.from(galleryEl.querySelectorAll<HTMLElement>(".brace-card"))
      .find(card => card.dataset.braceId === braceId);
    editableCard?.querySelector<HTMLDetailsElement>(".brace-design")?.setAttribute("open", "");
    editableCard?.scrollIntoView({ block: "center", behavior: "smooth" });
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

  function renderSummary(
    sourceBraces: BraceConfig[],
    renderInfo: Record<string, BraceRenderInfo>,
  ): void {
    summaryEl.replaceChildren();
    const entries = api.calculateBraceComparisonModel(sourceBraces, renderInfo);

    if (entries.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "Set at least one brace to compute comparisons.";
      summaryEl.append(empty);
      return;
    }

    entries.forEach((entry) => {
      const card = document.createElement("div");
      card.className = "brace-summary-card";
      card.innerHTML = `
        <h4>${entry.name}</h4>
        <div class="metric"><span>Relative stiffness (EI)</span>${format(entry.relativeEI, 1)}%</div>
        <div class="metric"><span>Relative moment of inertia (I)</span>${format(entry.relativeI, 1)}%</div>
        <div class="metric"><span>Relative mass</span>${format(entry.relativeMass, 1)}%</div>
        <div class="metric"><span>Relative area</span>${format(entry.relativeArea, 1)}%</div>
      `;
      summaryEl.append(card);
    });
  }

  function renameBrace(id: string, name: string): void {
    braces = braceLayoutState.renameBraceInLayout(braces, id, name);
    run();
  }

  function addBrace(): void {
    braces = braceLayoutState.appendDefaultBraceToLayout(braces, {
      nextBraceId,
      nextSegmentId,
      rectangleShape: api.Shapes.RECTANGLE,
      triangleShape: api.Shapes.TRIANGLE,
      defaultDensity: DEFAULT_DENSITY,
      defaultModulus: DEFAULT_MODULUS
    });
    run(true);
  }

  function removeBrace(id: string): void {
    if (braces.length === 1) return;
    braces = braceLayoutState.removeBraceFromLayout(braces, id);
    run(true);
  }

  function addSegment(braceId: string): void {
    braces = braceLayoutState.appendBraceSegmentToLayout(braces, braceId, {
      nextSegmentId,
      shape: api.Shapes.TRIANGLE,
      defaultHeight: 4,
      defaultBreadth: 10,
      defaultDensity: DEFAULT_DENSITY,
      defaultModulus: DEFAULT_MODULUS
    });
    run(true);
  }

  function updateSegment(braceId: string, segmentId: string, updates: Partial<StackSegment>): void {
    braces = braceLayoutState.updateBraceSegmentInLayout(
      braces,
      braceId,
      segmentId,
      updates
    );
    run();
  }

  function removeSegment(braceId: string, segmentId: string): void {
    braces = braceLayoutState.removeBraceSegmentFromLayout(braces, braceId, segmentId);
    run(true);
  }

  function toggleAdvanced(): void {
    showAdvanced = !showAdvanced;
    run(true);
  }

  async function saveBraceLayout(): Promise<void> {
    await readBraceSaveRunner().runBraceSaveAction({
      readSnapshot: readBraceSaveSnapshot,
      setStatus: writeBraceSaveStatus,
    });
  }

  async function handleBraceFileSelect(): Promise<void> {
    const file = loadInput.files?.[0];
    if (!file) return;
    try {
      const data = await readBraceSaveSurfaceApi().readBraceSavePackageFile(file);
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
  }

  function readBraceSaveSnapshot(): unknown[] {
    return braceLayoutState.readBraceSaveSnapshot(braces);
  }

  function readBracePerTabSession() {
    return (window as any).PerTabToolSession?.perTabToolSessionCreate
      ? (window as any).PerTabToolSession.perTabToolSessionCreate({ toolId: "brace_calculator", version: 1 })
      : null;
  }

  function persistBracePerTabSession(): void {
    perTabSession?.write({
      braces: readBraceSaveSnapshot(),
      activeTop,
      showAdvanced,
    });
  }

  function syncActiveTopFromFlexuralInputs(): void {
    const top = readFlexuralTopInputs();
    if (top) {
      activeTop = top;
    }
  }

  function readFlexuralTopInputs(): { span: number; thickness: number; modulus?: number } | null {
    const span = readFiniteInputValue("top_span_input");
    const thickness = readFiniteInputValue("top_thickness_input");
    const modulus = readFiniteInputValue("top_modulus_input");

    if (span === null || thickness === null) {
      return null;
    }

    return { span, thickness, modulus: modulus ?? undefined };
  }

  function writeFlexuralTopInputs(
    top?: import("./brace-match-plan-prompt").BraceMatchPlanTop,
    persist = true,
  ): void {
    if (!top) return;
    const thickness = document.getElementById("top_thickness_input") as HTMLInputElement | null;
    const modulus = document.getElementById("top_modulus_input") as HTMLInputElement | null;
    if (!thickness || !modulus) return;
    suppressTopInputPersistence = !persist;
    thickness.value = String(top.thicknessMm);
    modulus.value = String(top.modulusGPa);
    thickness.dispatchEvent(new Event("input", { bubbles: true }));
    modulus.dispatchEvent(new Event("input", { bubbles: true }));
    suppressTopInputPersistence = false;
    syncActiveTopFromFlexuralInputs();
  }

  function readFiniteInputValue(id: string): number | null {
    const input = document.getElementById(id) as HTMLInputElement | null;
    const value = Number(input?.value);
    return Number.isFinite(value) ? value : null;
  }

  function bindFlexuralTopInputPersistence(): void {
    ["top_span_input", "top_thickness_input", "top_modulus_input"].forEach((id) => {
      document.getElementById(id)?.addEventListener("input", () => {
        syncActiveTopFromFlexuralInputs();
        if (!suppressTopInputPersistence) persistBracePerTabSession();
      });
    });
  }

  function restoreBracePerTabSession(): void {
    const snapshot = perTabSession?.read();
    if (!snapshot) {
      return;
    }

    const restoredBraces = sanitizeBraceLayout(snapshot.braces);
    if (restoredBraces.length) {
      braces = restoredBraces;
    }

    const restoredTop = readTopFromLayout({ top: snapshot.activeTop });
    if (restoredTop) {
      activeTop = restoredTop;
    }

    showAdvanced = Boolean(snapshot.showAdvanced);
  }

  function readBraceSaveSurfaceApi() {
    if (window.BraceSaveSurface) {
      return window.BraceSaveSurface;
    }

    throw new Error("Brace save surface is unavailable.");
  }

  function readBraceSaveRunner() {
    if ((window as any).BraceSaveTarget?.braceSaveRunnerCreate) {
      return (window as any).BraceSaveTarget.braceSaveRunnerCreate();
    }

    return {
      readBraceSaveSurface() {
        return Promise.resolve({
          mode: "offline",
          label: "Download JSON",
          hint: "",
        });
      },
      runBraceSaveAction(request: {
        readSnapshot: () => ReturnType<typeof readBraceSaveSnapshot>;
        setStatus: (message: string) => void;
      }) {
        const savePackage = readBraceSaveSurfaceApi().buildBraceSavePackage(request.readSnapshot());
        readBraceSaveSurfaceApi().downloadBraceSavePackage({ document, URL }, savePackage);
        request.setStatus("JSON package downloaded.");
        return Promise.resolve(true);
      },
    };
  }

  function writeBraceSaveStatus(message: string): void {
    console.info("[BraceGeometry] " + message);
  }

  function readBraceNotebookRestoreApi() {
    return (window as any).BraceNotebookRestore?.restoreBraceNotebookEventIntoUi
      ? (window as any).BraceNotebookRestore
      : null;
  }

  async function restoreNotebookEventIntoUi(): Promise<boolean> {
    const restoreApi = readBraceNotebookRestoreApi();

    if (!restoreApi) {
      return false;
    }

    const restored = await restoreApi.restoreBraceNotebookEventIntoUi({
      runtime: window,
      applyBraces(rawBraces: unknown) {
        const loaded = sanitizeBraceLayout(rawBraces);
        if (!loaded.length) return;
        braces = loaded;
        run(true);
        emitBraceLayoutLoaded(rawBraces, loaded);
      },
    });

    if (restored) {
      writeBraceSaveStatus("Notebook event restored.");
    }

    return restored;
  }

  function sanitizeBraceLayout(data: unknown): BraceConfig[] {
    return braceLayoutState.sanitizeBraceLayout(data, {
      nextBraceId,
      nextSegmentId,
      validShapes: shapeSet,
      rectangleShape: api.Shapes.RECTANGLE,
      defaultDensity: DEFAULT_DENSITY,
      defaultModulus: DEFAULT_MODULUS,
    });
  }

  function emitBraceLayoutLoaded(raw: any, bracesLoaded: BraceConfig[]): void {
    try {
      const loadedTop = readTopFromLayout(raw);
      if (loadedTop) activeTop = loadedTop;
      const detail = braceLayoutState.readLoadedBraceLayoutEventDetail(raw, bracesLoaded);
      window.dispatchEvent(new CustomEvent("braceLayoutChanged", { detail }));
    } catch (err) {
      console.warn("[BraceGeometry] emit layout failed", err);
    }
  }

  function requireElement<T extends Element>(id: string): T {
    const element = document.getElementById(id);
    if (!element) {
      throw new Error(`Missing element with id ${id}`);
    }
    return element as unknown as T;
  }

  function requireBraceLayoutState(): NonNullable<Window["BraceLayoutState"]> {
    if (!window.BraceLayoutState) {
      throw new Error("Brace layout state is unavailable. Ensure brace-layout-state.js is loaded first.");
    }
    return window.BraceLayoutState;
  }

  function requireBraceStockTransfer(): NonNullable<Window["BraceStockTransfer"]> {
    if (!window.BraceStockTransfer) {
      throw new Error("Brace stock transfer is unavailable. Ensure brace-stock-transfer.js is loaded first.");
    }
    return window.BraceStockTransfer;
  }

  void initializeBraceSaveSurface();

  saveBtn.addEventListener("click", () => void saveBraceLayout());
  loadBtn.addEventListener("click", () => loadInput.click());
  loadInput.addEventListener("change", handleBraceFileSelect);
  addBraceBtn.addEventListener("click", () => addBrace());
  matchPlanButtons.forEach((button) => {
    button.disabled = false;
    button.title = activeBraceStock
      ? `Match brace plan with ${activeBraceStock.sourceLabel}`
      : "Match the brace plan with entered brace stock measurements.";
    button.addEventListener("click", openBraceMatchPlan);
  });
  window.addEventListener("requestBraceLayout", () => emitBraceLayout());

  function emitBraceLayout(): void {
    emitBraceLayoutFor(braces, activeTop);
  }

  function emitBraceLayoutFor(
    sourceBraces: BraceConfig[],
    top: typeof activeTop,
  ): void {
    try {
      const detail = braceLayoutState.readBraceLayoutEventDetail(sourceBraces, top);
      window.dispatchEvent(new CustomEvent("braceLayoutChanged", { detail }));
    } catch (err) {
      console.warn("[BraceGeometry] emit layout failed", err);
    }
  }

  async function initializeBraceSaveSurface(): Promise<void> {
    if (await restoreNotebookEventIntoUi()) {
      return;
    }

    const saveSurface = await readBraceSaveRunner().readBraceSaveSurface();
    saveBtn.textContent = saveSurface.label;
    saveBtn.title = saveSurface.hint;
  }

  restoreBracePerTabSession();
  bindFlexuralTopInputPersistence();
  run(true);
})();
