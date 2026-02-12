export function overlayToggleShouldRender(el: HTMLInputElement | null) {
  return Boolean(el?.checked);
}
