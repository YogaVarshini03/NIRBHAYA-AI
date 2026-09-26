import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../types';
import { apiUrl } from '../services/apiConfig';
import { evidenceService } from '../services/evidenceService';
import { useToast } from './ToastContext';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loginAsDemoUser: () => Promise<void>;
  loginWithCredentials: (email: string, pass: string) => Promise<{ success: boolean; user?: User; error?: string }>;
  registerUser: (data: { name: string; email: string; password?: string; phone: string; role?: UserRole; emergencyContact?: string }) => Promise<{ success: boolean; user?: User; accessKey?: string; error?: string }>;
  updateProfile: (data: { name?: string; phone?: string }) => Promise<{ success: boolean; user?: User; error?: string }>;
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
        const stored = localStorage.getItem(USER_KEY);
        return stored ? JSON.parse(stored) : null;
      } catch {
        return null;
      }
    }
    return null;
  });

  const { showToast } = useToast();

  // Validate or restore session from backend on mount
  useEffect(() => {
    const initAuth = async () => {
      const activeToken = token || localStorage.getItem(TOKEN_KEY);
      if (!activeToken) {
        // Fallback default demo identity if none logged in yet
        if (!user) {
          const defaultUser: User = {
            id: 'USR-7F42A91C',
            name: 'Abhishek K',
            email: 'demo@nirbhaya.ai',
            phone: '+91 93455 96322',
            role: 'USER',
            createdAt: '2026-01-15T09:00:00Z',
          };
          setUser(defaultUser);
          localStorage.setItem(USER_KEY, JSON.stringify(defaultUser));
        }
        return;
      }

      try {
        const res = await fetch(apiUrl('/api/auth/me'), {
          headers: {
            'Authorization': `Bearer ${activeToken}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user) {
            setUser(data.user);
            localStorage.setItem(USER_KEY, JSON.stringify(data.user));
          }
        } else {
          // Token invalid or expired
          console.warn('[AuthContext] Session token expired or invalid.');
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
      const res = await fetch(apiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password: pass,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        const errMsg = data.error || 'Authentication failed. Please verify credentials.';
        return { success: false, error: errMsg };
      }

      setToken(data.token);
      setUser(data.user);
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));

      showToast(`Welcome back, ${data.user.name}! Authenticated as ${data.user.role}.`, 'success');
      return { success: true, user: data.user };
    } catch (err: any) {
      console.error('[AuthContext] Login error:', err);
      const errMsg = err?.message || 'Network error connecting to authentication server.';
      return { success: false, error: errMsg };
    }
  };

  const registerUser = async (data: {
    name: string;
    email: string;
    password?: string;
    phone: string;
    role?: UserRole;
    emergencyContact?: string;
  }): Promise<{ success: boolean; user?: User; accessKey?: string; error?: string }> => {
    try {
      const payload = {
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        password: data.password || 'demo1234',
        phone: data.phone.trim(),
        role: data.role || 'USER',
        emergencyContact: data.emergencyContact?.trim(),
      };

      const res = await fetch(apiUrl('/api/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();

      if (!res.ok || !resData.success) {
        return { success: false, error: resData.error || 'Registration failed.' };
      }

      setToken(resData.token);
      setUser(resData.user);
      localStorage.setItem(TOKEN_KEY, resData.token);
      localStorage.setItem(USER_KEY, JSON.stringify(resData.user));

      showToast(`Account registered successfully! Permanent ID: ${resData.user.id}`, 'success');
      return { success: true, user: resData.user, accessKey: resData.accessKey };
    } catch (err: any) {
      console.error('[AuthContext] Registration error:', err);
      return { success: false, error: err?.message || 'Server error creating safety account.' };
    }
  };

  const loginAsDemoUser = async (): Promise<void> => {
    // Authenticate demo user against real backend with standard email and password
    const res = await loginWithCredentials('demo@nirbhaya.ai', 'demo1234');
    if (!res.success) {
      // Fallback local session if offline
      const demoUser: User = {
        id: 'USR-7F42A91C',
        name: 'Abhishek K',
        email: 'demo@nirbhaya.ai',
        phone: '+91 93455 96322',
        role: 'USER',
        createdAt: '2026-01-15T09:00:00Z',
      };
      setUser(demoUser);
      localStorage.setItem(USER_KEY, JSON.stringify(demoUser));
      showToast('Authenticated as Abhishek K (USR-7F42A91C)', 'success');
    }
  };

  const updateProfile = async (data: {
    name?: string;
    phone?: string;
  }): Promise<{ success: boolean; user?: User; error?: string }> => {
    try {
      const activeToken = token || localStorage.getItem(TOKEN_KEY);
      const res = await fetch(apiUrl('/api/auth/profile'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken || ''}`,
        },
        body: JSON.stringify(data),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        return { success: false, error: resData.error || 'Failed to update profile.' };
      }

      setUser(resData.user);
      localStorage.setItem(USER_KEY, JSON.stringify(resData.user));
      showToast('Safety profile updated successfully.', 'success');
      return { success: true, user: resData.user };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error updating profile.' };
    }
  };

  const logout = (): void => {
    setToken(null);
    setUser(null);
    evidenceService.lockVault();
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
    showToast('Signed out of safety session.', 'info');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        loginAsDemoUser,
        loginWithCredentials,
        registerUser,
        updateProfile,
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
