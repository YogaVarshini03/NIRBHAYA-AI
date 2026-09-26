import { getWebSocketUrl } from './apiConfig';

export type SocketStatus = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING';

export type SocketEventHandler = (payload: any) => void;

class SocketService {
  private ws: WebSocket | null = null;
  private status: SocketStatus = 'DISCONNECTED';
  private handlers: Map<string, Set<SocketEventHandler>> = new Map();
  private reconnectTimer: any = null;
  private currentIncidentSubscription: string | null = null;
  private currentRole: string = 'USER';
  private activeUrl: string = '';

  constructor() {
    this.init();
  }

  public init(): void {
    if (typeof window === 'undefined') return;
    const wsUrl = getWebSocketUrl();
    this.activeUrl = wsUrl;
    console.log(`[WebSocket] Initializing connection to: ${wsUrl}`);
    this.connect(wsUrl);
  }

  private connect(url: string): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.status = 'CONNECTING';
    this.emitInternal('STATUS_CHANGE', { status: this.status });

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('[WebSocket] Connected to NIRBHAYA AI Telemetry Gateway');
        this.status = 'CONNECTED';
        this.emitInternal('STATUS_CHANGE', { status: this.status });

        // Resubscribe if previously subscribed
        if (this.currentIncidentSubscription) {
          this.subscribeToIncident(this.currentIncidentSubscription, this.currentRole);
        }
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type) {
            this.emit(data.type, data);
          }
        } catch (err) {
          console.warn('[WebSocket] Malformed payload:', event.data);
        }
      };

      this.ws.onclose = () => {
        console.log('[WebSocket] Disconnected from Telemetry Gateway');
        this.status = 'DISCONNECTED';
        this.emitInternal('STATUS_CHANGE', { status: this.status });
        this.scheduleReconnect(url);
      };

      this.ws.onerror = (err) => {
        console.warn('[WebSocket] Socket encountered error:', err);
        if (this.ws) this.ws.close();
      };
    } catch (err) {
      console.warn('[WebSocket] Initialization failed:', err);
      this.scheduleReconnect(url);
    }
  }

  private scheduleReconnect(url: string): void {
    if (this.reconnectTimer) return;
    this.status = 'RECONNECTING';
    this.emitInternal('STATUS_CHANGE', { status: this.status });

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      console.log('[WebSocket] Attempting auto-reconnect...');
      this.connect(url);
    }, 3000);
  }

  public subscribeToIncident(incidentId: string, role: string = 'USER'): void {
    this.currentIncidentSubscription = incidentId;
    this.currentRole = role;

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'SUBSCRIBE_INCIDENT',
        incidentId,
        role,
      }));
    }
  }

  public subscribeToAll(role: string = 'RESPONDER'): void {
    this.currentRole = role;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'SUBSCRIBE_ALL',
        role,
      }));
    }
  }

  public sendLocation(data: {
    incidentId?: string;
    latitude: number;
    longitude: number;
    accuracy?: number;
    speed?: number | null;
    heading?: number | null;
    altitude?: number | null;
    senderRole?: string;
  }): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'LOCATION_UPDATE',
        ...data,
      }));
    }
  }

  public on(event: string, handler: SocketEventHandler): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);

    return () => {
      this.handlers.get(event)?.delete(handler);
    };
  }

  public emit(event: string, payload: any): void {
    const listeners = this.handlers.get(event);
    if (listeners) {
      listeners.forEach((handler) => handler(payload));
    }
  }

  private emitInternal(event: string, payload: any): void {
    this.emit(event, payload);
  }

  public getStatus(): SocketStatus {
    return this.status;
  }
}

export const socketService = new SocketService();
