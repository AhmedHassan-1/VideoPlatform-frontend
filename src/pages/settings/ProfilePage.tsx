// src/pages/settings/ProfilePage.tsx — Fixed:
//   - Removed useQueryClient (was causing crash — imported but not in import list)
//   - fmtBytes fixed for zero/unlimited cases
//   - authApi imported properly
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { usersApi, authApi } from '../../services/api';
import { useAuthStore } from '../../stores/auth.store';

declare const Swal: any;

function fmtBytes(b: number): string {
  if (!b || b <= 0) return '0 B';
  const u = ['B','KB','MB','GB','TB'];
  const i = Math.floor(Math.log(b) / Math.log(1024));
  return (b / Math.pow(1024, i)).toFixed(1).replace(/\.0$/, '') + ' ' + u[i];
}

function fmtDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
}

function UsageBar({ used, limit, color = 'var(--accent)' }: { used: number; limit: number; color?: string }) {
  const pct = limit === 0 ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const barColor = pct > 90 ? 'var(--accent-err)' : pct > 70 ? 'var(--accent-warn)' : color;
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, fontFamily:'JetBrains Mono,monospace', marginBottom:5, color:'var(--text-muted)' }}>
        <span style={{ color:'var(--text)' }}>{fmtBytes(used)}</span>
        <span>{limit === 0 ? 'Unlimited' : fmtBytes(limit)}</span>
      </div>
      <div style={{ height:6, background:'var(--bg-base)', borderRadius:3, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${pct}%`, background:barColor, borderRadius:3, transition:'width .4s ease' }} />
      </div>
      {limit > 0 && (
        <div style={{ fontSize:10, color:pct>70?barColor:'var(--text-muted)', marginTop:4, textAlign:'right', fontFamily:'JetBrains Mono,monospace' }}>
          {pct}% used
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, sub, color }: { icon:string; label:string; value:string|number; sub?:string; color?:string }) {
  return (
    <div className="s-card" style={{ padding:'18px 20px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
        <div style={{ width:34, height:34, borderRadius:9, background:color?`${color}18`:'rgba(108,99,255,.12)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <i className={`bi bi-${icon}`} style={{ fontSize:17, color:color||'var(--accent)' }}></i>
        </div>
        <span style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:1.2, fontWeight:700 }}>{label}</span>
      </div>
      <div style={{ fontSize:26, fontWeight:800, fontFamily:'JetBrains Mono,monospace', color:color||'var(--text)', letterSpacing:-1 }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:3 }}>{sub}</div>}
    </div>
  );
}

export default function ProfilePage() {
  const user = useAuthStore(s => s.user);
  const [pwForm, setPwForm] = useState({ current:'', next:'', confirm:'' });
  const [showPw, setShowPw] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['users','me'],
    queryFn:  () => usersApi.me().then(r => r.data),
  });

  const changePwMut = useMutation({
    mutationFn: (d: { currentPassword: string; newPassword: string }) =>
      authApi.changePassword(d.currentPassword, d.newPassword),
    onSuccess: () => {
      Swal.fire({ icon:'success', title:'Password changed', timer:1800, showConfirmButton:false });
      setPwForm({ current:'', next:'', confirm:'' });
      setShowPw(false);
    },
    onError: (e: any) => Swal.fire({ icon:'error', title:'Failed', text:e.response?.data?.message||'Wrong password' }),
  });

  async function handleChangePassword() {
    if (!pwForm.current || !pwForm.next) return;
    if (pwForm.next !== pwForm.confirm) { Swal.fire({ icon:'warning', title:'Passwords do not match' }); return; }
    if (pwForm.next.length < 8) { Swal.fire({ icon:'warning', title:'Password too short', text:'Min 8 characters' }); return; }
    const r = await Swal.fire({ title:'Change password?', icon:'question', showCancelButton:true, confirmButtonText:'Yes, change', reverseButtons:true });
    if (r.isConfirmed) changePwMut.mutate({ currentPassword: pwForm.current, newPassword: pwForm.next });
  }

  if (isLoading) return (
    <div style={{ maxWidth:760 }}>
      {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height:80, marginBottom:14, borderRadius:12 }} />)}
    </div>
  );

  const p         = profile as any;
  const storage   = p?.storage   || {};
  const bandwidth = p?.bandwidth  || {};

  return (
    <div style={{ maxWidth:760 }}>
      <div className="animate-fadeInUp" style={{ marginBottom:28 }}>
        <h1 style={{ fontSize:24, fontWeight:800, marginBottom:4 }}>Profile</h1>
        <p style={{ color:'var(--text-muted)', fontSize:14 }}>Your account overview and usage statistics</p>
      </div>

      {/* Identity card */}
      <div className="s-card animate-fadeInUp delay-1" style={{ padding:22, marginBottom:16, display:'flex', alignItems:'center', gap:18 }}>
        <div style={{ width:60, height:60, borderRadius:16, background:'linear-gradient(135deg,#6c63ff,#ff4d8d)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, fontWeight:900, color:'#fff', flexShrink:0 }}>
          {(p?.username?.[0] || user?.username?.[0] || '?').toUpperCase()}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:20, fontWeight:800, marginBottom:5 }}>{p?.username || user?.username}</div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
            <span className={`s-badge ${p?.role==='admin'?'badge-error':'badge-processing'}`}>{p?.role}</span>
            <span style={{ fontSize:12, color:'var(--text-muted)' }}>
              <i className="bi bi-calendar3" style={{ marginRight:4 }}></i>
              Member since {fmtDate(p?.createdAt)}
            </span>
            {p?.lastLoginAt && (
              <span style={{ fontSize:12, color:'var(--text-muted)' }}>
                <i className="bi bi-clock" style={{ marginRight:4 }}></i>
                Last login {fmtDate(p?.lastLoginAt)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="animate-fadeInUp delay-2" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(155px,1fr))', gap:12, marginBottom:16 }}>
        <StatCard icon="film"        label="Videos"    value={p?.videoCount ?? 0}               sub="uploaded" />
        <StatCard icon="eye"         label="Views"     value={p?.totalViews  ?? 0}               sub="all-time"  color="#2dffb4" />
        <StatCard icon="hdd"         label="Storage"   value={fmtBytes(storage.used||0)}         sub={storage.limit===0?'unlimited':`/ ${fmtBytes(storage.limit||0)}`}  color="#8b85ff" />
        <StatCard icon="speedometer" label="Bandwidth" value={bandwidth.unlimited?'∞':fmtBytes(bandwidth.used||0)} sub={bandwidth.unlimited?'no limit':`/ ${fmtBytes(bandwidth.limit||0)}`} color="#ffb830" />
      </div>

      {/* Storage */}
      <div className="s-card animate-fadeInUp delay-3" style={{ padding:22, marginBottom:12 }}>
        <div style={{ fontSize:13, fontWeight:700, marginBottom:16, display:'flex', alignItems:'center', gap:8 }}>
          <i className="bi bi-hdd" style={{ color:'var(--accent)' }}></i> Storage
          {storage.limit === 0 && <span className="s-badge badge-ready" style={{ fontSize:10 }}>Unlimited</span>}
        </div>
        {storage.limit === 0 ? (
          <div style={{ fontSize:12, color:'var(--text-muted)' }}>Used: <strong style={{ color:'var(--text)' }}>{fmtBytes(storage.used||0)}</strong> — no quota limit</div>
        ) : (
          <>
            <UsageBar used={storage.used||0} limit={storage.limit||0} color="#8b85ff" />
            <div style={{ marginTop:10 }}>
              <span style={{ fontSize:11, background:'rgba(139,133,255,.1)', color:'#8b85ff', padding:'3px 10px', borderRadius:20, fontFamily:'JetBrains Mono,monospace' }}>
                Available: {fmtBytes(Math.max(0,(storage.limit||0)-(storage.used||0)))}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Bandwidth */}
      <div className="s-card animate-fadeInUp delay-3" style={{ padding:22, marginBottom:16 }}>
        <div style={{ fontSize:13, fontWeight:700, marginBottom:bandwidth.unlimited?6:16, display:'flex', alignItems:'center', gap:8 }}>
          <i className="bi bi-speedometer" style={{ color:'var(--accent-warn)' }}></i> Bandwidth
          {bandwidth.unlimited && <span className="s-badge badge-ready" style={{ fontSize:10 }}>Unlimited</span>}
        </div>
        {bandwidth.unlimited ? (
          <div style={{ fontSize:12, color:'var(--text-muted)' }}>Used: <strong style={{ color:'var(--text)' }}>{fmtBytes(bandwidth.used||0)}</strong> — no bandwidth limit</div>
        ) : (
          <>
            <UsageBar used={bandwidth.used||0} limit={bandwidth.limit||0} color="#ffb830" />
            <div style={{ marginTop:10 }}>
              <span style={{ fontSize:11, background:'rgba(255,184,0,.1)', color:'var(--accent-warn)', padding:'3px 10px', borderRadius:20, fontFamily:'JetBrains Mono,monospace' }}>
                Available: {fmtBytes(Math.max(0,(bandwidth.limit||0)-(bandwidth.used||0)))}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Change Password */}
      <div className="s-card animate-fadeInUp delay-4" style={{ padding:22 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ fontSize:13, fontWeight:700, display:'flex', alignItems:'center', gap:8 }}>
            <i className="bi bi-shield-lock" style={{ color:'var(--accent)' }}></i> Change Password
          </div>
          <button onClick={() => setShowPw(s => !s)} className="s-btn s-btn-ghost s-btn-sm">
            <i className={`bi bi-chevron-${showPw?'up':'down'}`}></i> {showPw?'Hide':'Change'}
          </button>
        </div>

        {showPw && (
          <div style={{ marginTop:16, display:'flex', flexDirection:'column', gap:12 }}>
            {([
              { key:'current', label:'Current Password',     placeholder:'Enter current password' },
              { key:'next',    label:'New Password',         placeholder:'Min 8 characters' },
              { key:'confirm', label:'Confirm New Password', placeholder:'Repeat new password' },
            ] as const).map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="s-label">{label}</label>
                <input type="password" className="s-input"
                  value={pwForm[key]}
                  onChange={e => setPwForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder} />
              </div>
            ))}
            <button onClick={handleChangePassword} disabled={changePwMut.isPending}
              className="s-btn s-btn-primary" style={{ alignSelf:'flex-start' }}>
              {changePwMut.isPending
                ? <><span style={{ display:'inline-block', width:13, height:13, border:'2px solid rgba(255,255,255,.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin .7s linear infinite' }}></span> Saving…</>
                : <><i className="bi bi-check2-circle"></i> Update Password</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
