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
    
    // Ignore placeholder / unconfigured URLs
    const isPlaceholder = 
      trimmed.includes('your-backend') || 
      trimmed.includes('your-app') || 
      trimmed.includes('example.com') ||
      trimmed.includes('<');

    if (!isPlaceholder) {
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
 * Resolves the frontend application base URL for generating live tracking and sharing links.
 * Read from VITE_APP_BASE_URL or APP_BASE_URL (defaults to http://localhost:5173).
 */
export function getAppBaseUrl(): string {
  const envAppUrl = (import.meta as any).env?.VITE_APP_BASE_URL || (import.meta as any).env?.APP_BASE_URL;
  if (envAppUrl && typeof envAppUrl === 'string' && envAppUrl.trim() !== '') {
    return envAppUrl.trim().replace(/\/$/, '');
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'http://localhost:5173';
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
    const isPlaceholder = 
      trimmed.includes('your-backend') || 
      trimmed.includes('your-app') || 
      trimmed.includes('example.com') ||
      trimmed.includes('<');

    if (!isPlaceholder && !trimmed.includes('localhost') && !trimmed.includes('127.0.0.1')) {
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

let runtimeDemoMode: boolean | null = null;

/**
 * Syncs system health and DEMO_MODE setting dynamically from backend (/api/health).
 */
export async function syncBackendConfig(): Promise<{ demoMode: boolean; status: string } | null> {
  try {
    const res = await safeFetchJson<{ status: string; demoMode?: boolean; appMode?: string }>('/api/health');
    if (res.ok && res.data) {
      runtimeDemoMode = Boolean(res.data.demoMode || res.data.appMode === 'demo');
      return {
        status: res.data.status,
        demoMode: runtimeDemoMode,
      };
    }
  } catch (err) {
    console.warn('[apiConfig] Could not sync backend config:', err);
  }
  return null;
}

/**
 * Checks if DEMO_MODE safety switch is active.
 * Fetched from backend /api/health with fallback to build-time environment variable.
 */
export function isDemoMode(): boolean {
  if (runtimeDemoMode !== null) {
    return runtimeDemoMode;
  }
  const envVal = (import.meta as any).env?.VITE_DEMO_MODE;
  if (envVal !== undefined && envVal !== '') {
    return envVal === 'true' || envVal === true;
  }
  return false;
}

export interface SafeFetchResult<T = any> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

/**
 * Safe fetch wrapper that verifies response.ok and Content-Type before parsing JSON,
 * returning structured errors instead of throwing SyntaxError on HTML or non-JSON responses.
 */
export async function safeFetchJson<T = any>(
  endpointOrUrl: string,
  options?: RequestInit
): Promise<SafeFetchResult<T>> {
  const url = endpointOrUrl.startsWith('http://') || endpointOrUrl.startsWith('https://')
    ? endpointOrUrl
    : apiUrl(endpointOrUrl);

  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';

    if (!contentType.includes('application/json')) {
      const rawText = await res.text().catch(() => '');
      if (res.status === 401) {
        return { ok: false, status: 401, error: 'Session expired or unauthenticated. Please sign in again.' };
      }
      if (res.status === 403) {
        return { ok: false, status: 403, error: 'Access denied. You do not have permission for this action.' };
      }
      if (res.status === 404) {
        return { ok: false, status: 404, error: 'Resource or endpoint not found on server.' };
      }
      if (res.status >= 500) {
        return { ok: false, status: res.status, error: `Backend service error (HTTP ${res.status}).` };
      }
      return {
        ok: false,
        status: res.status,
        error: rawText.slice(0, 150) || `Server returned unexpected non-JSON response (HTTP ${res.status}).`
      };
    }

    const data = await res.json();
    if (!res.ok) {
      const errMsg = (data && (data.error || data.message)) || `Request failed with HTTP status ${res.status}`;
      return { ok: false, status: res.status, data, error: errMsg };
    }

    return { ok: true, status: res.status, data };
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      error: err?.message || 'Network connection error. Could not connect to backend server.',
    };
  }
}

