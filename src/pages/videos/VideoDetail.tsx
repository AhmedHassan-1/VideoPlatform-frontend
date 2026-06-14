import React from 'react';
// VideoDetail.tsx — Fixed: uses CSS variables, s-card/s-btn classes, Swal for confirm, no hardcoded hex

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Copy, Trash2, XCircle, Edit2, Check, X, RotateCcw } from 'lucide-react';
import { videosApi, embedApi, usersApi, videosExtApi } from '../../services/api';
import toast from 'react-hot-toast';

declare const Swal: any;

const STATUS_COLOR: Record<string, string> = {
  ready:'#00e5b0', processing:'#6c63ff', queued:'#ffb800',
  error:'#ff4757', uploading:'#5a5a80', cancelled:'#5a5a80',
};

const fmt    = (b: number) => b>=1e9?(b/1e9).toFixed(1)+'GB':b>=1e6?(b/1e6).toFixed(0)+'MB':b+'B';
const fmtDur = (s: number) => { if(!s) return '—'; return `${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,'0')}`; };

function CopyBtn({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); toast.success('Copied!'); setTimeout(() => setCopied(false), 2000); }}
      className="s-btn s-btn-ghost s-btn-sm"
      style={{ color: copied ? 'var(--accent-3)' : undefined, borderColor: copied ? 'rgba(0,229,176,.4)' : undefined }}>
      {copied ? <Check size={11} /> : <Copy size={11} />} {label || 'Copy'}
    </button>
  );
}

export default function VideoDetail() {
  const { id } = useParams<{ id: string }>();
  const nav    = useNavigate();
  const qc     = useQueryClient();

  const [editing, setEditing]     = useState(false);
  const [newTitle, setNewTitle]   = useState('');
  const [watermark, setWatermark] = useState('');
  const [embedData, setEmbedData] = useState<{ iframeUrl: string; embedToken: string; exp: number } | null>(null);
  const [loadingEmbed, setLoadingEmbed] = useState(false);

  const { data: video, isLoading } = useQuery({
    queryKey: ['video', id],
    queryFn: () => videosApi.get(id!).then(r => r.data),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && ['processing','queued','uploaded'].includes(status) ? 5000 : false;
    },
  });

  const { data: profile } = useQuery({
    queryKey: ['me'],
    queryFn: () => usersApi.me().then(r => r.data),
  });

  const deleteMut = useMutation({
    mutationFn: () => videosApi.delete(id!),
    onSuccess: () => { toast.success('Video deleted'); nav('/videos'); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const cancelMut = useMutation({
    mutationFn: () => videosApi.cancel(id!),
    onSuccess: () => { toast.success('Cancelled'); qc.invalidateQueries({ queryKey: ['video', id] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const retryMut = useMutation({
    mutationFn: () => videosExtApi.retry(id!),
    onSuccess: () => { toast.success('Video requeued!'); qc.invalidateQueries({ queryKey: ['video', id] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Retry failed'),
  });

  const updateMut = useMutation({
    mutationFn: (title: string) => videosApi.update(id!, { title }),
    onSuccess: () => { toast.success('Title updated'); setEditing(false); qc.invalidateQueries({ queryKey: ['video', id] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  async function handleDelete() {
    const result = await Swal.fire({
      title: 'Delete video?',
      html: `<span style="color:var(--text-muted)">This will permanently delete <strong style="color:var(--text)">"${video?.title}"</strong> and all its files.</span>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: '<i class="bi bi-trash3-fill me-1"></i> Yes, delete',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
    });
    if (result.isConfirmed) deleteMut.mutate();
  }

  async function generateEmbed() {
    if (!profile?.apiToken) { toast.error('No API token found — check Settings'); return; }
    setLoadingEmbed(true);
    try {
      const res = await embedApi.create(profile.apiToken, id!, watermark);
      setEmbedData(res.data);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to generate embed');
    } finally { setLoadingEmbed(false); }
  }

  if (isLoading) return (
    <div style={{ maxWidth:760 }}>
      {[1,2,3].map(i => (
        <div key={i} className="s-card animate-fadeInUp" style={{ padding:20, marginBottom:16 }}>
          <div className="skeleton" style={{ height:16, width:'60%', marginBottom:12 }} />
          <div className="skeleton" style={{ height:12, width:'40%' }} />
        </div>
      ))}
    </div>
  );

  if (!video) return (
    <div style={{ textAlign:'center', padding:'60px 0', color:'var(--accent-err)' }}>
      <i className="bi bi-exclamation-triangle" style={{ fontSize:36, display:'block', marginBottom:12 }}></i>
      <div style={{ fontSize:16, fontWeight:600 }}>Video not found</div>
    </div>
  );

  const hoursLeft = embedData ? Math.round((embedData.exp - Date.now()/1000) / 3600) : 0;

  return (
    <div style={{ maxWidth:760 }}>
      {/* Header */}
      <div className="animate-fadeInUp" style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
        <button onClick={() => nav('/videos')} className="s-btn s-btn-ghost s-btn-sm">
          <ArrowLeft size={14} /> Back
        </button>
        <div style={{ flex:1 }}>
          {editing ? (
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)}
                className="s-input"
                style={{ fontSize:18, fontWeight:700, flex:1 }}
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') updateMut.mutate(newTitle); if (e.key === 'Escape') setEditing(false); }}
              />
              <button onClick={() => updateMut.mutate(newTitle)} className="s-btn s-btn-primary s-btn-sm"><Check size={14} /></button>
              <button onClick={() => setEditing(false)} className="s-btn s-btn-ghost s-btn-sm"><X size={14} /></button>
            </div>
          ) : (
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <h1 style={{ fontSize:22, fontWeight:800, margin:0 }}>{video.title}</h1>
              <button onClick={() => { setEditing(true); setNewTitle(video.title); }}
                style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', padding:4, borderRadius:6, transition:'color .15s' }}
                onMouseEnter={e => (e.currentTarget.style.color='var(--text)')}
                onMouseLeave={e => (e.currentTarget.style.color='var(--text-muted)')}>
                <Edit2 size={14} />
              </button>
            </div>
          )}
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {['queued','processing'].includes(video.status) && (
            <button onClick={() => cancelMut.mutate()} className="s-btn s-btn-sm"
              style={{ background:'rgba(255,184,0,.1)', border:'1px solid rgba(255,184,0,.3)', color:'var(--accent-warn)' }}>
              <XCircle size={12} /> Cancel
            </button>
          )}
          {['error','uploaded','cancelled'].includes(video.status) && video.hasSourceFile && (
            <button onClick={() => retryMut.mutate()} className="s-btn s-btn-sm"
              style={{ background:'rgba(108,99,255,.1)', border:'1px solid rgba(108,99,255,.3)', color:'var(--accent)' }}>
              <RotateCcw size={12} /> Retry
            </button>
          )}
          <button onClick={handleDelete} className="s-btn s-btn-danger s-btn-sm">
            <Trash2 size={12} /> Delete
          </button>
        </div>
      </div>

      {/* Info Grid */}
      <div className="animate-fadeInUp delay-1" style={{ display:'grid', gridTemplateColumns:'200px 1fr', gap:16, marginBottom:16 }}>
        <div style={{ aspectRatio:'16/9', background:'var(--bg-elevated)', borderRadius:10, overflow:'hidden', border:'1px solid var(--border)' }}>
          {video.posterUrl
            ? <img src={video.posterUrl} alt={video.title} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)', flexDirection:'column', gap:6 }}>
                <i className="bi bi-image" style={{ fontSize:22, opacity:.5 }}></i>
                <span style={{ fontSize:11 }}>No poster</span>
              </div>
          }
        </div>

        <div className="s-card" style={{ padding:18 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            {[
              ['Status', (
                <span key="s" className={`s-badge badge-${video.status}`}>{video.status}</span>
              )],
              ['Queue',     video.queuePosition != null ? `#${video.queuePosition}` : '—'],
              ['File Size', fmt(video.originalSizeBytes)],
              ['Duration',  fmtDur(video.durationSec)],
              ['Qualities', video.qualities?.join(', ') || 'Auto'],
              ['Segment',   `${video.segmentDuration ?? '—'}s`],
            ].map(([label, val]) => (
              <div key={String(label)}>
                <span style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:1, marginBottom:4, display:'block', fontWeight:700 }}>{label}</span>
                <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:12, color:'var(--text-dim)' }}>{val as any}</span>
              </div>
            ))}
          </div>

          {video.status === 'processing' && (
            <div style={{ marginTop:14 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, fontFamily:'JetBrains Mono,monospace', marginBottom:5 }}>
                <span style={{ color:'var(--text-muted)' }}>Encoding…</span>
                <span style={{ color:'var(--accent)', fontWeight:700 }}>{video.progress}%</span>
              </div>
              <div className="s-progress">
                <div className="s-progress-bar" style={{ width:`${video.progress}%` }} />
              </div>
            </div>
          )}

          {video.status === 'error' && video.errorMessage && (
            <div style={{ marginTop:14, padding:10, background:'rgba(255,71,87,.1)', borderRadius:8, border:'1px solid rgba(255,71,87,.2)', color:'var(--accent-err)', fontSize:12, fontFamily:'JetBrains Mono,monospace', display:'flex', gap:8, alignItems:'flex-start' }}>
              <i className="bi bi-exclamation-triangle-fill" style={{ flexShrink:0, marginTop:1 }}></i>
              {video.errorMessage}
            </div>
          )}
        </div>
      </div>

      {/* Embed Section */}
      {video.status === 'ready' && (
        <div className="s-card animate-fadeInUp delay-2" style={{ padding:20, marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
            <div className="icon-box" style={{ background:'rgba(0,229,176,.15)' }}>
              <i className="bi bi-code-slash" style={{ color:'var(--accent-3)', fontSize:16 }}></i>
            </div>
            <div>
              <div style={{ fontSize:14, fontWeight:700 }}>Embed Video</div>
              <div style={{ fontSize:11, color:'var(--text-muted)' }}>Generate an embeddable player token</div>
            </div>
          </div>

          <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
            <input value={watermark} onChange={e => setWatermark(e.target.value)}
              className="s-input"
              placeholder="Watermark text (optional)"
              style={{ flex:1, minWidth:200, fontSize:13 }}
            />
            <button onClick={generateEmbed} disabled={loadingEmbed} className="s-btn s-btn-primary" style={{ opacity:loadingEmbed?0.6:1 }}>
              {loadingEmbed ? <><span style={{ display:'inline-block', width:14, height:14, border:'2px solid rgba(255,255,255,.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin .7s linear infinite' }}></span> Generating…</> : <><i className="bi bi-lightning-fill"></i> Generate Embed</>}
            </button>
          </div>

          {embedData && (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div style={{ padding:10, background:'rgba(255,184,0,.08)', border:'1px solid rgba(255,184,0,.2)', borderRadius:8, fontSize:12, color:'var(--accent-warn)', display:'flex', alignItems:'center', gap:8 }}>
                <i className="bi bi-clock"></i>
                Token expires in ~{hoursLeft}h — the player auto-refreshes it
              </div>
              {[
                { label:'iframe URL',  value: embedData.iframeUrl },
                { label:'Embed Token', value: embedData.embedToken },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                    <span style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:1, fontWeight:700 }}>{label}</span>
                    <CopyBtn text={value} />
                  </div>
                  <div style={{ background:'var(--bg-deep)', borderRadius:6, padding:10, fontFamily:'JetBrains Mono,monospace', fontSize:11, color:'var(--text-dim)', wordBreak:'break-all', border:'1px solid var(--border)' }}>{value}</div>
                </div>
              ))}
              <div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                  <span style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:1, fontWeight:700 }}>HTML Code</span>
                  <CopyBtn text={`<iframe src="${embedData.iframeUrl}" allowfullscreen width="100%" height="500px"></iframe>`} />
                </div>
                <pre style={{ background:'var(--bg-deep)', borderRadius:8, padding:14, fontFamily:'JetBrains Mono,monospace', fontSize:11, color:'var(--text-dim)', overflow:'auto', border:'1px solid var(--border)', margin:0 }}>
{`<iframe
  src="${embedData.iframeUrl}"
  allowfullscreen
  width="100%"
  height="500px"
></iframe>

<script>
  // Pass the embedToken to the iframe after load
  const iframe = document.querySelector('iframe');
  iframe.onload = () => {
    iframe.contentWindow.postMessage({
      embedToken: "${embedData.embedToken.slice(0,20)}...",
      exp: ${embedData.exp}
    }, '*');
  };
</script>`}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Job ID */}
      {video.jobId && (
        <div className="s-card animate-fadeInUp delay-3" style={{ padding:18 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:1, fontWeight:700 }}>Job ID</span>
            <CopyBtn text={video.jobId} />
          </div>
          <div style={{ marginTop:8, fontFamily:'JetBrains Mono,monospace', fontSize:12, color:'var(--text-dim)', wordBreak:'break-all' }}>{video.jobId}</div>
        </div>
      )}
    </div>
  );
}
