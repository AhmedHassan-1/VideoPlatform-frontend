// src/components/layout/AppLayout.tsx — Redesigned
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { useQuery } from '@tanstack/react-query';
import { usersApi } from '../../services/api';

declare const Swal: any;

const navItems = [
  { to:'/dashboard',           icon:'speedometer2',       label:'Dashboard'  },
  { to:'/videos',              icon:'collection-play',    label:'My Videos'  },
  { to:'/videos/upload',       icon:'cloud-upload',       label:'Upload'     },
  { to:'/settings',            icon:'gear',               label:'Settings'   },
  { to:'/settings/sessions',   icon:'display',            label:'Sessions'   },
  { to:'/settings/api-keys',   icon:'key',                label:'API Keys'   },
  { to:'/settings/webhooks',   icon:'link-45deg',         label:'Webhooks'   },
];

export default function AppLayout() {
  const { user, logout } = useAuthStore();
  const nav = useNavigate();
  const { data: profile } = useQuery({ queryKey:['me'], queryFn: () => usersApi.me().then(r => r.data) });

  const fmt = (b: number) => b === 0 ? '∞' : b >= 1e9 ? (b/1e9).toFixed(1)+'GB' : (b/1e6).toFixed(0)+'MB';
  const storage = profile?.storage;
  const pct = storage?.unlimited ? 0 : Math.min(100, Math.round((storage?.used / storage?.limit) * 100)) || 0;

  async function handleLogout() {
    const result = await Swal.fire({
      title: 'Sign out?',
      text: 'You will need to sign in again to access your account.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, sign out',
      cancelButtonText: 'Stay',
      reverseButtons: true,
    });
    if (result.isConfirmed) logout();
  }

  return (
    <div style={{ display:'flex', height:'100vh', background:'var(--bg-deep)', color:'var(--text)' }}>
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:34, height:34, borderRadius:9, background:'linear-gradient(135deg,#6c63ff,#ff4d8d)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 12px rgba(108,99,255,.4)', flexShrink:0 }}>
              <i className="bi bi-play-fill" style={{ fontSize:16, color:'#fff' }}></i>
            </div>
            <div>
              <div className="logo-text">StreamOS</div>
              <div style={{ fontSize:9, color:'var(--text-muted)', letterSpacing:2, textTransform:'uppercase', fontFamily:'JetBrains Mono,monospace' }}>Video Platform</div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(({ to, icon, label }, i) => (
            <NavLink key={to} to={to} end={to === '/dashboard'}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''} animate-slideInLeft delay-${i+1}`}>
              <i className={`bi bi-${icon}`} style={{ fontSize:15, flexShrink:0 }}></i>
              <span>{label}</span>
            </NavLink>
          ))}

          {user?.role === 'admin' && (
            <>
              <hr className="divider" style={{ margin:'8px 12px' }} />
              <NavLink to="/admin" className="nav-item" style={{ color:'var(--accent-2)' }}>
                <i className="bi bi-shield-shaded" style={{ fontSize:15 }}></i>
                <span>Admin Panel</span>
              </NavLink>
            </>
          )}
        </nav>

        {/* Storage */}
        {storage && (
          <div style={{ padding:'14px 16px', borderTop:'1px solid var(--border)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <span style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:1, fontWeight:700 }}>Storage</span>
              <span style={{ fontSize:11, color: pct>90?'var(--accent-err)':pct>70?'var(--accent-warn)':'var(--accent-3)', fontFamily:'JetBrains Mono,monospace', fontWeight:600 }}>{pct}%</span>
            </div>
            <div className="s-progress" style={{ height:5 }}>
              <div className="s-progress-bar" style={{ width:`${pct}%`, background: pct>90?'var(--accent-err)':pct>70?'var(--accent-warn)':'var(--accent)' }} />
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, fontFamily:'JetBrains Mono,monospace', marginTop:5, color:'var(--text-muted)' }}>
              <span style={{ color:'var(--text-dim)' }}>{fmt(storage.used)}</span>
              <span>{storage.unlimited ? '∞' : fmt(storage.limit)}</span>
            </div>
          </div>
        )}

        {/* User footer */}
        <div style={{ padding:'12px 14px', borderTop:'1px solid var(--border)', display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:8, background:'linear-gradient(135deg,#6c63ff,#ff4d8d)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:13, color:'#fff', flexShrink:0 }}>
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.username}</div>
            <div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'capitalize' }}>{user?.role}</div>
          </div>
          <button onClick={handleLogout} title="Sign out"
            style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', padding:6, borderRadius:6, transition:'all .15s' }}
            onMouseEnter={e => (e.currentTarget.style.color='var(--accent-err)')}
            onMouseLeave={e => (e.currentTarget.style.color='var(--text-muted)')}>
            <i className="bi bi-box-arrow-right" style={{ fontSize:15 }}></i>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex:1, overflow:'auto', padding:'28px 30px' }}>
        <Outlet />
      </main>
    </div>
  );
}
