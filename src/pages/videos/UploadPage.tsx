// src/pages/videos/UploadPage.tsx — Redesigned
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUpload } from '../../hooks/useUpload';

declare const Swal: any;

const QUALITIES = ['2160p','1440p','1080p','720p','480p','360p','240p'];

export default function UploadPage() {
  const nav = useNavigate();
  const [title, setTitle]       = useState('');
  const [file, setFile]         = useState<File|null>(null);
  const [poster, setPoster]     = useState<File|null>(null);
  const [autoQ, setAutoQ]       = useState(true);
  const [selQ, setSelQ]         = useState<string[]>(['1080p','720p','480p']);
  const [segDur, setSegDur]     = useState(6);
  const [keyRot, setKeyRot]     = useState(0);
  const [dragging, setDragging] = useState(false);
  const fileRef   = useRef<HTMLInputElement>(null);
  const posterRef = useRef<HTMLInputElement>(null);
  const { uploading, progress, phase, error, upload, cancel } = useUpload();

  const fmtSize = (b: number) => b >= 1e9 ? (b/1e9).toFixed(1)+'GB' : (b/1e6).toFixed(0)+'MB';

  const phaseLabel: Record<string,string> = {
    init:'Initializing…', chunks:`Uploading…`, poster:'Uploading poster…',
    completing:'Finalizing…', done:'Upload complete! ✓', error:'Upload failed',
  };

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f?.type.startsWith('video/')) { setFile(f); if (!title) setTitle(f.name.replace(/\.[^.]+$/,'')); }
    else Swal.fire({ icon:'warning', title:'Invalid file', text:'Please drop a video file.' });
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) { setFile(f); if (!title) setTitle(f.name.replace(/\.[^.]+$/,'')); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !title.trim()) return;
    const videoId = await upload({
      file, title: title.trim(), poster,
      qualities: autoQ ? null : selQ,
      segmentDuration: segDur, keyRotationInterval: keyRot,
    });
    if (videoId) {
      await Swal.fire({ icon:'success', title:'Upload complete!', text:'Your video is now in the processing queue.', timer:2000, timerProgressBar:true, showConfirmButton:false });
      nav('/videos');
    }
  }

  async function handleCancel() {
    if (uploading) {
      const r = await Swal.fire({ title:'Cancel upload?', text:'Progress will be lost.', icon:'question', showCancelButton:true, confirmButtonText:'Yes, cancel', reverseButtons:true });
      if (r.isConfirmed) cancel();
    } else {
      nav(-1);
    }
  }

  return (
    <div style={{ maxWidth:680 }}>
      <div className="animate-fadeInUp" style={{ marginBottom:24 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:6 }}>
          <button onClick={() => nav(-1)} className="s-btn s-btn-ghost s-btn-sm" style={{ padding:'6px 10px' }}>
            <i className="bi bi-arrow-left"></i>
          </button>
          <h1 style={{ fontSize:24, fontWeight:800 }}>Upload Video</h1>
        </div>
        <p style={{ color:'var(--text-muted)', fontSize:14 }}>Upload a video file to start processing.</p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Drop zone */}
        <div className="animate-fadeInUp delay-1" style={{ marginBottom:18 }}>
          <div
            className={`dropzone${dragging ? ' drag-over' : ''}`}
            onClick={() => !file && fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            style={{ cursor: file ? 'default' : 'pointer' }}>

            {file ? (
              <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                <div style={{ width:48, height:48, borderRadius:10, background:'rgba(108,99,255,.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <i className="bi bi-film" style={{ fontSize:22, color:'var(--accent)' }}></i>
                </div>
                <div style={{ flex:1, textAlign:'left' }}>
                  <div style={{ fontSize:14, fontWeight:700, color:'var(--text)', marginBottom:3 }}>{file.name}</div>
                  <div style={{ fontSize:12, color:'var(--text-muted)', fontFamily:'JetBrains Mono,monospace' }}>{fmtSize(file.size)} · {file.type}</div>
                </div>
                {!uploading && (
                  <button type="button" onClick={e => { e.stopPropagation(); setFile(null); }} className="s-btn s-btn-ghost s-btn-sm" style={{ padding:'5px 9px' }}>
                    <i className="bi bi-x"></i>
                  </button>
                )}
              </div>
            ) : (
              <div>
                <div style={{ width:56, height:56, borderRadius:14, background:'rgba(108,99,255,.12)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}>
                  <i className="bi bi-cloud-arrow-up-fill" style={{ fontSize:26, color:'var(--accent)' }}></i>
                </div>
                <div style={{ fontSize:15, fontWeight:700, marginBottom:6 }}>Drop your video here</div>
                <div style={{ fontSize:13, color:'var(--text-muted)', marginBottom:14 }}>or click to browse files</div>
                <span className="s-btn s-btn-ghost s-btn-sm" style={{ pointerEvents:'none' }}>
                  <i className="bi bi-folder2-open"></i> Browse files
                </span>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="video/*" onChange={handleFile} style={{ display:'none' }} />
        </div>

        {/* Title */}
        <div className="s-card animate-fadeInUp delay-2" style={{ padding:'20px', marginBottom:14 }}>
          <div style={{ fontSize:13, fontWeight:700, marginBottom:14, display:'flex', alignItems:'center', gap:8, color:'var(--text-dim)' }}>
            <i className="bi bi-type" style={{ color:'var(--accent)' }}></i> Video Details
          </div>
          <label style={{ display:'block', fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:1, marginBottom:6, fontWeight:700 }}>Title *</label>
          <input className="s-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Enter video title" required style={{ marginBottom:14 }} />

          {/* Poster */}
          <label style={{ display:'block', fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:1, marginBottom:6, fontWeight:700 }}>Thumbnail (optional)</label>
          {poster ? (
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'var(--bg-base)', borderRadius:8, border:'1px solid var(--border)' }}>
              <i className="bi bi-image-fill" style={{ color:'var(--accent-3)', fontSize:16 }}></i>
              <span style={{ flex:1, fontSize:12, color:'var(--text-dim)' }}>{poster.name}</span>
              <button type="button" onClick={() => setPoster(null)} className="s-btn s-btn-ghost s-btn-sm" style={{ padding:'3px 8px' }}><i className="bi bi-x"></i></button>
            </div>
          ) : (
            <button type="button" onClick={() => posterRef.current?.click()} className="s-btn s-btn-ghost" style={{ width:'100%', justifyContent:'center', border:'1px dashed var(--border)' }}>
              <i className="bi bi-image"></i> Upload thumbnail
            </button>
          )}
          <input ref={posterRef} type="file" accept="image/*" onChange={e => setPoster(e.target.files?.[0]||null)} style={{ display:'none' }} />
        </div>

        {/* Encoding settings */}
        <div className="s-card animate-fadeInUp delay-3" style={{ padding:'20px', marginBottom:14 }}>
          <div style={{ fontSize:13, fontWeight:700, marginBottom:16, display:'flex', alignItems:'center', gap:8, color:'var(--text-dim)' }}>
            <i className="bi bi-sliders" style={{ color:'var(--accent)' }}></i> Encoding Settings
          </div>

          <div style={{ marginBottom:18 }}>
            <label style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:1, marginBottom:10, fontWeight:700, display:'block' }}>Quality</label>
            <div style={{ display:'flex', gap:16, marginBottom:12 }}>
              {[{v:true,l:'Auto (recommended)'},{v:false,l:'Custom'}].map(({v,l}) => (
                <label key={l} style={{ display:'flex', alignItems:'center', gap:7, cursor:'pointer', fontSize:13, fontWeight:500 }}>
                  <input type="radio" checked={autoQ===v} onChange={() => setAutoQ(v)} style={{ accentColor:'var(--accent)', width:14, height:14 }} /> {l}
                </label>
              ))}
            </div>
            {!autoQ && (
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {QUALITIES.map(q => (
                  <button type="button" key={q} onClick={() => setSelQ(prev => prev.includes(q)?prev.filter(x=>x!==q):[...prev,q])}
                    className="s-btn s-btn-sm"
                    style={{ background: selQ.includes(q)?'rgba(108,99,255,.18)':'var(--bg-elevated)', color: selQ.includes(q)?'var(--accent)':'var(--text-muted)', border:`1px solid ${selQ.includes(q)?'rgba(108,99,255,.4)':'var(--border)'}` }}>
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:1, marginBottom:8, fontWeight:700, display:'flex', justifyContent:'space-between' }}>
              Segment Duration <span className="mono" style={{ color:'var(--accent)', fontSize:12 }}>{segDur}s</span>
            </label>
            <input type="range" min={2} max={20} value={segDur} onChange={e => setSegDur(+e.target.value)}
              style={{ width:'100%', accentColor:'var(--accent)', height:4 }} />
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--text-muted)', marginTop:4 }}>
              <span>2s</span><span>20s</span>
            </div>
          </div>

          <div>
            <label style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:1, marginBottom:8, fontWeight:700, display:'flex', justifyContent:'space-between' }}>
              Key Rotation <span className="mono" style={{ color:'var(--accent)', fontSize:12 }}>{keyRot===0?'Off':`Every ${keyRot} segs`}</span>
            </label>
            <input type="range" min={0} max={50} value={keyRot} onChange={e => setKeyRot(+e.target.value)}
              style={{ width:'100%', accentColor:'var(--accent)', height:4 }} />
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--text-muted)', marginTop:4 }}>
              <span>Off</span><span>Every 50 segs</span>
            </div>
          </div>
        </div>

        {/* Upload progress */}
        {uploading && (
          <div className="s-card animate-bounceIn" style={{ padding:18, marginBottom:14, borderColor:'rgba(108,99,255,.3)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
              <span style={{ fontSize:13, fontWeight:600, display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ display:'inline-block', width:14, height:14, border:'2px solid rgba(108,99,255,.3)', borderTopColor:'var(--accent)', borderRadius:'50%', animation:'spin .7s linear infinite' }}></span>
                {phase==='chunks' ? `Uploading… ${progress}%` : phaseLabel[phase]||phase}
              </span>
              <span className="mono" style={{ fontSize:13, fontWeight:700, color:'var(--accent)' }}>{progress}%</span>
            </div>
            <div className="s-progress">
              <div className="s-progress-bar" style={{ width:`${progress}%`, background: phase==='error'?'var(--accent-err)':'var(--accent)', transition:'width .4s' }} />
            </div>
            {error && <div style={{ color:'var(--accent-err)', fontSize:12, marginTop:8, fontFamily:'JetBrains Mono,monospace' }}>{error}</div>}
          </div>
        )}

        {/* Actions */}
        <div className="animate-fadeInUp delay-4" style={{ display:'flex', gap:10 }}>
          <button type="button" onClick={handleCancel} className="s-btn s-btn-ghost">
            <i className="bi bi-x-circle"></i> {uploading ? 'Cancel Upload' : 'Cancel'}
          </button>
          {!uploading && (
            <button type="submit" disabled={!file || !title.trim()} className="s-btn s-btn-primary"
              style={{ opacity: (!file||!title.trim()) ? .5 : 1, cursor: (!file||!title.trim()) ? 'not-allowed' : 'pointer' }}>
              <i className="bi bi-cloud-upload-fill"></i> Upload Video
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
