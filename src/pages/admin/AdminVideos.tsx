// src/pages/admin/AdminVideos.tsx — Updated:
//   - Error detail viewer (admin sees full ffmpeg stderr)
//   - Purge HLS output from disk button
//   - English numbers, no toast (SweetAlert2)
//   - outputDeletedAt shown in UI
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/api';

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
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function AdminVideos() {
  const [page,   setPage]   = useState(1);
  const [status, setStatus] = useState('');
  const [errorDetail, setErrorDetail] = useState<{ videoId: string; detail: any } | null>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'videos', page, status],
    queryFn: () => adminApi.videos(page, 50, undefined, status || undefined).then(r => r.data),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => adminApi.deleteVideo(id),
    onSuccess: () => {
      Swal.fire({ icon: 'success', title: 'Video deleted', timer: 1500, showConfirmButton: false });
      qc.invalidateQueries({ queryKey: ['admin', 'videos'] });
    },
    onError: (e: any) => Swal.fire({ icon: 'error', title: 'Delete failed', text: e.response?.data?.message || 'Failed' }),
  });

  const purgeMut = useMutation({
    mutationFn: (id: string) => adminApi.purgeVideoOutput(id),
    onSuccess: (r: any) => {
      const msg = r.data?.message || 'Output purged';
      Swal.fire({ icon: r.data?.ok ? 'success' : 'warning', title: msg, timer: 2500, showConfirmButton: false });
      qc.invalidateQueries({ queryKey: ['admin', 'videos'] });
    },
    onError: (e: any) => Swal.fire({ icon: 'error', title: 'Purge failed', text: e.response?.data?.message || 'Failed' }),
  });

  async function handleDelete(v: any) {
    const r = await Swal.fire({
      title: `Delete "${v.title}"?`,
      text: 'This will remove the video and all its data.',
      icon: 'warning', showCancelButton: true, confirmButtonText: 'Delete', confirmButtonColor: '#ff4757', reverseButtons: true,
    });
    if (r.isConfirmed) deleteMut.mutate(v.id);
  }

  async function handlePurge(v: any) {
    const r = await Swal.fire({
      title: 'Purge HLS output from disk?',
      html: `<div style="font-size:13px;color:#a0a0b8">This will delete the encoded HLS files for <strong>${v.title}</strong> from disk.<br>The video record in the database will be kept but the video will no longer be playable.</div>`,
      icon: 'warning', showCancelButton: true, confirmButtonText: 'Purge Output', confirmButtonColor: '#ff9100', reverseButtons: true,
    });
    if (r.isConfirmed) purgeMut.mutate(v.id);
  }

  async function showErrorDetail(v: any) {
    try {
      const r = await adminApi.videoErrorDetail(v.id);
      setErrorDetail({ videoId: v.id, detail: r.data });
    } catch {
      Swal.fire({ icon: 'error', title: 'Could not fetch error detail' });
    }
  }

  const th: React.CSSProperties = { padding: '8px 16px', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, color: '#6b6b80', fontFamily: 'monospace', borderBottom: '1px solid #22222e', background: '#111118', textAlign: 'left' };
  const td: React.CSSProperties = { padding: '10px 16px', fontSize: 13, borderBottom: '1px solid #22222e', verticalAlign: 'middle' };

  const totalPages = Math.ceil((data?.total || 0) / 50);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>All Videos</h1>
        <p style={{ color: '#6b6b80', fontSize: 13 }}>{data?.total || 0} videos total</p>
      </div>

      {/* Status filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {['', 'ready', 'processing', 'queued', 'error', 'uploading', 'cancelled'].map(s => (
          <button key={s} onClick={() => { setStatus(s); setPage(1); }}
            style={{ padding: '5px 12px', borderRadius: 5, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid', borderColor: status === s ? '#5d4fff' : '#22222e', background: status === s ? 'rgba(93,79,255,.15)' : 'none', color: status === s ? '#5d4fff' : '#6b6b80' }}>
            {s || 'All'}
          </button>
        ))}
      </div>

      <div style={{ background: '#16161f', border: '1px solid #22222e', borderRadius: 10, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b6b80' }}>Loading…</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>{['Title', 'User', 'Status', 'Size', 'Views', 'Created', 'Actions'].map(h => <th key={h} style={th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {data?.videos?.map((v: any) => (
                <tr key={v.id} style={{ opacity: v.isDeleted ? 0.5 : 1 }}>
                  <td style={td}>
                    <div style={{ maxWidth: 220 }}>
                      <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.title}</div>
                      {v.outputDeletedAt && (
                        <div style={{ fontSize: 10, color: '#ff9100', fontFamily: 'monospace', marginTop: 2 }}>
                          <i className="bi bi-hdd-x" style={{ marginRight: 4 }}></i>Output purged
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ ...td, fontFamily: 'monospace', fontSize: 12, color: '#a0a0b8' }}>{v.username || '—'}</td>
                  <td style={td}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span style={{ fontSize: 11, fontFamily: 'monospace', color: STATUS_COLOR[v.status] || '#6b6b80', background: `${STATUS_COLOR[v.status] || '#6b6b80'}20`, padding: '2px 8px', borderRadius: 4 }}>
                        {v.status}
                      </span>
                      {v.status === 'processing' && (
                        <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#6b6b80' }}>{v.progress}%</span>
                      )}
                    </div>
                  </td>
                  <td style={{ ...td, fontFamily: 'monospace', fontSize: 12 }}>{fmtBytes(v.originalSizeBytes)}</td>
                  <td style={{ ...td, fontFamily: 'monospace', fontSize: 12, color: '#a0a0b8' }}>{v.viewCount ?? 0}</td>
                  <td style={{ ...td, fontFamily: 'monospace', fontSize: 11, color: '#6b6b80' }}>{fmtDate(v.createdAt)}</td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {/* Error detail — only for error status */}
                      {(v.status === 'error' || v.jobErrorDetail) && (
                        <button onClick={() => showErrorDetail(v)}
                          title="View error detail"
                          style={{ background: 'rgba(255,68,68,.08)', border: '1px solid rgba(255,68,68,.3)', borderRadius: 4, color: '#ff4444', padding: '4px 8px', cursor: 'pointer', fontSize: 11 }}>
                          <i className="bi bi-bug"></i>
                        </button>
                      )}
                      {/* Purge output — for ready videos with output */}
                      {v.status === 'ready' && !v.outputDeletedAt && (
                        <button onClick={() => handlePurge(v)}
                          title="Purge HLS output from disk"
                          style={{ background: 'rgba(255,145,0,.08)', border: '1px solid rgba(255,145,0,.3)', borderRadius: 4, color: '#ff9100', padding: '4px 8px', cursor: 'pointer', fontSize: 11 }}>
                          <i className="bi bi-hdd-x"></i>
                        </button>
                      )}
                      {/* Delete */}
                      <button onClick={() => handleDelete(v)}
                        title="Delete video"
                        style={{ background: 'none', border: '1px solid rgba(255,68,68,.3)', borderRadius: 4, color: '#ff4444', padding: '4px 8px', cursor: 'pointer', fontSize: 11 }}>
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            style={{ background: 'none', border: '1px solid #22222e', borderRadius: 5, color: '#6b6b80', padding: '5px 12px', cursor: 'pointer' }}>
            Prev
          </button>
          <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#6b6b80' }}>{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
            style={{ background: 'none', border: '1px solid #22222e', borderRadius: 5, color: '#6b6b80', padding: '5px 12px', cursor: 'pointer' }}>
            Next
          </button>
        </div>
      )}

      {/* Error Detail Modal */}
      {errorDetail && (
        <div onClick={() => setErrorDetail(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#16161f', border: '1px solid #22222e', borderRadius: 12, padding: 24, width: 700, maxHeight: '80vh', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#ff4444' }}>
                <i className="bi bi-bug" style={{ marginRight: 8 }}></i>Job Error Detail
              </div>
              <button onClick={() => setErrorDetail(null)} style={{ background: 'none', border: 'none', color: '#6b6b80', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontFamily: 'monospace', background: 'rgba(255,68,68,.1)', color: '#ff4444', padding: '3px 8px', borderRadius: 4 }}>
                Status: {errorDetail.detail?.status}
              </span>
              {errorDetail.detail?.jobId && (
                <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#6b6b80', background: '#22222e', padding: '3px 8px', borderRadius: 4 }}>
                  Job: {errorDetail.detail.jobId}
                </span>
              )}
            </div>

            {errorDetail.detail?.errorMessage && (
              <div>
                <div style={{ fontSize: 11, color: '#6b6b80', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Summary</div>
                <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#ff4444', background: 'rgba(255,68,68,.06)', padding: '10px 14px', borderRadius: 6, border: '1px solid rgba(255,68,68,.2)' }}>
                  {errorDetail.detail.errorMessage}
                </div>
              </div>
            )}

            {errorDetail.detail?.jobErrorDetail ? (
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: '#6b6b80', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Full Error Log (FFmpeg output)</div>
                <pre style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, lineHeight: 1.7, color: '#c0c0d0', background: '#0a0a10', padding: '14px', borderRadius: 8, overflow: 'auto', maxHeight: 340, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {errorDetail.detail.jobErrorDetail}
                </pre>
              </div>
            ) : (
              <div style={{ color: '#6b6b80', fontSize: 13, fontStyle: 'italic' }}>No detailed error log available. This may occur if the error happened before FFmpeg started.</div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setErrorDetail(null)} style={{ background: '#22222e', border: 'none', borderRadius: 6, color: '#a0a0b8', padding: '8px 20px', cursor: 'pointer', fontSize: 13 }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
