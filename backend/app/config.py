"""
FireGuard AI - Configuration Management

Loads settings from environment variables and .env file using pydantic-settings.
"""

import logging
from pydantic_settings import BaseSettings
from pydantic import Field

logger = logging.getLogger("fireguard.config")


class Settings(BaseSettings):
    """Application settings loaded from environment variables / .env file."""

    # Camera settings
    CAMERA_URL: str = Field(
        default="http://192.168.1.100:8080/video",
        description="URL of the IP camera MJPEG stream",
    )

    # YOLO model settings
    YOLO_MODEL_PATH: str = Field(
        default="best.pt",
        description="Path to the YOLO model weights file",
    )
    CONFIDENCE_THRESHOLD: float = Field(
        default=0.5,
        ge=0.0,
        le=1.0,
        description="Minimum confidence threshold for fire detection",
    )

    # Arduino / serial settings
    ARDUINO_PORT: str = Field(
        default="COM3",
        description="Serial port for Arduino communication",
    )
    BAUD_RATE: int = Field(
        default=9600,
        description="Serial baud rate for Arduino communication",
    )

    # Database settings
    DB_PATH: str = Field(
        default="fireguard.db",
        description="Path to the SQLite database file",
    )

    # Runtime modes
    DEMO_MODE: bool = Field(
        default=True,
        description="Run in demo mode without hardware",
    )

    # WebSocket settings
    WS_BROADCAST_INTERVAL: float = Field(
        default=0.5,
        description="Seconds between WebSocket telemetry broadcasts",
    )

    # Pressure calculation parameters (ESTIMATED / PLACEHOLDER)
    PRESSURE_BASE: float = Field(
        default=1.0,
        description="Base pressure constant (bar) for estimation formula",
    )
    PRESSURE_FACTOR: float = Field(
        default=5.0,
        description="Pressure factor constant for estimation formula",
    )
    MIN_PRESSURE: float = Field(
        default=1.0,
        description="Minimum clamped pressure value (bar)",
    )
    MAX_PRESSURE: float = Field(
        default=12.0,
        description="Maximum clamped pressure value (bar)",
    )

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
    }


# Singleton settings instance
settings = Settings()

logger.info("Configuration loaded. DEMO_MODE=%s", settings.DEMO_MODE)
