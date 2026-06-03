// src/pages/dashboard/DashboardPage.tsx — Redesigned
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { videosApi, usersApi } from '../../services/api';
import { useAuthStore } from '../../stores/auth.store';

const STATUS_COLORS: Record<string, string> = {
  ready:'#00e5b0', processing:'#6c63ff', queued:'#ffb800',
  error:'#ff4757', uploading:'#5a5a80', cancelled:'#5a5a80',
};
const STATUS_ICONS: Record<string, string> = {
  ready:'check-circle-fill', processing:'arrow-repeat', queued:'clock',
  error:'exclamation-triangle-fill', uploading:'upload', cancelled:'x-circle',
};

const fmt = (b: number) => b >= 1e9 ? (b/1e9).toFixed(1)+'GB' : b >= 1e6 ? (b/1e6).toFixed(0)+'MB' : b+'B';

function StatCard({ val, label, color, icon, delay }: { val:any; label:string; color?:string; icon:string; delay:number }) {
  return (
    <div className={`stat-card animate-fadeInUp delay-${delay}`}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
        <div style={{ fontSize:32, fontWeight:800, fontFamily:'JetBrains Mono,monospace', color: color||'var(--text)', lineHeight:1 }}>{val}</div>
        <div className="icon-box" style={{ background:`${color||'#6c63ff'}18` }}>
          <i className={`bi bi-${icon}`} style={{ color: color||'var(--accent)', fontSize:17 }}></i>
        </div>
      </div>
      <div style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:1.2, fontWeight:700 }}>{label}</div>
    </div>
  );
}

function TimeAgo({ date }: { date: string }) {
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hrs  = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0)  return <>{days}d ago</>;
  if (hrs > 0)   return <>{hrs}h ago</>;
  if (mins > 0)  return <>{mins}m ago</>;
  return <>Just now</>;
}

export default function DashboardPage() {
  const user = useAuthStore(s => s.user);
  const nav  = useNavigate();

  const { data: videosData } = useQuery({ queryKey:['videos','list'], queryFn:() => videosApi.list(1,100).then(r=>r.data) });
  const { data: queue }      = useQuery({ queryKey:['videos','queue'], queryFn:() => videosApi.queue().then(r=>r.data), refetchInterval:10_000 });
  const { data: profile }    = useQuery({ queryKey:['me'], queryFn:() => usersApi.me().then(r=>r.data) });

  const vids    = (videosData?.videos || []) as any[];
  const ready   = vids.filter(v => v.status==='ready').length;
  const errors  = vids.filter(v => v.status==='error').length;
  const inQ     = (queue as any[])?.length || 0;
  const storage = profile?.storage;
  const pct     = storage?.unlimited ? 0 : Math.min(100, Math.round((storage?.used/storage?.limit)*100))||0;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div>
      {/* Header */}
      <div className="animate-fadeInUp" style={{ marginBottom:28 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <h1 style={{ fontSize:26, fontWeight:800, marginBottom:4 }}>
              {greeting}, <span className="text-gradient">{user?.username}</span> 👋
            </h1>
            <p style={{ color:'var(--text-muted)', fontSize:14 }}>Here's what's happening with your videos today.</p>
          </div>
          <button onClick={() => nav('/videos/upload')} className="s-btn s-btn-primary">
            <i className="bi bi-cloud-upload-fill"></i> Upload Video
          </button>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
        <StatCard val={vids.length} label="Total Videos"  icon="collection-play"      delay={1} />
        <StatCard val={ready}       label="Ready"          icon="check-circle-fill"    color="#00e5b0" delay={2} />
        <StatCard val={inQ}         label="In Queue"       icon="hourglass-split"      color={inQ>0?'#ffb800':'#00e5b0'} delay={3} />
        <StatCard val={errors}      label="Errors"         icon="exclamation-triangle-fill" color={errors>0?'#ff4757':'#00e5b0'} delay={4} />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18, marginBottom:18 }}>
        {/* Storage Card */}
        <div className="s-card animate-fadeInUp delay-3" style={{ padding:22 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
            <div className="icon-box" style={{ background:'rgba(108,99,255,.15)' }}>
              <i className="bi bi-hdd-fill" style={{ color:'var(--accent)', fontSize:16 }}></i>
            </div>
            <div>
              <div style={{ fontSize:14, fontWeight:700 }}>Storage</div>
              <div style={{ fontSize:11, color:'var(--text-muted)' }}>Disk usage</div>
            </div>
          </div>

          {storage ? (
            <>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                <span style={{ fontSize:22, fontWeight:800, fontFamily:'JetBrains Mono,monospace', color: pct>90?'var(--accent-err)':pct>70?'var(--accent-warn)':'var(--accent)' }}>{fmt(storage.used)}</span>
                <span style={{ fontSize:13, color:'var(--text-muted)', alignSelf:'flex-end', fontFamily:'JetBrains Mono,monospace' }}>/ {storage.unlimited?'∞':fmt(storage.limit)}</span>
              </div>
              <div className="s-progress" style={{ marginBottom:8 }}>
                <div className="s-progress-bar" style={{ width:`${pct}%`, background: pct>90?'var(--accent-err)':pct>70?'var(--accent-warn)':'var(--accent)' }} />
              </div>
              <div style={{ fontSize:12, color:'var(--text-muted)' }}>
                {storage.unlimited ? 'Unlimited storage' : `${pct}% used`}
              </div>
              {profile?.apiToken && (
                <div style={{ marginTop:16, padding:12, background:'var(--bg-base)', borderRadius:8, border:'1px solid var(--border)' }}>
                  <div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:1, fontWeight:700, marginBottom:5 }}>API Token</div>
                  <div style={{ fontSize:11, fontFamily:'JetBrains Mono,monospace', color:'var(--accent)', wordBreak:'break-all' }}>{profile.apiToken.slice(0,24)}…</div>
                </div>
              )}
            </>
          ) : (
            <div>
              {[80,60,40].map((w,i) => <div key={i} className="skeleton" style={{ height:14, width:`${w}%`, marginBottom:8 }} />)}
            </div>
          )}
        </div>

        {/* Queue Card */}
        <div className="s-card animate-fadeInUp delay-4" style={{ padding:22 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div className="icon-box" style={{ background:'rgba(255,184,0,.15)' }}>
                <i className="bi bi-hourglass-split" style={{ color:'var(--accent-warn)', fontSize:16 }}></i>
              </div>
              <div>
                <div style={{ fontSize:14, fontWeight:700 }}>Processing Queue</div>
                <div style={{ fontSize:11, color:'var(--text-muted)' }}>{inQ} item{inQ!==1?'s':''} pending</div>
              </div>
            </div>
            {inQ > 0 && (
              <span className="s-badge badge-queued animate-bounceIn">{inQ}</span>
            )}
          </div>

          {(queue as any[])?.length ? (
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {(queue as any[]).map((item:any) => (
                <div key={item.videoId} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', background:'var(--bg-base)', borderRadius:8, border:'1px solid var(--border)' }}>
                  <span style={{ fontSize:12, fontFamily:'JetBrains Mono,monospace', color: item.status==='processing'?'var(--accent)':'var(--text-muted)', width:22, flexShrink:0 }}>
                    {item.status==='processing' ? <i className="bi bi-arrow-repeat" style={{ animation:'spin 1s linear infinite', display:'inline-block' }}></i> : `#${item.queuePosition}`}
                  </span>
                  <span style={{ flex:1, fontSize:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'var(--text-dim)' }}>{item.title}</span>
                  {item.status==='processing' && (
                    <span style={{ fontSize:11, fontFamily:'JetBrains Mono,monospace', color:'var(--accent)', fontWeight:700 }}>{item.progress}%</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'20px 0', color:'var(--text-muted)' }}>
              <i className="bi bi-check2-all" style={{ fontSize:28, color:'var(--accent-3)', marginBottom:8 }}></i>
              <span style={{ fontSize:13 }}>Queue is empty</span>
            </div>
          )}
        </div>
      </div>

      {/* Recent Videos */}
      <div className="s-card animate-fadeInUp delay-5" style={{ padding:22 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div className="icon-box" style={{ background:'rgba(0,229,176,.15)' }}>
              <i className="bi bi-play-circle-fill" style={{ color:'var(--accent-3)', fontSize:16 }}></i>
            </div>
            <div>
              <div style={{ fontSize:14, fontWeight:700 }}>Recent Videos</div>
              <div style={{ fontSize:11, color:'var(--text-muted)' }}>{vids.length} total</div>
            </div>
          </div>
          <button onClick={() => nav('/videos')} className="s-btn s-btn-ghost s-btn-sm">
            View all <i className="bi bi-arrow-right"></i>
          </button>
        </div>

        {vids.length === 0 ? (
          <div style={{ textAlign:'center', padding:'32px 0', color:'var(--text-muted)' }}>
            <i className="bi bi-film" style={{ fontSize:36, display:'block', marginBottom:10, opacity:.4 }}></i>
            <div style={{ fontSize:14, marginBottom:8 }}>No videos yet</div>
            <button onClick={() => nav('/videos/upload')} className="s-btn s-btn-primary s-btn-sm">
              <i className="bi bi-cloud-upload"></i> Upload your first video
            </button>
          </div>
        ) : (
          <div>
            {vids.slice(0,6).map((v:any, i:number) => (
              <div key={v.id} onClick={() => nav(`/videos/${v.id}`)}
                className={`animate-fadeInUp delay-${Math.min(i+1,6)}`}
                style={{ display:'flex', alignItems:'center', gap:14, padding:'10px 0', borderBottom:'1px solid var(--border)', cursor:'pointer', transition:'padding .15s' }}
                onMouseEnter={e => (e.currentTarget.style.paddingLeft='6px')}
                onMouseLeave={e => (e.currentTarget.style.paddingLeft='0')}>
                <div style={{ width:52, height:32, background:'var(--bg-elevated)', borderRadius:6, overflow:'hidden', flexShrink:0, border:'1px solid var(--border)' }}>
                  {v.posterUrl ? <img src={v.posterUrl} alt={v.title} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> :
                    <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <i className="bi bi-film" style={{ fontSize:14, color:'var(--text-muted)' }}></i>
                    </div>}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'var(--text)' }}>{v.title}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'JetBrains Mono,monospace', marginTop:2 }}>
                    <TimeAgo date={v.createdAt} />
                  </div>
                </div>
                <span className={`s-badge badge-${v.status}`}>{v.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
