(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.calloutDragDispatch = calloutDragDispatch;
    exports.calloutTextBuild = calloutTextBuild;
    exports.calloutTextApply = calloutTextApply;
    exports.calloutBuild = calloutBuild;
    function calloutDragDispatch(behaviors, phase, event) {
        return behaviors.some((behavior) => behavior[phase](event));
    }
    function calloutTextBuild(name, frequencyHz, detail) {
        const frequencyLabel = `${frequencyHz.toFixed(1)} Hz`;
        return {
            labelHtml: `${name}<br><span>${frequencyLabel}</span>`,
            description: detail ? `${name}: ${frequencyLabel}, ${detail}` : `${name}: ${frequencyLabel}`,
        };
    }
    function calloutTextApply(callout, text) {
        callout.label.innerHTML = text.labelHtml;
        callout.root.title = text.description;
        callout.root.setAttribute("aria-label", text.description);
    }
    function calloutBuild(overlay, spec) {
        const root = document.createElement("div");
        root.className = spec.extraClassName ? `dof-thumb ${spec.extraClassName}` : "dof-thumb";
        Object.entries(spec.dataset).forEach(([key, value]) => {
            root.dataset[key] = value;
        });
        root.style.setProperty("--thumb-color", spec.color);
        const label = document.createElement("div");
        label.className = "dof-thumb-label";
        const stem = document.createElement("div");
        stem.className = "dof-thumb-stem";
        const halo = document.createElement("div");
        halo.className = "dof-thumb-halo";
        const dot = document.createElement("div");
        dot.className = "dof-thumb-dot";
        root.append(label, stem, halo, dot);
        root.addEventListener("pointerdown", spec.onPointerDown);
        overlay.appendChild(root);
        return { root, label, stem, dot, halo };
    }
});
