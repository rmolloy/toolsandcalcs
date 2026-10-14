export function resonanceToolNavigate(href: string, runtime: Window = window) {
  if ((runtime as any).ToolFullscreenNavigation?.navigate(href)) return;
  runtime.location.href = href;
}
