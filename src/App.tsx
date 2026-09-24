import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import { EmergencyProvider } from './context/EmergencyContext';

// Layout
import { AppLayout } from './components/layout/AppLayout';

// Public pages
import { LandingPage } from './pages/landing/LandingPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';

// Protected App pages
import { UserDashboard } from './pages/dashboard/UserDashboard';
import { RiskAnalysisPage } from './pages/risk/RiskAnalysisPage';
import { SafeRoutePage } from './pages/route/SafeRoutePage';
import { SilentSosPage } from './pages/sos/SilentSosPage';
import { LiveTrackingPage } from './pages/tracking/LiveTrackingPage';
import { EvidenceLockerPage } from './pages/evidence/EvidenceLockerPage';
import { TrustedContactsPage } from './pages/contacts/TrustedContactsPage';
import { SafetyHistoryPage } from './pages/history/SafetyHistoryPage';
import { SettingsPage } from './pages/settings/SettingsPage';

// Responder Pages
import { ResponderDashboard } from './pages/responder/ResponderDashboard';
import { ActiveEmergencyPage } from './pages/responder/ActiveEmergencyPage';
import { ResponderMapPage } from './pages/responder/ResponderMapPage';
import { IncidentDetailPage } from './pages/responder/IncidentDetailPage';

// Analytics Pages
import { SafetyAnalyticsPage } from './pages/analytics/SafetyAnalyticsPage';
import { IncidentHeatmapPage } from './pages/analytics/IncidentHeatmapPage';
import { SystemMonitoringPage } from './pages/analytics/SystemMonitoringPage';

// Protected Route Guard (Rule 44)
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <EmergencyProvider>
            <BrowserRouter>
              <Routes>
                {/* Public Landing & Auth Routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />

                {/* Authenticated Application Shell */}
                <Route
                  element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/dashboard" element={<UserDashboard />} />
                  <Route path="/risk-analysis" element={<RiskAnalysisPage />} />
                  <Route path="/safe-route" element={<SafeRoutePage />} />
                  <Route path="/sos" element={<SilentSosPage />} />
                  <Route path="/live-tracking" element={<LiveTrackingPage />} />
                  <Route path="/evidence" element={<EvidenceLockerPage />} />
                  <Route path="/contacts" element={<TrustedContactsPage />} />
                  <Route path="/history" element={<SafetyHistoryPage />} />
                  <Route path="/settings" element={<SettingsPage />} />

                  {/* Responder Command Routes */}
                  <Route path="/responder" element={<ResponderDashboard />} />
                  <Route path="/responder/active" element={<ActiveEmergencyPage />} />
                  <Route path="/responder/map" element={<ResponderMapPage />} />
                  <Route path="/responder/incident/:id" element={<IncidentDetailPage />} />

                  {/* Analytics & System Routes */}
                  <Route path="/analytics" element={<SafetyAnalyticsPage />} />
                  <Route path="/analytics/heatmap" element={<IncidentHeatmapPage />} />
                  <Route path="/analytics/system" element={<SystemMonitoringPage />} />
                </Route>

                {/* Catch-all Fallback Route */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </EmergencyProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
};

export default App;
