import React from 'react';
// src/pages/admin/AdminConfig.tsx
import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { adminApi } from '../../services/api';
import toast from 'react-hot-toast';

export default function AdminConfig() {
  const [tab, setTab] = useState<'proc'|'main'>('proc');
  const [cfg, setCfg] = useState<Record<string,any>>({});

  const { data: serverCfg, isLoading } = useQuery({ queryKey:['admin','config','server'], queryFn:()=>adminApi.serverConfig().then(r=>r.data) });
  const { data: mainCfg }  = useQuery({ queryKey:['admin','config','main'],   queryFn:()=>adminApi.mainConfig().then(r=>r.data) });

  useEffect(() => { if (serverCfg) setCfg(serverCfg); }, [serverCfg]);

  const saveMut = useMutation({
    mutationFn: () => adminApi.updateServerConfig({ concurrency:+cfg.concurrency, defaultSegmentDuration:+cfg.defaultSegmentDuration, defaultKeyRotation:+cfg.defaultKeyRotation, maxRetries:+cfg.maxRetries, gpuEnabled:cfg.gpuEnabled, gpuType:cfg.gpuType }),
    onSuccess: () => toast.success('Config saved — applied immediately'),
    onError: (e: any) => toast.error(e.response?.data?.message||'Failed'),
  });

  const card: React.CSSProperties = { background:'#16161f', border:'1px solid #22222e', borderRadius:10, padding:24, marginBottom:16 };
  const label: React.CSSProperties = { fontSize:11, color:'#6b6b80', textTransform:'uppercase', letterSpacing:1, fontFamily:'monospace', marginBottom:4, display:'block' };
  const desc: React.CSSProperties  = { fontSize:11, color:'#4a4a5a', marginBottom:8 };
  const row: React.CSSProperties   = { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 0', borderBottom:'1px solid #22222e' };
  const numInput = (k: string, min=0, max=999) => (
    <input type="number" min={min} max={max} value={cfg[k]??''} onChange={e => setCfg((c: any) => ({...c,[k]:e.target.value}))}
      style={{ width:80, background:'#111118', border:'1px solid #22222e', borderRadius:6, color:'#e8e8f0', padding:'6px 8px', fontFamily:'monospace', fontSize:13, outline:'none', textAlign:'center' }} />
  );

  return (
    <div style={{ maxWidth:700 }}>
      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>Configuration</h1>
        <p style={{ color:'#6b6b80', fontSize:13 }}>Server settings — changes apply immediately without restart</p>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:'1px solid #22222e', marginBottom:20 }}>
        {(['proc','main'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding:'10px 20px', fontSize:13, fontWeight:600, cursor:'pointer', color:tab===t?'#5d4fff':'#6b6b80', background:'none', border:'none', borderBottom:`2px solid ${tab===t?'#5d4fff':'transparent'}` }}>
            {t==='proc'?'Processing Server':'Main Server'}
          </button>
        ))}
      </div>

      {tab === 'proc' && (
        isLoading ? <div style={{ padding:40, textAlign:'center', color:'#6b6b80' }}>Loading…</div> : (
          <div style={card}>
            <div style={{ ...row }}>
              <div><label style={label}>Concurrency</label><div style={desc}>Parallel encoding jobs (1–8). Increase only if CPU/RAM allows.</div></div>
              {numInput('concurrency', 1, 8)}
            </div>
            <div style={row}>
              <div><label style={label}>Default Segment Duration (s)</label><div style={desc}>HLS segment length in seconds (2–30).</div></div>
              {numInput('defaultSegmentDuration', 2, 30)}
            </div>
            <div style={row}>
              <div><label style={label}>Default Key Rotation</label><div style={desc}>0 = one key per video. N = rotate every N segments.</div></div>
              {numInput('defaultKeyRotation', 0, 1000)}
            </div>
            <div style={row}>
              <div><label style={label}>Max Retries (per quality)</label><div style={desc}>Times to retry a failed quality track (0–5).</div></div>
              {numInput('maxRetries', 0, 5)}
            </div>
            <div style={row}>
              <div><label style={label}>GPU Encoding</label><div style={desc}>Use hardware acceleration (NVENC/QSV/AMF).</div></div>
              <label style={{ position:'relative', width:40, height:22, cursor:'pointer', display:'block' }}>
                <input type="checkbox" checked={cfg.gpuEnabled??false} onChange={e => setCfg((c: any) => ({...c,gpuEnabled:e.target.checked}))} style={{ opacity:0, width:0, height:0 }} />
                <span style={{ position:'absolute', inset:0, background:cfg.gpuEnabled?'#5d4fff':'#22222e', borderRadius:11, transition:'.25s' }}>
                  <span style={{ position:'absolute', width:16, height:16, left:cfg.gpuEnabled?22:3, top:3, background:'#fff', borderRadius:'50%', transition:'.25s' }} />
                </span>
              </label>
            </div>
            <div style={{ ...row, borderBottom:'none' }}>
              <div><label style={label}>GPU Type</label><div style={desc}>auto, nvidia, intel, amd, cpu</div></div>
              <select value={cfg.gpuType||'auto'} onChange={e => setCfg((c: any) => ({...c,gpuType:e.target.value}))}
                style={{ background:'#111118', border:'1px solid #22222e', borderRadius:6, color:'#e8e8f0', padding:'6px 10px', fontSize:13, outline:'none' }}>
                {['auto','nvidia','intel','amd','cpu'].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>

            {/* Quality profiles table */}
            {serverCfg?.qualityProfiles && (
              <div style={{ marginTop:20, paddingTop:20, borderTop:'1px solid #22222e' }}>
                <div style={{ fontSize:11, color:'#6b6b80', textTransform:'uppercase', letterSpacing:2, fontFamily:'monospace', marginBottom:12 }}>Quality Profiles (read-only)</div>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead><tr>{['Label','Resolution','Video Bitrate','Audio Bitrate'].map(h=><th key={h} style={{ padding:'6px 8px', fontSize:10, textTransform:'uppercase', letterSpacing:1, color:'#6b6b80', fontFamily:'monospace', textAlign:'left', borderBottom:'1px solid #22222e' }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {serverCfg.qualityProfiles.map((p: any) => (
                      <tr key={p.label}>
                        {[p.label,p.resolution,p.videoBitrate,p.audioBitrate].map((v,i) => (
                          <td key={i} style={{ padding:'6px 8px', fontSize:12, fontFamily:'monospace', color:'#a0a0b8', borderBottom:'1px solid #22222e' }}>{v}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}
              style={{ marginTop:20, display:'flex', alignItems:'center', gap:6, background:'#5d4fff', border:'none', borderRadius:6, color:'#fff', padding:'9px 20px', fontSize:13, fontWeight:600, cursor:'pointer', opacity:saveMut.isPending?0.6:1 }}>
              <Save size={14} /> {saveMut.isPending?'Saving…':'Save Changes'}
            </button>
          </div>
        )
      )}

      {tab === 'main' && mainCfg && (
        <div style={card}>
          {[
            ['Base URL',           mainCfg.baseUrl||'—'],
            ['Processing Server',  mainCfg.mainServerUrl||'—'],
            ['Environment',        mainCfg.nodeEnv],
            ['Stream Token TTL',   `${mainCfg.streamTtlSec}s (${Math.round(mainCfg.streamTtlSec/3600)}h)`],
            ['IP Binding',         mainCfg.streamIpBinding?'Enabled':'Disabled'],
            ['Trust Proxy',        mainCfg.trustProxy?'Yes':'No'],
            ['CORS Origin',        mainCfg.corsOrigin||'*'],
          ].map(([k,v]) => (
            <div key={k} style={row}>
              <span style={{ fontSize:13, color:'#a0a0b8' }}>{k}</span>
              <span style={{ fontSize:12, fontFamily:'monospace', color:'#e8e8f0' }}>{v}</span>
            </div>
          ))}
          <div style={{ ...row, borderBottom:'none' }}></div>
          <div style={{ padding:12, background:'#111118', borderRadius:6, fontSize:12, color:'#6b6b80' }}>
            Main server settings are configured via environment variables (.env file). Restart required to apply changes.
          </div>
        </div>
      )}
    </div>
  );
}
