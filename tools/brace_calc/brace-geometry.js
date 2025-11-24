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
    exports.BraceGeometry = void 0;
    exports.computeBraceGeometry = computeBraceGeometry;
    const FlexuralRigidity = (typeof window !== "undefined" && window.FlexuralRigidity) ||
        (typeof require === "function" ? require("../calculator").FlexuralRigidity : undefined);
    if (!FlexuralRigidity) {
        throw new Error("FlexuralRigidity calculator is unavailable.");
    }
    const { shapeProperties, Shapes } = FlexuralRigidity;
    function assertPositive(value, label) {
        if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
            throw new Error(`${label} must be a positive number`);
        }
    }
    const DEFAULT_DENSITY = 420; // kg/m³, spruce-ish
    const DEFAULT_MODULUS = 11; // GPa
    function computeBraceGeometry(defaultBreadth, segments) {
        var _a, _b, _c;
        assertPositive(defaultBreadth, "Brace breadth");
        if (!segments.length) {
            throw new Error("Add at least one segment to compute brace geometry.");
        }
        let runningBase = 0;
        let areaSum = 0;
        let centroidNumerator = 0;
        let massSum = 0;
        let eisum = 0;
        const rawSegments = [];
        for (const segment of segments) {
            const { shape, height } = segment;
            assertPositive(height, `${segment.label || "Segment"} height`);
            const segBreadth = (_a = segment.breadth) !== null && _a !== void 0 ? _a : defaultBreadth;
            assertPositive(segBreadth, `${segment.label || "Segment"} breadth`);
            const density = (_b = segment.density) !== null && _b !== void 0 ? _b : DEFAULT_DENSITY;
            assertPositive(density, `${segment.label || "Segment"} density`);
            const modulus = (_c = segment.modulus) !== null && _c !== void 0 ? _c : DEFAULT_MODULUS;
            assertPositive(modulus, `${segment.label || "Segment"} modulus`);
            const props = shapeProperties(shape, segBreadth, height);
            const centroidAbs = runningBase + props.centroid;
            areaSum += props.area;
            centroidNumerator += props.area * centroidAbs;
            const areaM2 = props.area * 1e-6;
            const massPerLength = density * areaM2;
            const EIvalue = modulus * 1e9 * (props.I * 1e-12);
            massSum += massPerLength;
            eisum += EIvalue;
            rawSegments.push({
                label: segment.label,
                shape,
                height,
                breadth: segBreadth,
                base: runningBase,
                area: props.area,
                centroid: centroidAbs,
                centroidFromBase: props.centroid,
                I: props.I,
                density,
                modulus,
                massPerLength,
                EI: EIvalue
            });
            runningBase += height;
        }
        if (areaSum === 0) {
            throw new Error("Total area is zero; check segment inputs.");
        }
        const centroid = centroidNumerator / areaSum;
        let ITotal = 0;
        for (const segment of rawSegments) {
            const distance = centroid - segment.centroid;
            ITotal += segment.I + segment.area * distance ** 2;
        }
        return {
            breadth: defaultBreadth,
            height: runningBase,
            area: areaSum,
            centroid,
            I: ITotal,
            massPerLength: massSum,
            EI: eisum,
            segments: rawSegments
        };
    }
    exports.BraceGeometry = {
        Shapes,
        computeBraceGeometry
    };
    exports.default = exports.BraceGeometry;
    if (typeof window !== "undefined") {
        window.BraceGeometry = exports.BraceGeometry;
    }
    if (typeof module !== "undefined" && typeof module.exports !== "undefined") {
        module.exports = exports.BraceGeometry;
    }
});
