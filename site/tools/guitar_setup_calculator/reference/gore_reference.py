"""Reference oracle copied from the supplied Gore-method implementation.

This file deliberately keeps the reference inputs and equations explicit. It
is used to produce golden outputs for the TypeScript port; it is not the
browser runtime.
"""

import json
import math

import numpy as np
from scipy.optimize import minimize


OPEN_MIDI = 55
SCALE_LENGTH_MM = 25.4 * 25.4
LAST_FRET = 18
EXTRA_STRING_LENGTH_MM = 120.0
ACTION_NUT_MM = 0.1
ACTION_12_MM = 2.4
DEFLECTION_MM = 0.50
FINGER_PRESSURE = 0.75
STRING_MASS_KG_PER_M = 0.002074
STRING_STIFFNESS_N = 17726
INITIAL_GUESS_MM = [0.56, 0.75]
ACTION_BY_FRET_MM = [
    0.1, 0.401, 0.677, 0.931, 1.166, 1.381, 1.580, 1.764, 1.934,
    2.090, 2.235, 2.370, 2.494, 2.609, 2.716, 2.816, 2.908, 2.994,
    3.074,
]


def fret_position_mm(fret_number):
    return SCALE_LENGTH_MM * (1 - 2 ** (-fret_number / 12))


def midi_frequency_hz(midi_note):
    return 440.0 * 2 ** ((midi_note - 69) / 12)


def target_frequency_hz(fret_number):
    return midi_frequency_hz(OPEN_MIDI + fret_number)


def cents_error(fret_number, nut_compensation_mm, saddle_compensation_mm):
    if fret_number == 0:
        return 0.0

    current_position_mm = fret_position_mm(fret_number)
    current_action_mm = ACTION_BY_FRET_MM[fret_number]
    previous_fret = fret_number - 1
    previous_position_mm = fret_position_mm(previous_fret)
    previous_action_mm = ACTION_BY_FRET_MM[previous_fret]

    if fret_number == 1:
        spacing_mm = current_position_mm - previous_position_mm - nut_compensation_mm
        previous_length_mm = 0.0
    else:
        spacing_mm = current_position_mm - previous_position_mm
        previous_length_mm = (
            math.hypot(previous_position_mm, previous_action_mm)
            - nut_compensation_mm
        )

    finger_deflection_mm = (
        DEFLECTION_MM * FINGER_PRESSURE * spacing_mm / fret_position_mm(1)
    )
    finger_contact_mm = math.hypot(
        spacing_mm,
        current_action_mm - previous_action_mm,
    ) / 2
    fretted_segment_mm = 2 * math.hypot(
        finger_deflection_mm,
        finger_contact_mm,
    )
    vibrating_segment_mm = (
        math.hypot(SCALE_LENGTH_MM - current_position_mm, current_action_mm)
        + saddle_compensation_mm
    )

    total_path_mm = previous_length_mm + fretted_segment_mm + vibrating_segment_mm
    stretch_mm = total_path_mm - SCALE_LENGTH_MM + nut_compensation_mm - saddle_compensation_mm
    compensated_speaking_length_mm = SCALE_LENGTH_MM - nut_compensation_mm + saddle_compensation_mm
    open_tension_n = (
        4 * STRING_MASS_KG_PER_M
        * (compensated_speaking_length_mm / 1000) ** 2
        * midi_frequency_hz(OPEN_MIDI) ** 2
    )
    fretted_tension_n = (
        open_tension_n
        + STRING_STIFFNESS_N * stretch_mm
        / (SCALE_LENGTH_MM + EXTRA_STRING_LENGTH_MM)
    )
    fretted_frequency_hz = (
        math.sqrt(fretted_tension_n / STRING_MASS_KG_PER_M)
        / (2 * vibrating_segment_mm / 1000)
    )
    return 1200 * math.log2(fretted_frequency_hz / target_frequency_hz(fret_number))


def total_error(compensation):
    nut_compensation_mm, saddle_compensation_mm = compensation
    return sum(
        abs(cents_error(fret, nut_compensation_mm, saddle_compensation_mm))
        for fret in range(LAST_FRET + 1)
    )


def main():
    result = minimize(
        total_error,
        INITIAL_GUESS_MM,
        method="SLSQP",
        bounds=[(-5, 5), (-5, 5)],
        options={"maxiter": 2147483647},
    )
    errors = [
        cents_error(fret, result.x[0], result.x[1])
        for fret in range(LAST_FRET + 1)
    ]
    print(json.dumps({
        "success": bool(result.success),
        "message": result.message,
        "nutCompensationMm": float(result.x[0]),
        "saddleCompensationMm": float(result.x[1]),
        "totalAbsoluteErrorCents": float(sum(abs(error) for error in errors)),
        "centsErrorByFret": errors,
    }))


if __name__ == "__main__":
    main()
