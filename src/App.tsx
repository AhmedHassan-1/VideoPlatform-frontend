// src/App.tsx — Updated: removed register, forgot-password, sessions, webhooks routes
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './stores/auth.store';
import LoginPage      from './pages/auth/LoginPage';
import DashboardPage  from './pages/dashboard/DashboardPage';
import VideosPage     from './pages/videos/VideosPage';
import UploadPage     from './pages/videos/UploadPage';
import VideoDetail    from './pages/videos/VideoDetail';
import SettingsPage   from './pages/settings/SettingsPage';
import AdminLayout    from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers     from './pages/admin/AdminUsers';
import AdminVideos    from './pages/admin/AdminVideos';
import AdminQueue     from './pages/admin/AdminQueue';
import AdminConfig    from './pages/admin/AdminConfig';
import AdminLogs      from './pages/admin/AdminLogs';
import AdminAudit     from './pages/admin/AdminAudit';
import ApiKeysPage    from './pages/settings/ApiKeysPage';
import AppLayout      from './components/layout/AppLayout';
import { useSSE }     from './hooks/useSSE';
import { Toaster }    from 'react-hot-toast';

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
      <Toaster position="top-right" toastOptions={{ style:{ background:'#1a1a2e', color:'#e8e8f0', border:'1px solid #1e1e35' } }} />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          {/* No register / forgot-password — admin creates accounts */}

          <Route path="/" element={<RequireAuth><AuthenticatedWrapper><AppLayout /></AuthenticatedWrapper></RequireAuth>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="videos" element={<VideosPage />} />
            <Route path="videos/upload" element={<UploadPage />} />
            <Route path="videos/:id" element={<VideoDetail />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="settings/api-keys" element={<ApiKeysPage />} />
          </Route>

          <Route path="/admin" element={<RequireAuth><RequireAdmin><AdminLayout /></RequireAdmin></RequireAuth>}>
            <Route index element={<AdminDashboard />} />
            <Route path="users"  element={<AdminUsers />} />
            <Route path="videos" element={<AdminVideos />} />
            <Route path="queue"  element={<AdminQueue />} />
            <Route path="config" element={<AdminConfig />} />
            <Route path="logs"   element={<AdminLogs />} />
            <Route path="audit"  element={<AdminAudit />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
