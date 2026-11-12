"""
FireGuard AI - YOLO Detection Engine

Loads an Ultralytics YOLO model for fire detection and runs inference on
camera frames.  In DEMO mode, detections are simulated with realistic
cycling behaviour.
"""

from __future__ import annotations

import asyncio
import logging
import math
import random
import time
from typing import Any, Dict, List, Optional

import cv2
import numpy as np

from app.config import settings

logger = logging.getLogger("fireguard.detection")


class DetectionEngine:
    """Wraps YOLO inference for fire detection."""

    def __init__(self) -> None:
        self._model: Any = None
        self._model_loaded: bool = False
        self._model_path: str = settings.YOLO_MODEL_PATH
        self._demo_mode: bool = settings.DEMO_MODE
        self._confidence_threshold: float = settings.CONFIDENCE_THRESHOLD

        # Demo simulation state
        self._demo_phase: float = random.uniform(0, 2 * math.pi)
        self._demo_cycle_length: float = random.uniform(15.0, 30.0)
        self._demo_start: float = time.time()

    # ------------------------------------------------------------------
    # Model management
    # ------------------------------------------------------------------

    async def load_model(self, path: Optional[str] = None) -> bool:
        """Load the YOLO model weights.

        In DEMO mode the model is not actually loaded; simulated detections
        are returned instead.
        """
        if path:
            self._model_path = path

        if self._demo_mode:
            logger.info("Detection engine in DEMO mode – model not loaded.")
            self._model_loaded = False
            return True

        try:
            from ultralytics import YOLO  # type: ignore

            loop = asyncio.get_event_loop()
            self._model = await loop.run_in_executor(
                None, lambda: YOLO(self._model_path)
            )
            self._model_loaded = True
            logger.info("YOLO model loaded from %s", self._model_path)
            return True
        except FileNotFoundError:
            logger.error("Model file not found: %s", self._model_path)
            self._model_loaded = False
            return False
        except Exception as exc:
            logger.error("Failed to load YOLO model: %s", exc)
            self._model_loaded = False
            return False

    # ------------------------------------------------------------------
    # Inference
    # ------------------------------------------------------------------

    async def detect(self, frame: np.ndarray) -> List[Dict[str, Any]]:
        """Run fire detection on a frame.

        Returns a list of detection dicts with keys:
        x1, y1, x2, y2, conf, label
        """
        if self._demo_mode:
            return self._simulate_detections(frame)

        if not self._model_loaded or self._model is None:
            return []

        try:
            loop = asyncio.get_event_loop()
            results = await loop.run_in_executor(
                None,
                lambda: self._model.predict(
                    frame,
                    conf=self._confidence_threshold,
                    verbose=False,
                ),
            )
            detections: List[Dict[str, Any]] = []
            for result in results:
                boxes = result.boxes
                if boxes is None:
                    continue
                for box in boxes:
                    xyxy = box.xyxy[0].cpu().numpy()
                    conf = float(box.conf[0].cpu().numpy())
                    cls_id = int(box.cls[0].cpu().numpy())
                    label = result.names.get(cls_id, "fire") if hasattr(result, "names") else "fire"
                    detections.append({
                        "x1": float(xyxy[0]),
                        "y1": float(xyxy[1]),
                        "x2": float(xyxy[2]),
                        "y2": float(xyxy[3]),
                        "conf": round(conf, 4),
                        "label": label,
                    })
            return detections
        except Exception as exc:
            logger.error("Detection inference error: %s", exc)
            return []

    def annotate_frame(
        self, frame: np.ndarray, detections: List[Dict[str, Any]]
    ) -> np.ndarray:
        """Draw bounding boxes and labels on a frame copy."""
        annotated = frame.copy()
        for det in detections:
            x1, y1 = int(det["x1"]), int(det["y1"])
            x2, y2 = int(det["x2"]), int(det["y2"])
            conf = det["conf"]
            label = det.get("label", "fire")

            # Colour intensity scales with confidence
            red = int(min(255, 100 + 155 * conf))
            color = (0, 0, red)

            cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)
            text = f"{label} {conf:.0%}"
            (tw, th), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
            cv2.rectangle(annotated, (x1, y1 - th - 8), (x1 + tw, y1), color, -1)
            cv2.putText(
                annotated, text, (x1, y1 - 4),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2,
            )
        return annotated

    # ------------------------------------------------------------------
    # Properties
    # ------------------------------------------------------------------

    @property
    def model_loaded(self) -> bool:
        return self._model_loaded

    @property
    def model_path(self) -> str:
        return self._model_path

    @property
    def confidence_threshold(self) -> float:
        return self._confidence_threshold

    @confidence_threshold.setter
    def confidence_threshold(self, value: float) -> None:
        self._confidence_threshold = max(0.0, min(1.0, value))

    # ------------------------------------------------------------------
    # Demo simulation
    # ------------------------------------------------------------------

    def _simulate_detections(self, frame: np.ndarray) -> List[Dict[str, Any]]:
        """Generate simulated detections that cycle between fire and clear.

        Fire is detected for ~15-30 s, then clear for a similar period.
        Confidence ramps up and down realistically.
        """
        elapsed = time.time() - self._demo_start
        # Sine-based cycle: positive half = fire, negative half = clear
        phase = math.sin(2 * math.pi * elapsed / self._demo_cycle_length + self._demo_phase)

        if phase > 0.1:
            # Fire detected – confidence ramps with the sine
            base_conf = 0.45 + 0.53 * ((phase - 0.1) / 0.9)
            noise = random.uniform(-0.05, 0.05)
            conf = max(0.0, min(0.98, base_conf + noise))

            h, w = frame.shape[:2]
            cx = int(w * 0.5 + 80 * math.sin(elapsed * 0.2))
            cy = int(h * 0.55 + 30 * math.cos(elapsed * 0.3))
            bw = random.randint(80, 160)
            bh = random.randint(60, 130)

            x1 = max(0, cx - bw // 2)
            y1 = max(0, cy - bh // 2)
            x2 = min(w, cx + bw // 2)
            y2 = min(h, cy + bh // 2)

            detections = [{
                "x1": float(x1),
                "y1": float(y1),
                "x2": float(x2),
                "y2": float(y2),
                "conf": round(conf, 4),
                "label": "fire",
            }]

            # Occasionally add a second smaller detection
            if random.random() < 0.2:
                sx1 = random.randint(0, max(1, w - 100))
                sy1 = random.randint(0, max(1, h - 80))
                detections.append({
                    "x1": float(sx1),
                    "y1": float(sy1),
                    "x2": float(min(w, sx1 + random.randint(40, 90))),
                    "y2": float(min(h, sy1 + random.randint(30, 70))),
                    "conf": round(random.uniform(0.3, 0.6), 4),
                    "label": "fire",
                })
            return detections
        else:
            return []
