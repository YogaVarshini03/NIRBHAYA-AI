// NIRBHAYA AI - Centralized API & WebSocket Configuration

/**
 * Resolves the base URL for HTTP/REST API endpoints.
 * - In browser under HTTPS (e.g. mobile LAN test https://172.28.210.73:3000), returns ''
 *   so requests route through Vite's HTTPS proxy, avoiding Mixed Content browser blocks.
 * - In desktop HTTP dev mode, uses VITE_API_BASE_URL (default http://localhost:5000)
 *   or adapts hostname dynamically for local network access.
 */
export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    return process.env.VITE_API_BASE_URL || 'http://localhost:5000';
  }

  // When frontend is served over HTTPS (mobile LAN testing), direct fetch to http://...:5000
  // is blocked by browsers as Mixed Content. Using relative '' forwards via Vite's proxy seamlessly.
  if (window.location.protocol === 'https:') {
    return '';
  }

  const envUrl = (import.meta as any).env?.VITE_API_BASE_URL;
  if (envUrl && envUrl.trim() !== '') {
    try {
      const u = new URL(envUrl);
      // If VITE_API_BASE_URL points to localhost/127.0.0.1, but browser is opened from LAN IP
      if (
        (u.hostname === 'localhost' || u.hostname === '127.0.0.1') &&
        window.location.hostname !== 'localhost' &&
        window.location.hostname !== '127.0.0.1'
      ) {
        u.hostname = window.location.hostname;
        return u.origin;
      }
      return envUrl.replace(/\/$/, '');
    } catch (e) {
      return envUrl.replace(/\/$/, '');
    }
  }

  const host = window.location.hostname || 'localhost';
  return `http://${host}:5000`;
}

/**
 * Formats a relative endpoint (e.g. '/api/emergency/create') with the resolved base URL.
 */
export function apiUrl(endpoint: string): string {
  const base = getApiBaseUrl();
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${path}`;
}

/**
 * Resolves the real-time WebSocket connection URL.
 * - For HTTPS frontend (LAN phone): wss://${host}:${port}/ws through Vite SSL proxy
 * - For HTTP desktop: ws://${hostname}:5000/ws directly to backend port 5000
 * - Respects VITE_WEBSOCKET_URL if provided
 */
export function getWebSocketUrl(): string {
  const envWs = (import.meta as any).env?.VITE_WEBSOCKET_URL;

  if (typeof window !== 'undefined') {
    const isHttps = window.location.protocol === 'https:';
    const host = window.location.hostname || 'localhost';

    // In HTTPS context (mobile phone LAN test), browsers strictly require WSS protocol.
    // The Vite dev server SSL proxy securely forwards /ws to backend ws://localhost:5000/ws.
    if (isHttps) {
      return `wss://${window.location.host}/ws`;
    }

    if (envWs && envWs.trim() !== '') {
      try {
        const u = new URL(envWs);
        if (
          (u.hostname === 'localhost' || u.hostname === '127.0.0.1') &&
          window.location.hostname !== 'localhost' &&
          window.location.hostname !== '127.0.0.1'
        ) {
          u.hostname = host;
        }
        return u.toString();
      } catch (e) {
        return envWs;
      }
    }

    // Default desktop direct connection to backend port 5000
    return `ws://${host}:5000/ws`;
  }

  return envWs || 'ws://localhost:5000/ws';
}
