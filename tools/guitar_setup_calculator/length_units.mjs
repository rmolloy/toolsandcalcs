const MILLIMETRES_PER_INCH = 25.4;

export const lengthUnitPresentation = Object.freeze({
  defaultUnit: "mm",

  normalize(unit) {
    return unit === "in" ? "in" : "mm";
  },

  label(unit) {
    return this.normalize(unit);
  },

  fromMillimetres(value, unit) {
    return this.normalize(unit) === "in" ? value / MILLIMETRES_PER_INCH : value;
  },

  toMillimetres(value, unit) {
    return this.normalize(unit) === "in" ? value * MILLIMETRES_PER_INCH : value;
  },

  format(value, unit, { signed = false, precision } = {}) {
    const normalizedUnit = this.normalize(unit);
    const displayValue = this.fromMillimetres(value, normalizedUnit);
    const digits = precision ?? (normalizedUnit === "in" ? 3 : 2);
    const sign = signed && displayValue >= 0 ? "+" : "";
    return `${sign}${displayValue.toFixed(digits)} ${normalizedUnit}`;
  },
});
