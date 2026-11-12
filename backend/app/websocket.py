"""
FireGuard AI - WebSocket Connection Manager

Manages WebSocket connections and broadcasts telemetry data to all
connected clients as JSON.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List

from fastapi import WebSocket

logger = logging.getLogger("fireguard.websocket")


class ConnectionManager:
    """Tracks active WebSocket connections and broadcasts messages."""

    def __init__(self) -> None:
        self._active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        """Accept a new WebSocket connection and add it to the pool."""
        await websocket.accept()
        self._active_connections.append(websocket)
        logger.info(
            "WebSocket connected. Total connections: %d",
            len(self._active_connections),
        )

    def disconnect(self, websocket: WebSocket) -> None:
        """Remove a WebSocket from the pool."""
        if websocket in self._active_connections:
            self._active_connections.remove(websocket)
        logger.info(
            "WebSocket disconnected. Total connections: %d",
            len(self._active_connections),
        )

    async def broadcast(self, data: Dict[str, Any]) -> None:
        """Send a JSON payload to every connected client.

        Stale / errored connections are removed automatically.
        """
        stale: List[WebSocket] = []
        for ws in self._active_connections:
            try:
                await ws.send_json(data)
            except Exception:
                stale.append(ws)
        for ws in stale:
            self.disconnect(ws)

    def get_connection_count(self) -> int:
        """Return the number of currently active connections."""
        return len(self._active_connections)
