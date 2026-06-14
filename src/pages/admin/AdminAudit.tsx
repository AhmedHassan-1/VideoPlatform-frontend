// src/pages/admin/AdminAudit.tsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../services/api';

const LEVEL_COLOR: Record<string, string> = { info:'#2dffb4', warn:'#ffb830', error:'#ff4444', debug:'#6b6b80' };

export default function AdminAudit() {
  const [page, setPage]     = useState(1);
  const [action, setAction] = useState('');
  const [level, setLevel]   = useState('');
  const [userId, setUserId] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin','audit', page, action, level, userId],
    queryFn:  () => adminApi.auditLogs({ page, limit:50, action:action||undefined, level:level||undefined, userId:userId||undefined }).then(r => r.data),
  });

  const th: React.CSSProperties = { padding:'8px 12px', fontSize:10, textTransform:'uppercase', letterSpacing:1.5, color:'#6b6b80', fontFamily:'monospace', borderBottom:'1px solid #22222e', background:'#111118', textAlign:'left' as const };
  const td: React.CSSProperties = { padding:'9px 12px', fontSize:12, borderBottom:'1px solid #22222e', verticalAlign:'middle' as const };

  return (
    <div>
      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>Audit Log</h1>
        <p style={{ color:'#6b6b80', fontSize:13 }}>{data?.total || 0} total entries</p>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
        {[
          { placeholder:'Filter by action…',  value:action,  set:setAction },
          { placeholder:'Filter by user ID…', value:userId,  set:setUserId },
        ].map(({ placeholder, value, set }) => (
          <input key={placeholder} value={value} onChange={e => { set(e.target.value); setPage(1); }}
            placeholder={placeholder}
            style={{ background:'#16161f', border:'1px solid #22222e', borderRadius:6, color:'#e8e8f0', padding:'7px 12px', fontSize:12, outline:'none', minWidth:200 }}
          />
        ))}
        <select value={level} onChange={e => { setLevel(e.target.value); setPage(1); }}
          style={{ background:'#16161f', border:'1px solid #22222e', borderRadius:6, color:'#e8e8f0', padding:'7px 10px', fontSize:12, outline:'none' }}>
          <option value="">All Levels</option>
          {['info','warn','error','debug'].map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      <div style={{ background:'#16161f', border:'1px solid #22222e', borderRadius:10, overflow:'hidden' }}>
        {isLoading ? (
          <div style={{ padding:40, textAlign:'center', color:'#6b6b80' }}>Loading…</div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>{['Time','Level','Action','User','IP','Details'].map(h => <th key={h} style={th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {data?.logs?.map((log: any) => (
                <tr key={log.id}>
                  <td style={{ ...td, fontFamily:'monospace', fontSize:11, color:'#6b6b80', whiteSpace:'nowrap' }}>
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td style={td}>
                    <span style={{ fontSize:10, fontFamily:'monospace', color: LEVEL_COLOR[log.level]||'#6b6b80', background:`${LEVEL_COLOR[log.level]||'#6b6b80'}20`, padding:'2px 6px', borderRadius:3 }}>
                      {log.level}
                    </span>
                  </td>
                  <td style={{ ...td, fontFamily:'monospace', color:'#e8e8f0', fontWeight:600 }}>{log.action}</td>
                  <td style={{ ...td, fontFamily:'monospace', fontSize:11, color:'#6b6b80' }}>{log.userId?.slice(0,8) || '—'}</td>
                  <td style={{ ...td, fontFamily:'monospace', fontSize:11, color:'#6b6b80' }}>{log.ip || '—'}</td>
                  <td style={{ ...td, fontSize:11, color:'#6b6b80' }}>
                    {log.meta ? (
                      <details style={{ cursor:'pointer' }}>
                        <summary style={{ color:'#5d4fff' }}>View</summary>
                        <pre style={{ fontSize:10, marginTop:4, color:'#a0a0b8' }}>{JSON.stringify(log.meta, null, 2)}</pre>
                      </details>
                    ) : log.target || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {(data?.pages || 1) > 1 && (
        <div style={{ display:'flex', gap:8, marginTop:12, alignItems:'center' }}>
          <button disabled={page <= 1} onClick={() => setPage(p => p-1)}
            style={{ background:'none', border:'1px solid #22222e', borderRadius:5, color:'#6b6b80', padding:'5px 12px', cursor:'pointer' }}>← Prev</button>
          <span style={{ fontSize:12, fontFamily:'monospace', color:'#6b6b80' }}>{page} / {data?.pages}</span>
          <button disabled={page >= (data?.pages||1)} onClick={() => setPage(p => p+1)}
            style={{ background:'none', border:'1px solid #22222e', borderRadius:5, color:'#6b6b80', padding:'5px 12px', cursor:'pointer' }}>Next →</button>
        </div>
      )}
    </div>
  );
}
