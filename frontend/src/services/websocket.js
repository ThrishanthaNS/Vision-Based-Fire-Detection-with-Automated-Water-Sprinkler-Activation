export class WebSocketService {
  constructor() {
    this.ws = null;
    this.url = null;
    this.onMessage = null;
    this.onStatus = null;
    this.reconnectAttempts = 0;
    this.maxReconnectDelay = 30000;
    this.baseDelay = 1000;
    this.reconnectTimer = null;
    this.intentionalClose = false;
  }

  connect(url, onMessage, onStatus) {
    this.url = url;
    this.onMessage = onMessage;
    this.onStatus = onStatus;
    this.intentionalClose = false;
    this._connect();
  }

  _connect() {
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        if (this.onStatus) {
          this.onStatus({ connected: true, reconnectAttempts: 0, error: null });
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (this.onMessage) {
            this.onMessage(data);
          }
        } catch (e) {
          console.warn('Failed to parse WebSocket message:', e);
        }
      };

      this.ws.onclose = (event) => {
        if (!this.intentionalClose) {
          this._scheduleReconnect();
        }
        if (this.onStatus) {
          this.onStatus({
            connected: false,
            reconnectAttempts: this.reconnectAttempts,
            error: event.wasClean ? null : 'Connection lost',
          });
        }
      };

      this.ws.onerror = () => {
        if (this.onStatus) {
          this.onStatus({
            connected: false,
            reconnectAttempts: this.reconnectAttempts,
            error: 'Connection error',
          });
        }
      };
    } catch (error) {
      this._scheduleReconnect();
    }
  }

  _scheduleReconnect() {
    if (this.intentionalClose) return;
    this.reconnectAttempts++;
    const delay = Math.min(
      this.baseDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    );
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => this._connect(), delay);
  }

  disconnect() {
    this.intentionalClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  get connected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}

export default WebSocketService;

