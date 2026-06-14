// src/pages/admin/AdminLogs.tsx — Updated: static log viewer (live SSE removed)
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../services/api';

declare const Swal: any;

function colorLine(line: string): string {
  if (/\b(ERROR|FATAL|✗|failed|exception|traceback)\b/i.test(line)) return 'var(--accent-err)';
  if (/\b(WARN|WARNING)\b/i.test(line))                               return 'var(--accent-warn)';
  if (/\b(✓|done|ready|success|complete)\b/i.test(line))             return 'var(--accent-3)';
  if (/\b(start|process|encod|submit|queue)\b/i.test(line))          return '#8b85ff';
  if (/\b(DEBUG|debug)\b/.test(line))                                 return 'var(--text-muted)';
  return 'var(--text-dim)';
}

type LogMode = 'app' | 'encode';

export default function AdminLogs() {
  const [mode,   setMode]   = useState<LogMode>('app');
  const [jobId,  setJobId]  = useState('');
  const [lines,  setLines]  = useState(500);
  const [target, setTarget] = useState<{ mode: LogMode; jobId: string; lines: number } | null>(null);

  // Only fetch when user clicks "Load"
  const { data, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['admin', 'logs', target],
    queryFn: async () => {
      if (!target) return { lines: [] };
      if (target.mode === 'encode') {
        if (!target.jobId.trim()) return { lines: [] };
        const r = await adminApi.encodeLog(target.jobId.trim(), target.lines);
        return r.data;
      }
      const r = await adminApi.appLog(target.lines);
      return r.data;
    },
    enabled: target !== null,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logLines: string[] = data?.lines ?? [];

  function loadLog() {
    setTarget({ mode, jobId, lines });
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(logLines.join('\n')).then(() => {
      Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 })
        .fire({ icon: 'success', title: 'Copied to clipboard' });
    });
  }

  function downloadLog() {
    const blob = new Blob([logLines.join('\n')], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `${mode}${jobId ? '-' + jobId.slice(0, 8) : ''}-${Date.now()}.log`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)', gap: 12 }}>

      {/* Header */}
      <div className="animate-fadeInUp">
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 3 }}>Server Logs</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>View recent log entries from the server</p>
      </div>

      {/* Controls */}
      <div className="s-card animate-fadeInUp delay-1" style={{ padding: '12px 16px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>

        {/* Mode */}
        {(['app', 'encode'] as LogMode[]).map(m => (
          <button key={m} onClick={() => setMode(m)} className="s-btn s-btn-sm"
            style={{
              background: mode === m ? 'var(--accent)' : 'var(--bg-elevated)',
              color:      mode === m ? '#fff' : 'var(--text-muted)',
              border:     mode === m ? 'none' : '1px solid var(--border)',
            }}>
            <i className={`bi bi-${m === 'app' ? 'journal-text' : 'film'}`}></i>
            {m === 'app' ? ' App Log' : ' Encode Log'}
          </button>
        ))}

        {/* Job ID (encode mode) */}
        {mode === 'encode' && (
          <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: 320 }}>
            <i className="bi bi-hash" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 13 }}></i>
            <input
              className="s-input"
              style={{ paddingLeft: 28, fontFamily: 'JetBrains Mono,monospace', fontSize: 12 }}
              value={jobId}
              onChange={e => setJobId(e.target.value)}
              placeholder="Job ID (UUID)"
            />
          </div>
        )}

        {/* Lines count - no spinners */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Last</span>
          <input
            type="number"
            className="s-input mono"
            style={{
              width: 80, textAlign: 'center', padding: '6px 8px', fontSize: 13,
              /* Remove spinners */
              MozAppearance: 'textfield',
            } as React.CSSProperties}
            min={50} max={5000} step={50}
            value={lines}
            onChange={e => setLines(Math.max(50, Math.min(5000, parseInt(e.target.value) || 500)))}
          />
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>lines</span>
        </div>

        <button onClick={loadLog} disabled={isFetching || (mode === 'encode' && !jobId.trim())}
          className="s-btn s-btn-primary s-btn-sm">
          {isFetching
            ? <><span style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite' }}></span> Loading…</>
            : <><i className="bi bi-arrow-clockwise"></i> Load</>}
        </button>

        <div style={{ flex: 1 }} />

        <button onClick={copyToClipboard} disabled={logLines.length === 0}
          className="s-btn s-btn-ghost s-btn-sm" title="Copy all">
          <i className="bi bi-clipboard"></i>
        </button>

        <button onClick={downloadLog} disabled={logLines.length === 0}
          className="s-btn s-btn-ghost s-btn-sm" title="Download log">
          <i className="bi bi-download"></i>
        </button>
      </div>

      {/* Error */}
      {isError && (
        <div style={{ padding: '10px 16px', background: 'rgba(255,71,87,.08)', border: '1px solid rgba(255,71,87,.25)', borderRadius: 8, fontSize: 13, color: 'var(--accent-err)' }}>
          <i className="bi bi-exclamation-triangle-fill" style={{ marginRight: 8 }}></i>
          {(error as any)?.response?.data?.message || (error as any)?.message || 'Failed to load log'}
        </div>
      )}

      {/* Log terminal */}
      <div style={{
        flex: 1, background: '#060610',
        border: '1px solid var(--border)', borderRadius: 10,
        padding: '14px 16px', overflow: 'auto',
        fontFamily: 'JetBrains Mono, monospace', fontSize: 11.5, lineHeight: 1.75,
      }}>
        {logLines.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', gap: 10 }}>
            {isFetching ? (
              <><span style={{ display: 'inline-block', width: 20, height: 20, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span>
                <span style={{ fontSize: 13 }}>Loading…</span></>
            ) : (
              <><i className="bi bi-terminal" style={{ fontSize: 36, opacity: .2 }}></i>
                <span style={{ fontSize: 13 }}>Select a log type and click <strong style={{ color: 'var(--accent-3)' }}>Load</strong></span>
                {mode === 'encode' && <span style={{ fontSize: 12 }}>Enter a Job ID to view encode logs</span>}</>
            )}
          </div>
        ) : logLines.map((line, i) => (
          <div key={i} style={{ color: colorLine(line), whiteSpace: 'pre-wrap', wordBreak: 'break-all', padding: '1px 0' }}>
            <span style={{ color: 'var(--text-muted)', userSelect: 'none', marginRight: 12, fontSize: 10 }}>
              {String(i + 1).padStart(4, '0')}
            </span>
            {line}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono,monospace', padding: '0 2px' }}>
        <span>{logLines.length > 0 && <span style={{ color: 'var(--text-dim)' }}>{logLines.length} lines</span>}</span>
        <span>{mode}{jobId ? ` · ${jobId.slice(0, 8)}…` : ''}</span>
      </div>
    </div>
  );
}
