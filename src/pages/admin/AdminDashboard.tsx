// src/pages/admin/AdminDashboard.tsx — Redesigned
import { useQuery } from '@tanstack/react-query';
import { adminApi, adminSysApi } from '../../services/api';

const fmt  = (b: number) => b>=1e12?(b/1e12).toFixed(1)+'TB':b>=1e9?(b/1e9).toFixed(1)+'GB':b>=1e6?(b/1e6).toFixed(0)+'MB':b+'B';
const fmtUp = (s: number) => `${Math.floor(s/3600)}h ${Math.floor((s%3600)/60)}m`;

function StatCard({ val, label, color, icon, delay }: { val:any; label:string; color?:string; icon:string; delay:number }) {
  return (
    <div className={`stat-card animate-fadeInUp delay-${delay}`}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
        <div style={{ fontSize:30, fontWeight:800, fontFamily:'JetBrains Mono,monospace', color:color||'var(--text)', lineHeight:1 }}>{val??'—'}</div>
        <div className="icon-box" style={{ background:`${color||'#6c63ff'}18` }}>
          <i className={`bi bi-${icon}`} style={{ color:color||'var(--accent)', fontSize:16 }}></i>
        </div>
      </div>
      <div style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:1.2, fontWeight:700 }}>{label}</div>
    </div>
  );
}

function InfoRow({ label, value, accent }: { label:string; value:any; accent?:string }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
      <span style={{ fontSize:13, color:'var(--text-dim)' }}>{label}</span>
      <span style={{ fontSize:12, fontFamily:'JetBrains Mono,monospace', color:accent||'var(--text)', fontWeight:600 }}>{value}</span>
    </div>
  );
}

export default function AdminDashboard() {
  const { data: stats } = useQuery({ queryKey:['admin','stats'], queryFn:()=>adminApi.stats().then(r=>r.data), refetchInterval:15000 });
  const { data: disk  } = useQuery({ queryKey:['admin','disk'],  queryFn:()=>adminSysApi?adminSysApi.disk().then(r=>r.data):Promise.resolve(null), refetchInterval:60000 });
  const { data: queue } = useQuery({ queryKey:['admin','queue'], queryFn:()=>adminApi.queue().then(r=>r.data), refetchInterval:10000 });

  const proc   = stats?.processing;
  const procOk = proc?.status === 'ok';
  const qLen   = (queue as any[])?.length || 0;

  return (
    <div>
      <div className="animate-fadeInUp" style={{ marginBottom:26 }}>
        <h1 style={{ fontSize:24, fontWeight:800, marginBottom:4 }}>Admin Dashboard</h1>
        <p style={{ color:'var(--text-muted)', fontSize:14 }}>Platform overview · auto-refreshes every 15s</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:22 }}>
        <StatCard val={stats?.users?.active}   label="Active Users"  icon="people-fill"          color="#6c63ff" delay={1} />
        <StatCard val={stats?.videos?.ready}   label="Ready Videos"  icon="check-circle-fill"    color="#00e5b0" delay={2} />
        <StatCard val={(stats?.videos?.queued??0)+(stats?.videos?.processing??0)} label="In Queue" icon="hourglass-split" color="#ffb800" delay={3} />
        <StatCard val={stats?.videos?.errors}  label="Errors"        icon="exclamation-triangle-fill" color={(stats?.videos?.errors??0)>0?'#ff4757':'#00e5b0'} delay={4} />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18, marginBottom:18 }}>
        {/* Processing Server */}
        <div className="s-card animate-fadeInUp delay-3" style={{ padding:22 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
            <div className="icon-box" style={{ background: procOk?'rgba(0,229,176,.15)':'rgba(255,71,87,.15)' }}>
              <i className="bi bi-cpu-fill" style={{ color: procOk?'var(--accent-3)':'var(--accent-err)', fontSize:16 }}></i>
            </div>
            <div>
              <div style={{ fontSize:14, fontWeight:700 }}>Processing Server</div>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:2 }}>
                <span style={{ width:7, height:7, borderRadius:'50%', background: procOk?'var(--accent-3)':'var(--accent-err)', display:'inline-block' }} />
                <span style={{ fontSize:12, fontWeight:600, color: procOk?'var(--accent-3)':'var(--accent-err)' }}>{procOk?'Online':'Offline'}</span>
              </div>
            </div>
          </div>
          {proc ? (
            <>
              <InfoRow label="Version"    value={proc.version||'—'} />
              <InfoRow label="Uptime"     value={proc.uptime?fmtUp(proc.uptime):'—'} />
              <InfoRow label="Workers"    value={`${proc.activeWorkers??0} / ${proc.maxWorkers??0}`} accent="var(--accent)" />
              <InfoRow label="Queue"      value={proc.queueLength??0} accent={qLen>0?'var(--accent-warn)':'var(--accent-3)'} />
              <InfoRow label="CPU"        value={proc.cpu?`${proc.cpu}%`:'—'} accent={proc.cpu>80?'var(--accent-err)':undefined} />
              <InfoRow label="Memory"     value={proc.memory?`${proc.memory}%`:'—'} />
            </>
          ) : (
            <div>{[1,2,3,4].map(i=><div key={i} className="skeleton" style={{ height:14, marginBottom:12, width:`${80-i*10}%` }} />)}</div>
          )}
        </div>

        {/* Disk Usage */}
        <div className="s-card animate-fadeInUp delay-4" style={{ padding:22 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
            <div className="icon-box" style={{ background:'rgba(108,99,255,.15)' }}>
              <i className="bi bi-hdd-stack-fill" style={{ color:'var(--accent)', fontSize:16 }}></i>
            </div>
            <div>
              <div style={{ fontSize:14, fontWeight:700 }}>Disk Usage</div>
              <div style={{ fontSize:11, color:'var(--text-muted)' }}>Storage overview</div>
            </div>
          </div>
          {disk ? (
            <>
              {(Object.entries(disk) as any[]).slice(0,4).map(([path, info]: [string,any]) => {
                const pct = Math.round((info.used/info.total)*100)||0;
                return (
                  <div key={path} style={{ marginBottom:14 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5, fontSize:12 }}>
                      <span className="mono" style={{ color:'var(--text-dim)', fontSize:11 }}>{path}</span>
                      <span className="mono" style={{ color: pct>90?'var(--accent-err)':pct>70?'var(--accent-warn)':'var(--accent-3)', fontWeight:700 }}>{pct}%</span>
                    </div>
                    <div className="s-progress">
                      <div className="s-progress-bar" style={{ width:`${pct}%`, background: pct>90?'var(--accent-err)':pct>70?'var(--accent-warn)':'var(--accent)' }} />
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--text-muted)', marginTop:3, fontFamily:'JetBrains Mono,monospace' }}>
                      <span>{fmt(info.used)}</span><span>{fmt(info.total)}</span>
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
            <div>{[1,2,3].map(i=><div key={i} style={{ marginBottom:14 }}><div className="skeleton" style={{ height:8 }} /></div>)}</div>
          )}
        </div>
      </div>

      {/* Live Queue */}
      <div className="s-card animate-fadeInUp delay-5" style={{ padding:22 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div className="icon-box" style={{ background:'rgba(255,184,0,.15)' }}>
              <i className="bi bi-list-task" style={{ color:'var(--accent-warn)', fontSize:16 }}></i>
            </div>
            <div>
              <div style={{ fontSize:14, fontWeight:700 }}>Processing Queue</div>
              <div style={{ fontSize:11, color:'var(--text-muted)' }}>{qLen} job{qLen!==1?'s':''} active</div>
            </div>
          </div>
          {qLen > 0 && <span className="s-badge badge-queued animate-bounceIn">{qLen} active</span>}
        </div>

        {(queue as any[])?.length ? (
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {(queue as any[]).slice(0,8).map((item:any, i:number) => (
              <div key={item.videoId} className={`animate-fadeInUp delay-${Math.min(i+1,6)}`}
                style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:'var(--bg-base)', borderRadius:8, border:'1px solid var(--border)' }}>
                <span className="mono" style={{ fontSize:11, color: item.status==='processing'?'var(--accent)':'var(--text-muted)', width:28, flexShrink:0 }}>
                  {item.status==='processing'
                    ? <i className="bi bi-arrow-repeat" style={{ animation:'spin 1s linear infinite', display:'inline-block' }}></i>
                    : `#${item.queuePosition}`}
                </span>
                <span style={{ flex:1, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'var(--text-dim)', fontWeight:500 }}>{item.title}</span>
                <span style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'JetBrains Mono,monospace' }}>{item.username}</span>
                {item.status==='processing' && (
                  <div style={{ width:80 }}>
                    <div style={{ display:'flex', justifyContent:'flex-end', fontSize:10, fontFamily:'JetBrains Mono,monospace', color:'var(--accent)', marginBottom:3 }}>{item.progress}%</div>
                    <div className="s-progress" style={{ height:3 }}>
                      <div className="s-progress-bar" style={{ width:`${item.progress||0}%` }} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'24px 0', color:'var(--text-muted)' }}>
            <i className="bi bi-check2-all" style={{ fontSize:32, color:'var(--accent-3)', marginBottom:10 }}></i>
            <span style={{ fontSize:14, fontWeight:600 }}>Queue is empty</span>
            <span style={{ fontSize:12, marginTop:4 }}>All videos have been processed</span>
          </div>
        )}
      </div>
    </div>
  );
}
