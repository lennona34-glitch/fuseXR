/**
 * Dedicated Low-Latency WebSocket Relay Client for Meta Quest 3 & PC
 * Provides robust bidirectional communication for Gamepad, Keyboard, Mouse, and Game Loading
 * Features automatic reconnection, heartbeats, and real-time link status reporting.
 */
export class RemoteRelay {
  constructor(options = {}) {
    this.isVR = !!options.isVR;
    this.listeners = new Map();
    this.ws = null;
    this.connected = false;
    this.peerCount = 0;
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
    this.statusCallbacks = new Set();
    this.pendingLoad = null;

    this.connect();
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${proto}//${window.location.host}/ws-relay`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.connected = true;
        console.log('[RemoteRelay] Connected to dedicated WebSocket relay at', wsUrl);
        this.sendRaw({ type: 'hello', isVR: this.isVR });
        this.notifyStatus();

        if (this.pendingLoad) {
          this.sendRaw(this.pendingLoad);
          this.pendingLoad = null;
        }

        // Keep-alive ping every 10 seconds
        clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = setInterval(() => {
          if (this.connected && this.ws.readyState === WebSocket.OPEN) {
            this.sendRaw({ type: 'ping' });
          }
        }, 10000);
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'pong') return;

          if (msg.type === 'status') {
            this.peerCount = msg.peerCount || 0;
            this.notifyStatus();
            return;
          }

          const cbs = this.listeners.get(msg.type);
          if (cbs) {
            for (const cb of cbs) {
              cb(msg.data);
            }
          }
        } catch (e) {
          console.error('[RemoteRelay] Error parsing message:', e);
        }
      };

      this.ws.onclose = (event) => {
        this.connected = false;
        clearInterval(this.heartbeatTimer);
        this.notifyStatus();
        console.log(`[RemoteRelay] WebSocket closed (code: ${event?.code}, reason: ${event?.reason})`);
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.warn('[RemoteRelay] WebSocket connection error:', err);
      };
    } catch (e) {
      console.error('[RemoteRelay] Failed to initiate WebSocket:', e);
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      console.log('[RemoteRelay] Attempting to reconnect...');
      this.connect();
    }, 1500);
  }

  on(type, callback) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type).add(callback);
    return () => this.listeners.get(type).delete(callback);
  }

  onStatus(callback) {
    this.statusCallbacks.add(callback);
    callback({ connected: this.connected, peerCount: this.peerCount, isVR: this.isVR });
    return () => this.statusCallbacks.delete(callback);
  }

  notifyStatus() {
    const status = {
      connected: this.connected,
      peerCount: this.peerCount,
      isVR: this.isVR
    };
    for (const cb of this.statusCallbacks) {
      cb(status);
    }
  }

  send(type, data = {}) {
    const msg = { type, data };
    if (!this.connected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      if (type === 'load-game' || type === 'load-tosec') {
        this.pendingLoad = msg;
      }
      return false;
    }
    this.sendRaw(msg);
    return true;
  }

  sendRaw(msg) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  close() {
    clearTimeout(this.reconnectTimer);
    clearInterval(this.heartbeatTimer);
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }
}
