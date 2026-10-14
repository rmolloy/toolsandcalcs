export function requireFinite(value: number, name: string): void {
  if (!Number.isFinite(value)) throw new RangeError(`${name} must be finite`);
}

export function requirePositive(value: number, name: string): void {
  requireFinite(value, name);
  if (value <= 0) throw new RangeError(`${name} must be positive`);
}

export function requirePositiveOrInfinity(value: number, name: string): void {
  if (value !== Infinity) requirePositive(value, name);
}

export function requireNonNegative(value: number, name: string): void {
  requireFinite(value, name);
  if (value < 0) throw new RangeError(`${name} must not be negative`);
}

export function requirePositiveInteger(value: number, name: string): void {
  requirePositive(value, name);
  if (!Number.isInteger(value)) throw new RangeError(`${name} must be an integer`);
}

export function requireNonNegativeInteger(value: number, name: string): void {
  requireNonNegative(value, name);
  if (!Number.isInteger(value)) throw new RangeError(`${name} must be an integer`);
}

export function requireUnitInterval(value: number, name: string): void {
  requireFinite(value, name);
  if (value < 0 || value > 1) throw new RangeError(`${name} must be between 0 and 1`);
}
