const STARTING_LENGTHS_MM = Object.freeze({
  steel_string: [622.3, 628.65, 635, 645.16, 647.7],
  electric: [628.65, 635, 647.7],
  twelve_string: [628.65, 645.16, 647.7],
  classical: [630, 640, 650, 660],
  tenor_ukulele: [381, 431.8, 482.6],
  four_string_bass: [762, 812.8, 863.6, 889],
  mandolin: [352.43, 355.6],
});

export function createScaleLengthEditor(options) {
  return new ScaleLengthEditor(options);
}

class ScaleLengthEditor {
  constructor({ document, getSetup, lengthUnits, onChange, onViewChange, onInvalid, restoredView }) {
    Object.assign(this, { document, getSetup, lengthUnits, onChange, onViewChange, onInvalid });
    this.root = document.getElementById('setup_scale_controls');
    this.input = document.getElementById('common_scale_length');
    this.confirmation = document.getElementById('single_scale_confirmation');
    this.confirmedLength = document.getElementById('confirmed_scale_length');
    this.invalidCommonLengthDraft = this.readInvalidLengthDraft(restoredView?.fields?.common_scale_length);
    this.mode = restoredView?.scaleMode === 'multi' || this.hasUnequalLengths() ? 'multi' : 'single';
    this.pending = Boolean(restoredView?.scaleConfirmationOpen);
    this.pendingLengthMm = restoredView?.scalePendingLengthMm ?? this.readDraftLength(restoredView?.fields?.confirmed_scale_length);
  }

  bind() {
    this.root.querySelectorAll('[data-scale-mode]').forEach((button) => button.addEventListener('click', () => this.select(button.dataset.scaleMode)));
    this.input.addEventListener('input', () => this.applyLength(this.input));
    this.confirmedLength.addEventListener('input', () => { this.pendingLengthMm = this.readDraftLength(this.confirmedLength.value); });
    this.document.getElementById('apply_common_scale').addEventListener('click', () => this.confirmSingleScale());
    this.document.getElementById('cancel_common_scale').addEventListener('click', () => this.cancelConfirmation());
    this.confirmation.addEventListener('keydown', (event) => { if (event.key === 'Escape') this.cancelConfirmation(); });
  }

  contains(input) {
    return this.root.contains(input);
  }

  get validationError() {
    if (this.mode !== 'single' || this.invalidCommonLengthDraft === null) return null;
    return new RangeError(this.root.dataset.invalidMessage);
  }

  select(mode) {
    if (mode === 'single' && this.hasUnequalLengths()) return this.requestConfirmation();
    this.mode = mode;
    this.pending = false;
    this.render();
    this.onViewChange?.();
  }

  reset() {
    this.mode = 'single';
    this.pending = false;
    this.clearCommonLengthDraft();
    this.presentCommonLength();
    this.render();
  }

  hasUnequalLengths() {
    const lengths = this.getSetup().strings.map((string) => string.scaleLengthMm);
    return lengths.some((length) => length !== lengths[0]);
  }

  requestConfirmation() {
    if (!this.pending) this.pendingLengthMm = this.getSetup().strings[0].scaleLengthMm;
    this.pending = true;
    this.render();
    this.confirmedLength.focus();
  }

  cancelConfirmation() {
    this.pending = false;
    this.render();
    this.onViewChange?.();
    this.root.querySelector('[data-scale-mode="multi"]').focus();
  }

  confirmSingleScale() {
    if (!this.applyLengthValue(this.pendingLengthMm, this.confirmedLength)) return;
    this.mode = 'single';
    this.pending = false;
    this.render();
    this.input.focus();
  }

  applyLength(input) {
    this.invalidCommonLengthDraft = this.readInvalidLengthDraft(input.value);
    return this.applyLengthValue(this.lengthUnits.read(input.value), input);
  }

  applyLengthValue(lengthMm, input) {
    if (!(lengthMm > 0) || !Number.isFinite(lengthMm)) return this.rejectLength(input);
    this.clearCommonLengthDraft();
    input.removeAttribute('aria-invalid');
    this.getSetup().scaleLengthMm = lengthMm;
    this.getSetup().strings.forEach((string) => { string.scaleLengthMm = lengthMm; });
    this.onChange();
    return true;
  }

  clearCommonLengthDraft() {
    this.invalidCommonLengthDraft = null;
    this.input.removeAttribute('aria-invalid');
  }

  captureView() {
    return { scalePendingLengthMm: this.pendingLengthMm };
  }

  rejectLength(input) {
    input.setAttribute('aria-invalid', 'true');
    this.onInvalid(this.root.dataset.invalidMessage);
    return false;
  }

  render() {
    this.root.dataset.scaleMode = this.mode;
    this.document.getElementById('string_inputs').dataset.scaleMode = this.mode;
    this.renderModeControls();
    this.renderLengths();
    this.renderSuggestions();
  }

  renderModeControls() {
    this.root.querySelectorAll('[data-scale-mode]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.scaleMode === this.mode)));
    this.document.getElementById('common_scale_field').hidden = this.mode !== 'single';
    this.document.querySelector('.fan-reference-control').hidden = this.mode !== 'multi';
    this.confirmation.hidden = !this.pending;
  }

  renderLengths() {
    this.renderLength(this.input);
    this.renderConfirmationLength();
    this.document.querySelectorAll('[data-string-field="scaleLengthMm"]').forEach((input) => this.renderStringLength(input));
  }

  readDraftLength(value) {
    if (value === undefined || value === '') return null;
    return this.lengthUnits.read(value);
  }

  readInvalidLengthDraft(value) {
    if (value === undefined) return null;
    const lengthMm = this.lengthUnits.read(value);
    return Number.isFinite(lengthMm) && lengthMm > 0 ? null : String(value);
  }

  renderConfirmationLength() {
    this.confirmedLength.step = String(this.lengthUnits.inputStep('scale'));
    this.confirmedLength.value = this.pendingLengthMm === null ? '' : String(this.lengthUnits.display(this.pendingLengthMm));
  }

  renderLength(input) {
    input.step = String(this.lengthUnits.inputStep('scale'));
    if (this.invalidCommonLengthDraft !== null) return this.renderInvalidCommonLength();
    if (this.document.activeElement !== input) this.presentCommonLength();
  }

  presentCommonLength() {
    if (this.invalidCommonLengthDraft !== null) return this.renderInvalidCommonLength();
    this.input.value = String(this.lengthUnits.display(this.getSetup().strings[0].scaleLengthMm));
  }

  renderInvalidCommonLength() {
    this.input.value = this.invalidCommonLengthDraft;
    this.input.setAttribute('aria-invalid', 'true');
  }

  renderStringLength(input) {
    input.setAttribute('list', 'scale_starting_lengths');
    if (this.document.activeElement !== input) input.value = String(this.lengthUnits.display(this.getSetup().strings[Number(input.dataset.stringIndex)].scaleLengthMm));
  }

  renderSuggestions() {
    const lengths = STARTING_LENGTHS_MM[this.getSetup().instrumentProfileId] || STARTING_LENGTHS_MM.steel_string;
    this.document.getElementById('scale_starting_lengths').replaceChildren(...lengths.map((length) => this.createSuggestion(length)));
  }

  createSuggestion(lengthMm) {
    const option = this.document.createElement('option');
    option.value = String(this.lengthUnits.display(lengthMm));
    option.label = `${Number((lengthMm / 25.4).toFixed(4))} in · ${lengthMm} mm`;
    return option;
  }
}
