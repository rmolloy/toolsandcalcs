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
    exports.resolveFlexuralRigidity = resolveFlexuralRigidity;
    exports.computeBraceGeometry = computeBraceGeometry;
    exports.calculateBraceRenderModel = calculateBraceRenderModel;
    exports.calculateBraceComparisonModel = calculateBraceComparisonModel;
    function resolveFlexuralRigidity(browserApi, commonJsRequire) {
        if (browserApi)
            return browserApi;
        if (!commonJsRequire)
            return undefined;
        return commonJsRequire("../calculator")
            .FlexuralRigidity;
    }
    const FlexuralRigidity = resolveFlexuralRigidity(typeof window !== "undefined" ? window.FlexuralRigidity : undefined, typeof require === "function" ? require : undefined);
    if (!FlexuralRigidity) {
        throw new Error("FlexuralRigidity calculator is unavailable.");
    }
    const { computeBraceElasticRigidity, shapeProperties, Shapes } = FlexuralRigidity;
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
        const elasticRigidity = computeBraceElasticRigidity({
            b: defaultBreadth,
            segments: rawSegments.map((segment) => ({
                label: segment.label,
                shape: segment.shape,
                h: segment.height,
                breadth: segment.breadth,
                material: { E: segment.modulus * 1000 },
            })),
        }, defaultBreadth, 1000);
        return {
            breadth: defaultBreadth,
            height: runningBase,
            area: areaSum,
            centroid,
            I: ITotal,
            massPerLength: massSum,
            EI: elasticRigidity.EI / 1e6,
            segments: rawSegments
        };
    }
    function calculateBraceRenderModel(braces, defaults) {
        const renderInfo = {};
        const totalHeights = [];
        const breadths = [];
        braces.forEach((brace) => {
            var _a, _b;
            const stack = brace.segments
                .map((segment) => {
                var _a, _b, _c;
                return ({
                    label: segment.label,
                    shape: segment.shape,
                    height: Math.max(0, segment.height),
                    breadth: Math.max(0.5, (_a = segment.breadth) !== null && _a !== void 0 ? _a : 10),
                    density: (_b = segment.density) !== null && _b !== void 0 ? _b : defaults.density,
                    modulus: (_c = segment.modulus) !== null && _c !== void 0 ? _c : defaults.modulus,
                });
            })
                .filter((segment) => segment.height > 0);
            const totalHeight = stack.reduce((sum, segment) => sum + segment.height, 0);
            totalHeights.push(totalHeight);
            breadths.push(stack.length ? stack[stack.length - 1].breadth : 10);
            try {
                renderInfo[brace.id] = {
                    result: computeBraceGeometry((_b = (_a = stack[0]) === null || _a === void 0 ? void 0 : _a.breadth) !== null && _b !== void 0 ? _b : 10, stack),
                };
            }
            catch (error) {
                renderInfo[brace.id] = {
                    error: error instanceof Error ? error.message : String(error),
                };
            }
        });
        return {
            renderInfo,
            scales: {
                referenceBreadth: Math.max(10, Math.max(...breadths, 10) * 1.2),
                maxHeight: Math.max(...totalHeights, 10),
            },
        };
    }
    function calculateBraceComparisonModel(braces, renderInfo) {
        const entries = braces.flatMap((brace) => {
            var _a;
            const result = (_a = renderInfo[brace.id]) === null || _a === void 0 ? void 0 : _a.result;
            return result ? [{ brace, result }] : [];
        });
        if (!entries.length) {
            return [];
        }
        const reference = entries[0].result;
        const referenceMass = reference.massPerLength || 1;
        const referenceEI = reference.EI || 1;
        const referenceArea = reference.area || 1;
        const referenceI = reference.I || 1;
        return entries.map(({ brace, result }) => ({
            id: brace.id,
            name: brace.name,
            relativeEI: (result.EI / referenceEI) * 100,
            relativeI: (result.I / referenceI) * 100,
            relativeMass: (result.massPerLength / referenceMass) * 100,
            relativeArea: (result.area / referenceArea) * 100,
        }));
    }
    exports.BraceGeometry = {
        Shapes,
        calculateBraceComparisonModel,
        calculateBraceRenderModel,
        computeBraceGeometry
    };
    exports.default = exports.BraceGeometry;
    if (typeof window !== "undefined") {
        window.BraceGeometry = exports.BraceGeometry;
    }
    if (typeof module !== "undefined" &&
        typeof module.exports !== "undefined" &&
        Object.prototype.toString.call(module.exports) !== "[object Module]" &&
        Object.isExtensible(module.exports)) {
        module.exports = exports.BraceGeometry;
    }
});
