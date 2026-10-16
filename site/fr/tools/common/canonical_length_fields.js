(function attachCanonicalLengthFields(runtime) {
  const MILLIMETRES_PER_INCH = 25.4;
  const CONSTRAINT_NAMES = ['min', 'max', 'step'];

  function createCanonicalLengthFields({ fields, format = formatLength } = {}) {
    return new CanonicalLengthFields(fields, format);
  }

  class CanonicalLengthFields {
    constructor(fields, format) {
      this.currentUnit = 'mm';
      this.fields = createFields(fields, format);
    }

    get unit() { return this.currentUnit; }

    read(key) { return this.requireField(key).read(this.unit); }

    readText(key) { return canonicalText(this.read(key)); }

    write(key, canonicalMm) {
      this.requireField(key).write(canonicalMm, this.unit);
    }

    applyUnit(unit) {
      requireUnit(unit);
      this.fields.forEach((field) => field.read(this.unit));
      this.currentUnit = unit;
      this.fields.forEach((field) => field.present(unit));
    }

    requireField(key) {
      if (!this.fields.has(key)) throw new RangeError(`Unknown length field: ${key}`);
      return this.fields.get(key);
    }
  }

  class CanonicalLengthField {
    constructor({ input, relatedInputs = [], label }, format) {
      requireInput(input);
      this.input = input;
      this.inputs = [input, ...relatedInputs];
      this.label = label;
      this.format = format;
      this.constraints = readConstraints(input);
      this.capture('mm');
    }

    read(unit) {
      if (this.input.value !== this.presentedText) this.capture(unit);
      return this.canonicalMm;
    }

    capture(unit) {
      this.presentedText = this.input.value;
      this.draftText = this.input.value;
      this.canonicalMm = toMillimetres(parseLength(this.input.value), unit);
    }

    write(canonicalMm, unit) {
      requireFiniteLength(canonicalMm);
      this.canonicalMm = canonicalMm;
      this.present(unit);
    }

    present(unit) {
      const text = this.presentationText(unit);
      this.inputs.forEach((input) => presentInput(input, text, this.constraints, unit));
      this.presentedText = this.input.value;
      presentLabel(this.label, unit);
    }

    presentationText(unit) {
      if (!Number.isFinite(this.canonicalMm)) return this.draftText;
      return this.format(fromMillimetres(this.canonicalMm, unit), unit);
    }
  }

  function createFields(fields, format) {
    requireFields(fields);
    requireFormat(format);
    return new Map(Object.entries(fields).map(([key, definition]) => [key, new CanonicalLengthField(definition, format)]));
  }

  function requireFields(fields) {
    if (!fields || typeof fields !== 'object') throw new TypeError('Length fields must be an explicit record.');
  }

  function requireFormat(format) {
    if (typeof format !== 'function') throw new TypeError('Length format must be a function.');
  }

  function requireInput(input) {
    if (!input || typeof input.value !== 'string') throw new TypeError('Each length field requires an input.');
  }

  function requireUnit(unit) {
    if (unit !== 'mm' && unit !== 'in') throw new RangeError(`Unsupported length unit: ${unit}`);
  }

  function requireFiniteLength(value) {
    if (!Number.isFinite(value)) throw new TypeError('Canonical length must be a finite number.');
  }

  function readConstraints(input) {
    return Object.fromEntries(CONSTRAINT_NAMES.map((name) => [name, String(input[name] ?? '')]));
  }

  function presentInput(input, value, constraints, unit) {
    CONSTRAINT_NAMES.forEach((name) => { input[name] = presentConstraint(constraints[name], unit); });
    input.value = value;
  }

  function presentConstraint(text, unit) {
    const canonicalMm = parseLength(text);
    if (!Number.isFinite(canonicalMm)) return text;
    return String(fromMillimetres(canonicalMm, unit));
  }

  function presentLabel(label, unit) {
    if (!label) return;
    label.textContent = label.textContent.replace(/\((?:mm|in)\)(\s*)$/, `(${unit})$1`);
  }

  function parseLength(text) {
    if (String(text).trim() === '') return Number.NaN;
    const value = Number(text);
    return Number.isFinite(value) ? value : Number.NaN;
  }

  function toMillimetres(value, unit) {
    return unit === 'in' ? value * MILLIMETRES_PER_INCH : value;
  }

  function fromMillimetres(value, unit) {
    return unit === 'in' ? value / MILLIMETRES_PER_INCH : value;
  }

  function canonicalText(value) {
    return Number.isFinite(value) ? String(value) : '';
  }

  function formatLength(value) {
    return String(Number(value.toFixed(6)));
  }

  const api = Object.freeze({ createCanonicalLengthFields });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  runtime.ToolCanonicalLengthFields = api;
})(typeof window !== 'undefined' ? window : globalThis);
