export function createSetupStepNavigation(document, stepAliases = {}) {
  const navigation = new SetupStepNavigation(document, stepAliases);
  navigation.bind();
  navigation.render();
  return navigation;
}

class SetupStepNavigation {
  constructor(document, stepAliases) {
    this.document = document;
    this.buttons = Array.from(document.querySelectorAll("[data-setup-step]"));
    this.panels = this.buttons.map((button) => document.getElementById(button.getAttribute("aria-controls")));
    this.previous = document.getElementById("setup_previous");
    this.next = document.getElementById("setup_next");
    this.position = 0;
    this.stepAliases = stepAliases;
  }

  get index() {
    return Number(this.buttons[this.position].dataset.setupStep);
  }

  bind() {
    this.buttons.forEach((button, position) => button.addEventListener("click", () => this.selectPosition(position)));
    this.previous.addEventListener("click", () => this.selectPosition(this.position - 1));
    this.next.addEventListener("click", () => this.selectPosition(this.position + 1));
  }

  select(stepId) {
    const targetStepId = this.stepAliases[stepId] ?? stepId;
    const position = this.buttons.findIndex((button) => Number(button.dataset.setupStep) === targetStepId);
    this.selectPosition(position);
  }

  selectPosition(position) {
    if (!this.panels[position]) return;
    this.activatePosition(position);
  }

  activatePosition(position) {
    this.position = position;
    this.render();
    this.focusHeading();
  }

  render() {
    this.panels.forEach((panel, position) => { panel.hidden = position !== this.position; });
    this.buttons.forEach((button, position) => this.markCurrentStep(button, position));
    this.renderActions();
  }

  markCurrentStep(button, position) {
    if (position !== this.position) return button.removeAttribute("aria-current");
    button.setAttribute("aria-current", "step");
  }

  renderActions() {
    this.previous.disabled = this.position === 0;
    this.next.hidden = this.position === this.panels.length - 1;
    this.next.textContent = this.position === this.panels.length - 2
      ? this.next.dataset.reviewLabel : this.next.dataset.continueLabel;
  }

  focusHeading() {
    this.panels[this.position].querySelector('[role="heading"]').focus({ preventScroll: true });
    this.document.getElementById("setup_form").scrollIntoView({ block: "start", behavior: "instant" });
  }
}
