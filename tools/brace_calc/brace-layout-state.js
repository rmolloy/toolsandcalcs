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
    exports.BraceLayoutState = void 0;
    exports.applyBraceSegmentUpdate = applyBraceSegmentUpdate;
    exports.readBraceTopFromLayout = readBraceTopFromLayout;
    exports.readBraceSaveSnapshot = readBraceSaveSnapshot;
    exports.readBraceLayoutEventDetail = readBraceLayoutEventDetail;
    exports.readLoadedBraceLayoutEventDetail = readLoadedBraceLayoutEventDetail;
    exports.removeBraceFromLayout = removeBraceFromLayout;
    exports.removeBraceSegmentFromLayout = removeBraceSegmentFromLayout;
    exports.renameBraceInLayout = renameBraceInLayout;
    exports.updateBraceSegmentInLayout = updateBraceSegmentInLayout;
    exports.appendBraceSegmentToLayout = appendBraceSegmentToLayout;
    exports.appendDefaultBraceToLayout = appendDefaultBraceToLayout;
    exports.createInitialBraceLayout = createInitialBraceLayout;
    exports.ensureBraceLayoutHasDefault = ensureBraceLayoutHasDefault;
    exports.sanitizeBraceLayout = sanitizeBraceLayout;
    function applyBraceSegmentUpdate(segment, updates) {
        return {
            ...segment,
            ...updates,
            height: positiveOrMinimum(updates.height, segment.height, 0),
            breadth: positiveOrMinimum(updates.breadth, segment.breadth, 0.5),
            density: positiveOrMinimum(updates.density, segment.density, 1),
            modulus: positiveOrMinimum(updates.modulus, segment.modulus, 0.1),
        };
    }
    function readBraceTopFromLayout(layout) {
        const top = layout && typeof layout === "object"
            ? layout.top
            : null;
        const span = Number(top === null || top === void 0 ? void 0 : top.span);
        const thickness = Number(top === null || top === void 0 ? void 0 : top.thickness);
        const modulus = Number(top === null || top === void 0 ? void 0 : top.modulus);
        if (!Number.isFinite(span) || !Number.isFinite(thickness)) {
            return null;
        }
        return {
            span,
            thickness,
            modulus: Number.isFinite(modulus) ? modulus : undefined,
        };
    }
    function readBraceSaveSnapshot(braces) {
        return braces.map((brace) => ({
            name: brace.name,
            segments: brace.segments.map((segment) => ({
                label: segment.label,
                shape: segment.shape,
                height: segment.height,
                breadth: segment.breadth,
                density: segment.density,
                modulus: segment.modulus,
            })),
        }));
    }
    function readBraceLayoutEventDetail(braces, top) {
        const detail = {
            braces: readBraceSaveSnapshot(braces),
        };
        if (top) {
            detail.top = top;
        }
        return detail;
    }
    function readLoadedBraceLayoutEventDetail(rawLayout, braces) {
        const detail = {
            braces: braces.map((brace) => ({
                name: brace.name,
                segments: brace.segments.map((segment) => ({
                    label: segment.label,
                    shape: segment.shape,
                    height: segment.height,
                    breadth: segment.breadth,
                    modulus: segment.modulus,
                })),
            })),
        };
        const top = readBraceTopFromLayout(rawLayout);
        if (top) {
            detail.top = top;
        }
        return detail;
    }
    function removeBraceFromLayout(braces, braceId) {
        return braces.length === 1
            ? braces
            : braces.filter((brace) => brace.id !== braceId);
    }
    function removeBraceSegmentFromLayout(braces, braceId, segmentId) {
        return braces.map((brace) => {
            if (brace.id !== braceId || brace.segments.length === 1) {
                return brace;
            }
            return {
                ...brace,
                segments: brace.segments.filter((segment) => segment.id !== segmentId),
            };
        });
    }
    function renameBraceInLayout(braces, braceId, name) {
        return braces.map((brace) => (brace.id === braceId
            ? { ...brace, name }
            : brace));
    }
    function updateBraceSegmentInLayout(braces, braceId, segmentId, updates) {
        return braces.map((brace) => {
            if (brace.id !== braceId) {
                return brace;
            }
            return {
                ...brace,
                segments: brace.segments.map((segment) => (segment.id === segmentId
                    ? applyBraceSegmentUpdate(segment, updates)
                    : segment)),
            };
        });
    }
    function appendBraceSegmentToLayout(braces, braceId, context) {
        return braces.map((brace) => {
            var _a, _b, _c, _d;
            if (brace.id !== braceId) {
                return brace;
            }
            const lastSegment = brace.segments[brace.segments.length - 1];
            const segmentNumber = brace.segments.length + 1;
            return {
                ...brace,
                segments: [
                    ...brace.segments,
                    {
                        id: context.nextSegmentId(),
                        label: `Segment ${segmentNumber}`,
                        shape: context.shape,
                        height: (_a = lastSegment === null || lastSegment === void 0 ? void 0 : lastSegment.height) !== null && _a !== void 0 ? _a : context.defaultHeight,
                        breadth: (_b = lastSegment === null || lastSegment === void 0 ? void 0 : lastSegment.breadth) !== null && _b !== void 0 ? _b : context.defaultBreadth,
                        density: (_c = lastSegment === null || lastSegment === void 0 ? void 0 : lastSegment.density) !== null && _c !== void 0 ? _c : context.defaultDensity,
                        modulus: (_d = lastSegment === null || lastSegment === void 0 ? void 0 : lastSegment.modulus) !== null && _d !== void 0 ? _d : context.defaultModulus,
                    },
                ],
            };
        });
    }
    function appendDefaultBraceToLayout(braces, context) {
        const braceNumber = braces.length + 1;
        return [
            ...braces,
            {
                id: context.nextBraceId(),
                name: `Brace ${braceNumber}`,
                segments: [
                    {
                        id: context.nextSegmentId(),
                        label: "Base",
                        shape: context.rectangleShape,
                        height: 4,
                        breadth: 10,
                        density: context.defaultDensity,
                        modulus: context.defaultModulus,
                    },
                    {
                        id: context.nextSegmentId(),
                        label: "Cap",
                        shape: context.triangleShape,
                        height: 8,
                        breadth: 10,
                        density: context.defaultDensity,
                        modulus: context.defaultModulus,
                    },
                ],
            },
        ];
    }
    function createInitialBraceLayout(transferred, defaultLayout, context) {
        if (transferred) {
            return [{
                    id: context.nextBraceId(),
                    name: "Transferred brace stock",
                    segments: [{
                            id: context.nextSegmentId(),
                            label: "Measured stock",
                            shape: context.rectangleShape,
                            height: transferred.height,
                            breadth: transferred.breadth,
                            density: transferred.density,
                            modulus: transferred.modulus,
                        }],
                }];
        }
        const defaultBraces = sanitizeBraceLayout(defaultLayout, context);
        if (defaultBraces.length) {
            return defaultBraces;
        }
        return appendDefaultBraceToLayout([], {
            nextBraceId: context.nextBraceId,
            nextSegmentId: context.nextSegmentId,
            rectangleShape: context.rectangleShape,
            triangleShape: context.triangleShape,
            defaultDensity: context.defaultDensity,
            defaultModulus: context.defaultModulus,
        });
    }
    function ensureBraceLayoutHasDefault(braces, context) {
        return braces.length
            ? braces
            : appendDefaultBraceToLayout(braces, context);
    }
    function sanitizeBraceLayout(data, context) {
        const braceArray = bracesReadFromLayout(data);
        return braceArray.flatMap((rawBrace, braceIndex) => {
            const brace = braceSanitize(rawBrace, braceIndex, context);
            return brace ? [brace] : [];
        });
    }
    function bracesReadFromLayout(data) {
        if (Array.isArray(data))
            return data;
        if (!data || typeof data !== "object")
            return [];
        const braces = data.braces;
        return Array.isArray(braces) ? braces : [];
    }
    function braceSanitize(rawBrace, braceIndex, context) {
        if (!rawBrace || typeof rawBrace !== "object")
            return null;
        const rawSegments = Array.isArray(rawBrace.segments)
            ? rawBrace.segments
            : [];
        const segments = rawSegments.flatMap((rawSegment, segmentIndex) => {
            const segment = segmentSanitize(rawSegment, `Segment ${segmentIndex + 1}`, context);
            return segment ? [segment] : [];
        });
        if (!segments.length)
            return null;
        return {
            id: context.nextBraceId(),
            name: nonEmptyStringRead(rawBrace.name, `Brace ${braceIndex + 1}`),
            segments,
        };
    }
    function segmentSanitize(rawSegment, fallbackLabel, context) {
        if (!rawSegment || typeof rawSegment !== "object")
            return null;
        const segment = rawSegment;
        const height = Number(segment.height);
        if (!Number.isFinite(height) || height <= 0)
            return null;
        return {
            id: context.nextSegmentId(),
            label: nonEmptyStringRead(segment.label, fallbackLabel),
            shape: context.validShapes.has(segment.shape)
                ? segment.shape
                : context.rectangleShape,
            height,
            breadth: positiveNumberRead(segment.breadth, 10),
            density: positiveNumberRead(segment.density, context.defaultDensity),
            modulus: positiveNumberRead(segment.modulus, context.defaultModulus),
        };
    }
    function nonEmptyStringRead(value, fallback) {
        return typeof value === "string" && value.trim() ? value.trim() : fallback;
    }
    function positiveNumberRead(value, fallback) {
        const number = Number(value);
        return Number.isFinite(number) && number > 0 ? number : fallback;
    }
    function positiveOrMinimum(candidate, current, minimum) {
        return candidate != null && Number.isFinite(candidate)
            ? Math.max(minimum, candidate)
            : current;
    }
    exports.BraceLayoutState = {
        applyBraceSegmentUpdate,
        appendDefaultBraceToLayout,
        appendBraceSegmentToLayout,
        createInitialBraceLayout,
        ensureBraceLayoutHasDefault,
        readBraceLayoutEventDetail,
        readLoadedBraceLayoutEventDetail,
        readBraceTopFromLayout,
        readBraceSaveSnapshot,
        renameBraceInLayout,
        removeBraceFromLayout,
        removeBraceSegmentFromLayout,
        sanitizeBraceLayout,
        updateBraceSegmentInLayout,
    };
    if (typeof window !== "undefined") {
        window.BraceLayoutState = exports.BraceLayoutState;
    }
});
