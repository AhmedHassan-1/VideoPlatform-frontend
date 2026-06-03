import React from 'react';
// src/pages/admin/AdminVideos.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, FileText } from 'lucide-react';
import { adminApi } from '../../services/api';
import toast from 'react-hot-toast';

const STATUS_COLOR: Record<string,string> = { ready:'#2dffb4', processing:'#5d4fff', queued:'#ffb830', error:'#ff4444', uploading:'#6b6b80', cancelled:'#6b6b80' };
const fmt = (b: number) => b>=1e9?(b/1e9).toFixed(1)+'GB':b>=1e6?(b/1e6).toFixed(0)+'MB':b+'B';

export default function AdminVideos() {
  const [page, setPage]     = useState(1);
  const [status, setStatus] = useState('');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin','videos',page,status],
    queryFn: () => adminApi.videos(page, 50, undefined, status||undefined).then(r => r.data),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => adminApi.deleteVideo(id),
    onSuccess: () => { toast.success('Video deleted'); qc.invalidateQueries({ queryKey:['admin','videos'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message||'Failed'),
  });

  const th: React.CSSProperties = { padding:'8px 16px', fontSize:10, textTransform:'uppercase', letterSpacing:1.5, color:'#6b6b80', fontFamily:'monospace', borderBottom:'1px solid #22222e', background:'#111118', textAlign:'left' };
  const td: React.CSSProperties = { padding:'10px 16px', fontSize:13, borderBottom:'1px solid #22222e', verticalAlign:'middle' };

  return (
    <div>
      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>All Videos</h1>
        <p style={{ color:'#6b6b80', fontSize:13 }}>{data?.total||0} videos</p>
      </div>
      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
        {['','ready','processing','queued','error','uploading'].map(s => (
          <button key={s} onClick={() => { setStatus(s); setPage(1); }}
            style={{ padding:'5px 12px', borderRadius:5, fontSize:12, fontWeight:600, cursor:'pointer', border:'1px solid', borderColor:status===s?'#5d4fff':'#22222e', background:status===s?'rgba(93,79,255,.15)':'none', color:status===s?'#5d4fff':'#6b6b80' }}>
            {s||'All'}
          </button>
        ))}
      </div>
      <div style={{ background:'#16161f', border:'1px solid #22222e', borderRadius:10, overflow:'hidden' }}>
        {isLoading ? <div style={{ padding:40, textAlign:'center', color:'#6b6b80' }}>Loading…</div> : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr>{['Title','User','Status','Size','Created','Actions'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>
              {data?.videos?.map((v: any) => (
                <tr key={v.id}>
                  <td style={td}><div style={{ maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontWeight:600 }}>{v.title}</div></td>
                  <td style={{ ...td, fontFamily:'monospace', fontSize:12, color:'#a0a0b8' }}>{v.username||'—'}</td>
                  <td style={td}><span style={{ fontSize:11, fontFamily:'monospace', color:STATUS_COLOR[v.status]||'#6b6b80', background:`${STATUS_COLOR[v.status]||'#6b6b80'}20`, padding:'2px 8px', borderRadius:4 }}>{v.status}</span></td>
                  <td style={{ ...td, fontFamily:'monospace', fontSize:12 }}>{fmt(v.originalSizeBytes)}</td>
                  <td style={{ ...td, fontFamily:'monospace', fontSize:11, color:'#6b6b80' }}>{new Date(v.createdAt).toLocaleDateString()}</td>
                  <td style={td}>
                    <div style={{ display:'flex', gap:4 }}>
                      <button onClick={() => deleteMut.mutate(v.id)} style={{ background:'none', border:'1px solid rgba(255,68,68,.3)', borderRadius:4, color:'#ff4444', padding:'4px 6px', cursor:'pointer' }}><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {(data?.pages||1) > 1 && (
        <div style={{ display:'flex', gap:8, marginTop:12, alignItems:'center' }}>
          <button disabled={page<=1} onClick={() => setPage(p=>p-1)} style={{ background:'none', border:'1px solid #22222e', borderRadius:5, color:'#6b6b80', padding:'5px 12px', cursor:'pointer' }}>← Prev</button>
          <span style={{ fontSize:12, fontFamily:'monospace', color:'#6b6b80' }}>{page}/{data?.pages}</span>
          <button disabled={page>=(data?.pages||1)} onClick={() => setPage(p=>p+1)} style={{ background:'none', border:'1px solid #22222e', borderRadius:5, color:'#6b6b80', padding:'5px 12px', cursor:'pointer' }}>Next →</button>
        </div>
      )}
    </div>
  );
}
