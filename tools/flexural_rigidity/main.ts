type FlexCalcAPI = typeof import("./calculator").FlexuralRigidity;
type BraceSpec = import("./calculator").BraceSpec;
type SliceResult = import("./calculator").SliceResult;
type BraceTransformResult = import("./calculator").BraceTransformResult;
type ShapeKind = import("./calculator").ShapeKind;

type NumericField = HTMLInputElement | HTMLSelectElement;
type FormFields = Record<string, NumericField>;

type BraceStackSegment = {
  id: string;
  label: string;
  shape: ShapeKind;
  height: number;
};

type FormValues = {
  spanAA: number;
  topThickness: number;
  topModulus: number;
  brace_b: number;
  brace_count: number;
  brace_angle: number;
  brace_modulus: number;
  bridge_moment: number;
  bridge_limit: number;
  braceSegments: BraceStackSegment[];
};

type BraceVisualization = {
  offset: number;
  height: number;
  width: number;
};

type VizState = {
  span: number;
  topThickness: number;
  braces: BraceVisualization[];
};

type AnnotatedBrace = BraceTransformResult & { EI: number };
type AnnotatedSlice = SliceResult & { braces: AnnotatedBrace[] };
type RotationState = { rotationDeg?: number; rotationPass?: boolean };

(function initFlexuralRigidityUI() {
  const calculator = window.FlexuralRigidity;
  if (!calculator) {
    throw new Error("FlexuralRigidity calculator is unavailable. Ensure calculator.js is loaded first.");
  }
  const calc = calculator;

  const defaults = {
    spanAA: 500,
    topThickness: 4,
    topModulus: 10,
    brace_b: 10,
    brace_count: 2,
    brace_angle: 0,
    brace_modulus: 12,
    bridge_moment: 12,
    bridge_limit: 2
  } as const;

  const fields: FormFields = {};
  document.querySelectorAll<NumericField>("[data-field]").forEach(element => {
    const key = element.dataset.field;
    if (key) fields[key] = element;
  });

  const resultEls = {
    EI: requireElement<HTMLElement>("result_ei"),
    I: requireElement<HTMLElement>("result_I"),
    centroid: requireElement<HTMLElement>("result_centroid"),
    braceHeight: requireElement<HTMLElement>("result_brace_height"),
    rotation: requireElement<HTMLElement>("result_rotation"),
    rotationStatus: requireElement<HTMLElement>("result_rotation_status"),
    status: requireElement<HTMLElement>("result_status" ),
    braceSummary: requireElement<HTMLElement>("brace_summary")
  } as const;

  const vizEls = {
    svg: requireElement<SVGSVGElement>("aa_view"),
    axisX: requireElement<SVGLineElement>("viz_axis_x"),
    axisY: requireElement<SVGLineElement>("viz_axis_y"),
    spanLine: requireElement<SVGLineElement>("viz_span_line"),
    top: requireElement<SVGRectElement>("viz_top"),
    bracesGroup: requireElement<SVGGElement>("viz_braces"),
    centroid: requireElement<SVGLineElement>("viz_centroid"),
    status: requireElement<HTMLElement>("viz_status")
  } as const;

  const stackControls = {
    container: requireElement<HTMLDivElement>("brace_stack"),
    addSegment: requireElement<HTMLButtonElement>("add_segment"),
    hint: requireElement<HTMLElement>("brace_stack_hint"),
  } as const;
  const previewEls = {
    canvas: requireElement<HTMLDivElement>("brace_preview"),
    meta: requireElement<HTMLElement>("brace_preview_meta"),
    summary: requireElement<HTMLElement>("brace_design_summary"),
  } as const;
  const topPreviewEls = {
    canvas: requireElement<HTMLDivElement>("top_preview"),
    meta: requireElement<HTMLElement>("top_preview_meta"),
  } as const;
  const layoutControls = {
    loadButton: requireElement<HTMLButtonElement>("load_brace_layout"),
    fileInput: requireElement<HTMLInputElement>("brace_layout_file"),
  } as const;

  function requireElement<T extends Element>(id: string): T {
    const element = document.getElementById(id);
    if (!element) {
      throw new Error(`Missing element with id ${id}`);
    }
    return element as unknown as T;
  }

  function parseNumber(value: string | undefined): number {
    if (value == null || value.trim() === "") return NaN;
    const num = Number(value);
    return Number.isFinite(num) ? num : NaN;
  }

  function numberOrDefault(value: number, fallback: number): number {
    return Number.isFinite(value) ? value : fallback;
  }

  let segmentCounter = 0;
  let braceStack: BraceStackSegment[] = [];
  let latestValues: FormValues | null = null;

  function nextSegmentId(): string {
    segmentCounter += 1;
    return `segment-${segmentCounter}`;
  }

  function createStackSegment(partial: Partial<BraceStackSegment> = {}): BraceStackSegment {
    return {
      id: nextSegmentId(),
      label: partial.label ?? "Segment",
      shape: partial.shape ?? calc.Shapes.RECTANGLE,
      height: partial.height ?? 4
    };
  }

  function createDefaultStack(): BraceStackSegment[] {
    return [
      createStackSegment({ label: "Base", shape: calc.Shapes.RECTANGLE, height: 4 }),
      createStackSegment({ label: "Cap", shape: calc.Shapes.TRIANGLE, height: 8 })
    ];
  }

  function cloneStack(stack: BraceStackSegment[] = braceStack): BraceStackSegment[] {
    return stack.map(segment => ({ ...segment }));
  }

  function relabelStack(): void {
    braceStack = braceStack.map((segment, index) => ({
      ...segment,
      label: index === 0 ? "Base" : `Cap ${index}`
    }));
  }

  braceStack = createDefaultStack();

  const shapeOptions: Array<{ value: ShapeKind; label: string }> = [
    { value: calc.Shapes.RECTANGLE, label: "Rectangle" },
    { value: calc.Shapes.TRIANGLE, label: "Triangle" },
    { value: calc.Shapes.PARABOLIC, label: "Parabolic" }
  ];

  function updateAddSegmentState(): void {
    const baseShape = braceStack[0]?.shape;
    const canStack = baseShape === calc.Shapes.RECTANGLE;
    stackControls.addSegment.disabled = !canStack;
    if (canStack) {
      stackControls.hint.textContent = "Rectangular bases can stack additional caps. Add as many segments as needed.";
    } else {
      stackControls.hint.textContent = "Stacks require a rectangular base. Switch the base shape or edit the single segment.";
    }
  }

  function renderBraceStack(): void {
    relabelStack();
    stackControls.container.replaceChildren();
    braceStack.forEach((segment, index) => {
      const row = document.createElement("div");
      row.className = "brace-stack-row";

      const title = document.createElement("div");
      title.className = "brace-stack-label";
      title.textContent = segment.label ?? `Segment ${index + 1}`;

      const shapeField = document.createElement("div");
      shapeField.className = "brace-stack-field";
      const shapeLabel = document.createElement("span");
      shapeLabel.textContent = "Shape";
      const shapeSelect = document.createElement("select");
      shapeSelect.className = "brace-stack-select";
      shapeOptions.forEach(option => {
        const opt = document.createElement("option");
        opt.value = option.value;
        opt.textContent = option.label;
        shapeSelect.append(opt);
      });
      shapeSelect.value = segment.shape;
      shapeSelect.addEventListener("change", () => {
        updateBraceSegment(segment.id, { shape: shapeSelect.value as ShapeKind });
      });
      shapeField.append(shapeLabel, shapeSelect);

      const heightField = document.createElement("div");
      heightField.className = "brace-stack-field";
      const heightLabel = document.createElement("span");
      heightLabel.textContent = "Height (mm)";
      const heightInput = document.createElement("input");
      heightInput.className = "brace-stack-input";
      heightInput.type = "number";
      heightInput.min = "0";
      heightInput.step = "0.5";
      heightInput.value = segment.height.toString();
      heightInput.addEventListener("input", () => {
        updateBraceSegment(segment.id, { height: Number(heightInput.value) });
      });
      heightField.append(heightLabel, heightInput);

      const removeButton = document.createElement("button");
      removeButton.className = "brace-stack-remove";
      removeButton.type = "button";
      removeButton.textContent = "Remove";
      removeButton.disabled = braceStack.length === 1;
      removeButton.addEventListener("click", () => removeBraceSegment(segment.id));

      row.append(title, shapeField, heightField, removeButton);
      stackControls.container.append(row);
    });
    updateAddSegmentState();
    updateDesignSummary();
    renderBracePreview(latestValues);
  }

  function renderTopProfile(values: FormValues | null): void {
    const span = numberOrDefault(values?.spanAA ?? parseNumber(fields.spanAA?.value), defaults.spanAA);
    const thickness = numberOrDefault(values?.topThickness ?? parseNumber(fields.topThickness?.value), defaults.topThickness);
    const svgWidth = 140;
    const svgHeight = 60;
    const rectHeight = Math.max(6, Math.min(svgHeight, (thickness / 10) * svgHeight));
    const rectY = (svgHeight - rectHeight) / 2;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${svgWidth} ${svgHeight}`);
    svg.setAttribute("width", `${svgWidth}`);
    svg.setAttribute("height", `${svgHeight}`);
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", "0");
    rect.setAttribute("y", rectY.toString());
    rect.setAttribute("width", svgWidth.toString());
    rect.setAttribute("height", rectHeight.toString());
    rect.setAttribute("fill", "var(--blue)");
    const outline = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    outline.setAttribute("x", "0");
    outline.setAttribute("y", rectY.toString());
    outline.setAttribute("width", svgWidth.toString());
    outline.setAttribute("height", rectHeight.toString());
    outline.setAttribute("fill", "none");
    outline.setAttribute("stroke", "rgba(255,255,255,0.7)");
    outline.setAttribute("stroke-width", "1.4");
    svg.append(rect, outline);
    topPreviewEls.canvas.replaceChildren(svg);
    topPreviewEls.meta.textContent = `${format(span, 0)} × ${format(thickness, 1)} mm`;
  }

  function updateDesignSummary(): void {
    const labels = braceStack.map((segment) => segment.label || "").filter(Boolean).join(" / ");
    const detail = labels
      ? `Segments (${braceStack.length}) — ${labels}`
      : `Segments (${braceStack.length})`;
    previewEls.summary.innerHTML = `
      <span class="design-label">Design</span>
      <span class="design-detail">${detail}</span>
    `;
  }

  function renderBracePreview(values: FormValues | null): void {
    if (!previewEls.canvas) return;
    const widthValue = numberOrDefault(values?.brace_b ?? parseNumber(fields.brace_b?.value), defaults.brace_b);
    const totalHeight = braceStack.reduce((sum, segment) => sum + Math.max(0, segment.height), 0);
    const svgWidth = 140;
    const mmScale = svgWidth / Math.max(widthValue, 1);
    const previewHeight = Math.max(totalHeight, 1) * mmScale || 1;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${svgWidth} ${previewHeight}`);
    svg.setAttribute("width", `${svgWidth}`);
    svg.setAttribute("height", `${previewHeight}`);
    let currentY = previewHeight;
    braceStack.forEach((segment) => {
      const segHeight = Math.max(0, segment.height);
      if (segHeight <= 0) return;
      const segHeightPx = segHeight * mmScale;
      const topY = currentY - segHeightPx;
      const x = 0;
      const segWidthPx = svgWidth;
      let element: SVGElement;
      if (segment.shape === calc.Shapes.TRIANGLE) {
        element = document.createElementNS("http://www.w3.org/2000/svg", "path");
        element.setAttribute("d", `M${x} ${currentY} L${x + segWidthPx} ${currentY} L${x + segWidthPx / 2} ${topY} Z`);
      } else if (segment.shape === calc.Shapes.PARABOLIC) {
        element = document.createElementNS("http://www.w3.org/2000/svg", "path");
        const mid = x + segWidthPx / 2;
        element.setAttribute("d", `M${x} ${currentY} L${x + segWidthPx} ${currentY} Q${mid} ${topY} ${x} ${currentY} Z`);
      } else {
        element = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        element.setAttribute("x", String(x));
        element.setAttribute("y", String(topY));
        element.setAttribute("width", String(segWidthPx));
        element.setAttribute("height", String(segHeightPx));
      }
      element.setAttribute("fill", segmentColor(segment.shape));
      svg.append(element);
      const outline = element.cloneNode(false) as SVGElement;
      outline.setAttribute("fill", "none");
      outline.setAttribute("stroke", "rgba(255,255,255,0.7)");
      outline.setAttribute("stroke-width", "1.4");
      svg.append(outline);
      currentY = topY;
    });
    previewEls.canvas.replaceChildren(svg);
    previewEls.meta.textContent = `${format(widthValue, 1)} × ${format(totalHeight, 1)} mm`;
  }

  function segmentColor(shape: ShapeKind): string {
    if (shape === calc.Shapes.TRIANGLE) return "var(--orange)";
    if (shape === calc.Shapes.PARABOLIC) return "var(--yellow)";
    return "var(--blue)";
  }

  function addBraceSegment(): void {
    const newHeight =
      braceStack.length > 0 ? Math.max(1, braceStack[braceStack.length - 1].height) : 4;
    braceStack = [
      ...braceStack,
      createStackSegment({
        label: `Cap ${braceStack.length}`,
        shape: calc.Shapes.TRIANGLE,
        height: newHeight
      })
    ];
    renderBraceStack();
    run();
  }

  function updateBraceSegment(id: string, updates: Partial<BraceStackSegment>): void {
    braceStack = braceStack.map(segment => {
      if (segment.id !== id) return segment;
      const nextHeight =
        updates.height != null && Number.isFinite(updates.height) ? Math.max(0, updates.height) : segment.height;
      const nextShape = updates.shape ?? segment.shape;
      return {
        ...segment,
        ...updates,
        height: nextHeight,
        shape: nextShape
      };
    });
    updateAddSegmentState();
    run();
  }

  function removeBraceSegment(id: string): void {
    if (braceStack.length === 1) return;
    braceStack = braceStack.filter(segment => segment.id !== id);
    if (braceStack.length === 0) {
      braceStack = [createStackSegment({ label: "Base" })];
    }
    renderBraceStack();
    run();
  }

  function readInputs(): FormValues {
    return {
      spanAA: parseNumber(fields.spanAA?.value),
      topThickness: parseNumber(fields.topThickness?.value),
      topModulus: parseNumber(fields.topModulus?.value),
      brace_b: parseNumber(fields.brace_b?.value),
      brace_count: parseNumber(fields.brace_count?.value),
      brace_angle: parseNumber(fields.brace_angle?.value),
      brace_modulus: parseNumber(fields.brace_modulus?.value),
      bridge_moment: parseNumber(fields.bridge_moment?.value),
      bridge_limit: parseNumber(fields.bridge_limit?.value),
      braceSegments: cloneStack()
    };
  }

  function buildBrace(values: FormValues): BraceSpec {
    const braceModulusNmm2 = numberOrDefault(values.brace_modulus, defaults.brace_modulus) * 1000;
    const planWidth = numberOrDefault(values.brace_b, defaults.brace_b);
    const rawAngle = Number.isFinite(values.brace_angle) ? values.brace_angle : 0;
    const angleFromPerp = calc.clamp(rawAngle, 0, 89.9);
    const phiDeg = 90 - angleFromPerp;
    const stack = values.braceSegments
      .map((segment, index) => ({
        shape: segment.shape,
        h: Math.max(0, segment.height),
        label: segment.label ?? `segment ${index + 1}`,
        material: { E: braceModulusNmm2 }
      }))
      .filter(segment => segment.h > 0);
    return {
      w_plan: planWidth,
      phi_deg: phiDeg,
      segments: stack
    };
  }

  function computeBraceOffsets(span: number, braceWidth: number, count: number): number[] {
    const spanValue = Number.isFinite(span) ? span : defaults.spanAA;
    const width = Number.isFinite(braceWidth) ? braceWidth : defaults.brace_b;
    const n = Math.max(1, count);
    const halfSpan = spanValue / 2;
    const totalBraceWidth = width * n;
    if (totalBraceWidth >= spanValue) {
      const start = -halfSpan + width / 2;
      return Array.from({ length: n }, (_, index) => start + index * width);
    }
    const gap = (spanValue - totalBraceWidth) / (n + 1);
    const start = -halfSpan + gap + width / 2;
    const step = width + gap;
    return Array.from({ length: n }, (_, index) => start + index * step);
  }

  function resolveBraceCount(raw: number): number {
    return Number.isFinite(raw) ? Math.max(1, Math.round(raw)) : 1;
  }

  function buildBraceSet(values: FormValues) {
    const count = resolveBraceCount(values.brace_count);
    return {
      models: Array.from({ length: count }, () => buildBrace(values)),
      offsets: computeBraceOffsets(values.spanAA, values.brace_b, count)
    };
  }

  function computeRotation(values: FormValues, EI: number): RotationState {
    const momentNmm = numberOrDefault(values.bridge_moment, defaults.bridge_moment) * 1e3;
    const safeEI = EI > 0 ? EI : Number.EPSILON;
    const rotationDeg = momentNmm / safeEI * (180 / Math.PI);
    const limit = values.bridge_limit;
    const rotationPass = Number.isFinite(limit) ? rotationDeg <= limit : true;
    return { rotationDeg, rotationPass };
  }

  function buildVizState(values: FormValues, offsets: number[], slice: AnnotatedSlice): VizState {
    return {
      span: numberOrDefault(values.spanAA, defaults.spanAA),
      topThickness: numberOrDefault(values.topThickness, defaults.topThickness),
      braces: offsets.map((offset, index) => ({
        offset,
        height: slice.braces[index]?.height ?? slice.braces[0]?.height ?? 0,
        width: numberOrDefault(values.brace_b, defaults.brace_b)
      }))
    };
  }

  function annotateBraceRigidity(values: FormValues, slice: SliceResult): AnnotatedSlice {
    const modulus = numberOrDefault(values.topModulus, defaults.topModulus) * 1000;
    const annotated = slice.braces.map((brace, index) => {
      const EIbrace = modulus * brace.transformedI;
      console.debug(`[FlexuralRigidity] Brace ${index + 1} EI: ${EIbrace.toFixed(2)} N·mm²`);
      return { ...brace, EI: EIbrace };
    });
    return { ...slice, braces: annotated };
  }

  function format(value: number, digits = 2): string {
    if (!Number.isFinite(value)) return "—";
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    }).format(value);
  }

  function renderBraceSummary(braces: AnnotatedBrace[]): void {
    const container = resultEls.braceSummary;
    container.innerHTML = "";
    braces.forEach((brace, index) => {
      const card = document.createElement("div");
      card.className = "brace-summary-card";
      const title = document.createElement("h4");
      title.textContent = `Brace ${index + 1}`;
      const eiRow = document.createElement("div");
      eiRow.className = "brace-summary-metric";
      eiRow.innerHTML = `<span>EI (N·m²)</span><span>${format(brace.EI / 1e6, 3)}</span>`;
      const iRow = document.createElement("div");
      iRow.className = "brace-summary-metric";
      iRow.innerHTML = `<span>I (mm⁴)</span><span>${format(brace.transformedI, 1)}</span>`;
      card.append(title, eiRow, iRow);
      container.append(card);
    });
  }

  function setResults(slice: AnnotatedSlice & RotationState): void {
    const eiNm2 = slice.EI / 1e6;
    resultEls.EI.textContent = format(eiNm2, 3);
    resultEls.I.textContent = format(slice.transformedI, 1);
    resultEls.centroid.textContent = `${format(slice.centroid, 2)} mm`;
    const braceHeight = slice.braces[0]?.height;
    resultEls.braceHeight.textContent = braceHeight ? `${format(braceHeight, 1)} mm` : "—";
    if (slice.rotationDeg != null) {
      resultEls.rotation.textContent = `${format(slice.rotationDeg, 3)} °`;
      resultEls.rotationStatus.textContent = slice.rotationPass ? "OK" : "Over limit";
      resultEls.rotationStatus.style.color = slice.rotationPass ? "var(--muted)" : "var(--orange)";
    } else {
      resultEls.rotation.textContent = "—";
      resultEls.rotationStatus.textContent = "—";
      resultEls.rotationStatus.style.color = "var(--muted)";
    }
    resultEls.status.textContent = "Live: computed from current inputs.";
    renderBraceSummary(slice.braces);
  }

  function setError(message: string): void {
    resultEls.EI.textContent = "—";
    resultEls.I.textContent = "—";
    resultEls.centroid.textContent = "—";
    resultEls.braceHeight.textContent = "—";
    resultEls.rotation.textContent = "—";
    resultEls.rotationStatus.textContent = "—";
    resultEls.rotationStatus.style.color = "var(--muted)";
    resultEls.status.textContent = message;
  }

  function run(): void {
    try {
      const values = readInputs();
      latestValues = values;
      renderTopProfile(values);
      renderBracePreview(values);
      const { models: braceModels, offsets } = buildBraceSet(values);
    const slice = calc.computeSlice({
        spanAA: numberOrDefault(values.spanAA, defaults.spanAA),
        topThickness: numberOrDefault(values.topThickness, defaults.topThickness),
        topModulus: numberOrDefault(values.topModulus, defaults.topModulus) * 1000,
        braces: braceModels
      });
      const { rotationDeg, rotationPass } = computeRotation(values, slice.EI);
      const sliceWithRigidity = annotateBraceRigidity(values, slice);
      const vizState = buildVizState(values, offsets, sliceWithRigidity);
      setResults({ ...sliceWithRigidity, rotationDeg, rotationPass });
      renderViz(vizState, sliceWithRigidity);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setError(message);
    }
  }

  document.querySelectorAll<NumericField>("input[data-field], select[data-field]").forEach(element => {
    const eventType = element.tagName === "SELECT" ? "change" : "input";
    element.addEventListener(eventType, () => run());
  });
  stackControls.addSegment.addEventListener("click", () => addBraceSegment());
  layoutControls.loadButton.addEventListener("click", () => layoutControls.fileInput.click());
  layoutControls.fileInput.addEventListener("change", (event) => handleBraceLayoutFile(event));

  async function handleBraceLayoutFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const raw = JSON.parse(text);
      const braceArray = Array.isArray(raw) ? raw : Array.isArray(raw?.braces) ? raw.braces : [];
      if (!braceArray.length) throw new Error("No braces found in layout.");
      let index = 0;
      if (braceArray.length > 1) {
        const options = braceArray.map((brace: any, idx: number) => `${idx + 1}. ${brace.name || `Brace ${idx + 1}`}`).join("\n");
        const choice = window.prompt(`Select brace to import:\n${options}`, "1");
        const parsed = choice != null ? Number(choice) - 1 : 0;
        if (Number.isFinite(parsed) && parsed >= 0 && parsed < braceArray.length) {
          index = parsed;
        }
      }
      applyImportedBrace(braceArray[index]);
    } catch (err) {
      console.error("[FlexRigidity] Brace layout import failed", err);
      window.alert("Unable to load brace layout. Please verify the file and try again.");
    } finally {
      layoutControls.fileInput.value = "";
    }
  }

  function applyImportedBrace(data: any): void {
    if (!data?.segments?.length) throw new Error("Brace layout missing segments.");
    braceStack = data.segments.map((segment: any, index: number) => ({
      id: nextSegmentId(),
      label: segment.label || (index === 0 ? "Base" : `Segment ${index + 1}`),
      shape: normalizeShape(segment.shape),
      height: Math.max(0, Number(segment.height) || 0),
    })).filter((segment: BraceStackSegment) => segment.height > 0);
    if (!braceStack.length) throw new Error("No valid segments in brace layout.");
    const lastBreadth = Number(data.segments[data.segments.length - 1]?.breadth);
    if (Number.isFinite(lastBreadth) && fields.brace_b) {
      fields.brace_b.value = String(lastBreadth);
    }
    const firstModulus = Number(data.segments[0]?.modulus);
    if (Number.isFinite(firstModulus) && fields.brace_modulus) {
      fields.brace_modulus.value = String(firstModulus);
    }
    renderBraceStack();
    run();
  }

  function normalizeShape(value: unknown): ShapeKind {
    const normalized = typeof value === "string" ? value.toLowerCase() : "";
    if (normalized.includes("tri")) return calc.Shapes.TRIANGLE;
    if (normalized.includes("para")) return calc.Shapes.PARABOLIC;
    if (normalized.includes("rect")) return calc.Shapes.RECTANGLE;
    return calc.Shapes.RECTANGLE;
  }

  function reset(): void {
    Object.entries(defaults).forEach(([key, value]) => {
      const field = fields[key];
      if (!field) return;
      if (field instanceof HTMLSelectElement) {
        field.value = String(value);
      } else {
        field.value = String(value);
      }
    });
    braceStack = createDefaultStack();
    renderBraceStack();
    run();
  }

  reset();

  function renderViz(dimensions: VizState, slice: AnnotatedSlice): void {
    const width = 700;
    const padding = 24;
    const span = Math.max(dimensions.span || 1, 1);
    const baseSpan = span <= 500 ? 500 : span * 1.2;
    const topH = Math.max(dimensions.topThickness || 0, 0);
    const braceHeights = dimensions.braces.map(b => Math.max(b.height || 0, 0));
    const maxBraceH = braceHeights.length ? Math.max(...braceHeights) : 0;
    const totalH = Math.max(topH + maxBraceH, 1);

    const baseScale = (width - 2 * padding) / baseSpan;
    const scaleX = baseScale;
    const scaleY = baseScale;
    const spanPx = span * scaleX;
    const spanDraw = Math.min(spanPx, width - 2 * padding);
    const offsetX = (width - spanDraw) / 2;
    const viewHeight = padding * 2 + Math.max(totalH * scaleY, padding);
    vizEls.svg.setAttribute("viewBox", `0 0 ${width} ${viewHeight}`);
    vizEls.svg.style.height = `${viewHeight}px`;
    const baseY = viewHeight - padding;

    vizEls.spanLine.setAttribute("x1", offsetX.toString());
    vizEls.spanLine.setAttribute("x2", (offsetX + spanDraw).toString());
    vizEls.spanLine.setAttribute("y1", baseY.toString());
    vizEls.spanLine.setAttribute("y2", baseY.toString());

    vizEls.axisX.setAttribute("x1", offsetX.toString());
    vizEls.axisX.setAttribute("x2", (offsetX + spanDraw).toString());
    vizEls.axisX.setAttribute("y1", baseY.toString());
    vizEls.axisX.setAttribute("y2", baseY.toString());

    vizEls.axisY.setAttribute("x1", offsetX.toString());
    vizEls.axisY.setAttribute("x2", offsetX.toString());
    vizEls.axisY.setAttribute("y1", baseY.toString());
    vizEls.axisY.setAttribute("y2", (baseY - totalH * scaleY).toString());

    const topY = baseY - topH * scaleY;
    vizEls.top.setAttribute("x", offsetX.toString());
    vizEls.top.setAttribute("y", topY.toString());
    vizEls.top.setAttribute("width", spanDraw.toString());
    vizEls.top.setAttribute("height", Math.max(topH * scaleY, 1).toString());

    vizEls.bracesGroup.replaceChildren();
    const centerX = offsetX + spanDraw / 2;
    dimensions.braces.forEach(brace => {
      const widthMm = Math.max(1, brace.width || 0);
      const widthPx = widthMm * scaleX;
      const braceX = centerX + (brace.offset || 0) * scaleX - widthPx / 2;
      let currentY = topY;
      braceStack.forEach((segment) => {
        const segHeight = Math.max(0, segment.height);
        if (segHeight <= 0) return;
        const segHeightPx = segHeight * scaleY;
        const topSegmentY = currentY - segHeightPx;
        let element: SVGElement;
        if (segment.shape === calc.Shapes.TRIANGLE) {
          element = document.createElementNS("http://www.w3.org/2000/svg", "path");
          element.setAttribute("d", `M${braceX} ${currentY} L${braceX + widthPx} ${currentY} L${braceX + widthPx / 2} ${topSegmentY} Z`);
        } else if (segment.shape === calc.Shapes.PARABOLIC) {
          element = document.createElementNS("http://www.w3.org/2000/svg", "path");
          const mid = braceX + widthPx / 2;
          element.setAttribute("d", `M${braceX} ${currentY} L${braceX + widthPx} ${currentY} Q${mid} ${topSegmentY} ${braceX} ${currentY} Z`);
        } else {
          element = document.createElementNS("http://www.w3.org/2000/svg", "rect");
          element.setAttribute("x", braceX.toString());
          element.setAttribute("y", topSegmentY.toString());
          element.setAttribute("width", Math.max(widthPx, 1).toString());
          element.setAttribute("height", Math.max(segHeightPx, 1).toString());
        }
        element.setAttribute("fill", segmentColor(segment.shape));
        element.setAttribute("fill-opacity", "0.55");
        const outline = element.cloneNode(false) as SVGElement;
        outline.setAttribute("fill", "none");
        outline.setAttribute("stroke", "rgba(255,255,255,0.7)");
        outline.setAttribute("stroke-width", "1.2");
        vizEls.bracesGroup.appendChild(element);
        vizEls.bracesGroup.appendChild(outline);
        currentY = topSegmentY;
      });
    });

    const centroidY = baseY - (slice.centroid || 0) * scaleY;
    vizEls.centroid.setAttribute("x1", offsetX.toString());
    vizEls.centroid.setAttribute("x2", (offsetX + spanDraw).toString());
    vizEls.centroid.setAttribute("y1", centroidY.toString());
    vizEls.centroid.setAttribute("y2", centroidY.toString());

    const reference = span <= 500 ? "500 mm reference" : `${format(baseSpan, 0)} mm span (+20%)`;
    vizEls.status.textContent = `Span: ${format(span, 0)} mm (${reference}) · Total height: ${format(totalH, 1)} mm · Braces: ${dimensions.braces.length}`;
  }
})();
