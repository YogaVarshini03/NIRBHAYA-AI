import { User } from '../types';
import { storageService, StorageKeys } from './storageService';

export const DEFAULT_DEMO_USER: User = {
  id: 'usr_ananya_sharma_01',
  name: 'Ananya Sharma',
  email: 'demo@nirbhaya.ai',
  phone: '+91 98765 43210',
  emergencyContact: '+91 98765 11223 (Mother)',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
  role: 'USER',
  demoMode: true,
  createdAt: '2026-01-15T09:00:00Z',
};

export const demoAuthService = {
  getCurrentUser(): User | null {
    return storageService.getItem<User | null>(StorageKeys.USER_SESSION, null);
  },

  loginDemoUser(): User {
    storageService.setItem(StorageKeys.USER_SESSION, DEFAULT_DEMO_USER);
    return DEFAULT_DEMO_USER;
  },

  loginWithCredentials(email: string, _password: string): { success: boolean; user?: User; error?: string } {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      return { success: false, error: 'Please enter your email address.' };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return { success: false, error: 'Please enter a valid email address.' };
    }

    // Accept demo email or create an authenticated session with provided email
    const user: User = {
      ...DEFAULT_DEMO_USER,
      email: trimmedEmail,
      name: trimmedEmail === 'demo@nirbhaya.ai' ? 'Ananya Sharma' : trimmedEmail.split('@')[0],
    };
    storageService.setItem(StorageKeys.USER_SESSION, user);
    return { success: true, user };
  },

  registerUser(data: { name: string; email: string; phone: string; emergencyContact: string }): User {
    const newUser: User = {
      id: `usr_${Date.now()}`,
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone.trim(),
      emergencyContact: data.emergencyContact.trim(),
      role: 'USER',
      demoMode: true,
      createdAt: new Date().toISOString(),
    };
    storageService.setItem(StorageKeys.USER_SESSION, newUser);
    return newUser;
  },

  logout(): void {
    storageService.removeItem(StorageKeys.USER_SESSION);
  },

  isAuthenticated(): boolean {
    return !!storageService.getItem<User | null>(StorageKeys.USER_SESSION, null);
  }
};
