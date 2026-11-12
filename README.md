# FireGuard AI — Intelligent Fire Detection & Suppression Monitoring Dashboard

A professional, real-time industrial monitoring dashboard for an **AI-based intelligent fire detection, distance estimation, and water pressure prediction system**.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Hardware Layer                        │
│  IP Camera → Python/OpenCV → YOLO Detection                  │
│  Arduino Nano → Smoke Sensor (MQ-2) + LiDAR (TF-Luna)      │
└──────────────────────┬──────────────────────────────────────┘
                       │ pyserial / OpenCV
┌──────────────────────▼──────────────────────────────────────┐
│               Python FastAPI Backend (port 8000)             │
│  camera.py · detection.py · hardware.py · logic.py          │
│  database.py · websocket.py · config.py · schemas.py        │
│                                                              │
│  REST API  ·  WebSocket /ws/telemetry  ·  MJPEG /api/stream │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP + WebSocket
┌──────────────────────▼──────────────────────────────────────┐
│          React + Vite Frontend (port 3000)                   │
│  Dashboard · Live Monitoring · Analytics                     │
│  Event History · Settings                                    │
└─────────────────────────────────────────────────────────────┘
```

## Project Structure

```
TheEnd/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py          FastAPI app, routes, telemetry loop
│   │   ├── camera.py        IP camera capture + MJPEG stream
│   │   ├── detection.py     YOLO model inference
│   │   ├── hardware.py      Arduino serial + sensor reading
│   │   ├── logic.py         State machine + pressure estimation
│   │   ├── database.py      SQLite event storage
│   │   ├── websocket.py     WebSocket connection manager
│   │   ├── config.py        Environment-based configuration
│   │   └── schemas.py       Pydantic data models
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── layout/      Navbar, Layout (with TelemetryContext)
    │   │   ├── dashboard/   StatusCard, CameraFeed, FrameAnalysis,
    │   │   │                SensorMonitor, PressurePanel,
    │   │   │                DecisionPanel, SuppressionTimeline
    │   │   ├── charts/      DetectionChart, DistanceChart, PressureChart
    │   │   └── common/      StatusIndicator, ConnectionBadge, etc.
    │   ├── hooks/           useWebSocket, useTelemetry, useApi
    │   ├── pages/           Dashboard, LiveMonitoring, Analytics,
    │   │                    EventHistory, Settings
    │   └── services/        api.js, websocket.js
    ├── package.json
    └── vite.config.js
```

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Python | 3.10+ | For the backend |
| Node.js | 18+ | For the frontend |
| npm | 9+ | Installed with Node.js |

---

## Installation

### 1. Clone / navigate to the project

```bash
cd c:\Users\thris\Project\TheEnd
```

### 2. Backend setup

```bash
cd backend

# Create and activate a virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate    # Linux/macOS

# Install Python dependencies
pip install -r requirements.txt

# Copy the environment template
copy .env.example .env         # Windows
# cp .env.example .env        # Linux/macOS
```

Then edit **`.env`** with your hardware settings (see Configuration below).

### 3. Frontend setup

```bash
cd ..\frontend
npm install
```

---

## Configuration

Edit `backend/.env`:

```env
# IP camera MJPEG stream URL
CAMERA_URL=http://192.168.1.100:8080/video

# YOLO model — place best.pt in the backend/ folder
YOLO_MODEL_PATH=best.pt

# Detection confidence threshold (0.0 – 1.0)
CONFIDENCE_THRESHOLD=0.5

# Arduino serial port
ARDUINO_PORT=COM3        # Windows: COM3, COM4... | Linux: /dev/ttyUSB0
BAUD_RATE=9600

# SQLite database file (created automatically)
DB_PATH=fireguard.db

# Set to false to use real hardware
DEMO_MODE=true

# Pressure estimation (placeholder formula — replace with real values)
PRESSURE_BASE=1.0
PRESSURE_FACTOR=5.0
MIN_PRESSURE=1.0
MAX_PRESSURE=12.0
```

> **DEMO_MODE=true** runs the full dashboard with simulated telemetry — no hardware required.

---

## Running the Application

### Start the backend

```bash
cd backend
venv\Scripts\activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The backend starts at **http://localhost:8000**  
Interactive API docs: **http://localhost:8000/docs**

### Start the frontend (new terminal)

```bash
cd frontend
npm run dev
```

The dashboard opens at **http://localhost:3000**

---

## Hardware Integration

### Arduino Nano — Expected Serial Protocol

The backend expects the Arduino to send this exact format every loop:

```
SMOKE:0,DIST:2.45\n
SMOKE:1,DIST:1.23\n
```

- `SMOKE:0` = smoke not triggered; `SMOKE:1` = smoke triggered  
- `DIST:X.XX` = LiDAR distance in metres

**Example Arduino sketch:**

```cpp
#include <SoftwareSerial.h>

const int SMOKE_PIN = A0;
const float SMOKE_THRESHOLD = 300.0;

void setup() {
  Serial.begin(9600);
  pinMode(SMOKE_PIN, INPUT);
}

void loop() {
  float smokeVal = analogRead(SMOKE_PIN);
  bool smokeTriggered = smokeVal > SMOKE_THRESHOLD;
  
  // Replace with your actual LiDAR reading code
  float distance = readLiDAR();  
  
  Serial.print("SMOKE:");
  Serial.print(smokeTriggered ? 1 : 0);
  Serial.print(",DIST:");
  Serial.println(distance, 2);
  
  delay(200);
}
```

### IP Camera

Supports any MJPEG or RTSP stream readable by OpenCV:

| Camera Type | Example URL |
|------------|-------------|
| Android IP Webcam app | `http://192.168.1.x:8080/video` |
| RTSP camera | `rtsp://user:pass@192.168.1.x:554/stream` |
| Local webcam (index) | Set `CAMERA_URL=0` in .env |

### YOLO Model

Place your trained `best.pt` in the `backend/` directory. The model is loaded automatically on startup. If the file is not found, the system falls back to demo mode detections.

---

## Dashboard Pages

| Page | URL | Description |
|------|-----|-------------|
| Dashboard | `/` | Main control view — all metrics, camera, sensors |
| Live Monitoring | `/live` | Full-screen camera + real-time side panel |
| Analytics | `/analytics` | Charts: detection frequency, distance, pressure |
| Event History | `/history` | Paginated event log with CSV export |
| Settings | `/settings` | Configure camera URL, model, COM port, thresholds |

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| GET | `/api/status` | System status summary |
| GET | `/api/telemetry/latest` | Latest telemetry snapshot |
| GET | `/api/events` | Paginated event history |
| GET | `/api/events/stats` | Aggregate statistics |
| GET | `/api/events/export/csv` | Download all events as CSV |
| GET | `/api/settings` | Current configuration |
| POST | `/api/settings` | Update configuration |
| GET | `/api/sensors` | All sensor statuses |
| GET | `/api/stream/camera` | MJPEG camera stream |
| POST | `/api/demo/toggle` | Toggle demo mode |
| WS | `/ws/telemetry` | Real-time telemetry stream |

---

## Telemetry WebSocket Format

The backend broadcasts this JSON every 0.5 seconds:

```json
{
  "frame_id": 142,
  "timestamp": "2026-11-07T20:30:00",
  "fire_detected": true,
  "confidence": 0.964,
  "smoke_triggered": true,
  "distance_m": 2.45,
  "estimated_pressure_bar": 3.24,
  "estimated_pressure_psi": 46.98,
  "system_state": "FIRE_CONFIRMED",
  "bounding_boxes": [
    {"x1": 120, "y1": 80, "x2": 300, "y2": 220, "conf": 0.964, "label": "fire"}
  ],
  "fps": 28.4,
  "camera_connected": false,
  "arduino_connected": false,
  "smoke_sensor_connected": false,
  "lidar_connected": false,
  "demo_mode": true
}
```

> When `demo_mode` is `true`, all values are simulated. The frontend shows a **DEMO** badge to make this clear.

---

## System States

| State | Type | Description |
|-------|------|-------------|
| `MONITORING` | SYSTEM | No threat detected, watching |
| `FIRE_DETECTED` | SENSOR | YOLO confidence above threshold |
| `SMOKE_DETECTED` | SENSOR | Smoke sensor triggered |
| `FIRE_CONFIRMED` | SYSTEM | Both fire and smoke confirmed |
| `DISTANCE_ACQUIRED` | SENSOR | LiDAR reading obtained |
| `PRESSURE_ESTIMATED` | SYSTEM | Pressure calculation complete |
| `SUPPRESSION_SIMULATED` | SIMULATED | Virtual suppression process started |
| `SUPPRESSION_COMPLETE` | SIMULATED | Virtual suppression process ended |

> States marked **SIMULATED** are software-only. Physical suppression is not implemented.

---

## Pressure Estimation

The current formula is a **placeholder** pending calibrated engineering data:

```
pressure_bar = BASE + (FACTOR / max(distance_m, 0.5))
pressure_psi = pressure_bar × 14.5038
```

Clamp to `[MIN_PRESSURE, MAX_PRESSURE]`. Replace this with your actual hydraulic engineering formula once calibration data is available. Parameters are configurable from the Settings page and via `.env`.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Backend won't start | Ensure virtual environment is activated and `pip install -r requirements.txt` completed |
| Camera offline | Set `DEMO_MODE=true` in `.env` to test without hardware |
| Arduino not found | Check COM port in `.env`; try `DEMO_MODE=true` |
| YOLO model error | Place `best.pt` in `backend/` folder; ensure ultralytics is installed |
| WebSocket disconnected | Confirm backend is running on port 8000 |
| Frontend not loading | Run `npm install` inside `frontend/` |

---

## Important Notes

- **Simulated vs Physical**: Fire detection, LiDAR and camera are physical. Water suppression is simulated only. The dashboard makes this distinction clear at all times.
- **Demo values**: When `demo_mode=true`, a yellow **DEMO** badge appears in the navbar and camera feed. Demo sensor readings are never presented as real hardware measurements.
- **Security**: The backend currently allows all CORS origins for local development. Restrict `allow_origins` in `main.py` before any production deployment.
- **Camera credentials**: Never log camera credentials. Use environment variables only.

