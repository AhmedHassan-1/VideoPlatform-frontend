import React from 'react';
// VideoDetail.tsx — Fixed: React Query v5 refetchInterval, proper types

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Copy, Trash2, XCircle, Edit2, Check, X, RotateCcw } from 'lucide-react';
import { videosApi, embedApi, usersApi, videoExtApi } from '../../services/api';
import toast from 'react-hot-toast';

const STATUS_COLOR: Record<string, string> = {
  ready:'#2dffb4', processing:'#5d4fff', queued:'#ffb830',
  error:'#ff4444', uploading:'#6b6b80', cancelled:'#6b6b80',
};

const fmt = (b: number) => b>=1e9?(b/1e9).toFixed(1)+'GB':b>=1e6?(b/1e6).toFixed(0)+'MB':b+'B';
const fmtDur = (s: number) => { if(!s) return '—'; return `${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,'0')}`; };

function CopyBtn({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); toast.success('Copied!'); setTimeout(() => setCopied(false), 2000); }}
      style={{ display:'flex', alignItems:'center', gap:4, background:'none', border:'1px solid #22222e', borderRadius:4, color:'#6b6b80', padding:'4px 8px', fontSize:11, cursor:'pointer' }}>
      {copied ? <Check size={10} color="#2dffb4" /> : <Copy size={10} />} {label||'Copy'}
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
    // Polling only while video is still processing
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
    mutationFn: () => videoExtApi.retry(id!),
    onSuccess: () => { toast.success('Video requeued!'); qc.invalidateQueries({ queryKey: ['video', id] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Retry failed'),
  });

  const updateMut = useMutation({
    mutationFn: (title: string) => videosApi.update(id!, { title }),
    onSuccess: () => { toast.success('Title updated'); setEditing(false); qc.invalidateQueries({ queryKey: ['video', id] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

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

  const c: Record<string, React.CSSProperties> = {
    card:  { background:'#16161f', border:'1px solid #22222e', borderRadius:10, padding:20, marginBottom:16 },
    label: { fontSize:11, color:'#6b6b80', textTransform:'uppercase', letterSpacing:1, marginBottom:6, display:'block', fontFamily:'monospace' },
    mono:  { fontFamily:'monospace', fontSize:12, color:'#a0a0b8', wordBreak:'break-all' },
  };

  if (isLoading) return <div style={{ color:'#6b6b80', padding:40, textAlign:'center' }}>Loading…</div>;
  if (!video)    return <div style={{ color:'#ff4444', padding:40, textAlign:'center' }}>Video not found</div>;

  const hoursLeft = embedData ? Math.round((embedData.exp - Date.now()/1000) / 3600) : 0;

  return (
    <div style={{ maxWidth:760 }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
        <button onClick={() => nav('/videos')} style={{ background:'none', border:'1px solid #22222e', borderRadius:6, color:'#6b6b80', padding:'6px 10px', cursor:'pointer', display:'flex', alignItems:'center', gap:4, fontSize:12 }}>
          <ArrowLeft size={14} /> Back
        </button>
        <div style={{ flex:1 }}>
          {editing ? (
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)}
                style={{ background:'#111118', border:'1px solid #5d4fff', borderRadius:6, color:'#e8e8f0', padding:'6px 12px', fontSize:18, fontWeight:700, outline:'none', flex:1 }}
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') updateMut.mutate(newTitle); if (e.key === 'Escape') setEditing(false); }}
              />
              <button onClick={() => updateMut.mutate(newTitle)} style={{ background:'#5d4fff', border:'none', borderRadius:6, color:'#fff', padding:'6px 10px', cursor:'pointer' }}><Check size={14} /></button>
              <button onClick={() => setEditing(false)} style={{ background:'none', border:'1px solid #22222e', borderRadius:6, color:'#6b6b80', padding:'6px 10px', cursor:'pointer' }}><X size={14} /></button>
            </div>
          ) : (
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <h1 style={{ fontSize:22, fontWeight:800, margin:0 }}>{video.title}</h1>
              <button onClick={() => { setEditing(true); setNewTitle(video.title); }} style={{ background:'none', border:'none', color:'#6b6b80', cursor:'pointer', padding:4 }}>
                <Edit2 size={14} />
              </button>
            </div>
          )}
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {['queued','processing'].includes(video.status) && (
            <button onClick={() => cancelMut.mutate()} style={{ display:'flex', alignItems:'center', gap:4, background:'rgba(255,184,48,.1)', border:'1px solid rgba(255,184,48,.3)', borderRadius:6, color:'#ffb830', padding:'7px 12px', cursor:'pointer', fontSize:12, fontWeight:600 }}>
              <XCircle size={12} /> Cancel
            </button>
          )}
          {['error','uploaded','cancelled'].includes(video.status) && video.hasSourceFile && (
            <button onClick={() => retryMut.mutate()} style={{ display:'flex', alignItems:'center', gap:4, background:'rgba(93,79,255,.1)', border:'1px solid rgba(93,79,255,.3)', borderRadius:6, color:'#5d4fff', padding:'7px 12px', cursor:'pointer', fontSize:12, fontWeight:600 }}>
              <RotateCcw size={12} /> Retry
            </button>
          )}
          <button onClick={() => { if (confirm(`Delete "${video.title}"?`)) deleteMut.mutate(); }}
            style={{ display:'flex', alignItems:'center', gap:4, background:'rgba(255,68,68,.1)', border:'1px solid rgba(255,68,68,.3)', borderRadius:6, color:'#ff4444', padding:'7px 12px', cursor:'pointer', fontSize:12, fontWeight:600 }}>
            <Trash2 size={12} /> Delete
          </button>
        </div>
      </div>

      {/* Info */}
      <div style={{ display:'grid', gridTemplateColumns:'200px 1fr', gap:16, marginBottom:16 }}>
        <div style={{ aspectRatio:'16/9', background:'#22222e', borderRadius:8, overflow:'hidden' }}>
          {video.posterUrl
            ? <img src={video.posterUrl} alt={video.title} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'#6b6b80', fontSize:12 }}>No poster</div>
          }
        </div>
        <div style={c.card}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {[
              ['Status',         <span style={{ fontSize:12, fontFamily:'monospace', color:STATUS_COLOR[video.status]||'#6b6b80', background:`${STATUS_COLOR[video.status]||'#6b6b80'}20`, padding:'2px 8px', borderRadius:4 }}>{video.status}</span>],
              ['Queue',          video.queuePosition != null ? `#${video.queuePosition}` : '—'],
              ['File Size',      fmt(video.originalSizeBytes)],
              ['Duration',       fmtDur(video.durationSec)],
              ['Qualities',      video.qualities?.join(', ') || 'Auto'],
              ['Segment / Rot',  `${video.segmentDuration}s / ${video.keyRotationInterval||'off'}`],
            ].map(([label, val]) => (
              <div key={String(label)}>
                <span style={c.label}>{label}</span>
                <span style={c.mono}>{val as any}</span>
              </div>
            ))}
          </div>
          {video.status === 'processing' && (
            <div style={{ marginTop:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, fontFamily:'monospace', marginBottom:4 }}>
                <span style={{ color:'#6b6b80' }}>Encoding…</span>
                <span style={{ color:'#5d4fff' }}>{video.progress}%</span>
              </div>
              <div style={{ height:6, background:'#22222e', borderRadius:3 }}>
                <div style={{ height:'100%', width:`${video.progress}%`, background:'#5d4fff', borderRadius:3, transition:'width .5s' }} />
              </div>
            </div>
          )}
          {video.status === 'error' && video.errorMessage && (
            <div style={{ marginTop:12, padding:10, background:'rgba(255,68,68,.1)', borderRadius:6, color:'#ff4444', fontSize:12, fontFamily:'monospace' }}>
              ✗ {video.errorMessage}
            </div>
          )}
        </div>
      </div>

      {/* Embed */}
      {video.status === 'ready' && (
        <div style={c.card}>
          <div style={c.label}>Embed Video</div>
          <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
            <input value={watermark} onChange={e => setWatermark(e.target.value)}
              placeholder="Watermark text (optional)"
              style={{ flex:1, minWidth:200, background:'#111118', border:'1px solid #22222e', borderRadius:6, color:'#e8e8f0', padding:'8px 12px', fontSize:12, outline:'none' }}
            />
            <button onClick={generateEmbed} disabled={loadingEmbed}
              style={{ background:'#5d4fff', border:'none', borderRadius:6, color:'#fff', padding:'8px 16px', fontSize:12, fontWeight:600, cursor:'pointer', opacity:loadingEmbed?0.6:1 }}>
              {loadingEmbed ? 'Generating…' : 'Generate Embed'}
            </button>
          </div>

          {embedData && (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div style={{ padding:10, background:'rgba(255,184,48,.08)', border:'1px solid rgba(255,184,48,.2)', borderRadius:6, fontSize:12, color:'#ffb830' }}>
                ⏱ Token expires in ~{hoursLeft}h — the player auto-refreshes it
              </div>
              {[
                { label:'iframe URL',   value: embedData.iframeUrl },
                { label:'Embed Token',  value: embedData.embedToken },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                    <span style={c.label}>{label}</span>
                    <CopyBtn text={value} />
                  </div>
                  <div style={{ background:'#0a0a0f', borderRadius:6, padding:10, fontFamily:'monospace', fontSize:11, color:'#a0a0b8', wordBreak:'break-all' }}>{value}</div>
                </div>
              ))}
              <div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                  <span style={c.label}>HTML Code</span>
                  <CopyBtn text={`<iframe src="${embedData.iframeUrl}" allowfullscreen width="100%" height="500px"></iframe>`} />
                </div>
                <pre style={{ background:'#0a0a0f', borderRadius:6, padding:12, fontFamily:'monospace', fontSize:11, color:'#a0a0b8', overflow:'auto' }}>
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
        <div style={c.card}>
          <span style={c.label}>Job ID</span>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={c.mono}>{video.jobId}</span>
            <CopyBtn text={video.jobId} />
          </div>
        </div>
      )}
    </div>
  );
}
