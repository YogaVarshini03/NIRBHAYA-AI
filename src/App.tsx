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

// Protected Route Guard
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

// Strict Role-Based Route Guard (Section 2: USER, RESPONDER, ADMIN)
const RoleRoute: React.FC<{ allowedRoles: ('USER' | 'RESPONDER' | 'ADMIN')[]; children: React.ReactNode }> = ({
  allowedRoles,
  children,
}) => {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Admin has access to all operational routes
  if (user.role === 'ADMIN') {
    return <>{children}</>;
  }

  if (!allowedRoles.includes(user.role)) {
    if (user.role === 'RESPONDER') {
      return <Navigate to="/responder" replace />;
    }
    return <Navigate to="/dashboard" replace />;
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
                  {/* Citizen User Routes */}
                  <Route path="/dashboard" element={<RoleRoute allowedRoles={['USER']}><UserDashboard /></RoleRoute>} />
                  <Route path="/risk-analysis" element={<RoleRoute allowedRoles={['USER']}><RiskAnalysisPage /></RoleRoute>} />
                  <Route path="/safe-route" element={<RoleRoute allowedRoles={['USER']}><SafeRoutePage /></RoleRoute>} />
                  <Route path="/sos" element={<RoleRoute allowedRoles={['USER']}><SilentSosPage /></RoleRoute>} />
                  <Route path="/live-tracking" element={<LiveTrackingPage />} />
                  <Route path="/evidence" element={<RoleRoute allowedRoles={['USER']}><EvidenceLockerPage /></RoleRoute>} />
                  <Route path="/contacts" element={<RoleRoute allowedRoles={['USER']}><TrustedContactsPage /></RoleRoute>} />
                  <Route path="/history" element={<SafetyHistoryPage />} />
                  <Route path="/settings" element={<SettingsPage />} />

                  {/* Responder Command Routes */}
                  <Route path="/responder" element={<RoleRoute allowedRoles={['RESPONDER']}><ResponderDashboard /></RoleRoute>} />
                  <Route path="/responder/active" element={<RoleRoute allowedRoles={['RESPONDER']}><ActiveEmergencyPage /></RoleRoute>} />
                  <Route path="/responder/map" element={<RoleRoute allowedRoles={['RESPONDER']}><ResponderMapPage /></RoleRoute>} />
                  <Route path="/responder/incident/:id" element={<RoleRoute allowedRoles={['RESPONDER']}><IncidentDetailPage /></RoleRoute>} />

                  {/* Analytics & System Admin Routes */}
                  <Route path="/analytics" element={<RoleRoute allowedRoles={['ADMIN']}><SafetyAnalyticsPage /></RoleRoute>} />
                  <Route path="/analytics/heatmap" element={<RoleRoute allowedRoles={['ADMIN']}><IncidentHeatmapPage /></RoleRoute>} />
                  <Route path="/analytics/system" element={<RoleRoute allowedRoles={['ADMIN']}><SystemMonitoringPage /></RoleRoute>} />
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
