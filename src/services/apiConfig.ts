// NIRBHAYA AI - Production API & WebSocket Configuration

/**
 * Resolves the API base URL for REST endpoints.
 * - In Vercel production: Uses VITE_API_BASE_URL (https://nirbhaya-ai-production.up.railway.app)
 * - In local development: Uses Vite proxy ('') to prevent mixed-content or CORS issues,
 *   or connects to local backend port 5000.
 */
export function getApiBaseUrl(): string {
  const envUrl = (import.meta as any).env?.VITE_API_BASE_URL;

  // 1. If explicit production or remote backend URL is provided (e.g. Railway)
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    const trimmed = envUrl.trim().replace(/\/$/, '');
    
    // Check if it's a remote production backend (e.g. railway.app, custom domain)
    if (!trimmed.includes('localhost') && !trimmed.includes('127.0.0.1')) {
      return trimmed;
    }

    // If it points to localhost, but the app is being opened on a LAN device (phone)
    if (typeof window !== 'undefined') {
      const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (!isLocalHost) {
        // In HTTPS dev mode on phone, use relative '' so Vite's SSL proxy handles it
        if (window.location.protocol === 'https:') {
          return '';
        }
        return `http://${window.location.hostname}:5000`;
      }
    }

    return trimmed;
  }

  // 2. Browser runtime fallback
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // On Vercel or any non-localhost production deployment without env var, default to production Railway backend
    if (hostname.includes('vercel.app') || hostname.includes('nirbhaya')) {
      return 'https://nirbhaya-ai-production.up.railway.app';
    }

    // In local development under Vite proxy
    return '';
  }

  return 'http://localhost:5000';
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
 * - In Vercel production: wss://nirbhaya-ai-production.up.railway.app/ws
 * - In local dev (HTTPS): wss://${host}/ws (proxied through Vite SSL)
 * - In local dev (HTTP): ws://${hostname}:5000/ws
 */
export function getWebSocketUrl(): string {
  const envWs = (import.meta as any).env?.VITE_WEBSOCKET_URL;

  // 1. If explicitly configured
  if (envWs && typeof envWs === 'string' && envWs.trim() !== '') {
    const trimmed = envWs.trim();
    if (!trimmed.includes('localhost') && !trimmed.includes('127.0.0.1')) {
      return trimmed;
    }
  }

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;

    // Production environment (Vercel / Cloud)
    if (hostname.includes('vercel.app') || hostname.includes('nirbhaya')) {
      return 'wss://nirbhaya-ai-production.up.railway.app/ws';
    }

    // Local dev with HTTPS (mobile phone LAN test)
    if (window.location.protocol === 'https:') {
      return `wss://${window.location.host}/ws`;
    }

    // Local dev direct connection
    const host = hostname || 'localhost';
    return `ws://${host}:5000/ws`;
  }

  return envWs || 'ws://localhost:5000/ws';
}
