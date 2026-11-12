"""
FireGuard AI - Hardware Manager

Communicates with an Arduino over serial to read smoke sensor (digital) and
LiDAR distance (float) values.

In DEMO mode, sensor readings are simulated realistically.
"""

from __future__ import annotations

import asyncio
import logging
import math
import random
import time
from typing import Optional, Tuple

from app.config import settings

logger = logging.getLogger("fireguard.hardware")


class HardwareManager:
    """Manages Arduino serial communication and sensor readings."""

    def __init__(self) -> None:
        self._serial: object = None  # serial.Serial when connected
        self._connected: bool = False
        self._com_port: str = settings.ARDUINO_PORT
        self._baud_rate: int = settings.BAUD_RATE
        self._demo_mode: bool = settings.DEMO_MODE

        # Latest readings
        self._smoke_triggered: bool = False
        self._distance_m: Optional[float] = None
        self._last_read_time: Optional[float] = None

        # Sensor-level status
        self._smoke_sensor_connected: bool = False
        self._lidar_connected: bool = False

        # Demo state
        self._demo_start: float = time.time()
        self._demo_fire_correlated: bool = False

    # ------------------------------------------------------------------
    # Connection
    # ------------------------------------------------------------------

    async def connect_arduino(
        self,
        port: Optional[str] = None,
        baud: Optional[int] = None,
    ) -> bool:
        """Open the serial port to the Arduino.

        In DEMO mode, no physical connection is made.
        """
        if port:
            self._com_port = port
        if baud:
            self._baud_rate = baud

        if self._demo_mode:
            self._connected = False
            self._smoke_sensor_connected = False
            self._lidar_connected = False
            logger.info("Hardware in DEMO mode – sensors will be simulated.")
            return True

        try:
            import serial  # type: ignore

            loop = asyncio.get_event_loop()
            self._serial = await loop.run_in_executor(
                None,
                lambda: serial.Serial(self._com_port, self._baud_rate, timeout=1),
            )
            self._connected = True
            self._smoke_sensor_connected = True
            self._lidar_connected = True
            logger.info("Arduino connected on %s @ %d baud", self._com_port, self._baud_rate)
            return True
        except ImportError:
            logger.error("pyserial is not installed.")
            self._connected = False
            return False
        except Exception as exc:
            logger.error("Failed to connect Arduino on %s: %s", self._com_port, exc)
            self._connected = False
            return False

    async def disconnect_arduino(self) -> None:
        """Close the serial connection."""
        if self._serial is not None:
            try:
                self._serial.close()  # type: ignore
            except Exception as exc:
                logger.error("Error closing serial port: %s", exc)
            self._serial = None
        self._connected = False
        self._smoke_sensor_connected = False
        self._lidar_connected = False
        logger.info("Arduino disconnected.")

    # ------------------------------------------------------------------
    # Sensor reading
    # ------------------------------------------------------------------

    async def read_sensors(
        self, fire_detected: bool = False
    ) -> Tuple[bool, Optional[float]]:
        """Read smoke and distance sensors.

        In DEMO mode, returns simulated values.  ``fire_detected`` is used
        to correlate smoke simulation with visual detections.

        Expected Arduino serial format:
            ``SMOKE:0,DIST:2.45\\n``

        Returns:
            (smoke_triggered, distance_m)
        """
        if self._demo_mode:
            return self._simulate_sensors(fire_detected)

        if not self._connected or self._serial is None:
            return False, None

        try:
            import serial  # type: ignore

            loop = asyncio.get_event_loop()
            raw: bytes = await loop.run_in_executor(None, self._serial.readline)  # type: ignore
            line = raw.decode("utf-8", errors="replace").strip()
            if not line:
                return self._smoke_triggered, self._distance_m

            # Parse "SMOKE:0,DIST:2.45"
            smoke = False
            distance: Optional[float] = None
            for part in line.split(","):
                part = part.strip()
                if part.startswith("SMOKE:"):
                    val = part.split(":")[1].strip()
                    smoke = val == "1"
                elif part.startswith("DIST:"):
                    val = part.split(":")[1].strip()
                    try:
                        distance = float(val)
                    except ValueError:
                        distance = None

            self._smoke_triggered = smoke
            self._distance_m = distance
            self._last_read_time = time.time()
            self._smoke_sensor_connected = True
            self._lidar_connected = distance is not None
            return smoke, distance

        except Exception as exc:
            logger.error("Serial read error: %s", exc)
            self._smoke_sensor_connected = False
            self._lidar_connected = False
            return False, None

    # ------------------------------------------------------------------
    # Properties
    # ------------------------------------------------------------------

    @property
    def arduino_connected(self) -> bool:
        return self._connected

    @property
    def smoke_sensor_status(self) -> dict:
        return {
            "name": "Smoke Sensor",
            "connected": self._smoke_sensor_connected or self._demo_mode,
            "last_reading": self._smoke_triggered,
            "last_update": (
                time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(self._last_read_time))
                if self._last_read_time
                else None
            ),
        }

    @property
    def lidar_status(self) -> dict:
        return {
            "name": "LiDAR Distance",
            "connected": self._lidar_connected or self._demo_mode,
            "last_reading": self._distance_m,
            "last_update": (
                time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(self._last_read_time))
                if self._last_read_time
                else None
            ),
        }

    @property
    def last_reading(self) -> dict:
        return {
            "smoke_triggered": self._smoke_triggered,
            "distance_m": self._distance_m,
            "timestamp": self._last_read_time,
        }

    @property
    def com_port(self) -> str:
        return self._com_port

    # ------------------------------------------------------------------
    # Demo simulation
    # ------------------------------------------------------------------

    def _simulate_sensors(self, fire_detected: bool) -> Tuple[bool, Optional[float]]:
        """Produce simulated sensor values.

        * Distance varies smoothly between 1.0 and 8.0 metres.
        * Smoke occasionally triggers, correlated with fire detection.

        Values are clearly marked as simulated via the ``demo_mode`` flag
        in telemetry payloads.
        """
        elapsed = time.time() - self._demo_start

        # Distance: slow sinusoidal drift between 1.0 and 8.0 m
        base_dist = 4.5 + 3.5 * math.sin(elapsed * 0.15)
        jitter = random.uniform(-0.2, 0.2)
        distance = round(max(1.0, min(8.0, base_dist + jitter)), 2)

        # Smoke: correlated with fire_detected, with some randomness
        if fire_detected:
            smoke = random.random() < 0.7  # 70 % chance if fire seen
        else:
            smoke = random.random() < 0.05  # 5 % spurious

        self._smoke_triggered = smoke
        self._distance_m = distance
        self._last_read_time = time.time()
        self._smoke_sensor_connected = True
        self._lidar_connected = True
        return smoke, distance
