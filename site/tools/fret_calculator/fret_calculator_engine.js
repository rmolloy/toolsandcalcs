"use strict";
/*
© 2026 Rick Molloy. All rights reserved.
*/
// The Fret Calculator's math: equal-temperament fret positions and bridge compensation scaled from a
// 650 mm reference, in millimetres, with the conversion to and from inches. The page, the offline package,
// the academy export and the Guitar Lab connector panel all load this one source.
(function fretCalculatorEnginePublish() {
    const MM_PER_INCH = 25.4;
    const DEFAULT_SCALE_MM = 650;
    const DEFAULT_FRET_COUNT = 24;
    // The scale lengths the page's field accepts.
    const SCALE_RANGE_MM = Object.freeze({ min: 400, max: 1000 });
    // Saddle setbacks at the 650 mm reference scale.
    const REFERENCE_SETBACKS_MM = Object.freeze({ classical: 2.0, steelFirst: 2.266, steelSixth: 5.470 });
    function fretPositionsBuild(scaleMm, fretCount) {
        const rows = [];
        let previousDistanceMm = 0;
        for (let fret = 1; fret <= fretCount; fret += 1) {
            const distanceMm = scaleMm - scaleMm / Math.pow(2, fret / 12);
            const deltaMm = distanceMm - previousDistanceMm;
            const remainingMm = scaleMm - distanceMm;
            rows.push({ fret, distanceMm, deltaMm, remainingMm });
            previousDistanceMm = distanceMm;
        }
        return rows;
    }
    function compensationBuildFromScale(scaleMm) {
        const factor = scaleMm / DEFAULT_SCALE_MM;
        const classicalSetbackMm = REFERENCE_SETBACKS_MM.classical * factor;
        const steelFirstSetbackMm = REFERENCE_SETBACKS_MM.steelFirst * factor;
        const steelSixthSetbackMm = REFERENCE_SETBACKS_MM.steelSixth * factor;
        return {
            scaleMm,
            classicalSetbackMm,
            steelFirstSetbackMm,
            steelSixthSetbackMm,
            classicalNutToSaddleMm: scaleMm + classicalSetbackMm,
            steelFirstNutToSaddleMm: scaleMm + steelFirstSetbackMm,
            steelSixthNutToSaddleMm: scaleMm + steelSixthSetbackMm,
        };
    }
    function lengthFromMillimeters(valueMm, unit) {
        return unit === "in" ? valueMm / MM_PER_INCH : valueMm;
    }
    function millimetersFromLength(value, unit) {
        return unit === "in" ? value * MM_PER_INCH : value;
    }
    const FretCalculatorEngine = {
        MM_PER_INCH,
        DEFAULT_SCALE_MM,
        DEFAULT_FRET_COUNT,
        SCALE_RANGE_MM,
        fretPositionsBuild,
        compensationBuildFromScale,
        lengthFromMillimeters,
        millimetersFromLength,
    };
    (typeof window !== "undefined" ? window : globalThis).FretCalculatorEngine = FretCalculatorEngine;
    if (typeof module !== "undefined" && module.exports) {
        module.exports = FretCalculatorEngine;
    }
})();
