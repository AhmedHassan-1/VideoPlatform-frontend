// src/pages/settings/WebhooksPage.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Zap, ToggleLeft, ToggleRight } from 'lucide-react';
import { webhooksApi } from '../../services/api';
import toast from 'react-hot-toast';

const ALL_EVENTS = [
  { value: 'video.ready',    label: 'Video Ready',    desc: 'Fired when HLS encoding completes' },
  { value: 'video.error',    label: 'Video Error',    desc: 'Fired when encoding fails' },
  { value: 'video.queued',   label: 'Video Queued',   desc: 'Fired when a video is added to queue' },
];

export default function WebhooksPage() {
  const qc = useQueryClient();
  const [url, setUrl]           = useState('');
  const [events, setEvents]     = useState<string[]>(['video.ready', 'video.error']);
  const [showAdd, setShowAdd]   = useState(false);

  const { data: hooks, isLoading } = useQuery({
    queryKey: ['webhooks'],
    queryFn:  () => webhooksApi.list().then(r => r.data),
  });

  const createMut = useMutation({
    mutationFn: () => webhooksApi.create(url, events),
    onSuccess: () => { toast.success('Webhook created'); setUrl(''); setShowAdd(false); qc.invalidateQueries({ queryKey: ['webhooks'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => webhooksApi.remove(id),
    onSuccess: () => { toast.success('Webhook removed'); qc.invalidateQueries({ queryKey: ['webhooks'] }); },
  });

  const testMut = useMutation({
    mutationFn: (id: string) => webhooksApi.test(id),
    onSuccess: () => toast.success('Test event sent!'),
    onError: () => toast.error('Delivery failed'),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => webhooksApi.update(id, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['webhooks'] }),
  });

  const s = {
    card: { background:'#16161f', border:'1px solid #22222e', borderRadius:10, padding:24, marginBottom:16 } as React.CSSProperties,
    input: { width:'100%', background:'#111118', border:'1px solid #22222e', borderRadius:6, color:'#e8e8f0', padding:'8px 12px', fontSize:13, outline:'none' } as React.CSSProperties,
    label: { display:'block', fontSize:11, color:'#6b6b80', textTransform:'uppercase' as const, letterSpacing:1, marginBottom:6, fontFamily:'monospace' },
    row: { display:'flex', alignItems:'flex-start', gap:12, padding:'14px 0', borderBottom:'1px solid #22222e' } as React.CSSProperties,
  };

  return (
    <div style={{ maxWidth:680 }}>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>Webhooks</h1>
        <p style={{ color:'#6b6b80', fontSize:13 }}>Get notified when video events occur</p>
      </div>

      <div style={s.card}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom: showAdd ? 20 : 0 }}>
          <div style={{ fontSize:11, color:'#6b6b80', textTransform:'uppercase', letterSpacing:2, fontFamily:'monospace' }}>{hooks?.length || 0} webhooks</div>
          <button onClick={() => setShowAdd(s => !s)}
            style={{ display:'flex', alignItems:'center', gap:6, background: showAdd ? 'none' : '#5d4fff', border: showAdd ? '1px solid #22222e' : 'none', borderRadius:6, color: showAdd ? '#6b6b80' : '#fff', padding:'7px 14px', fontSize:12, fontWeight:600, cursor:'pointer' }}>
            <Plus size={12} /> {showAdd ? 'Cancel' : 'Add Webhook'}
          </button>
        </div>

        {showAdd && (
          <div>
            <div style={{ marginBottom:12 }}>
              <label style={s.label}>Endpoint URL *</label>
              <input value={url} onChange={e => setUrl(e.target.value)} style={s.input} placeholder="https://yoursite.com/webhooks/streamos" />
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={s.label}>Events</label>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {ALL_EVENTS.map(ev => (
                  <label key={ev.value} style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
                    <input type="checkbox" checked={events.includes(ev.value)}
                      onChange={e => setEvents(prev => e.target.checked ? [...prev, ev.value] : prev.filter(x => x !== ev.value))}
                      style={{ accentColor:'#5d4fff', width:14, height:14 }}
                    />
                    <div>
                      <span style={{ fontSize:13, fontWeight:600, fontFamily:'monospace', color:'#5d4fff' }}>{ev.value}</span>
                      <span style={{ fontSize:12, color:'#6b6b80', marginLeft:8 }}>{ev.desc}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <button onClick={() => createMut.mutate()} disabled={!url.trim() || events.length === 0 || createMut.isPending}
              style={{ background:'#5d4fff', border:'none', borderRadius:6, color:'#fff', padding:'8px 18px', fontSize:12, fontWeight:600, cursor:'pointer', opacity: !url.trim() ? 0.5 : 1 }}>
              {createMut.isPending ? 'Creating…' : 'Create Webhook'}
            </button>
          </div>
        )}
      </div>

      {/* Webhooks list */}
      <div style={s.card}>
        {isLoading ? <div style={{ padding:20, textAlign:'center', color:'#6b6b80' }}>Loading…</div> :
         hooks?.length === 0 ? <div style={{ padding:20, textAlign:'center', color:'#6b6b80', fontSize:13 }}>No webhooks configured</div> :
         hooks?.map((hook: any) => {
           const evts: string[] = JSON.parse(hook.eventsJson || '[]');
           return (
             <div key={hook.id} style={s.row}>
               <div style={{ width:36, height:36, borderRadius:8, background: hook.isActive ? 'rgba(93,79,255,.15)' : 'rgba(255,255,255,.04)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                 <Zap size={16} color={hook.isActive ? '#5d4fff' : '#6b6b80'} />
               </div>
               <div style={{ flex:1, minWidth:0 }}>
                 <div style={{ fontSize:13, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{hook.url}</div>
                 <div style={{ display:'flex', gap:6, marginTop:6, flexWrap:'wrap' }}>
                   {evts.map(ev => (
                     <span key={ev} style={{ fontSize:10, fontFamily:'monospace', color:'#5d4fff', background:'rgba(93,79,255,.1)', padding:'2px 6px', borderRadius:3 }}>{ev}</span>
                   ))}
                 </div>
                 {hook.lastCalled && (
                   <div style={{ fontSize:11, color:'#6b6b80', marginTop:4, fontFamily:'monospace' }}>
                     Last: {new Date(hook.lastCalled).toLocaleString()} · Status: {hook.lastStatus || '—'}
                     {hook.failureCount > 0 && ` · ⚠ ${hook.failureCount} failures`}
                   </div>
                 )}
               </div>
               <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                 <button onClick={() => testMut.mutate(hook.id)} style={{ background:'none', border:'1px solid #22222e', borderRadius:5, color:'#6b6b80', padding:'5px 10px', cursor:'pointer', fontSize:11 }}>Test</button>
                 <button onClick={() => toggleMut.mutate({ id: hook.id, isActive: !hook.isActive })}
                   style={{ background:'none', border:'none', color: hook.isActive ? '#2dffb4' : '#6b6b80', cursor:'pointer', padding:4 }}>
                   {hook.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                 </button>
                 <button onClick={() => { if(confirm('Remove webhook?')) removeMut.mutate(hook.id); }}
                   style={{ background:'none', border:'1px solid rgba(255,68,68,.3)', borderRadius:5, color:'#ff4444', padding:'5px 8px', cursor:'pointer' }}>
                   <Trash2 size={12} />
                 </button>
               </div>
             </div>
           );
         })
        }
      </div>

      {/* Signature verification */}
      <div style={{ ...s.card, background:'#0e0e16' }}>
        <div style={{ fontSize:11, color:'#6b6b80', textTransform:'uppercase', letterSpacing:2, fontFamily:'monospace', marginBottom:10 }}>Verifying Signatures</div>
        <pre style={{ fontSize:11, fontFamily:'monospace', color:'#a0a0b8', overflow:'auto', margin:0 }}>{`// Node.js — verify X-StreamOS-Signature header
const crypto = require('crypto');
const sig = crypto
  .createHmac('sha256', 'YOUR_WEBHOOK_SECRET')
  .update(rawBody)
  .digest('hex');
if (sig !== req.headers['x-streamOS-signature'])
  throw new Error('Invalid signature');`}</pre>
      </div>
    </div>
  );
}
