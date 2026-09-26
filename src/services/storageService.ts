export const StorageKeys = {
  USER_SESSION: 'nirbhaya_user_session',
  CONTACTS: 'nirbhaya_contacts',
  RISK_FACTORS: 'nirbhaya_risk_factors',
  SELECTED_ROUTE: 'nirbhaya_selected_route',
  ACTIVE_INCIDENT: 'nirbhaya_active_incident',
  EVIDENCE_LIST: 'nirbhaya_evidence_list',
  SAFETY_HISTORY: 'nirbhaya_safety_history',
  APP_SETTINGS: 'nirbhaya_app_settings',
  NOTIFICATIONS: 'nirbhaya_notifications',
  LAST_CALCULATED_ROUTES: 'nirbhaya_last_routes',
};

export const storageService = {
  getItem<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return defaultValue;
      return JSON.parse(item) as T;
    } catch (e) {
      console.warn(`Error reading localStorage key "${key}":`, e);
      return defaultValue;
    }
  },

  setItem<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn(`Error writing to localStorage key "${key}":`, e);
    }
  },

  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn(`Error removing localStorage key "${key}":`, e);
    }
  },

  clearAll(): void {
    try {
      Object.values(StorageKeys).forEach((key) => {
        localStorage.removeItem(key);
      });
    } catch (e) {
      console.warn('Error clearing localStorage:', e);
    }
  }
};
