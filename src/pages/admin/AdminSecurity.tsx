// src/pages/admin/AdminSecurity.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Plus, Trash2, Wifi, WifiOff } from 'lucide-react';
import { adminExtApi } from '../../services/api';
import toast from 'react-hot-toast';

export default function AdminSecurity() {
  const qc = useQueryClient();
  const [ip, setIp]           = useState('');
  const [reason, setReason]   = useState('');
  const [expires, setExpires] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const { data: ips, isLoading } = useQuery({
    queryKey: ['admin','blocked-ips'],
    queryFn:  () => adminExtApi.blockedIps().then(r => r.data),
  });

  const { data: sseStats } = useQuery({
    queryKey: ['admin','sse-stats'],
    queryFn:  () => adminExtApi.sseStats().then(r => r.data),
    refetchInterval: 15_000,
  });

  const blockMut = useMutation({
    mutationFn: () => adminExtApi.blockIp(ip.trim(), reason.trim(), expires || undefined),
    onSuccess: () => {
      toast.success(`IP ${ip} blocked`);
      setIp(''); setReason(''); setExpires(''); setShowAdd(false);
      qc.invalidateQueries({ queryKey: ['admin','blocked-ips'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const unblockMut = useMutation({
    mutationFn: (id: string) => adminExtApi.unblockIp(id),
    onSuccess: () => { toast.success('IP unblocked'); qc.invalidateQueries({ queryKey: ['admin','blocked-ips'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const cronMut = useMutation({
    mutationFn: () => adminExtApi.cronRun(),
    onSuccess: () => toast.success('Cron tasks ran successfully'),
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const input: React.CSSProperties = { width:'100%', background:'#111118', border:'1px solid #22222e', borderRadius:6, color:'#e8e8f0', padding:'8px 12px', fontSize:13, outline:'none' };
  const label: React.CSSProperties = { display:'block', fontSize:11, color:'#6b6b80', textTransform:'uppercase', letterSpacing:1, marginBottom:4, fontFamily:'monospace' };
  const card:  React.CSSProperties = { background:'#16161f', border:'1px solid #22222e', borderRadius:10, padding:20, marginBottom:16 };
  const th:    React.CSSProperties = { padding:'8px 16px', fontSize:10, textTransform:'uppercase', letterSpacing:1.5, color:'#6b6b80', fontFamily:'monospace', borderBottom:'1px solid #22222e', background:'#111118', textAlign:'left' as const };
  const td:    React.CSSProperties = { padding:'10px 16px', fontSize:13, borderBottom:'1px solid #22222e', verticalAlign:'middle' as const };

  return (
    <div>
      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>Security</h1>
        <p style={{ color:'#6b6b80', fontSize:13 }}>IP blocklist and system monitoring</p>
      </div>

      {/* SSE Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 }}>
        {[
          { label:'Connected Clients',  val: sseStats?.total ?? '—',  color:'#2dffb4',  icon: Wifi },
          { label:'Blocked IPs',        val: ips?.length ?? '—',      color:'#ff4444',  icon: WifiOff },
          { label:'Active',             val: sseStats?.total > 0 ? 'Yes' : 'No', color: sseStats?.total > 0 ? '#2dffb4' : '#6b6b80', icon: Shield },
        ].map(({ label, val, color, icon: Icon }) => (
          <div key={label} style={{ background:'#111118', border:'1px solid #22222e', borderRadius:8, padding:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
              <div style={{ fontSize:24, fontWeight:800, fontFamily:'monospace', color }}>{val}</div>
              <Icon size={18} color={color} />
            </div>
            <div style={{ fontSize:11, color:'#6b6b80', textTransform:'uppercase', letterSpacing:1 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Manual Cron */}
      <div style={{ ...card, borderColor: 'rgba(255,184,48,.2)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontWeight:600, marginBottom:4 }}>Maintenance Tasks</div>
            <div style={{ fontSize:12, color:'#6b6b80' }}>Clean expired sessions, prune audit logs, check disk space</div>
          </div>
          <button
            onClick={() => cronMut.mutate()}
            disabled={cronMut.isPending}
            style={{ background:'rgba(255,184,48,.1)', border:'1px solid rgba(255,184,48,.3)', borderRadius:6, color:'#ffb830', padding:'8px 16px', fontSize:12, fontWeight:600, cursor:'pointer', opacity: cronMut.isPending ? 0.6 : 1 }}>
            {cronMut.isPending ? 'Running…' : '▶ Run Now'}
          </button>
        </div>
      </div>

      {/* IP Blocklist */}
      <div style={card}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <div style={{ fontSize:11, color:'#6b6b80', textTransform:'uppercase', letterSpacing:2, fontFamily:'monospace' }}>
            IP Blocklist ({ips?.length || 0})
          </div>
          <button onClick={() => setShowAdd(s => !s)}
            style={{ display:'flex', alignItems:'center', gap:6, background:'#5d4fff', border:'none', borderRadius:6, color:'#fff', padding:'7px 14px', fontSize:12, fontWeight:600, cursor:'pointer' }}>
            <Plus size={12} /> Block IP
          </button>
        </div>

        {showAdd && (
          <div style={{ background:'#111118', borderRadius:8, padding:16, marginBottom:16, border:'1px solid rgba(93,79,255,.3)' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
              <div>
                <label style={label}>IP Address *</label>
                <input value={ip} onChange={e => setIp(e.target.value)} style={input} placeholder="192.168.1.1" />
              </div>
              <div>
                <label style={label}>Reason</label>
                <input value={reason} onChange={e => setReason(e.target.value)} style={input} placeholder="Abuse, spam, etc." />
              </div>
            </div>
            <div style={{ marginBottom:12 }}>
              <label style={label}>Expires (leave blank = permanent)</label>
              <input type="datetime-local" value={expires} onChange={e => setExpires(e.target.value)} style={input} />
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => blockMut.mutate()} disabled={!ip.trim() || blockMut.isPending}
                style={{ background:'rgba(255,68,68,.15)', border:'1px solid rgba(255,68,68,.4)', borderRadius:6, color:'#ff4444', padding:'8px 16px', fontSize:12, fontWeight:600, cursor:'pointer', opacity: !ip.trim() ? 0.5 : 1 }}>
                {blockMut.isPending ? 'Blocking…' : 'Block IP'}
              </button>
              <button onClick={() => setShowAdd(false)}
                style={{ background:'none', border:'1px solid #22222e', borderRadius:6, color:'#6b6b80', padding:'8px 16px', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div style={{ padding:20, textAlign:'center', color:'#6b6b80' }}>Loading…</div>
        ) : ips?.length === 0 ? (
          <div style={{ padding:20, textAlign:'center', color:'#6b6b80', fontSize:13 }}>No blocked IPs</div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>{['IP Address','Reason','Blocked By','Expires','Actions'].map(h=><th key={h} style={th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {ips?.map((b: any) => (
                <tr key={b.id}>
                  <td style={{ ...td, fontFamily:'monospace', fontWeight:600 }}>{b.ip}</td>
                  <td style={{ ...td, color:'#a0a0b8' }}>{b.reason || '—'}</td>
                  <td style={{ ...td, fontFamily:'monospace', fontSize:12, color:'#6b6b80' }}>{b.blockedBy || '—'}</td>
                  <td style={{ ...td, fontFamily:'monospace', fontSize:12, color: b.expiresAt ? '#ffb830' : '#6b6b80' }}>
                    {b.expiresAt ? new Date(b.expiresAt).toLocaleDateString() : 'Permanent'}
                  </td>
                  <td style={td}>
                    <button onClick={() => unblockMut.mutate(b.id)}
                      style={{ background:'none', border:'1px solid rgba(45,255,180,.3)', borderRadius:4, color:'#2dffb4', padding:'4px 8px', cursor:'pointer', fontSize:11 }}>
                      Unblock
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
