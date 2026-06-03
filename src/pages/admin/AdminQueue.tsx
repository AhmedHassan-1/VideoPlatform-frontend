import React from 'react';
// src/pages/admin/AdminQueue.tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { XCircle, RefreshCw } from 'lucide-react';
import { adminApi } from '../../services/api';
import toast from 'react-hot-toast';

export default function AdminQueue() {
  const qc = useQueryClient();
  const { data: queue, isLoading } = useQuery({ queryKey:['admin','queue'], queryFn:()=>adminApi.queue().then(r=>r.data), refetchInterval:8000 });

  const cancelMut = useMutation({
    mutationFn: (jobId: string) => adminApi.cancelJob(jobId),
    onSuccess: () => { toast.success('Job cancelled'); qc.invalidateQueries({ queryKey:['admin','queue'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message||'Failed'),
  });

  const card: React.CSSProperties = { background:'#16161f', border:'1px solid #22222e', borderRadius:10, padding:20, marginBottom:16 };

  function QueueItem({ item }: { item: any }) {
    return (
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', background:'#111118', border:'1px solid #22222e', borderRadius:8, marginBottom:8 }}>
        <div style={{ fontSize:22, fontWeight:800, fontFamily:'monospace', color: item.isActive?'#5d4fff':'#2e2e3e', width:32, textAlign:'center', flexShrink:0 }}>
          {item.isActive ? '▶' : item.position}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:600, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.title}</div>
          <div style={{ fontSize:11, color:'#6b6b80', fontFamily:'monospace', marginTop:2 }}>
            {item.username} · {item.jobId?.slice(0,12)}… · seg:{item.segmentDuration}s · rot:{item.keyRotationInterval||'off'}
          </div>
          {item.qualities && <div style={{ fontSize:10, color:'#5d4fff', fontFamily:'monospace', marginTop:2 }}>{item.qualities.join(', ')}</div>}
          {item.isActive && (
            <div style={{ marginTop:6 }}>
              <div style={{ height:4, background:'#22222e', borderRadius:2 }}>
                <div style={{ height:'100%', width:`${item.progress||0}%`, background:'#5d4fff', borderRadius:2, transition:'width .5s' }} />
              </div>
            </div>
          )}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
          <span style={{ fontSize:11, fontFamily:'monospace', color:item.isActive?'#5d4fff':'#ffb830', background:item.isActive?'rgba(93,79,255,.15)':'rgba(255,184,48,.1)', padding:'2px 8px', borderRadius:4 }}>
            {item.isActive ? `${item.progress||0}%` : 'queued'}
          </span>
          <button onClick={() => { if(confirm(`Cancel "${item.title}"?`)) cancelMut.mutate(item.jobId); }} style={{ background:'rgba(255,68,68,.1)', border:'1px solid rgba(255,68,68,.3)', borderRadius:4, color:'#ff4444', padding:'4px 8px', cursor:'pointer', display:'flex', alignItems:'center', gap:4, fontSize:11 }}>
            <XCircle size={12} /> Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>Processing Queue</h1>
          <p style={{ color:'#6b6b80', fontSize:13 }}>
            {queue?.activeCount||0} active · {queue?.pendingCount||0} pending · {queue?.concurrency||1} workers
          </p>
        </div>
        <button onClick={() => qc.invalidateQueries({ queryKey:['admin','queue'] })} style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'1px solid #22222e', borderRadius:6, color:'#6b6b80', padding:'7px 12px', cursor:'pointer', fontSize:12 }}>
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {isLoading ? <div style={{ padding:40, textAlign:'center', color:'#6b6b80' }}>Loading…</div> : (
        <>
          <div style={card}>
            <div style={{ fontSize:11, color:'#6b6b80', textTransform:'uppercase', letterSpacing:2, fontFamily:'monospace', marginBottom:12 }}>
              Active ({queue?.activeCount||0})
            </div>
            {queue?.active?.length ? queue.active.map((item: any) => <QueueItem key={item.jobId} item={item} />) : (
              <div style={{ padding:'16px 0', textAlign:'center', color:'#6b6b80', fontSize:13 }}>No active jobs</div>
            )}
          </div>

          <div style={card}>
            <div style={{ fontSize:11, color:'#6b6b80', textTransform:'uppercase', letterSpacing:2, fontFamily:'monospace', marginBottom:12 }}>
              Pending ({queue?.pendingCount||0})
            </div>
            {queue?.pending?.length ? queue.pending.map((item: any) => <QueueItem key={item.jobId} item={item} />) : (
              <div style={{ padding:'16px 0', textAlign:'center', color:'#6b6b80', fontSize:13 }}>Queue is empty</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
