import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../types';
import { safeFetchJson, syncBackendConfig } from '../services/apiConfig';
import { evidenceService } from '../services/evidenceService';
import { useToast } from './ToastContext';

interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone: string;
  pin: string;
  role?: UserRole;
  emergencyContact?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loginWithCredentials: (email: string, pass: string) => Promise<{ success: boolean; user?: User; error?: string }>;
  registerUser: (data: RegisterData) => Promise<{ success: boolean; user?: User; accessKey?: string; error?: string }>;
  updateProfile: (data: { name?: string; phone?: string }) => Promise<{ success: boolean; user?: User; error?: string }>;
  verifyPin: (pin: string) => Promise<{ success: boolean; error?: string }>;
  setSafetyPin: (pin: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'nirbhaya_auth_token';
const USER_KEY = 'nirbhaya_user_session';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(TOKEN_KEY);
    }
    return null;
  });

  const [user, setUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedToken = localStorage.getItem(TOKEN_KEY);
        const stored = localStorage.getItem(USER_KEY);
        // Only initialize user if token also exists
        return (stored && storedToken) ? JSON.parse(stored) : null;
      } catch {
        return null;
      }
    }
    return null;
  });

  const { showToast } = useToast();

  const clearAuthSession = () => {
    setToken(null);
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  };

  // Validate or restore session from backend on mount & sync backend config
  useEffect(() => {
    const initAuth = async () => {
      // Sync DEMO_MODE and system health from backend
      syncBackendConfig().catch(() => {});

      const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null);
      if (!activeToken) {
        clearAuthSession();
        return;
      }

      try {
        const res = await safeFetchJson<{ success: boolean; user: User }>('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${activeToken}`,
          },
        });

        if (res.ok && res.data?.success && res.data.user) {
          setUser(res.data.user);
          setToken(activeToken);
          localStorage.setItem(USER_KEY, JSON.stringify(res.data.user));
        } else if (res.status === 401 || res.status === 403) {
          console.warn('[AuthContext] Session token expired or invalid (HTTP 401/403). Clearing stale auth state.');
          clearAuthSession();
        }
      } catch (err) {
        console.warn('[AuthContext] Could not verify backend auth session:', err);
      }
    };

    initAuth();
  }, []);

  const loginWithCredentials = async (
    email: string,
    pass: string
  ): Promise<{ success: boolean; user?: User; error?: string }> => {
    try {
      const res = await safeFetchJson<{ success: boolean; token: string; user: User; error?: string }>('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password: pass,
        }),
      });

      if (!res.ok || !res.data?.success) {
        clearAuthSession();
        const errMsg = res.error || res.data?.error || 'Authentication failed. Please verify credentials.';
        return { success: false, error: errMsg };
      }

      const { token: newToken, user: newUser } = res.data;
      setToken(newToken);
      setUser(newUser);
      localStorage.setItem(TOKEN_KEY, newToken);
      localStorage.setItem(USER_KEY, JSON.stringify(newUser));

      showToast(`Welcome back, ${newUser.name}! Authenticated as ${newUser.role}.`, 'success');
      return { success: true, user: newUser };
    } catch (err: any) {
      console.error('[AuthContext] Login error:', err);
      clearAuthSession();
      const errMsg = err?.message || 'Network error connecting to authentication server.';
      return { success: false, error: errMsg };
    }
  };

  const registerUser = async (data: RegisterData): Promise<{ success: boolean; user?: User; accessKey?: string; error?: string }> => {
    try {
      const payload = {
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        password: data.password,
        phone: data.phone.trim(),
        pin: data.pin.trim(),
        role: data.role || 'USER',
        emergencyContact: data.emergencyContact?.trim(),
      };

      const res = await safeFetchJson<{ success: boolean; token: string; user: User; accessKey: string; error?: string }>('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok || !res.data?.success) {
        return { success: false, error: res.error || res.data?.error || 'Registration failed.' };
      }

      const { token: newToken, user: newUser, accessKey } = res.data;
      setToken(newToken);
      setUser(newUser);
      localStorage.setItem(TOKEN_KEY, newToken);
      localStorage.setItem(USER_KEY, JSON.stringify(newUser));

      showToast(`Account registered successfully! Permanent ID: ${newUser.id}`, 'success');
      return { success: true, user: newUser, accessKey };
    } catch (err: any) {
      console.error('[AuthContext] Registration error:', err);
      return { success: false, error: err?.message || 'Server error creating safety account.' };
    }
  };

  const verifyPin = async (pin: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const activeToken = token || localStorage.getItem(TOKEN_KEY);
      if (!activeToken) {
        return { success: false, error: 'Authentication required.' };
      }

      const res = await safeFetchJson<{ success: boolean; error?: string }>('/api/auth/verify-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`,
        },
        body: JSON.stringify({ pin: pin.trim() }),
      });

      if (!res.ok || !res.data?.success) {
        return { success: false, error: res.error || res.data?.error || 'Incorrect PIN.' };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Error verifying PIN.' };
    }
  };

  const setSafetyPin = async (pin: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const activeToken = token || localStorage.getItem(TOKEN_KEY);
      if (!activeToken) {
        return { success: false, error: 'Authentication required.' };
      }

      const res = await safeFetchJson<{ success: boolean; error?: string }>('/api/auth/set-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`,
        },
        body: JSON.stringify({ pin: pin.trim() }),
      });

      if (!res.ok || !res.data?.success) {
        return { success: false, error: res.error || res.data?.error || 'Failed to set safety PIN.' };
      }

      if (user) {
        const updatedUser = { ...user, hasPin: true };
        setUser(updatedUser);
        localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
      }

      showToast('Safety PIN successfully configured!', 'success');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error setting PIN.' };
    }
  };

  const updateProfile = async (data: {
    name?: string;
    phone?: string;
  }): Promise<{ success: boolean; user?: User; error?: string }> => {
    try {
      const activeToken = token || localStorage.getItem(TOKEN_KEY);
      const res = await safeFetchJson<{ success: boolean; user: User; error?: string }>('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken || ''}`,
        },
        body: JSON.stringify(data),
      });

      if (!res.ok || !res.data?.success) {
        return { success: false, error: res.error || res.data?.error || 'Failed to update profile.' };
      }

      setUser(res.data.user);
      localStorage.setItem(USER_KEY, JSON.stringify(res.data.user));
      showToast('Safety profile updated successfully.', 'success');
      return { success: true, user: res.data.user };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error updating profile.' };
    }
  };

  const logout = (): void => {
    clearAuthSession();
    evidenceService.lockVault();
    showToast('Signed out of safety session.', 'info');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(user && token),
        loginWithCredentials,
        registerUser,
        updateProfile,
        verifyPin,
        setSafetyPin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

