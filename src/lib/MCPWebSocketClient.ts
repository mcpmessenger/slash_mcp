import { MCPMessage } from '../types/mcp';

/**
 * Minimal JSON-RPC 2.0 client over WebSocket.
 * Handles request-response mapping and exposes a promise-based send method.
 */
export class MCPWebSocketClient {
  private socket: WebSocket;
  private pending: Map<string | number, (msg: MCPMessage) => void> = new Map();
  private notificationHandlers: Array<(msg: MCPMessage) => void> = [];
  readonly id: string;

  constructor(url: string) {
    this.id = `conn-${Date.now()}`;
    this.socket = new WebSocket(url);
    this.socket.addEventListener('message', (ev) => {
      try {
        const msg: MCPMessage = JSON.parse(ev.data);
        if (msg.id && this.pending.has(msg.id)) {
          this.pending.get(msg.id)!(msg);
          this.pending.delete(msg.id);
        } else if (!('id' in msg)) {
          // notification
          this.notificationHandlers.forEach((h) => h(msg));
        }
      } catch (err) {
        console.error('Invalid MCP message', err);
      }
    });
  }

  /** Wait until WebSocket is OPEN */
  async waitUntilOpen(timeout = 8000) {
    if (this.socket.readyState === WebSocket.OPEN) return;
    return new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('WebSocket timeout')), timeout);
      this.socket.addEventListener('open', () => {
        clearTimeout(t);
        resolve();
      });
      this.socket.addEventListener('error', (e) => {
        clearTimeout(t);
        reject(e);
      });
    });
  }

  /** Send a JSON-RPC request and await the response */
  async send(request: MCPMessage): Promise<MCPMessage> {
    await this.waitUntilOpen();
    const reqId = request.id ?? Date.now();
    const payload = { ...request, id: reqId } as MCPMessage;
    const promise = new Promise<MCPMessage>((resolve) => {
      this.pending.set(reqId, resolve);
    });
    this.socket.send(JSON.stringify(payload));
    return promise;
  }

  close() {
    this.socket.close();
  }

  onNotification(cb: (msg: MCPMessage) => void) {
    this.notificationHandlers.push(cb);
    return () => {
      this.notificationHandlers = this.notificationHandlers.filter((h) => h !== cb);
    };
  }
} 