"use strict";
(() => {
    const C = (re, im = 0) => ({ re, im });
    const add = (a, b) => C(a.re + b.re, a.im + b.im);
    const sub = (a, b) => C(a.re - b.re, a.im - b.im);
    const mul = (a, b) => C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
    const scl = (a, s) => C(a.re * s, a.im * s);
    const inv = (a) => {
        const d = a.re * a.re + a.im * a.im || 1e-30;
        return C(a.re / d, -a.im / d);
    };
    const div = (a, b) => mul(a, inv(b));
    const abs = (a) => Math.hypot(a.re, a.im);
    const ComplexMath = { C, add, sub, mul, scl, inv, div, abs };
    const globalScope = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : undefined;
    if (globalScope) {
        globalScope.Complex = ComplexMath;
    }
    if (typeof module !== "undefined" && module.exports) {
        module.exports = ComplexMath;
    }
})();
