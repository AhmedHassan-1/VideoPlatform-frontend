// src/pages/admin/AdminLogs.tsx
import { useState, useEffect, useRef } from 'react';
import { Wifi, WifiOff, Trash2 } from 'lucide-react';

function colorLine(line: string) {
  if (/ERROR|error|✗|failed/i.test(line)) return '#ff4444';
  if (/WARN|warn/i.test(line))             return '#ffb830';
  if (/✓|done|ready|success/i.test(line)) return '#2dffb4';
  if (/▶|start|process|encod/i.test(line))return '#5d4fff';
  return '#a0a0b8';
}

export default function AdminLogs() {
  const [logType, setLogType] = useState<'app'|'encode'|'errors'>('app');
  const [jobId, setJobId]     = useState('');
  const [lines, setLines]     = useState<string[]>([]);
  const [connected, setCon]   = useState(false);
  const [autoScroll, setAuto] = useState(true);
  const esRef   = useRef<EventSource|null>(null);
  const logRef  = useRef<HTMLDivElement>(null);
  const token   = localStorage.getItem('token') || '';

  function connect() {
    if (esRef.current) { esRef.current.close(); esRef.current = null; }
    setLines([]);
    let url = `/admin/logs/stream?type=${logType}&token=${encodeURIComponent(token)}`;
    if (jobId.trim() && logType !== 'app') url += `&jobId=${encodeURIComponent(jobId.trim())}`;
    const es = new EventSource(url);
    esRef.current = es;
    es.onopen    = () => setCon(true);
    es.onerror   = () => { setCon(false); };
    es.onmessage = e => {
      try { const l = JSON.parse(e.data); setLines(prev => [...prev.slice(-2000), l]); }
      catch { setLines(prev => [...prev.slice(-2000), e.data]); }
    };
  }

  function disconnect() {
    esRef.current?.close();
    esRef.current = null;
    setCon(false);
  }

  useEffect(() => { return () => disconnect(); }, []);

  useEffect(() => {
    if (autoScroll && logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [lines, autoScroll]);

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 96px)' }}>
      <div style={{ marginBottom:16 }}>
        <h1 style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>Logs</h1>
        <p style={{ color:'#6b6b80', fontSize:13 }}>Real-time server log viewer</p>
      </div>

      {/* Controls */}
      <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap', alignItems:'center' }}>
        <select value={logType} onChange={e => setLogType(e.target.value as any)}
          style={{ background:'#16161f', border:'1px solid #22222e', borderRadius:6, color:'#e8e8f0', padding:'7px 10px', fontSize:12, outline:'none', minWidth:160 }}>
          <option value="app">Application Log</option>
          <option value="encode">Encode Log</option>
          <option value="errors">Errors Log</option>
        </select>
        {logType !== 'app' && (
          <input value={jobId} onChange={e => setJobId(e.target.value)}
            placeholder="Job ID (UUID)"
            style={{ flex:1, maxWidth:340, background:'#16161f', border:'1px solid #22222e', borderRadius:6, color:'#e8e8f0', padding:'7px 10px', fontSize:12, outline:'none', fontFamily:'monospace' }}
          />
        )}
        <button onClick={connected ? disconnect : connect}
          style={{ display:'flex', alignItems:'center', gap:6, background: connected?'rgba(255,68,68,.1)':'rgba(45,255,180,.1)', border:`1px solid ${connected?'rgba(255,68,68,.3)':'rgba(45,255,180,.3)'}`, borderRadius:6, color:connected?'#ff4444':'#2dffb4', padding:'7px 14px', fontSize:12, fontWeight:600, cursor:'pointer' }}>
          {connected ? <><WifiOff size={12} /> Disconnect</> : <><Wifi size={12} /> Connect</>}
        </button>
        <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#6b6b80', cursor:'pointer' }}>
          <input type="checkbox" checked={autoScroll} onChange={e => setAuto(e.target.checked)} />
          Auto-scroll
        </label>
        <button onClick={() => setLines([])} style={{ display:'flex', alignItems:'center', gap:4, background:'none', border:'1px solid #22222e', borderRadius:6, color:'#6b6b80', padding:'7px 10px', fontSize:12, cursor:'pointer' }}>
          <Trash2 size={12} /> Clear
        </button>

        <div style={{ display:'flex', alignItems:'center', gap:6, marginLeft:'auto', fontSize:11, fontFamily:'monospace', color: connected?'#2dffb4':'#6b6b80' }}>
          <span style={{ width:7, height:7, borderRadius:'50%', background: connected?'#2dffb4':'#6b6b80', display:'inline-block' }} />
          {connected ? 'Connected' : 'Disconnected'}
        </div>
      </div>

      {/* Log viewer */}
      <div ref={logRef} style={{ flex:1, background:'#0a0a0f', border:'1px solid #22222e', borderRadius:8, padding:12, overflow:'auto', fontFamily:'JetBrains Mono,monospace', fontSize:11, lineHeight:1.7 }}>
        {lines.length === 0 && (
          <div style={{ color:'#3a3a4a', textAlign:'center', padding:40 }}>
            {connected ? 'Waiting for log output…' : 'Click Connect to start streaming logs'}
          </div>
        )}
        {lines.map((line, i) => (
          <div key={i} style={{ color: colorLine(line), whiteSpace:'pre-wrap', wordBreak:'break-all' }}>{line}</div>
        ))}
      </div>

      <div style={{ fontSize:11, color:'#3a3a4a', fontFamily:'monospace', marginTop:6, textAlign:'right' }}>
        {lines.length} lines (max 2000)
      </div>
    </div>
  );
}
