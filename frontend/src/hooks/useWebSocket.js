import { useState, useEffect, useRef, useCallback } from 'react';
import { WebSocketService } from '../services/websocket';

const WS_URL = 'ws://localhost:8000/ws/telemetry';

export default function useWebSocket() {
  const [telemetry, setTelemetry] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);

  const handleMessage = useCallback((data) => {
    setTelemetry(data);
  }, []);

  const handleStatus = useCallback((status) => {
    setIsConnected(status.connected);
    setReconnectAttempts(status.reconnectAttempts);
    setError(status.error);
  }, []);

  useEffect(() => {
    const ws = new WebSocketService();
    wsRef.current = ws;
    ws.connect(WS_URL, handleMessage, handleStatus);

    return () => {
      ws.disconnect();
    };
  }, [handleMessage, handleStatus]);

  return { telemetry, isConnected, reconnectAttempts, error };
}

