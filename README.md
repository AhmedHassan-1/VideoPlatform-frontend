# 🖥️ Frontend — React + Vite

**React SPA** — Admin panel + user dashboard for the video platform.

---

## 📋 Overview

| Item | Value |
|------|-------|
| Framework | React 18 + TypeScript |
| Build Tool | Vite |
| State | Zustand (auth) + TanStack Query (server state) |
| Styling | CSS variables + custom design system |
| Dev Port | `5173` |

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start development server (proxies API to localhost:3000)
npm run dev

# 3. Build for production
npm run build

# 4. Preview production build
npm run preview
```

---

## 📁 Project Structure

```
src/
├── pages/
│   ├── auth/
│   │   └── LoginPage.tsx          # Login only (no register/forgot-password)
│   ├── dashboard/
│   │   └── DashboardPage.tsx
│   ├── videos/
│   │   ├── VideosPage.tsx
│   │   ├── UploadPage.tsx         # No quality/segment/key controls (admin-only)
│   │   └── VideoDetail.tsx
│   ├── settings/
│   │   ├── SettingsPage.tsx       # Improved token UI, domains, password
│   │   └── ApiKeysPage.tsx        # API key management with reveal/copy
│   └── admin/
│       ├── AdminDashboard.tsx     # Stats overview
│       ├── AdminUsers.tsx         # Users: create/edit/disable/delete + maxQualities
│       ├── AdminVideos.tsx        # All videos management
│       ├── AdminQueue.tsx         # Live encoding queue
│       ├── AdminConfig.tsx        # Processing / FFmpeg / Main Server config tabs
│       ├── AdminLogs.tsx          # Live SSE log viewer (fixed)
│       ├── AdminAudit.tsx         # Audit log
│       └── AdminLayout.tsx
├── components/
│   └── layout/
│       └── AppLayout.tsx          # Sidebar navigation
├── services/
│   └── api.ts                     # All API calls (clean, no obsolete endpoints)
├── stores/
│   └── auth.store.ts              # Zustand auth state
├── hooks/
│   ├── useUpload.ts               # Chunked upload hook
│   └── useSSE.ts                  # Server-sent events
└── App.tsx                        # Router (no register/forgot-password routes)
```

---

## 🔐 Auth Flow

1. User visits any page → redirected to `/login` if not authenticated
2. Admin logs in → JWT stored in `localStorage`
3. JWT included in every API request via Axios interceptor
4. On 401 → auto logout + redirect to `/login`
5. **No self-registration** — admin creates all accounts via `/admin/users`

---

## 👤 User Features

| Feature | Where |
|---------|-------|
| View/manage videos | `/videos` |
| Upload video | `/videos/upload` |
| Account settings | `/settings` |
| API token (show/copy/regenerate) | `/settings` |
| Allowed embed domains | `/settings` |
| Change password | `/settings` |
| API keys management | `/settings/api-keys` |

**Removed from user panel (admin-only now):**
- ~~Sessions management~~ — removed
- ~~Webhooks~~ — removed
- ~~Quality selection during upload~~ — removed
- ~~Segment duration control~~ — removed
- ~~Key rotation control~~ — removed

---

## 🛡️ Admin Features

| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/admin` | Platform stats, server health |
| Users | `/admin/users` | Create/edit/disable/delete users, set maxQualities |
| Videos | `/admin/videos` | All videos across all users |
| Queue | `/admin/queue` | Live encoding queue, cancel jobs |
| Config | `/admin/config` | 3 tabs: Processing / FFmpeg / Main Server |
| Logs | `/admin/logs` | Live SSE log stream (encode/errors/app) |
| Audit | `/admin/audit` | Full audit trail |

### Config Tabs

**Processing Tab:**
- Concurrency (parallel jobs)
- Default segment duration (HLS)
- Default key rotation
- Max retries
- GPU on/off + type
- Quality profiles (read-only display)

**FFmpeg Tab:**
- Video/audio codec
- Encoding preset
- CRF quality value
- Pixel format
- Audio bitrate
- Hardware acceleration
- Extra FFmpeg arguments

**Main Server Tab:**
- Read-only view of env-based config

---

## 🎨 Design System

CSS variables defined in `index.html`:

```css
--bg-deep:     #060610   /* Deepest background */
--bg-base:     #0c0c1a   /* Base background */
--bg-card:     #12121f   /* Card background */
--bg-elevated: #1a1a2e   /* Elevated surfaces */
--border:      #1e1e35   /* Default border */
--accent:      #6c63ff   /* Primary accent (purple) */
--accent-2:    #ff4d8d   /* Secondary accent (pink) */
--accent-3:    #00e5b0   /* Success/green */
--accent-warn: #ffb800   /* Warning (amber) */
--accent-err:  #ff4757   /* Error (red) */
--text:        #e8e8f0   /* Primary text */
--text-dim:    #b8b8cc   /* Secondary text */
--text-muted:  #6b6b80   /* Muted text */
```

Reusable classes: `s-card`, `s-btn`, `s-input`, `s-table`, `s-badge`, `s-progress`, `s-label`

---

## 🔌 API Proxy (Development)

`vite.config.ts` proxies these paths to `http://localhost:3000`:

```
/api, /auth, /upload, /videos, /users, /admin, /stream, /player, /thumbnails
```

For production, configure nginx to proxy the same paths.

---

## 📦 Key Dependencies

| Package | Purpose |
|---------|---------|
| `react-router-dom` | Client-side routing |
| `@tanstack/react-query` | Server state management + caching |
| `zustand` | Auth state |
| `axios` | HTTP client |
| `react-hot-toast` | Toast notifications |
| `lucide-react` | Icons |

External CDN (loaded in `index.html`):
- Bootstrap 5.3 CSS + Icons
- SweetAlert2
- Plyr (video player)
- hls.js (HLS streaming)

---

## 🐳 Build for Production

```bash
npm run build
# Output: dist/

# Serve with nginx example:
# location / { root /var/www/frontend/dist; try_files $uri $uri/ /index.html; }
# location /api { proxy_pass http://localhost:3000; }
# location /auth { proxy_pass http://localhost:3000; }
# ... (add other proxied paths)
```
