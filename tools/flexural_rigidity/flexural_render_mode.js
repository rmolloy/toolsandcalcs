"use strict";
(function initFlexuralRenderMode() {
    const pageElement = document.querySelector("[data-flexural-mode]");
    if (!pageElement)
        return;
    const modePage = pageElement;
    const buttons = Array.from(document.querySelectorAll("[data-flexural-mode-button]"));
    const regions = Array.from(document.querySelectorAll("[data-flexural-region]"));
    const actions = Array.from(document.querySelectorAll("[data-flexural-mode-target]"));
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
    function writeFlexuralMode(mode) {
        modePage.dataset.flexuralMode = mode;
        buttons.forEach((button) => {
            button.setAttribute("aria-pressed", String(readFlexuralModeFromButton(button) === mode));
        });
        regions.forEach((region) => {
            region.hidden = readFlexuralModeFromRegion(region) !== mode;
        });
    }
    function readFlexuralModeFromPage(element) {
        return element.dataset.flexuralMode === "edit" ? "edit" : "view";
    }
    function readFlexuralModeFromButton(button) {
        return button.dataset.flexuralModeButton === "edit" ? "edit" : "view";
    }
    function readFlexuralModeFromAction(action) {
        return action.dataset.flexuralModeTarget === "edit" ? "edit" : "view";
    }
    function readFlexuralModeFromRegion(region) {
        return region.dataset.flexuralRegion === "edit" ? "edit" : "view";
    }
})();
