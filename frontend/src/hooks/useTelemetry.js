import { useState, useEffect, useRef, useCallback } from 'react';
import useWebSocket from './useWebSocket';

const MAX_HISTORY = 200;
const MAX_FRAMES = 50;

export default function useTelemetry() {
  const { telemetry: rawTelemetry, isConnected, reconnectAttempts, error } = useWebSocket();
  const [telemetryHistory, setTelemetryHistory] = useState([]);
  const [frameRecords, setFrameRecords] = useState([]);
  const [latestTelemetry, setLatestTelemetry] = useState(null);
  const lastFrameIdRef = useRef(null);

  useEffect(() => {
    if (!rawTelemetry) return;

    setLatestTelemetry(rawTelemetry);

    if (rawTelemetry.frame_id !== lastFrameIdRef.current) {
      lastFrameIdRef.current = rawTelemetry.frame_id;

      setTelemetryHistory(prev => {
        const next = [...prev, {
          timestamp: rawTelemetry.timestamp,
          confidence: rawTelemetry.confidence,
          fire_detected: rawTelemetry.fire_detected,
          distance_m: rawTelemetry.distance_m,
          estimated_pressure_bar: rawTelemetry.estimated_pressure_bar,
          estimated_pressure_psi: rawTelemetry.estimated_pressure_psi,
          system_state: rawTelemetry.system_state,
        }];
        return next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next;
      });

      setFrameRecords(prev => {
        const record = {
          frame_id: rawTelemetry.frame_id,
          timestamp: rawTelemetry.timestamp,
          fire_detected: rawTelemetry.fire_detected,
          confidence: rawTelemetry.confidence,
          smoke_triggered: rawTelemetry.smoke_triggered,
          distance_m: rawTelemetry.distance_m,
          estimated_pressure_bar: rawTelemetry.estimated_pressure_bar,
          system_decision: rawTelemetry.system_state,
        };
        const next = [...prev, record];
        return next.length > MAX_FRAMES ? next.slice(-MAX_FRAMES) : next;
      });
    }
  }, [rawTelemetry]);

  const fireDetectionHistory = telemetryHistory.map(t => ({
    timestamp: t.timestamp,
    confidence: t.confidence,
    fire_detected: t.fire_detected,
  }));

  const distanceHistory = telemetryHistory.map(t => ({
    timestamp: t.timestamp,
    distance_m: t.distance_m,
  }));

  const pressureHistory = telemetryHistory.map(t => ({
    timestamp: t.timestamp,
    estimated_pressure_bar: t.estimated_pressure_bar,
  }));

  return {
    latestTelemetry,
    telemetryHistory,
    frameRecords,
    fireDetectionHistory,
    distanceHistory,
    pressureHistory,
    isConnected,
    reconnectAttempts,
    error,
    demoMode: latestTelemetry?.demo_mode || false,
  };
}

