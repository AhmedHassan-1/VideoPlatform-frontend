// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './stores/auth.store';
import LoginPage     from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import VideosPage    from './pages/videos/VideosPage';
import UploadPage    from './pages/videos/UploadPage';
import VideoDetail   from './pages/videos/VideoDetail';
import SettingsPage  from './pages/settings/SettingsPage';
import AdminLayout   from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers    from './pages/admin/AdminUsers';
import AdminVideos   from './pages/admin/AdminVideos';
import AdminQueue    from './pages/admin/AdminQueue';
import AdminConfig   from './pages/admin/AdminConfig';
import AdminLogs     from './pages/admin/AdminLogs';
import AdminSecurity from './pages/admin/AdminSecurity';
import AdminAudit    from './pages/admin/AdminAudit';
import SessionsPage  from './pages/settings/SessionsPage';
import ApiKeysPage   from './pages/settings/ApiKeysPage';
import WebhooksPage  from './pages/settings/WebhooksPage';
import RegisterPage  from './pages/auth/RegisterPage';
import { ForgotPasswordPage, ResetPasswordPage, VerifyEmailPage } from './pages/auth/ForgotPasswordPage';
import AppLayout     from './components/layout/AppLayout';
import { useSSE }    from './hooks/useSSE';

const qc = new QueryClient({ defaultOptions: { queries: { retry:1, staleTime:30_000 } } });

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuth = useAuthStore(s => s.isAuthenticated);
  return isAuth ? <>{children}</> : <Navigate to="/login" replace />;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const user = useAuthStore(s => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function AuthenticatedWrapper({ children }: { children: React.ReactNode }) {
  useSSE();
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          <Route path="/login"           element={<LoginPage />} />
          <Route path="/register"        element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password"  element={<ResetPasswordPage />} />
          <Route path="/verify-email"    element={<VerifyEmailPage />} />

          <Route path="/" element={<RequireAuth><AuthenticatedWrapper><AppLayout /></AuthenticatedWrapper></RequireAuth>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="videos" element={<VideosPage />} />
            <Route path="videos/upload" element={<UploadPage />} />
            <Route path="videos/:id" element={<VideoDetail />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="settings/sessions" element={<SessionsPage />} />
            <Route path="settings/api-keys"  element={<ApiKeysPage />} />
            <Route path="settings/webhooks"  element={<WebhooksPage />} />
          </Route>

          <Route path="/admin" element={<RequireAuth><RequireAdmin><AdminLayout /></RequireAdmin></RequireAuth>}>
            <Route index element={<AdminDashboard />} />
            <Route path="users"    element={<AdminUsers />} />
            <Route path="videos"   element={<AdminVideos />} />
            <Route path="queue"    element={<AdminQueue />} />
            <Route path="config"   element={<AdminConfig />} />
            <Route path="logs"     element={<AdminLogs />} />
            <Route path="security" element={<AdminSecurity />} />
            <Route path="audit"    element={<AdminAudit />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
