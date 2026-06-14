// src/pages/admin/AdminLayout.tsx — Fixed: mobile responsive
import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';

declare const Swal: any;

const items = [
  { to:'/admin',          icon:'speedometer2',    label:'Dashboard',  end:true },
  { to:'/admin/queue',    icon:'hourglass-split', label:'Queue'      },
  { to:'/admin/videos',   icon:'collection-play', label:'Videos'     },
  { to:'/admin/users',    icon:'people',          label:'Users'      },
  { to:'/admin/config',   icon:'sliders',         label:'Config'     },
  { to:'/admin/logs',     icon:'terminal',        label:'Logs'       },
  { to:'/admin/audit',    icon:'journal-text',    label:'Audit Log'  },
];

export default function AdminLayout() {
  const { user, logout } = useAuthStore();
  const nav = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function handleLogout() {
    const result = await Swal.fire({
      title:'Sign out?', icon:'question',
      showCancelButton:true, confirmButtonText:'Yes, sign out', cancelButtonText:'Stay', reverseButtons:true,
    });
    if (result.isConfirmed) logout();
  }

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <>
      {sidebarOpen && (
        <div onClick={closeSidebar}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', zIndex:99, backdropFilter:'blur(2px)' }}
        />
      )}

      <div style={{ display:'flex', height:'100vh', background:'var(--bg-deep)', color:'var(--text)' }}>
        <aside className="sidebar" style={{ transform: sidebarOpen ? 'translateX(0)' : undefined }}>
          <div className="sidebar-logo" style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:34, height:34, borderRadius:9, background:'linear-gradient(135deg,#ff4d8d,#ffb800)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 12px rgba(255,77,141,.4)', flexShrink:0 }}>
                <i className="bi bi-shield-shaded" style={{ fontSize:16, color:'#fff' }}></i>
              </div>
              <div>
                <div style={{ fontSize:17, fontWeight:800, background:'linear-gradient(135deg,#ff4d8d,#ffb800)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>StreamOS</div>
                <div style={{ fontSize:9, color:'var(--accent-2)', letterSpacing:2, textTransform:'uppercase', fontFamily:'JetBrains Mono,monospace' }}>Admin Console</div>
              </div>
            </div>
            <button onClick={closeSidebar} className="sidebar-close-btn"
              style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', padding:6, borderRadius:6, fontSize:18, lineHeight:1 }}>
              <i className="bi bi-x-lg"></i>
            </button>
          </div>

          <nav className="sidebar-nav">
            {items.map(({ to, icon, label, end }, i) => (
              <NavLink key={to} to={to} end={end}
                onClick={closeSidebar}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''} animate-slideInLeft delay-${Math.min(i+1,6)}`}>
                <i className={`bi bi-${icon}`} style={{ fontSize:15, flexShrink:0 }}></i>
                <span>{label}</span>
              </NavLink>
            ))}
            <hr className="divider" style={{ margin:'8px 12px' }} />
            <button onClick={() => { closeSidebar(); nav('/dashboard'); }}
              style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 18px', color:'var(--text-muted)', border:'none', background:'none', cursor:'pointer', fontSize:13, fontWeight:600, width:'100%', transition:'color .15s' }}
              onMouseEnter={e => (e.currentTarget.style.color='var(--text)')}
              onMouseLeave={e => (e.currentTarget.style.color='var(--text-muted)')}>
              <i className="bi bi-arrow-left-circle" style={{ fontSize:15 }}></i> User Area
            </button>
          </nav>

          <div style={{ padding:'12px 14px', borderTop:'1px solid var(--border)', display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:32, height:32, borderRadius:8, background:'linear-gradient(135deg,#ff4d8d,#ffb800)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:13, color:'#fff', flexShrink:0 }}>
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.username}</div>
              <div style={{ fontSize:10, color:'var(--accent-2)' }}>Administrator</div>
            </div>
            <button onClick={handleLogout} title="Sign out"
              style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', padding:6, borderRadius:6, transition:'color .15s' }}
              onMouseEnter={e => (e.currentTarget.style.color='var(--accent-err)')}
              onMouseLeave={e => (e.currentTarget.style.color='var(--text-muted)')}>
              <i className="bi bi-box-arrow-right" style={{ fontSize:15 }}></i>
            </button>
          </div>
        </aside>

        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          {/* Mobile top bar */}
          <div className="mobile-topbar">
            <button onClick={() => setSidebarOpen(true)}
              style={{ background:'none', border:'none', color:'var(--text)', cursor:'pointer', padding:'8px', borderRadius:8, fontSize:18, lineHeight:1 }}>
              <i className="bi bi-list"></i>
            </button>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:26, height:26, borderRadius:7, background:'linear-gradient(135deg,#ff4d8d,#ffb800)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <i className="bi bi-shield-shaded" style={{ fontSize:13, color:'#fff' }}></i>
              </div>
              <span style={{ fontSize:15, fontWeight:800, background:'linear-gradient(135deg,#ff4d8d,#ffb800)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Admin</span>
            </div>
            <div style={{ width:34 }} />
          </div>

          <main style={{ flex:1, overflow:'auto', padding:'28px 30px' }} className="main-content">
            <Outlet />
          </main>
        </div>
      </div>
    </>
  );
}
