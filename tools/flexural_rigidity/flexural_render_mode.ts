(function initFlexuralRenderMode() {
  type FlexuralMode = "view" | "edit";

  const pageElement = document.querySelector<HTMLElement>("[data-flexural-mode]");
  if (!pageElement) return;
  const modePage = pageElement;

  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-flexural-mode-button]"));
  const regions = Array.from(document.querySelectorAll<HTMLElement>("[data-flexural-region]"));
  const actions = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-flexural-mode-target]"));
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      writeFlexuralMode(readFlexuralModeFromButton(button));
    });
  });
  actions.forEach((action) => {
    action.addEventListener("click", () => {
      writeFlexuralMode(readFlexuralModeFromAction(action));
    });
  });

  writeFlexuralMode(readFlexuralModeFromPage(modePage));

  function writeFlexuralMode(mode: FlexuralMode): void {
    modePage.dataset.flexuralMode = mode;
    buttons.forEach((button) => {
      button.setAttribute("aria-pressed", String(readFlexuralModeFromButton(button) === mode));
    });
    regions.forEach((region) => {
      region.hidden = readFlexuralModeFromRegion(region) !== mode;
    });
  }

  function readFlexuralModeFromPage(element: HTMLElement): FlexuralMode {
    return element.dataset.flexuralMode === "edit" ? "edit" : "view";
  }

  function readFlexuralModeFromButton(button: HTMLButtonElement): FlexuralMode {
    return button.dataset.flexuralModeButton === "edit" ? "edit" : "view";
  }

  function readFlexuralModeFromAction(action: HTMLButtonElement): FlexuralMode {
    return action.dataset.flexuralModeTarget === "edit" ? "edit" : "view";
  }

  function readFlexuralModeFromRegion(region: HTMLElement): FlexuralMode {
    return region.dataset.flexuralRegion === "edit" ? "edit" : "view";
  }
})();
