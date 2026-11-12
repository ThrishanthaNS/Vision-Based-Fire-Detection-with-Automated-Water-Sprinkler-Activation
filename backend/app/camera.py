"""
FireGuard AI - Camera Manager

Handles IP camera capture via OpenCV, MJPEG streaming, and demo-mode frame
generation.
"""

from __future__ import annotations

import asyncio
import logging
import math
import random
import time
from typing import List, Optional, Tuple

import cv2
import numpy as np

from app.config import settings

logger = logging.getLogger("fireguard.camera")


class CameraManager:
    """Manages an IP camera connection and provides frames for processing."""

    def __init__(self) -> None:
        self._cap: Optional[cv2.VideoCapture] = None
        self._connected: bool = False
        self._frame_count: int = 0
        self._fps: float = 0.0
        self._last_frame_time: float = 0.0
        self._fps_samples: List[float] = []
        self._current_frame: Optional[np.ndarray] = None
        self._processed_frame: Optional[np.ndarray] = None
        self._camera_url: str = settings.CAMERA_URL
        self._demo_mode: bool = settings.DEMO_MODE
        self._reconnect_attempts: int = 0
        self._max_reconnect: int = 5
        self._lock = asyncio.Lock()

        # Demo animation state
        self._demo_fire_phase: float = 0.0

    # ------------------------------------------------------------------
    # Connection management
    # ------------------------------------------------------------------

    async def connect(self) -> bool:
        """Attempt to connect to the IP camera.

        In DEMO mode the camera is not opened; instead synthetic frames are
        generated on each call to ``get_frame()``.
        """
        if self._demo_mode:
            self._connected = False
            logger.info("Camera in DEMO mode – synthetic frames will be generated.")
            return True

        try:
            loop = asyncio.get_event_loop()
            self._cap = await loop.run_in_executor(
                None, lambda: cv2.VideoCapture(self._camera_url)
            )
            if self._cap is not None and self._cap.isOpened():
                self._connected = True
                self._reconnect_attempts = 0
                logger.info("Connected to camera at %s", self._camera_url)
                return True
            else:
                self._connected = False
                logger.warning("Camera at %s could not be opened.", self._camera_url)
                return False
        except Exception as exc:
            self._connected = False
            logger.error("Camera connection error: %s", exc)
            return False

    async def disconnect(self) -> None:
        """Release the camera resource."""
        if self._cap is not None:
            try:
                self._cap.release()
            except Exception as exc:
                logger.error("Error releasing camera: %s", exc)
            self._cap = None
        self._connected = False
        logger.info("Camera disconnected.")

    async def _try_reconnect(self) -> bool:
        """Attempt to reconnect after a failure."""
        if self._demo_mode:
            return True
        self._reconnect_attempts += 1
        if self._reconnect_attempts > self._max_reconnect:
            logger.error("Max reconnection attempts reached.")
            return False
        logger.info("Reconnecting to camera (attempt %d)…", self._reconnect_attempts)
        await self.disconnect()
        return await self.connect()

    # ------------------------------------------------------------------
    # Frame acquisition
    # ------------------------------------------------------------------

    async def get_frame(self) -> Optional[np.ndarray]:
        """Return the latest raw frame (or a demo frame)."""
        async with self._lock:
            now = time.time()
            if self._demo_mode:
                frame = self._generate_demo_frame()
            elif self._connected and self._cap is not None:
                loop = asyncio.get_event_loop()
                ret, frame = await loop.run_in_executor(None, self._cap.read)
                if not ret or frame is None:
                    logger.warning("Failed to read frame – attempting reconnect.")
                    await self._try_reconnect()
                    return self._current_frame  # return stale frame while reconnecting
            else:
                return None

            self._current_frame = frame
            self._frame_count += 1
            self._update_fps(now)
            return frame

    async def get_processed_frame(
        self, detections: Optional[List] = None
    ) -> Optional[np.ndarray]:
        """Return the current frame with detection annotations drawn."""
        frame = self._current_frame
        if frame is None:
            frame = await self.get_frame()
        if frame is None:
            return None

        annotated = frame.copy()
        if detections:
            for det in detections:
                x1 = int(det.get("x1", 0))
                y1 = int(det.get("y1", 0))
                x2 = int(det.get("x2", 0))
                y2 = int(det.get("y2", 0))
                conf = det.get("conf", 0.0)
                label = det.get("label", "fire")
                color = (0, 0, 255)  # red
                cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)
                text = f"{label} {conf:.2f}"
                cv2.putText(
                    annotated, text, (x1, max(y1 - 8, 0)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2,
                )
        self._processed_frame = annotated
        return annotated

    async def generate_mjpeg_stream(self):
        """Async generator yielding multipart MJPEG frames.

        Suitable for use as a ``StreamingResponse`` body with
        ``media_type="multipart/x-mixed-replace; boundary=frame"``.
        """
        while True:
            frame = self._processed_frame if self._processed_frame is not None else self._current_frame
            if frame is None:
                frame = await self.get_frame()
            if frame is not None:
                ret, jpeg = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
                if ret:
                    yield (
                        b"--frame\r\n"
                        b"Content-Type: image/jpeg\r\n\r\n"
                        + jpeg.tobytes()
                        + b"\r\n"
                    )
            await asyncio.sleep(0.033)  # ~30 fps cap

    # ------------------------------------------------------------------
    # Properties
    # ------------------------------------------------------------------

    @property
    def is_connected(self) -> bool:
        return self._connected

    @property
    def fps(self) -> float:
        return round(self._fps, 1)

    @property
    def frame_count(self) -> int:
        return self._frame_count

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _update_fps(self, now: float) -> None:
        if self._last_frame_time > 0:
            dt = now - self._last_frame_time
            if dt > 0:
                self._fps_samples.append(1.0 / dt)
                if len(self._fps_samples) > 30:
                    self._fps_samples.pop(0)
                self._fps = sum(self._fps_samples) / len(self._fps_samples)
        self._last_frame_time = now

    def _generate_demo_frame(self) -> np.ndarray:
        """Generate a synthetic dark frame with overlay text.

        Periodically adds a fire-like warm glow region to simulate what a
        camera might see during a fire event.
        """
        width, height = 640, 480
        frame = np.zeros((height, width, 3), dtype=np.uint8)

        # Dark background with slight noise
        noise = np.random.randint(5, 20, (height, width, 3), dtype=np.uint8)
        frame = cv2.add(frame, noise)

        # "DEMO MODE" text overlay
        cv2.putText(
            frame,
            "DEMO MODE - No Camera Connected",
            (60, 40),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8,
            (100, 100, 255),
            2,
        )

        # Timestamp
        ts = time.strftime("%Y-%m-%d %H:%M:%S")
        cv2.putText(
            frame, ts, (10, height - 15),
            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (180, 180, 180), 1,
        )

        # Simulate fire-like warm region periodically
        self._demo_fire_phase += 0.05
        cycle = math.sin(self._demo_fire_phase)
        if cycle > 0.3:
            intensity = int(80 + 120 * ((cycle - 0.3) / 0.7))
            cx = int(width * 0.5 + 80 * math.sin(self._demo_fire_phase * 0.3))
            cy = int(height * 0.55 + 30 * math.cos(self._demo_fire_phase * 0.4))
            radius = random.randint(50, 100)
            overlay = frame.copy()
            # Orange-red glow
            cv2.circle(overlay, (cx, cy), radius, (0, int(intensity * 0.5), intensity), -1)
            cv2.circle(overlay, (cx + 20, cy - 10), radius // 2, (0, intensity, int(intensity * 0.8)), -1)
            alpha = 0.5
            frame = cv2.addWeighted(overlay, alpha, frame, 1 - alpha, 0)

        return frame
