// src/services/api.ts — Updated: added bandwidth, error-detail, purge-output, removed live logs stream
import axios from 'axios';

const api = axios.create({ baseURL: '' });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login:          (username: string, password: string) =>
    api.post('/auth/login', { username, password }),
  logout:         () => api.post('/auth/logout'),
  me:             () => api.get('/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
};

// ── Users ─────────────────────────────────────────────────────────────────────
export const usersApi = {
  me:              () => api.get('/users/me'),
  storage:         () => api.get('/users/me/storage'),
  getDomains:      () => api.get('/users/me/domains'),
  addDomain:       (domain: string) => api.post('/users/me/domains', { domain }),
  removeDomain:    (id: string) => api.delete(`/users/me/domains/${id}`),
  setDomains:      (domains: string[]) => api.put('/users/me/domains', { domains }),
  regenerateToken: () => api.post('/users/me/regenerate-token'),
};

// ── Videos ────────────────────────────────────────────────────────────────────
export const videosApi = {
  list:    (page = 1, limit = 20, status?: string) =>
    api.get('/videos', { params: { page, limit, status } }),
  queue:   () => api.get('/videos/queue'),
  get:     (id: string) => api.get(`/videos/${id}`),
  update:  (id: string, data: Record<string, unknown>) => api.patch(`/videos/${id}`, data),
  delete:  (id: string) => api.delete(`/videos/${id}`),
  cancel:  (id: string) => api.post(`/videos/${id}/cancel`),
};

// ── Upload ────────────────────────────────────────────────────────────────────
export const uploadApi = {
  init: (data: { filename: string; totalSize: number; title: string; qualities?: string[] | null }) =>
    api.post('/upload/init', data),

  chunk: (uploadId: string, index: number, data: ArrayBuffer) =>
    api.put(`/upload/chunk/${uploadId}?index=${index}`, data, {
      headers: { 'Content-Type': 'application/octet-stream' },
    }),

  poster: (uploadId: string, data: ArrayBuffer, ext: string) =>
    api.post(`/upload/poster/${uploadId}?ext=${ext}`, data, {
      headers: { 'Content-Type': 'application/octet-stream' },
    }),

  status:   (uploadId: string) => api.get(`/upload/status/${uploadId}`),
  complete: (uploadId: string) => api.post(`/upload/complete/${uploadId}`),
  cancel:   (uploadId: string) => api.delete(`/upload/cancel/${uploadId}`),
};

// ── Embed ─────────────────────────────────────────────────────────────────────
export const embedApi = {
  create: (apiToken: string, videoId: string, watermark = '') =>
    api.post('/api/embed', { apiToken, videoId, watermark }),
};

// ── Admin ─────────────────────────────────────────────────────────────────────
export const adminApi = {
  stats:       () => api.get('/admin/stats'),
  queue:       () => api.get('/admin/queue'),
  cancelJob:   (jobId: string) => api.post(`/admin/queue/${jobId}/cancel`),
  videos:      (page = 1, limit = 50, userId?: string, status?: string) =>
    api.get('/admin/videos', { params: { page, limit, userId, status } }),
  deleteVideo: (id: string) => api.delete(`/admin/videos/${id}`),
  // Get full error detail (admin only)
  videoErrorDetail: (id: string) => api.get(`/admin/videos/${id}/error-detail`),
  // Purge HLS output from disk (keep DB record)
  purgeVideoOutput: (id: string) => api.delete(`/admin/videos/${id}/output`),

  // Users
  users:           () => api.get('/admin/users'),
  getUser:         (id: string) => api.get(`/admin/users/${id}`),
  createUser:      (data: Record<string, unknown>) => api.post('/admin/users', data),
  updateUser:      (id: string, data: Record<string, unknown>) => api.patch(`/admin/users/${id}`, data),
  deleteUser:      (id: string) => api.delete(`/admin/users/${id}`),
  disableUser:     (id: string) => api.patch(`/admin/users/${id}/disable`),
  enableUser:      (id: string) => api.patch(`/admin/users/${id}/enable`),
  setMaxQualities: (id: string, maxQualities: number | null) =>
    api.patch(`/admin/users/${id}/max-qualities`, { maxQualities }),
  setBandwidth:    (id: string, bandwidthLimitBytes: number) =>
    api.patch(`/admin/users/${id}/bandwidth`, { bandwidthLimitBytes }),
  resetBandwidth:  (id: string) => api.post(`/admin/users/${id}/bandwidth/reset`),

  // Config — Processing server
  serverConfig:       () => api.get('/admin/config/server'),
  updateServerConfig: (data: Record<string, unknown>) => api.patch('/admin/config/server', data),

  // Config — FFmpeg
  ffmpegConfig:       () => api.get('/admin/config/ffmpeg'),
  updateFfmpegConfig: (data: Record<string, unknown>) => api.patch('/admin/config/ffmpeg', data),

  // Config — Quality Profiles
  qualityProfiles:       () => api.get('/admin/config/quality-profiles'),
  updateQualityProfile:  (label: string, data: Record<string, unknown>) =>
    api.patch(`/admin/config/quality-profiles/${label}`, data),
  resetQualityProfiles:  () => api.post('/admin/config/quality-profiles/reset'),

  // Config — Main Server
  mainConfig:       () => api.get('/admin/config/main'),
  updateMainConfig: (data: Record<string, unknown>) => api.patch('/admin/config/main', data),

  // Logs (static — no live streaming)
  appLog:    (lines?: number) => api.get('/admin/logs/app', { params: { lines } }),
  encodeLog: (jobId: string, lines?: number) => api.get(`/admin/logs/encode/${jobId}`, { params: { lines } }),

  // Audit
  auditLogs: (params?: Record<string, unknown>) => api.get('/admin/audit', { params }),
};

// ── API Keys ──────────────────────────────────────────────────────────────────
export const apiKeysApi = {
  list:        () => api.get('/users/me/api-keys'),
  create:      (label: string, expiresAt?: string) => api.post('/users/me/api-keys', { label, expiresAt }),
  revoke:      (id: string) => api.delete(`/users/me/api-keys/${id}`),
  revoke_all:  () => api.delete('/users/me/api-keys'),
  updateLabel: (id: string, label: string) => api.patch(`/users/me/api-keys/${id}`, { label }),
};

// ── Videos Extended ───────────────────────────────────────────────────────────
export const videosExtApi = {
  retry:       (id: string) => api.post(`/videos/${id}/retry`),
  stats:       (id: string) => api.get(`/videos/${id}/stats`),
  batchDelete: (videoIds: string[]) => api.delete('/videos/batch', { data: { videoIds } }),
  batchUpdate: (videoIds: string[], data: Record<string, unknown>) =>
    api.patch('/videos/batch', { videoIds, ...data }),
  batchRetry: (videoIds: string[]) => api.post('/videos/batch/retry', { videoIds }),
};

// ── Admin System ──────────────────────────────────────────────────────────────
export const adminSysApi = {
  disk:     () => api.get('/admin/system/disk'),
  overview: () => api.get('/admin/system/overview'),
  cronRun:  () => api.post('/admin/cron/run'),
};
