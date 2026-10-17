import type { StockMeasurementsDraft } from "./resonate_stock_measurements.js";
import { resonanceLocalizedMessages as messages } from "./resonate_localized_messages.js";

export function renderStockSupportGuidance(draft: StockMeasurementsDraft): HTMLElement | null {
  if (!draft.kind) return null;
  return createStockSupportGuidance(draft, draft.kind);
}

function createStockSupportGuidance(draft: StockMeasurementsDraft, kind: NonNullable<StockMeasurementsDraft["kind"]>) {
  const guidance = Object.assign(document.createElement("div"), { className: "stock-support-guidance muted small" });
  appendSupportInstruction(guidance, draft.measurements.stockLengthMm, messages.stockSupportLongRatio, messages.stockSupportLongDistance);
  appendCrossSupportInstruction(guidance, draft);
  guidance.append(createSupportHelpLink(kind));
  return guidance;
}

function appendCrossSupportInstruction(guidance: HTMLElement, draft: StockMeasurementsDraft) {
  if (draft.kind === "plate_stock") appendSupportInstruction(guidance, draft.measurements.stockWidthMm, messages.stockSupportCrossRatio, messages.stockSupportCrossDistance);
}

function appendSupportInstruction(container: HTMLElement, dimensionMm: number, fallback: string, template: string) {
  const instruction = document.createElement("span");
  instruction.textContent = supportInstructionText(dimensionMm, fallback, template);
  container.append(instruction, " ");
}

function supportInstructionText(dimensionMm: number, fallback: string, template: string) {
  if (!Number.isFinite(dimensionMm) || dimensionMm <= 0) return fallback;
  const distance = new Intl.NumberFormat(document.documentElement.lang || "en-US", { maximumFractionDigits: 1 }).format(dimensionMm * 0.224);
  return template.replace("{distanceMm}", distance);
}

function createSupportHelpLink(kind: NonNullable<StockMeasurementsDraft["kind"]>) {
  const link = Object.assign(document.createElement("a"), { className: "link" });
  link.href = kind === "plate_stock" ? "#reader_help_plate" : "#reader_help_brace";
  link.textContent = messages.stockSupportHelpLink;
  link.addEventListener("click", openSupportHelp);
  return link;
}

function openSupportHelp(event: MouseEvent) {
  const link = event.currentTarget as HTMLAnchorElement;
  const section = document.querySelector<HTMLDetailsElement>(link.hash);
  revealSupportHelp(event, section);
}

function revealSupportHelp(event: MouseEvent, section: HTMLDetailsElement | null) {
  if (!section) return;
  event.preventDefault();
  focusSupportHelp(section);
}

function focusSupportHelp(section: HTMLDetailsElement) {
  section.open = true;
  section.scrollIntoView({ block: "start" });
  section.querySelector<HTMLElement>("summary")?.focus({ preventScroll: true });
}
