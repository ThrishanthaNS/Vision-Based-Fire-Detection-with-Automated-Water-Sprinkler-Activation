"""
FireGuard AI - Pydantic Models / Schemas

Defines all data structures used throughout the application.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class BoundingBox(BaseModel):
    """A single detection bounding box."""

    x1: float
    y1: float
    x2: float
    y2: float
    conf: float
    label: str


class TelemetryData(BaseModel):
    """Real-time telemetry payload broadcast over WebSocket."""

    frame_id: int = 0
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    fire_detected: bool = False
    confidence: float = 0.0
    smoke_triggered: bool = False
    distance_m: Optional[float] = None
    estimated_pressure_bar: Optional[float] = None
    estimated_pressure_psi: Optional[float] = None
    system_state: str = "MONITORING"
    bounding_boxes: List[Dict[str, Any]] = Field(default_factory=list)
    fps: float = 0.0
    camera_connected: bool = False
    arduino_connected: bool = False
    smoke_sensor_connected: bool = False
    lidar_connected: bool = False
    demo_mode: bool = True


class DetectionEvent(BaseModel):
    """A persisted detection event stored in the database."""

    id: Optional[int] = None
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    fire_detected: bool = False
    confidence: float = 0.0
    distance_m: Optional[float] = None
    estimated_pressure_bar: Optional[float] = None
    estimated_pressure_psi: Optional[float] = None
    duration_seconds: float = 0.0
    system_state: str = "MONITORING"
    smoke_triggered: bool = False


class PressureParams(BaseModel):
    """Pressure calculation parameters."""

    base: Optional[float] = None
    factor: Optional[float] = None
    min_pressure: Optional[float] = None
    max_pressure: Optional[float] = None


class SystemSettings(BaseModel):
    """Mutable system settings that can be updated at runtime."""

    camera_url: Optional[str] = None
    model_path: Optional[str] = None
    confidence_threshold: Optional[float] = None
    arduino_port: Optional[str] = None
    baud_rate: Optional[int] = None
    pressure_params: Optional[PressureParams] = None


class SensorStatus(BaseModel):
    """Status of an individual sensor."""

    name: str
    connected: bool = False
    last_reading: Optional[Any] = None
    last_update: Optional[str] = None


class FrameRecord(BaseModel):
    """Summary record for a processed frame."""

    frame_id: int = 0
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    fire_detected: bool = False
    confidence: float = 0.0
    smoke_triggered: bool = False
    distance_m: Optional[float] = None
    estimated_pressure_bar: Optional[float] = None
    system_decision: str = "MONITORING"
