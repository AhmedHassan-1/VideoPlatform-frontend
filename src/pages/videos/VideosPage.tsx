// src/pages/videos/VideosPage.tsx — Redesigned with Bootstrap + SweetAlert2
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { videosApi, videosExtApi } from '../../services/api';

declare const Swal: any;

const STATUS_COLORS: Record<string, string> = {
  ready:'#00e5b0', processing:'#6c63ff', queued:'#ffb800',
  error:'#ff4757', uploading:'#5a5a80', cancelled:'#5a5a80', uploaded:'#5a5a80',
};
const fmt    = (b: number) => !b?'—': b>=1e9?(b/1e9).toFixed(1)+'GB':b>=1e6?(b/1e6).toFixed(0)+'MB':b+'B';
const fmtDur = (s: number) => { if(!s) return '—'; return `${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,'0')}`; };

export default function VideosPage() {
  const [page, setPage]       = useState(1);
  const [status, setStatus]   = useState('');
  const [editing, setEditing] = useState<string|null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const nav = useNavigate();
  const qc  = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['videos', page, status],
    queryFn: () => videosApi.list(page, 20, status||undefined).then(r => r.data),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => videosApi.delete(id),
    onSuccess: () => { Swal.fire({ icon:'success', title:'Deleted', timer:1200, showConfirmButton:false, timerProgressBar:true }); qc.invalidateQueries({ queryKey:['videos'] }); },
    onError:   (e: any) => Swal.fire({ icon:'error', title:'Failed', text: e.response?.data?.message||'Delete failed' }),
  });

  const cancelMut = useMutation({
    mutationFn: (id: string) => videosApi.cancel(id),
    onSuccess: () => { Swal.fire({ icon:'info', title:'Cancelled', timer:1200, showConfirmButton:false }); qc.invalidateQueries({ queryKey:['videos'] }); },
    onError:   (e: any) => Swal.fire({ icon:'error', title:'Failed', text: e.response?.data?.message }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, title }: { id:string; title:string }) => videosApi.update(id, { title }),
    onSuccess: () => { setEditing(null); qc.invalidateQueries({ queryKey:['videos'] }); },
    onError:   (e: any) => Swal.fire({ icon:'error', title:'Update failed', text: e.response?.data?.message }),
  });

  const batchDeleteMut = useMutation({
    mutationFn: () => import('../../services/api').then(m => m.videosExtApi.batchDelete([...selected])),
    onSuccess: (res) => { Swal.fire({ icon:'success', title:`Deleted ${res.data.deleted} videos`, timer:1500, showConfirmButton:false }); setSelected(new Set()); qc.invalidateQueries({ queryKey:['videos'] }); },
    onError:   (e: any) => Swal.fire({ icon:'error', title:'Batch delete failed', text: e.response?.data?.message }),
  });

  async function handleDelete(id: string, title: string) {
    const result = await Swal.fire({
      title: 'Delete video?',
      html: `<span style="color:var(--text-muted)">This will permanently delete <strong style="color:var(--text)">"${title}"</strong> and all its files.</span>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: '<i class="bi bi-trash3-fill me-1"></i>Yes, delete',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
    });
    if (result.isConfirmed) deleteMut.mutate(id);
  }

  async function handleBatchDelete() {
    const result = await Swal.fire({
      title: `Delete ${selected.size} videos?`,
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete all',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
    });
    if (result.isConfirmed) batchDeleteMut.mutate();
  }

  async function downloadVideo(id: string, title: string) {
    try {
      const res = await import('../../services/api').then(m => m.videosExtApi.download(id));
      const blob = new Blob([res.data]);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `${title}.mp4`; a.click();
      URL.revokeObjectURL(url);
    } catch { Swal.fire({ icon:'error', title:'Download failed', text:'Source file may have been cleaned up.' }); }
  }

  const videos = (data?.videos || []) as any[];
  const total  = data?.total || 0;
  const pages  = Math.ceil(total / 20);
  const allSel = videos.length > 0 && videos.every((v:any) => selected.has(v.id));
  const toggleAll = () => {
    if (allSel) { const s = new Set(selected); videos.forEach((v:any) => s.delete(v.id)); setSelected(s); }
    else        { const s = new Set(selected); videos.forEach((v:any) => s.add(v.id));    setSelected(s); }
  };

  const statusOptions = ['','ready','processing','queued','error','uploading','cancelled'];

  return (
    <div>
      {/* Header */}
      <div className="animate-fadeInUp" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:800, marginBottom:4 }}>My Videos</h1>
          <p style={{ color:'var(--text-muted)', fontSize:14 }}>{total} video{total!==1?'s':''} total</p>
        </div>
        <button onClick={() => nav('/videos/upload')} className="s-btn s-btn-primary">
          <i className="bi bi-cloud-upload-fill"></i> Upload
        </button>
      </div>

      {/* Filters */}
      <div className="s-card animate-fadeInUp delay-1" style={{ padding:'14px 18px', marginBottom:16, display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {statusOptions.map(s => (
            <button key={s||'all'} onClick={() => { setStatus(s); setPage(1); }}
              className="s-btn s-btn-sm"
              style={{ background: status===s ? 'var(--accent)' : 'var(--bg-elevated)', color: status===s ? '#fff' : 'var(--text-muted)', border: status===s ? 'none' : '1px solid var(--border)' }}>
              {s || 'All'}
            </button>
          ))}
        </div>
        <div style={{ flex:1 }} />
        <span style={{ fontSize:13, color:'var(--text-muted)', fontFamily:'JetBrains Mono,monospace' }}>
          Page {page}/{pages||1}
        </span>
      </div>

      {/* Batch actions */}
      {selected.size > 0 && (
        <div className="animate-bounceIn" style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12, padding:'10px 16px', background:'rgba(108,99,255,.1)', border:'1px solid rgba(108,99,255,.3)', borderRadius:10 }}>
          <i className="bi bi-check2-square" style={{ color:'var(--accent)', fontSize:16 }}></i>
          <span style={{ fontSize:13, fontWeight:700, color:'var(--accent)' }}>{selected.size} selected</span>
          <button onClick={handleBatchDelete} className="s-btn s-btn-danger s-btn-sm"><i className="bi bi-trash3"></i> Delete All</button>
          <button onClick={() => setSelected(new Set())} className="s-btn s-btn-ghost s-btn-sm"><i className="bi bi-x"></i> Clear</button>
        </div>
      )}

      {/* Table */}
      <div className="s-card animate-fadeInUp delay-2" style={{ overflow:'hidden' }}>
        {isLoading ? (
          <div style={{ padding:40 }}>
            {[1,2,3,4,5].map(i => (
              <div key={i} style={{ display:'flex', gap:12, marginBottom:14, alignItems:'center' }}>
                <div className="skeleton" style={{ width:52, height:32, flexShrink:0 }} />
                <div className="skeleton" style={{ flex:1, height:14 }} />
                <div className="skeleton" style={{ width:80, height:22 }} />
                <div className="skeleton" style={{ width:60, height:14 }} />
              </div>
            ))}
          </div>
        ) : videos.length === 0 ? (
          <div style={{ padding:'50px', textAlign:'center', color:'var(--text-muted)' }}>
            <i className="bi bi-film" style={{ fontSize:40, display:'block', marginBottom:12, opacity:.35 }}></i>
            <div style={{ fontSize:15, fontWeight:600, marginBottom:8 }}>No videos found</div>
            <div style={{ fontSize:13, marginBottom:16 }}>{status ? `No videos with status "${status}"` : 'Upload your first video to get started'}</div>
            <button onClick={() => nav('/videos/upload')} className="s-btn s-btn-primary s-btn-sm">
              <i className="bi bi-cloud-upload"></i> Upload
            </button>
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table className="s-table">
              <thead>
                <tr>
                  <th style={{ width:40 }}>
                    <input type="checkbox" checked={allSel} onChange={toggleAll}
                      style={{ cursor:'pointer', accentColor:'var(--accent)', width:14, height:14 }} />
                  </th>
                  {['Thumbnail','Title','Status','Progress','Size','Duration','Views','Date','Actions'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {videos.map((v:any, i:number) => (
                  <tr key={v.id} className={`animate-fadeInUp delay-${Math.min(i+1,6)}`}
                    style={{ background: selected.has(v.id) ? 'rgba(108,99,255,.05)' : undefined }}>
                    <td>
                      <input type="checkbox" checked={selected.has(v.id)}
                        onChange={() => { const s = new Set(selected); s.has(v.id)?s.delete(v.id):s.add(v.id); setSelected(s); }}
                        style={{ cursor:'pointer', accentColor:'var(--accent)', width:14, height:14 }} />
                    </td>
                    <td>
                      <div style={{ width:52, height:32, background:'var(--bg-elevated)', borderRadius:6, overflow:'hidden', cursor:'pointer', border:'1px solid var(--border)' }}
                        onClick={() => nav(`/videos/${v.id}`)}>
                        {v.posterUrl ? <img src={v.posterUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> :
                          <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}><i className="bi bi-play-fill" style={{ fontSize:13, color:'var(--text-muted)' }}></i></div>}
                      </div>
                    </td>
                    <td>
                      {editing === v.id ? (
                        <div style={{ display:'flex', gap:5 }}>
                          <input value={newTitle} onChange={e => setNewTitle(e.target.value)} className="s-input"
                            style={{ padding:'4px 8px', fontSize:12, height:30 }} autoFocus
                            onKeyDown={e => { if(e.key==='Enter') updateMut.mutate({ id:v.id, title:newTitle }); if(e.key==='Escape') setEditing(null); }} />
                          <button onClick={() => updateMut.mutate({ id:v.id, title:newTitle })} className="s-btn s-btn-primary s-btn-sm" style={{ padding:'4px 9px' }}><i className="bi bi-check2"></i></button>
                          <button onClick={() => setEditing(null)} className="s-btn s-btn-ghost s-btn-sm" style={{ padding:'4px 9px' }}><i className="bi bi-x"></i></button>
                        </div>
                      ) : (
                        <div style={{ maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontWeight:600, cursor:'pointer', color:'var(--text)' }}
                          onClick={() => nav(`/videos/${v.id}`)}>
                          {v.title}
                        </div>
                      )}
                    </td>
                    <td><span className={`s-badge badge-${v.status||'uploading'}`}>{v.status}</span></td>
                    <td>
                      {v.status==='processing' ? (
                        <div style={{ width:72 }}>
                          <div style={{ fontSize:10, fontFamily:'JetBrains Mono,monospace', color:'var(--accent)', marginBottom:3 }}>{v.progress||0}%</div>
                          <div className="s-progress" style={{ height:4 }}>
                            <div className="s-progress-bar" style={{ width:`${v.progress||0}%` }} />
                          </div>
                        </div>
                      ) : v.status==='ready' ? <i className="bi bi-check-circle-fill" style={{ color:'var(--accent-3)', fontSize:13 }}></i> : <span style={{ color:'var(--text-muted)' }}>—</span>}
                    </td>
                    <td><span className="mono" style={{ fontSize:12, color:'var(--text-dim)' }}>{fmt(v.originalSizeBytes)}</span></td>
                    <td><span className="mono" style={{ fontSize:12, color:'var(--text-dim)' }}>{fmtDur(v.durationSec)}</span></td>
                    <td><span className="mono" style={{ fontSize:12, color:'var(--text-muted)' }}>{v.viewCount||0}</span></td>
                    <td><span className="mono" style={{ fontSize:11, color:'var(--text-muted)' }}>{new Date(v.createdAt).toLocaleDateString()}</span></td>
                    <td>
                      <div style={{ display:'flex', gap:4 }}>
                        <button title="View" onClick={() => nav(`/videos/${v.id}`)} className="s-btn s-btn-ghost s-btn-sm" style={{ padding:'5px 8px' }}><i className="bi bi-eye" style={{ fontSize:12 }}></i></button>
                        <button title="Edit" onClick={() => { setEditing(v.id); setNewTitle(v.title); }} className="s-btn s-btn-ghost s-btn-sm" style={{ padding:'5px 8px' }}><i className="bi bi-pencil" style={{ fontSize:12 }}></i></button>
                        {v.status==='ready' && (
                          <button title="Download" onClick={() => downloadVideo(v.id, v.title)} className="s-btn s-btn-sm" style={{ padding:'5px 8px', background:'rgba(0,229,176,.12)', border:'1px solid rgba(0,229,176,.3)', color:'var(--accent-3)' }}><i className="bi bi-download" style={{ fontSize:12 }}></i></button>
                        )}
                        {['queued','processing'].includes(v.status) && (
                          <button title="Cancel" onClick={() => cancelMut.mutate(v.id)} className="s-btn s-btn-sm" style={{ padding:'5px 8px', background:'rgba(255,184,0,.1)', border:'1px solid rgba(255,184,0,.3)', color:'var(--accent-warn)' }}><i className="bi bi-x-circle" style={{ fontSize:12 }}></i></button>
                        )}
                        <button title="Delete" onClick={() => handleDelete(v.id, v.title)} className="s-btn s-btn-sm" style={{ padding:'5px 8px', background:'rgba(255,71,87,.1)', border:'1px solid rgba(255,71,87,.3)', color:'var(--accent-err)' }}><i className="bi bi-trash3" style={{ fontSize:12 }}></i></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="animate-fadeIn" style={{ display:'flex', gap:8, marginTop:16, alignItems:'center', justifyContent:'center' }}>
          <button disabled={page<=1} onClick={() => setPage(p=>p-1)} className="s-btn s-btn-ghost s-btn-sm">
            <i className="bi bi-chevron-left"></i> Prev
          </button>
          {Array.from({ length: Math.min(pages, 7) }, (_,i) => i+1).map(p => (
            <button key={p} onClick={() => setPage(p)} className="s-btn s-btn-sm"
              style={{ background: p===page?'var(--accent)':'var(--bg-elevated)', color: p===page?'#fff':'var(--text-muted)', border: p===page?'none':'1px solid var(--border)', minWidth:34 }}>
              {p}
            </button>
          ))}
          <button disabled={page>=pages} onClick={() => setPage(p=>p+1)} className="s-btn s-btn-ghost s-btn-sm">
            Next <i className="bi bi-chevron-right"></i>
          </button>
        </div>
      )}
    </div>
  );
}
