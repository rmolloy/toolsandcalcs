export type CalloutElements = {
  root: HTMLDivElement;
  label: HTMLDivElement;
  stem: HTMLDivElement;
  dot: HTMLDivElement;
  halo: HTMLDivElement;
};

export type CalloutSpec = {
  color: string;
  dataset: Record<string, string>;
  extraClassName?: string;
  onPointerDown: (event: PointerEvent) => void;
};

export type CalloutDragBehavior = {
  move(event: PointerEvent): boolean;
  end(event: PointerEvent): boolean;
};

export function calloutDragDispatch(
  behaviors: readonly CalloutDragBehavior[],
  phase: "move" | "end",
  event: PointerEvent,
): boolean {
  return behaviors.some((behavior) => behavior[phase](event));
}

export type CalloutText = {
  labelHtml: string;
  description: string;
};

export function calloutTextBuild(name: string, frequencyHz: number, detail?: string): CalloutText {
  const frequencyLabel = `${frequencyHz.toFixed(1)} Hz`;
  return {
    labelHtml: `${name}<br><span>${frequencyLabel}</span>`,
    description: detail ? `${name}: ${frequencyLabel}, ${detail}` : `${name}: ${frequencyLabel}`,
  };
}

export function calloutTextApply(callout: CalloutElements, text: CalloutText): void {
  callout.label.innerHTML = text.labelHtml;
  callout.root.title = text.description;
  callout.root.setAttribute("aria-label", text.description);
}

export function calloutBuild(overlay: HTMLElement, spec: CalloutSpec): CalloutElements {
  const root = document.createElement("div");
  root.className = spec.extraClassName ? `dof-thumb ${spec.extraClassName}` : "dof-thumb";
  Object.entries(spec.dataset).forEach(([key, value]) => {
    root.dataset[key] = value;
  });
  root.style.setProperty("--thumb-color", spec.color);

  const label = document.createElement("div");
  label.className = "dof-thumb-label";
  const stem = document.createElement("div");
  stem.className = "dof-thumb-stem";
  const halo = document.createElement("div");
  halo.className = "dof-thumb-halo";
  const dot = document.createElement("div");
  dot.className = "dof-thumb-dot";

  root.append(label, stem, halo, dot);
  root.addEventListener("pointerdown", spec.onPointerDown);
  overlay.appendChild(root);
  return { root, label, stem, dot, halo };
}
