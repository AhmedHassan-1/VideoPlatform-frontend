// src/pages/admin/AdminVideos.tsx — Updated:
//   - Fixed button styles (uniform, no mixed orange/red)
//   - Admin can generate embed token for any ready video
//   - Error detail viewer
//   - Purge HLS output from disk
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import api from '../../services/api';

declare const Swal: any;

const STATUS_COLOR: Record<string, string> = {
  ready: '#2dffb4', processing: '#5d4fff', queued: '#ffb830',
  error: '#ff4444', uploading: '#6b6b80', cancelled: '#6b6b80',
};

function fmtBytes(b: number): string {
  if (!b) return '0 B';
  const u = ['B','KB','MB','GB','TB'];
  const i = Math.floor(Math.log(b) / Math.log(1024));
  return (b / Math.pow(1024, i)).toFixed(1).replace(/\.0$/, '') + ' ' + u[i];
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' });
}

function ActionBtn({ onClick, title, color, icon, disabled }: {
  onClick: () => void; title: string; color: string; icon: string; disabled?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled} title={title} style={{
      background: `${color}12`, border: `1px solid ${color}35`, borderRadius: 5,
      color, padding: '5px 8px', cursor: disabled ? 'not-allowed' : 'pointer',
      fontSize: 12, opacity: disabled ? 0.4 : 1, transition: 'background .15s',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <i className={`bi bi-${icon}`} style={{ fontSize: 13 }}></i>
    </button>
  );
}

export default function AdminVideos() {
  const [page, setPage]               = useState(1);
  const [status, setStatus]           = useState('');
  const [errorDetail, setErrorDetail] = useState<{ videoId: string; detail: any } | null>(null);
  const [embedModal, setEmbedModal]   = useState<{ video: any; result: any } | null>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin','videos', page, status],
    queryFn:  () => adminApi.videos(page, 50, undefined, status || undefined).then(r => r.data),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => adminApi.deleteVideo(id),
    onSuccess: () => {
      Swal.fire({ icon:'success', title:'Video deleted', timer:1500, showConfirmButton:false });
      qc.invalidateQueries({ queryKey:['admin','videos'] });
    },
    onError: (e: any) => Swal.fire({ icon:'error', title:'Delete failed', text:e.response?.data?.message }),
  });

  const purgeMut = useMutation({
    mutationFn: (id: string) => adminApi.purgeVideoOutput(id),
    onSuccess: (r: any) => {
      Swal.fire({ icon:r.data?.ok?'success':'warning', title:r.data?.message||'Done', timer:2500, showConfirmButton:false });
      qc.invalidateQueries({ queryKey:['admin','videos'] });
    },
    onError: (e: any) => Swal.fire({ icon:'error', title:'Purge failed', text:e.response?.data?.message }),
  });

  async function handleDelete(v: any) {
    const r = await Swal.fire({ title:`Delete "${v.title}"?`, icon:'warning', showCancelButton:true, confirmButtonText:'Delete', confirmButtonColor:'#ff4757', reverseButtons:true });
    if (r.isConfirmed) deleteMut.mutate(v.id);
  }

  async function handlePurge(v: any) {
    const r = await Swal.fire({
      title:'Purge HLS output from disk?',
      html:`<div style="font-size:13px;color:#a0a0b8">Encoded files for <strong>${v.title}</strong> will be deleted from disk.<br>Video record stays in DB but won't be playable.</div>`,
      icon:'warning', showCancelButton:true, confirmButtonText:'Purge', confirmButtonColor:'#ff9100', reverseButtons:true,
    });
    if (r.isConfirmed) purgeMut.mutate(v.id);
  }

  async function showErrorDetail(v: any) {
    try {
      const r = await adminApi.videoErrorDetail(v.id);
      setErrorDetail({ videoId: v.id, detail: r.data });
    } catch { Swal.fire({ icon:'error', title:'Could not fetch error detail' }); }
  }

  async function generateEmbedToken(v: any) {
    try {
      const userRes = await adminApi.getUser(v.userId);
      const apiToken = userRes.data?.apiToken;
      if (!apiToken) throw new Error('Could not retrieve user API token');
      const { data: embedData } = await api.post('/api/embed', { apiToken, videoId: v.id, watermark:'' });
      setEmbedModal({ video: v, result: embedData });
    } catch (e: any) {
      Swal.fire({ icon:'error', title:'Token generation failed', text: e.response?.data?.message || e.message });
    }
  }

  const totalPages = Math.ceil((data?.total || 0) / 50);

  const th: React.CSSProperties = { padding:'10px 14px', fontSize:10, textTransform:'uppercase', letterSpacing:1.5, color:'#6b6b80', fontFamily:'monospace', borderBottom:'1px solid #22222e', background:'#111118', textAlign:'left' };
  const td: React.CSSProperties = { padding:'10px 14px', fontSize:13, borderBottom:'1px solid #22222e', verticalAlign:'middle' };

  return (
    <div>
      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>All Videos</h1>
        <p style={{ color:'#6b6b80', fontSize:13 }}>{data?.total||0} videos total</p>
      </div>

      <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }}>
        {['','ready','processing','queued','error','uploading','cancelled'].map(s => (
          <button key={s} onClick={() => { setStatus(s); setPage(1); }}
            style={{ padding:'5px 12px', borderRadius:6, fontSize:12, fontWeight:600, cursor:'pointer', border:'1px solid', borderColor:status===s?'#5d4fff':'#22222e', background:status===s?'rgba(93,79,255,.15)':'none', color:status===s?'#8b85ff':'#6b6b80' }}>
            {s||'All'}
          </button>
        ))}
      </div>

      <div style={{ background:'#16161f', border:'1px solid #22222e', borderRadius:10, overflow:'hidden' }}>
        {isLoading ? (
          <div style={{ padding:40, textAlign:'center', color:'#6b6b80' }}>Loading…</div>
        ) : !data?.videos?.length ? (
          <div style={{ padding:48, textAlign:'center', color:'#6b6b80' }}>
            <i className="bi bi-film" style={{ fontSize:36, display:'block', marginBottom:10, opacity:.25 }}></i>
            No videos found
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>{['Title','User','Status','Size','Views','Created','Actions'].map(h=><th key={h} style={th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {data.videos.map((v: any) => (
                <tr key={v.id} style={{ opacity: v.isDeleted ? 0.4 : 1 }}>
                  <td style={td}>
                    <div style={{ maxWidth:220 }}>
                      <div style={{ fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'#e8e8f0' }}>{v.title}</div>
                      {v.outputDeletedAt && (
                        <div style={{ fontSize:10, color:'#ff9100', fontFamily:'monospace', marginTop:2 }}>
                          <i className="bi bi-hdd-x" style={{ marginRight:4 }}></i>Output purged
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ ...td, fontFamily:'monospace', fontSize:12, color:'#a0a0b8' }}>{v.username||'—'}</td>
                  <td style={td}>
                    <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                      <span style={{ fontSize:11, fontFamily:'monospace', color:STATUS_COLOR[v.status]||'#6b6b80', background:`${STATUS_COLOR[v.status]||'#6b6b80'}18`, padding:'2px 8px', borderRadius:4, display:'inline-block' }}>
                        {v.status}
                      </span>
                      {v.status==='processing' && v.progress>0 && (
                        <span style={{ fontSize:10, fontFamily:'monospace', color:'#5d4fff' }}>{v.progress}%</span>
                      )}
                    </div>
                  </td>
                  <td style={{ ...td, fontFamily:'monospace', fontSize:12 }}>{fmtBytes(v.originalSizeBytes)}</td>
                  <td style={{ ...td, fontFamily:'monospace', fontSize:12, color:'#a0a0b8' }}>{v.viewCount??0}</td>
                  <td style={{ ...td, fontFamily:'monospace', fontSize:11, color:'#6b6b80' }}>{fmtDate(v.createdAt)}</td>
                  <td style={td}>
                    <div style={{ display:'flex', gap:5 }}>
                      {v.status==='ready' && (
                        <ActionBtn onClick={() => generateEmbedToken(v)} title="Generate embed token" color="#8b85ff" icon="code-slash" />
                      )}
                      {v.status==='error' && (
                        <ActionBtn onClick={() => showErrorDetail(v)} title="View error detail" color="#ff4444" icon="bug" />
                      )}
                      {v.status==='ready' && !v.outputDeletedAt && (
                        <ActionBtn onClick={() => handlePurge(v)} title="Purge output from disk" color="#ff9100" icon="hdd-x" />
                      )}
                      <ActionBtn onClick={() => handleDelete(v)} title="Delete video" color="#ff4444" icon="trash" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div style={{ display:'flex', gap:8, marginTop:14, alignItems:'center' }}>
          <button disabled={page<=1} onClick={() => setPage(p=>p-1)} style={{ background:'none', border:'1px solid #22222e', borderRadius:6, color:'#6b6b80', padding:'5px 14px', cursor:'pointer' }}>← Prev</button>
          <span style={{ fontSize:12, fontFamily:'monospace', color:'#6b6b80' }}>{page} / {totalPages}</span>
          <button disabled={page>=totalPages} onClick={() => setPage(p=>p+1)} style={{ background:'none', border:'1px solid #22222e', borderRadius:6, color:'#6b6b80', padding:'5px 14px', cursor:'pointer' }}>Next →</button>
        </div>
      )}

      {/* Error Detail Modal */}
      {errorDetail && (
        <div onClick={() => setErrorDetail(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.8)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, backdropFilter:'blur(4px)' }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'#16161f', border:'1px solid #22222e', borderRadius:12, padding:24, width:680, maxHeight:'80vh', display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ fontSize:16, fontWeight:800, color:'#ff4444' }}><i className="bi bi-bug" style={{ marginRight:8 }}></i>Error Detail</div>
              <button onClick={() => setErrorDetail(null)} style={{ background:'none', border:'none', color:'#6b6b80', cursor:'pointer', fontSize:20 }}>×</button>
            </div>
            {errorDetail.detail?.errorMessage && (
              <div style={{ fontFamily:'monospace', fontSize:12, color:'#ff4444', background:'rgba(255,68,68,.06)', padding:'10px 14px', borderRadius:6, border:'1px solid rgba(255,68,68,.2)' }}>
                {errorDetail.detail.errorMessage}
              </div>
            )}
            {errorDetail.detail?.jobErrorDetail ? (
              <pre style={{ fontFamily:'JetBrains Mono,monospace', fontSize:11, lineHeight:1.7, color:'#c0c0d0', background:'#0a0a10', padding:14, borderRadius:8, overflow:'auto', maxHeight:340, margin:0, whiteSpace:'pre-wrap', wordBreak:'break-all' }}>
                {errorDetail.detail.jobErrorDetail}
              </pre>
            ) : (
              <div style={{ color:'#6b6b80', fontSize:13, fontStyle:'italic' }}>No detailed log available.</div>
            )}
            <div style={{ display:'flex', justifyContent:'flex-end' }}>
              <button onClick={() => setErrorDetail(null)} style={{ background:'#22222e', border:'none', borderRadius:6, color:'#a0a0b8', padding:'8px 20px', cursor:'pointer' }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Embed Token Modal */}
      {embedModal && (
        <div onClick={() => setEmbedModal(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.8)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, backdropFilter:'blur(4px)' }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'#16161f', border:'1px solid #22222e', borderRadius:12, padding:28, width:620, maxHeight:'85vh', overflow:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <div style={{ fontSize:16, fontWeight:800, color:'#8b85ff' }}><i className="bi bi-code-slash" style={{ marginRight:8 }}></i>Embed Token — {embedModal.video.title}</div>
              <button onClick={() => setEmbedModal(null)} style={{ background:'none', border:'none', color:'#6b6b80', cursor:'pointer', fontSize:20 }}>×</button>
            </div>
            {[
              { label:'iFrame URL', key:'iframeUrl', desc:'Use as <iframe src="..."> on your page' },
              { label:'Embed Token', key:'embedToken', desc:'Send as X-Embed-Token header with playback requests' },
            ].map(({ label, key, desc }) => (
              <div key={key} style={{ marginBottom:16 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                  <div>
                    <div style={{ fontSize:11, color:'#6b6b80', textTransform:'uppercase', letterSpacing:1 }}>{label}</div>
                    <div style={{ fontSize:11, color:'#4a4a60', marginTop:2 }}>{desc}</div>
                  </div>
                  <button onClick={() => {
                    navigator.clipboard.writeText((embedModal.result as any)[key]);
                    Swal.mixin({ toast:true, position:'top-end', showConfirmButton:false, timer:1500 }).fire({ icon:'success', title:'Copied!' });
                  }} style={{ background:'rgba(139,133,255,.1)', border:'1px solid rgba(139,133,255,.3)', borderRadius:6, color:'#8b85ff', padding:'5px 12px', cursor:'pointer', fontSize:12, flexShrink:0 }}>
                    <i className="bi bi-clipboard" style={{ marginRight:5 }}></i>Copy
                  </button>
                </div>
                <div style={{ background:'#0a0a10', border:'1px solid #22222e', borderRadius:8, padding:'10px 14px', fontFamily:'JetBrains Mono,monospace', fontSize:11, color:'#8b85ff', wordBreak:'break-all', lineHeight:1.7 }}>
                  {(embedModal.result as any)[key]}
                </div>
              </div>
            ))}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:8 }}>
              <div style={{ fontSize:11, color:'#4a4a60' }}>
                <i className="bi bi-clock" style={{ marginRight:5 }}></i>
                Expires: {embedModal.result.exp ? new Date(embedModal.result.exp*1000).toLocaleString('en-US') : '—'}
              </div>
              <button onClick={() => setEmbedModal(null)} style={{ background:'#22222e', border:'none', borderRadius:6, color:'#a0a0b8', padding:'8px 20px', cursor:'pointer' }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
