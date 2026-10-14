"use strict";

(() => {
  type Complex = { re: number; im: number };

  const C = (re: number, im = 0): Complex => ({ re, im });
  const add = (a: Complex, b: Complex): Complex => C(a.re + b.re, a.im + b.im);
  const sub = (a: Complex, b: Complex): Complex => C(a.re - b.re, a.im - b.im);
  const mul = (a: Complex, b: Complex): Complex => C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
  const scl = (a: Complex, s: number): Complex => C(a.re * s, a.im * s);
  const inv = (a: Complex): Complex => {
    const d = a.re * a.re + a.im * a.im || 1e-30;
    return C(a.re / d, -a.im / d);
  };
  const div = (a: Complex, b: Complex): Complex => mul(a, inv(b));
  const abs = (a: Complex): number => Math.hypot(a.re, a.im);

  const ComplexMath = { C, add, sub, mul, scl, inv, div, abs };

  const globalScope = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : undefined;
  if (globalScope) {
    (globalScope as any).Complex = ComplexMath;
  }
  if (typeof module !== "undefined" && (module as any).exports) {
    (module as any).exports = ComplexMath;
  }
})();
