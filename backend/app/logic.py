"""
FireGuard AI - System State Machine & Decision Engine

Implements the fire-suppression decision pipeline and pressure estimation.

NOTE: The pressure calculation is a **placeholder / estimated formula** and
does NOT represent real-world fire-suppression engineering.  It is provided
purely for demonstration and dashboard visualisation purposes.
"""

from __future__ import annotations

import logging
import time
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

from app.config import settings

logger = logging.getLogger("fireguard.logic")


class SystemState(str, Enum):
    """Finite-state-machine states for the suppression pipeline."""

    MONITORING = "MONITORING"
    FIRE_DETECTED = "FIRE_DETECTED"
    SMOKE_DETECTED = "SMOKE_DETECTED"
    FIRE_CONFIRMED = "FIRE_CONFIRMED"
    DISTANCE_ACQUIRED = "DISTANCE_ACQUIRED"
    PRESSURE_ESTIMATED = "PRESSURE_ESTIMATED"
    SUPPRESSION_SIMULATED = "SUPPRESSION_SIMULATED"
    SUPPRESSION_COMPLETE = "SUPPRESSION_COMPLETE"


# Ordered progression for the suppression pipeline
_STATE_ORDER: List[SystemState] = [
    SystemState.MONITORING,
    SystemState.FIRE_DETECTED,
    SystemState.SMOKE_DETECTED,
    SystemState.FIRE_CONFIRMED,
    SystemState.DISTANCE_ACQUIRED,
    SystemState.PRESSURE_ESTIMATED,
    SystemState.SUPPRESSION_SIMULATED,
    SystemState.SUPPRESSION_COMPLETE,
]


class SystemLogic:
    """Decision engine that manages state transitions and pressure estimation."""

    def __init__(self) -> None:
        self._current_state: SystemState = SystemState.MONITORING
        self._state_history: List[Dict[str, Any]] = []
        self._suppression_active: bool = False
        self._fire_start_time: Optional[float] = None
        self._fire_confirmed_time: Optional[float] = None
        self._suppression_start_time: Optional[float] = None
        self._consecutive_fire_frames: int = 0
        self._consecutive_clear_frames: int = 0
        self._last_pressure_bar: Optional[float] = None
        self._last_pressure_psi: Optional[float] = None

        # Thresholds
        self._confirm_frames: int = 5  # consecutive frames to confirm fire
        self._clear_frames: int = 15   # consecutive clear frames to reset
        self._suppression_duration: float = 10.0  # seconds for simulated suppression

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def process_inputs(
        self,
        fire_detected: bool,
        confidence: float,
        smoke_triggered: bool,
        distance_m: Optional[float],
    ) -> str:
        """Evaluate sensor inputs and advance the state machine.

        Returns the new system state as a string.
        """
        now = time.time()

        # ----- MONITORING -----
        if self._current_state == SystemState.MONITORING:
            if fire_detected and confidence >= settings.CONFIDENCE_THRESHOLD:
                self._consecutive_fire_frames += 1
                self._consecutive_clear_frames = 0
                if self._fire_start_time is None:
                    self._fire_start_time = now
                self._set_state(SystemState.FIRE_DETECTED)
            elif smoke_triggered:
                self._set_state(SystemState.SMOKE_DETECTED)
            else:
                self._consecutive_fire_frames = 0
                self._consecutive_clear_frames += 1

        # ----- FIRE_DETECTED -----
        elif self._current_state == SystemState.FIRE_DETECTED:
            if fire_detected and confidence >= settings.CONFIDENCE_THRESHOLD:
                self._consecutive_fire_frames += 1
                self._consecutive_clear_frames = 0
                if self._consecutive_fire_frames >= self._confirm_frames:
                    self._fire_confirmed_time = now
                    self._set_state(SystemState.FIRE_CONFIRMED)
            else:
                self._consecutive_fire_frames = max(0, self._consecutive_fire_frames - 1)
                self._consecutive_clear_frames += 1
                if self._consecutive_clear_frames >= self._clear_frames:
                    self._reset()

        # ----- SMOKE_DETECTED -----
        elif self._current_state == SystemState.SMOKE_DETECTED:
            if fire_detected and confidence >= settings.CONFIDENCE_THRESHOLD:
                self._consecutive_fire_frames += 1
                self._consecutive_clear_frames = 0
                if self._fire_start_time is None:
                    self._fire_start_time = now
                self._set_state(SystemState.FIRE_DETECTED)
            elif not smoke_triggered:
                self._consecutive_clear_frames += 1
                if self._consecutive_clear_frames >= self._clear_frames:
                    self._reset()

        # ----- FIRE_CONFIRMED -----
        elif self._current_state == SystemState.FIRE_CONFIRMED:
            if distance_m is not None and distance_m > 0:
                self._set_state(SystemState.DISTANCE_ACQUIRED)
            # Allow regression if fire disappears
            if not fire_detected:
                self._consecutive_clear_frames += 1
                if self._consecutive_clear_frames >= self._clear_frames:
                    self._reset()
            else:
                self._consecutive_clear_frames = 0

        # ----- DISTANCE_ACQUIRED -----
        elif self._current_state == SystemState.DISTANCE_ACQUIRED:
            if distance_m is not None and distance_m > 0:
                p_bar, p_psi = self.calculate_pressure(distance_m)
                self._last_pressure_bar = p_bar
                self._last_pressure_psi = p_psi
                self._set_state(SystemState.PRESSURE_ESTIMATED)
            if not fire_detected:
                self._consecutive_clear_frames += 1
                if self._consecutive_clear_frames >= self._clear_frames:
                    self._reset()
            else:
                self._consecutive_clear_frames = 0

        # ----- PRESSURE_ESTIMATED -----
        elif self._current_state == SystemState.PRESSURE_ESTIMATED:
            self._suppression_active = True
            self._suppression_start_time = now
            self._set_state(SystemState.SUPPRESSION_SIMULATED)

        # ----- SUPPRESSION_SIMULATED -----
        elif self._current_state == SystemState.SUPPRESSION_SIMULATED:
            self._suppression_active = True
            if self._suppression_start_time is not None:
                elapsed = now - self._suppression_start_time
                if elapsed >= self._suppression_duration:
                    self._set_state(SystemState.SUPPRESSION_COMPLETE)

        # ----- SUPPRESSION_COMPLETE -----
        elif self._current_state == SystemState.SUPPRESSION_COMPLETE:
            self._suppression_active = False
            # Stay here briefly, then auto-reset after a few clear frames
            self._consecutive_clear_frames += 1
            if self._consecutive_clear_frames >= 5:
                self._reset()

        return self._current_state.value

    def calculate_pressure(self, distance_m: float) -> Tuple[float, float]:
        """Estimate suppression pressure from distance.

        **WARNING**: This is a placeholder / demonstration formula.
        It does NOT represent real fire-suppression engineering calculations.

        Formula:
            pressure_bar = PRESSURE_BASE + (PRESSURE_FACTOR / max(distance_m, 0.5))
            pressure_psi = pressure_bar * 14.5038
            Clamped between MIN_PRESSURE and MAX_PRESSURE.
        """
        safe_distance = max(distance_m, 0.5)
        pressure_bar = settings.PRESSURE_BASE + (settings.PRESSURE_FACTOR / safe_distance)
        pressure_bar = max(settings.MIN_PRESSURE, min(settings.MAX_PRESSURE, pressure_bar))
        pressure_psi = round(pressure_bar * 14.5038, 2)
        pressure_bar = round(pressure_bar, 2)
        self._last_pressure_bar = pressure_bar
        self._last_pressure_psi = pressure_psi
        return pressure_bar, pressure_psi

    def get_suppression_timeline(self) -> Dict[str, Any]:
        """Return the current suppression simulation status."""
        now = time.time()
        elapsed = 0.0
        progress = 0.0
        if self._suppression_start_time is not None and self._suppression_active:
            elapsed = now - self._suppression_start_time
            progress = min(elapsed / self._suppression_duration, 1.0)
        return {
            "active": self._suppression_active,
            "elapsed_seconds": round(elapsed, 2),
            "total_seconds": self._suppression_duration,
            "progress": round(progress, 4),
            "pressure_bar": self._last_pressure_bar,
            "pressure_psi": self._last_pressure_psi,
            "state": self._current_state.value,
        }

    # ------------------------------------------------------------------
    # Properties
    # ------------------------------------------------------------------

    @property
    def current_state(self) -> str:
        return self._current_state.value

    @property
    def state_history(self) -> List[Dict[str, Any]]:
        return list(self._state_history)

    @property
    def suppression_active(self) -> bool:
        return self._suppression_active

    @property
    def fire_duration(self) -> float:
        """Seconds since fire was first detected in current episode."""
        if self._fire_start_time is None:
            return 0.0
        return time.time() - self._fire_start_time

    @property
    def last_pressure_bar(self) -> Optional[float]:
        return self._last_pressure_bar

    @property
    def last_pressure_psi(self) -> Optional[float]:
        return self._last_pressure_psi

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _set_state(self, new_state: SystemState) -> None:
        if new_state != self._current_state:
            logger.info("State transition: %s -> %s", self._current_state.value, new_state.value)
            self._state_history.append({
                "from": self._current_state.value,
                "to": new_state.value,
                "timestamp": time.time(),
            })
            self._current_state = new_state

    def _reset(self) -> None:
        """Return to MONITORING and clear episode data."""
        self._set_state(SystemState.MONITORING)
        self._consecutive_fire_frames = 0
        self._consecutive_clear_frames = 0
        self._fire_start_time = None
        self._fire_confirmed_time = None
        self._suppression_start_time = None
        self._suppression_active = False
        self._last_pressure_bar = None
        self._last_pressure_psi = None
