// src/pages/videos/UploadPage.tsx — Updated: optional multi-select quality picker
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUpload } from '../../hooks/useUpload';

declare const Swal: any;

const ALL_QUALITIES = ['2160p', '1440p', '1080p', '720p', '480p', '360p', '240p'];

export default function UploadPage() {
  const nav = useNavigate();
  const [title,      setTitle]      = useState('');
  const [file,       setFile]       = useState<File | null>(null);
  const [poster,     setPoster]     = useState<File | null>(null);
  const [dragging,   setDragging]   = useState(false);
  // null = auto (server decides), string[] = user-picked subset
  const [qualities,  setQualities]  = useState<string[] | null>(null);
  const [showQual,   setShowQual]   = useState(false);

  const fileRef   = useRef<HTMLInputElement>(null);
  const posterRef = useRef<HTMLInputElement>(null);
  const { uploading, progress, phase, error, upload, cancel } = useUpload();

  const fmtSize = (b: number) => b >= 1e9 ? (b / 1e9).toFixed(1) + 'GB' : (b / 1e6).toFixed(0) + 'MB';
  const phaseLabel: Record<string, string> = {
    init: 'Initializing…', chunks: 'Uploading…', poster: 'Uploading poster…',
    completing: 'Finalizing…', done: 'Upload complete! ✓', error: 'Upload failed',
  };

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f?.type.startsWith('video/')) { setFile(f); if (!title) setTitle(f.name.replace(/\.[^.]+$/, '')); }
    else Swal.fire({ icon: 'warning', title: 'Invalid file', text: 'Please drop a video file.' });
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) { setFile(f); if (!title) setTitle(f.name.replace(/\.[^.]+$/, '')); }
  }

  function toggleQuality(q: string) {
    const current = qualities ?? ALL_QUALITIES;
    if (current.includes(q)) {
      const next = current.filter(x => x !== q);
      setQualities(next.length === ALL_QUALITIES.length ? null : next);
    } else {
      const next = ALL_QUALITIES.filter(x => current.includes(x) || x === q);
      setQualities(next.length === ALL_QUALITIES.length ? null : next);
    }
  }

  function selectAll() { setQualities(null); }
  function selectNone() { setQualities([]); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !title.trim()) return;
    if (qualities !== null && qualities.length === 0) {
      Swal.fire({ icon: 'warning', title: 'No qualities selected', text: 'Select at least one quality or use Auto.' });
      return;
    }
    const videoId = await upload({
      file,
      title: title.trim(),
      poster,
      qualities: qualities ?? null,
    });
    if (videoId) {
      await Swal.fire({ icon: 'success', title: 'Upload complete!', text: 'Your video is now in the processing queue.', timer: 2000, timerProgressBar: true, showConfirmButton: false });
      nav('/videos');
    }
  }

  async function handleCancel() {
    if (uploading) {
      const r = await Swal.fire({ title: 'Cancel upload?', text: 'Progress will be lost.', icon: 'question', showCancelButton: true, confirmButtonText: 'Yes, cancel', reverseButtons: true });
      if (r.isConfirmed) cancel();
    } else {
      nav(-1);
    }
  }

  const isAuto = qualities === null;
  const selectedSet = new Set(qualities ?? ALL_QUALITIES);

  return (
    <div style={{ maxWidth: 680 }}>
      <div className="animate-fadeInUp" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <button onClick={() => nav(-1)} className="s-btn s-btn-ghost s-btn-sm" style={{ padding: '6px 10px' }}>
            <i className="bi bi-arrow-left"></i>
          </button>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>Upload Video</h1>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Upload a video file to start processing.</p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Drop zone */}
        <div className="animate-fadeInUp delay-1" style={{ marginBottom: 18 }}>
          <div
            className={`dropzone${dragging ? ' drag-over' : ''}`}
            onClick={() => !file && fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            style={{ cursor: file ? 'default' : 'pointer' }}>
            {file ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: 10, background: 'rgba(108,99,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className="bi bi-film" style={{ fontSize: 22, color: 'var(--accent)' }}></i>
                </div>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>{file.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono,monospace' }}>{fmtSize(file.size)} · {file.type}</div>
                </div>
                {!uploading && (
                  <button type="button" onClick={e => { e.stopPropagation(); setFile(null); }} className="s-btn s-btn-ghost s-btn-sm" style={{ padding: '5px 9px' }}>
                    <i className="bi bi-x"></i>
                  </button>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <div style={{ width: 56, height: 56, borderRadius: 14, background: 'rgba(108,99,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <i className="bi bi-cloud-arrow-up" style={{ fontSize: 26, color: 'var(--accent)' }}></i>
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Drop video here</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>or click to browse</div>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="video/*" onChange={handleFile} style={{ display: 'none' }} />
        </div>

        {/* Title + poster */}
        <div className="animate-fadeInUp delay-2 s-card" style={{ padding: 20, marginBottom: 16 }}>
          <div style={{ marginBottom: 14 }}>
            <label className="s-label">Title *</label>
            <input className="s-input" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Enter video title…" required maxLength={500} />
          </div>
          <div>
            <label className="s-label">Thumbnail <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
            {poster ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--bg-base)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <i className="bi bi-image" style={{ color: 'var(--accent)', fontSize: 16 }}></i>
                <span style={{ flex: 1, fontSize: 13, fontFamily: 'JetBrains Mono,monospace', color: 'var(--text-dim)' }}>{poster.name}</span>
                <button type="button" onClick={() => setPoster(null)} className="s-btn s-btn-ghost s-btn-sm" style={{ padding: '4px 8px' }}>
                  <i className="bi bi-x" style={{ fontSize: 12 }}></i>
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => posterRef.current?.click()}
                className="s-btn s-btn-ghost" style={{ width: '100%', justifyContent: 'center', gap: 8 }}>
                <i className="bi bi-image"></i> Choose thumbnail image
              </button>
            )}
            <input ref={posterRef} type="file" accept="image/*"
              onChange={e => { const f = e.target.files?.[0]; if (f) setPoster(f); }}
              style={{ display: 'none' }} />
          </div>
        </div>

        {/* Quality selection — optional */}
        <div className="animate-fadeInUp delay-3 s-card" style={{ padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showQual ? 14 : 0 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                <i className="bi bi-layers" style={{ marginRight: 7, color: 'var(--accent)' }}></i>
                Quality Selection
                {isAuto
                  ? <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>Auto (all qualities)</span>
                  : <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--accent)', fontWeight: 700 }}>Custom: {qualities!.join(', ')}</span>}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                Select specific quality levels to encode, or leave as auto to encode all.
              </div>
            </div>
            <button type="button"
              onClick={() => setShowQual(s => !s)}
              className="s-btn s-btn-ghost s-btn-sm"
              style={{ color: 'var(--accent)' }}>
              <i className={`bi bi-chevron-${showQual ? 'up' : 'down'}`}></i>
              {showQual ? 'Hide' : 'Customize'}
            </button>
          </div>

          {showQual && (
            <div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                <button type="button" onClick={selectAll} className="s-btn s-btn-ghost s-btn-sm" style={{ fontSize: 11 }}>
                  Select All
                </button>
                <button type="button" onClick={selectNone} className="s-btn s-btn-ghost s-btn-sm" style={{ fontSize: 11 }}>
                  Deselect All
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {ALL_QUALITIES.map(q => {
                  const checked = selectedSet.has(q);
                  return (
                    <button
                      key={q}
                      type="button"
                      onClick={() => toggleQuality(q)}
                      style={{
                        padding: '7px 16px', borderRadius: 8, border: `1.5px solid ${checked ? 'var(--accent)' : 'var(--border)'}`,
                        background: checked ? 'rgba(108,99,255,.12)' : 'var(--bg-base)',
                        color: checked ? 'var(--accent)' : 'var(--text-muted)',
                        fontWeight: checked ? 700 : 400, fontSize: 13, cursor: 'pointer',
                        transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 6,
                      }}>
                      {checked && <i className="bi bi-check2" style={{ fontSize: 12 }}></i>}
                      {q}
                    </button>
                  );
                })}
              </div>
              {qualities !== null && qualities.length === 0 && (
                <div style={{ marginTop: 10, fontSize: 12, color: 'var(--accent-err)' }}>
                  <i className="bi bi-exclamation-triangle" style={{ marginRight: 5 }}></i>
                  Select at least one quality to upload.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Progress */}
        {uploading && (
          <div className="s-card animate-fadeInUp" style={{ padding: 20, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{phaseLabel[phase] || phase}</span>
              <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono,monospace', color: 'var(--accent)' }}>{progress}%</span>
            </div>
            <div className="s-progress">
              <div className="s-progress-bar" style={{ width: `${progress}%`, transition: 'width .3s ease' }} />
            </div>
          </div>
        )}

        {error && (
          <div style={{ padding: '12px 16px', background: 'rgba(255,71,87,.08)', border: '1px solid rgba(255,71,87,.25)', borderRadius: 10, marginBottom: 16, fontSize: 13, color: 'var(--accent-err)' }}>
            <i className="bi bi-exclamation-circle" style={{ marginRight: 8 }}></i>{error}
          </div>
        )}

        <div className="animate-fadeInUp delay-4" style={{ display: 'flex', gap: 10 }}>
          <button type="submit"
            disabled={!file || !title.trim() || uploading || (qualities !== null && qualities.length === 0)}
            className="s-btn s-btn-primary" style={{ flex: 1 }}>
            {uploading
              ? <><span className="spinner-sm"></span> Uploading…</>
              : <><i className="bi bi-upload"></i> Upload Video</>}
          </button>
          <button type="button" onClick={handleCancel} className="s-btn s-btn-ghost">
            {uploading ? 'Cancel' : 'Back'}
          </button>
        </div>

        {/* No spinner for number inputs */}
        <style>{`input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}`}</style>
      </form>
    </div>
  );
}
