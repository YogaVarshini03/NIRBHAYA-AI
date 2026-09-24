import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { demoAuthService } from '../services/demoAuthService';
import { useToast } from './ToastContext';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loginAsDemoUser: () => void;
  loginWithCredentials: (email: string, pass: string) => { success: boolean; error?: string };
  registerUser: (data: { name: string; email: string; phone: string; emergencyContact: string }) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => demoAuthService.getCurrentUser());
  const { showToast } = useToast();

  useEffect(() => {
    // Keep user state in sync with local storage if modified elsewhere
    const stored = demoAuthService.getCurrentUser();
    if (stored && !user) {
      setUser(stored);
    }
  }, []);

  const loginAsDemoUser = () => {
    const demoUser = demoAuthService.loginDemoUser();
    setUser(demoUser);
    showToast('Demo session started successfully as Ananya Sharma.', 'success');
  };

  const loginWithCredentials = (email: string, pass: string) => {
    const res = demoAuthService.loginWithCredentials(email, pass);
    if (res.success && res.user) {
      setUser(res.user);
      showToast('Welcome back! Safety network authenticated.', 'success');
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const registerUser = (data: { name: string; email: string; phone: string; emergencyContact: string }) => {
    const newUser = demoAuthService.registerUser(data);
    setUser(newUser);
    showToast('Your safety profile has been created successfully.', 'success');
  };

  const logout = () => {
    demoAuthService.logout();
    setUser(null);
    showToast('Signed out of safety session.', 'info');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loginAsDemoUser,
        loginWithCredentials,
        registerUser,
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
