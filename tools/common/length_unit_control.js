(function attachLengthUnitControl(runtime) {
  function mountLengthUnitControl(document, controller) {
    const config = document.getElementById('tool_length_unit_config');
    const actions = document.querySelector('.hero-actions, .fit-actions');
    if (!config || !actions || !controller) return null;
    const group = createControl(document, JSON.parse(config.textContent).label, controller);
    actions.insertBefore(group, actions.querySelector('.tool-locale-selector, .hero-help-link, #btn_fullscreen'));
    controller.subscribe(({ unit, available }) => updateControl(group, unit, available));
    return group;
  }

  function createControl(document, label, controller) {
    const group = document.createElement('div');
    group.className = 'tool-length-unit-control';
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', label);
    ['mm', 'in'].forEach((unit) => group.appendChild(createButton(document, controller, unit)));
    return group;
  }

  function createButton(document, controller, unit) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.lengthUnitButton = unit;
    button.textContent = unit;
    button.addEventListener('click', () => controller.select(unit));
    return button;
  }

  function updateControl(group, unit, available) {
    group.hidden = !available;
    group.querySelectorAll('button').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.lengthUnitButton === unit)));
  }

  const api = Object.freeze({ mountLengthUnitControl });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (!runtime.document) return;
  const mount = () => mountLengthUnitControl(runtime.document, runtime.ToolLengthUnits);
  if (runtime.document.readyState === 'loading') runtime.document.addEventListener('DOMContentLoaded', mount);
  else mount();
})(typeof window !== 'undefined' ? window : globalThis);
