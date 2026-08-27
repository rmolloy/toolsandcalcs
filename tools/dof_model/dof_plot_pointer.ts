export function readDofPlotAxes(plotElement: HTMLElement) {
  const layout = (plotElement as any)._fullLayout;
  const xaxis = layout?.xaxis;
  const yaxis = layout?.yaxis;
  if (
    !xaxis
    || !yaxis
    || typeof xaxis.l2p !== "function"
    || typeof yaxis.l2p !== "function"
  ) {
    return null;
  }
  return { xaxis, yaxis };
}

export function readDofAxisRange(xaxis: any) {
  if (Array.isArray(xaxis?.range) && xaxis.range.length === 2) {
    return [
      Math.min(xaxis.range[0], xaxis.range[1]),
      Math.max(xaxis.range[0], xaxis.range[1]),
    ];
  }
  return [50, 500];
}

export function readDofPointerFrequency(
  event: PointerEvent,
  plotElement: HTMLElement,
) {
  const axes = readDofPlotAxes(plotElement);
  if (!axes || typeof axes.xaxis.p2l !== "function") return null;
  const rect = plotElement.getBoundingClientRect();
  const localX = event.clientX - rect.left;
  const plotX = localX - (axes.xaxis._offset || 0);
  const clampedPlotX = Math.max(
    0,
    Math.min(axes.xaxis._length || 0, plotX),
  );
  const frequency = axes.xaxis.p2l(clampedPlotX);
  if (!Number.isFinite(frequency)) return null;
  const [minimum, maximum] = readDofAxisRange(axes.xaxis);
  return Math.max(minimum, Math.min(maximum, frequency));
}

export function readDofPointerLevel(
  event: PointerEvent,
  plotElement: HTMLElement,
) {
  const axes = readDofPlotAxes(plotElement);
  if (!axes || typeof axes.yaxis.p2l !== "function") return null;
  const rect = plotElement.getBoundingClientRect();
  const localY = event.clientY - rect.top;
  const plotY = localY - (axes.yaxis._offset || 0);
  const clampedPlotY = Math.max(
    0,
    Math.min(axes.yaxis._length || 0, plotY),
  );
  const level = axes.yaxis.p2l(clampedPlotY);
  if (!Number.isFinite(level)) return null;
  const [minimum, maximum] = readDofAxisRange(axes.yaxis);
  return Math.max(minimum, Math.min(maximum, level));
}
