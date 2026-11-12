"""
FireGuard AI - FastAPI Application Entry Point

Creates the FastAPI app, registers all routes / WebSocket endpoints, and
manages the background telemetry loop.
"""

from __future__ import annotations

import asyncio
import logging
import time
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any, Dict, Optional

from fastapi import FastAPI, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, StreamingResponse

from app.camera import CameraManager
from app.config import settings
from app.database import close_db, export_events_csv, get_event_stats, get_events, init_db, save_event
from app.detection import DetectionEngine
from app.hardware import HardwareManager
from app.logic import SystemLogic
from app.schemas import PressureParams, SystemSettings, TelemetryData
from app.websocket import ConnectionManager

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(name)-24s  %(levelname)-7s  %(message)s",
)
logger = logging.getLogger("fireguard.main")

# ---------------------------------------------------------------------------
# Shared service instances
# ---------------------------------------------------------------------------

camera_manager = CameraManager()
detection_engine = DetectionEngine()
hardware_manager = HardwareManager()
system_logic = SystemLogic()
ws_manager = ConnectionManager()

# Global mutable state
_latest_telemetry: Dict[str, Any] = {}
_telemetry_task: Optional[asyncio.Task] = None
_running: bool = False
_previous_state: str = "MONITORING"


# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown hooks."""
    global _telemetry_task, _running

    # ---- Startup ----
    logger.info("Starting FireGuard AI Backend (DEMO_MODE=%s)", settings.DEMO_MODE)
    await init_db()
    await camera_manager.connect()
    await detection_engine.load_model()
    await hardware_manager.connect_arduino()

    _running = True
    _telemetry_task = asyncio.create_task(telemetry_loop())
    logger.info("Telemetry loop started.")

    yield

    # ---- Shutdown ----
    _running = False
    if _telemetry_task is not None:
        _telemetry_task.cancel()
        try:
            await _telemetry_task
        except asyncio.CancelledError:
            pass
    await camera_manager.disconnect()
    await hardware_manager.disconnect_arduino()
    await close_db()
    logger.info("FireGuard AI Backend shut down.")


app = FastAPI(
    title="FireGuard AI Backend",
    description="Real-time AI fire detection and suppression estimation dashboard backend.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Background telemetry loop
# ---------------------------------------------------------------------------


async def telemetry_loop() -> None:
    """Continuously capture → detect → read sensors → decide → broadcast."""
    global _latest_telemetry, _previous_state

    frame_id = 0
    while _running:
        try:
            # 1. Capture frame
            frame = await camera_manager.get_frame()

            # 2. Run YOLO detection
            detections = []
            if frame is not None:
                detections = await detection_engine.detect(frame)

            fire_detected = any(d["conf"] >= settings.CONFIDENCE_THRESHOLD for d in detections) if detections else False
            max_confidence = max((d["conf"] for d in detections), default=0.0)

            # 3. Read hardware sensors
            smoke_triggered, distance_m = await hardware_manager.read_sensors(
                fire_detected=fire_detected
            )

            # 4. Process through logic engine
            system_state = system_logic.process_inputs(
                fire_detected=fire_detected,
                confidence=max_confidence,
                smoke_triggered=smoke_triggered,
                distance_m=distance_m,
            )

            # 5. Calculate pressure if distance available
            pressure_bar: Optional[float] = None
            pressure_psi: Optional[float] = None
            if distance_m is not None and distance_m > 0:
                pressure_bar, pressure_psi = system_logic.calculate_pressure(distance_m)

            # Annotate frame for MJPEG stream
            if frame is not None:
                bboxes = [
                    {
                        "x1": d["x1"], "y1": d["y1"],
                        "x2": d["x2"], "y2": d["y2"],
                        "conf": d["conf"], "label": d["label"],
                    }
                    for d in detections
                ]
                await camera_manager.get_processed_frame(detections=bboxes)

            # 6. Build TelemetryData
            frame_id += 1
            telemetry = TelemetryData(
                frame_id=frame_id,
                timestamp=datetime.utcnow().isoformat(),
                fire_detected=fire_detected,
                confidence=round(max_confidence, 4),
                smoke_triggered=smoke_triggered,
                distance_m=distance_m,
                estimated_pressure_bar=pressure_bar,
                estimated_pressure_psi=pressure_psi,
                system_state=system_state,
                bounding_boxes=[
                    {
                        "x1": d["x1"], "y1": d["y1"],
                        "x2": d["x2"], "y2": d["y2"],
                        "conf": d["conf"], "label": d["label"],
                    }
                    for d in detections
                ],
                fps=camera_manager.fps,
                camera_connected=camera_manager.is_connected,
                arduino_connected=hardware_manager.arduino_connected,
                smoke_sensor_connected=hardware_manager.smoke_sensor_status["connected"],
                lidar_connected=hardware_manager.lidar_status["connected"],
                demo_mode=settings.DEMO_MODE,
            )

            _latest_telemetry = telemetry.model_dump()

            # 7. Broadcast via WebSocket
            await ws_manager.broadcast(_latest_telemetry)

            # 8. Save significant events to database
            state_changed = system_state != _previous_state
            if fire_detected or state_changed:
                await save_event(
                    fire_detected=fire_detected,
                    confidence=max_confidence,
                    distance_m=distance_m,
                    pressure_bar=pressure_bar,
                    pressure_psi=pressure_psi,
                    duration=system_logic.fire_duration,
                    system_state=system_state,
                    smoke_triggered=smoke_triggered,
                )
            _previous_state = system_state

            # 9. Sleep for broadcast interval
            await asyncio.sleep(settings.WS_BROADCAST_INTERVAL)

        except asyncio.CancelledError:
            break
        except Exception as exc:
            logger.error("Telemetry loop error: %s", exc, exc_info=True)
            await asyncio.sleep(1.0)


# ---------------------------------------------------------------------------
# REST API Endpoints
# ---------------------------------------------------------------------------


@app.get("/", tags=["Health"])
async def health_check() -> Dict[str, Any]:
    """Health check / root endpoint."""
    return {
        "status": "ok",
        "service": "FireGuard AI Backend",
        "demo_mode": settings.DEMO_MODE,
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.get("/api/status", tags=["Status"])
async def system_status() -> Dict[str, Any]:
    """Current system status summary."""
    return {
        "system_state": system_logic.current_state,
        "suppression": system_logic.get_suppression_timeline(),
        "camera_connected": camera_manager.is_connected,
        "arduino_connected": hardware_manager.arduino_connected,
        "demo_mode": settings.DEMO_MODE,
        "ws_connections": ws_manager.get_connection_count(),
        "frames_processed": camera_manager.frame_count,
        "fps": camera_manager.fps,
        "model_loaded": detection_engine.model_loaded,
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.get("/api/telemetry/latest", tags=["Telemetry"])
async def latest_telemetry() -> Dict[str, Any]:
    """Return the most recent telemetry reading."""
    if _latest_telemetry:
        return _latest_telemetry
    return {"message": "No telemetry available yet."}


@app.get("/api/events", tags=["Events"])
async def list_events(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    start_date: Optional[str] = Query(None, description="ISO-8601 start date filter"),
    end_date: Optional[str] = Query(None, description="ISO-8601 end date filter"),
) -> Dict[str, Any]:
    """Paginated event history."""
    events = await get_events(limit=limit, offset=offset, start_date=start_date, end_date=end_date)
    return {"events": events, "count": len(events), "limit": limit, "offset": offset}


@app.get("/api/events/stats", tags=["Events"])
async def event_stats() -> Dict[str, Any]:
    """Aggregate event statistics."""
    return await get_event_stats()


@app.get("/api/events/export/csv", tags=["Events"])
async def export_csv() -> Response:
    """Export all events as a downloadable CSV file."""
    csv_data = await export_events_csv()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=fireguard_events.csv"},
    )


@app.get("/api/settings", tags=["Settings"])
async def get_settings() -> Dict[str, Any]:
    """Return current system settings."""
    return {
        "camera_url": settings.CAMERA_URL,
        "model_path": settings.YOLO_MODEL_PATH,
        "confidence_threshold": settings.CONFIDENCE_THRESHOLD,
        "arduino_port": settings.ARDUINO_PORT,
        "baud_rate": settings.BAUD_RATE,
        "demo_mode": settings.DEMO_MODE,
        "ws_broadcast_interval": settings.WS_BROADCAST_INTERVAL,
        "pressure_params": {
            "base": settings.PRESSURE_BASE,
            "factor": settings.PRESSURE_FACTOR,
            "min_pressure": settings.MIN_PRESSURE,
            "max_pressure": settings.MAX_PRESSURE,
        },
    }


@app.post("/api/settings", tags=["Settings"])
async def update_settings(body: SystemSettings) -> Dict[str, Any]:
    """Update mutable system settings at runtime.

    Only fields that are provided (not None) are updated.
    """
    if body.camera_url is not None:
        settings.CAMERA_URL = body.camera_url
    if body.model_path is not None:
        settings.YOLO_MODEL_PATH = body.model_path
        await detection_engine.load_model(body.model_path)
    if body.confidence_threshold is not None:
        settings.CONFIDENCE_THRESHOLD = body.confidence_threshold
        detection_engine.confidence_threshold = body.confidence_threshold
    if body.arduino_port is not None:
        settings.ARDUINO_PORT = body.arduino_port
    if body.baud_rate is not None:
        settings.BAUD_RATE = body.baud_rate
    if body.pressure_params is not None:
        pp: PressureParams = body.pressure_params
        if pp.base is not None:
            settings.PRESSURE_BASE = pp.base
        if pp.factor is not None:
            settings.PRESSURE_FACTOR = pp.factor
        if pp.min_pressure is not None:
            settings.MIN_PRESSURE = pp.min_pressure
        if pp.max_pressure is not None:
            settings.MAX_PRESSURE = pp.max_pressure

    logger.info("Settings updated via API.")
    return {"status": "updated", "settings": await get_settings()}


@app.get("/api/sensors", tags=["Sensors"])
async def sensor_statuses() -> Dict[str, Any]:
    """Return the status of every sensor."""
    return {
        "sensors": [
            {
                "name": "IP Camera",
                "connected": camera_manager.is_connected or settings.DEMO_MODE,
                "last_reading": f"{camera_manager.frame_count} frames",
                "last_update": datetime.utcnow().isoformat(),
            },
            hardware_manager.smoke_sensor_status,
            hardware_manager.lidar_status,
            {
                "name": "YOLO Model",
                "connected": detection_engine.model_loaded or settings.DEMO_MODE,
                "last_reading": detection_engine.model_path,
                "last_update": datetime.utcnow().isoformat(),
            },
        ],
        "demo_mode": settings.DEMO_MODE,
    }


@app.get("/api/stream/camera", tags=["Stream"])
async def camera_stream() -> StreamingResponse:
    """MJPEG camera stream for use in ``<img src="...">``."""
    return StreamingResponse(
        camera_manager.generate_mjpeg_stream(),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )


@app.post("/api/demo/toggle", tags=["Demo"])
async def toggle_demo() -> Dict[str, Any]:
    """Toggle demo mode on or off."""
    settings.DEMO_MODE = not settings.DEMO_MODE
    camera_manager._demo_mode = settings.DEMO_MODE
    detection_engine._demo_mode = settings.DEMO_MODE
    hardware_manager._demo_mode = settings.DEMO_MODE
    logger.info("Demo mode toggled to %s", settings.DEMO_MODE)
    return {"demo_mode": settings.DEMO_MODE}


# ---------------------------------------------------------------------------
# WebSocket Endpoint
# ---------------------------------------------------------------------------


@app.websocket("/ws/telemetry")
async def websocket_telemetry(websocket: WebSocket) -> None:
    """Accept a WebSocket connection for continuous telemetry streaming."""
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep the connection alive; optionally receive client messages
            data = await websocket.receive_text()
            # Clients may send "ping" to keep alive
            if data.strip().lower() == "ping":
                await websocket.send_json({"pong": True})
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)
