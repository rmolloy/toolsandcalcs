export function createSetupStepNavigation(document) {
  const navigation = new SetupStepNavigation(document);
  navigation.bind();
  navigation.render();
  return navigation;
}

class SetupStepNavigation {
  constructor(document) {
    this.document = document;
    this.buttons = Array.from(document.querySelectorAll("[data-setup-step]"));
    this.panels = this.buttons.map((button) => document.getElementById(button.getAttribute("aria-controls")));
    this.previous = document.getElementById("setup_previous");
    this.next = document.getElementById("setup_next");
    this.index = 0;
  }

  bind() {
    this.buttons.forEach((button, index) => button.addEventListener("click", () => this.select(index)));
    this.previous.addEventListener("click", () => this.select(this.index - 1));
    this.next.addEventListener("click", () => this.select(this.index + 1));
  }

  select(index) {
    if (!this.panels[index]) return;
    this.index = index;
    this.render();
    this.focusHeading();
  }

  render() {
    this.panels.forEach((panel, index) => { panel.hidden = index !== this.index; });
    this.buttons.forEach((button, index) => this.markCurrentStep(button, index));
    this.renderActions();
  }

  markCurrentStep(button, index) {
    if (index !== this.index) return button.removeAttribute("aria-current");
    button.setAttribute("aria-current", "step");
  }

  renderActions() {
    this.previous.disabled = this.index === 0;
    this.next.hidden = this.index === this.panels.length - 1;
    this.next.textContent = this.index === this.panels.length - 2
      ? this.next.dataset.reviewLabel : this.next.dataset.continueLabel;
  }

  focusHeading() {
    this.panels[this.index].querySelector('[role="heading"]').focus({ preventScroll: true });
    this.document.getElementById("setup_form").scrollIntoView({ block: "start", behavior: "instant" });
  }
}
