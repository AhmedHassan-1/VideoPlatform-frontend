// src/pages/settings/SessionsPage.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Monitor, Smartphone, Globe, Trash2, LogOut, Shield } from 'lucide-react';
import { authExtApi } from '../../services/api';
import { useAuthStore } from '../../stores/auth.store';
import toast from 'react-hot-toast';

function parseUA(ua: string | null) {
  if (!ua) return { device: 'Unknown device', icon: Globe };
  const u = ua.toLowerCase();
  if (u.includes('mobile') || u.includes('android') || u.includes('iphone'))
    return { device: ua.slice(0, 60), icon: Smartphone };
  return { device: ua.slice(0, 60), icon: Monitor };
}

function fmtDate(d: string) {
  const date = new Date(d);
  const now  = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff/60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff/3_600_000)}h ago`;
  return date.toLocaleDateString();
}

export default function SessionsPage() {
  const qc      = useQueryClient();
  const logout  = useAuthStore(s => s.logout);
  const [confirmLogoutAll, setConfirmLogoutAll] = useState(false);

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn:  () => authExtApi.sessions().then(r => r.data),
    refetchInterval: 30_000,
  });

  const revokeMut = useMutation({
    mutationFn: (id: string) => authExtApi.revokeSession(id),
    onSuccess: () => { toast.success('Session revoked'); qc.invalidateQueries({ queryKey: ['sessions'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const logoutAllMut = useMutation({
    mutationFn: () => authExtApi.logoutAll(),
    onSuccess: () => { toast.success('All sessions terminated'); logout(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const card: React.CSSProperties = { background:'#16161f', border:'1px solid #22222e', borderRadius:10, padding:24, marginBottom:16 };
  const row:  React.CSSProperties = { display:'flex', alignItems:'flex-start', gap:16, padding:'14px 0', borderBottom:'1px solid #22222e' };

  return (
    <div style={{ maxWidth:680 }}>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>Active Sessions</h1>
        <p style={{ color:'#6b6b80', fontSize:13 }}>Manage where you're logged in</p>
      </div>

      <div style={card}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <div style={{ fontSize:11, color:'#6b6b80', textTransform:'uppercase', letterSpacing:2, fontFamily:'monospace' }}>
            {sessions?.length || 0} active sessions
          </div>
          <button
            onClick={() => setConfirmLogoutAll(true)}
            style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(255,68,68,.1)', border:'1px solid rgba(255,68,68,.3)', borderRadius:6, color:'#ff4444', padding:'6px 12px', fontSize:12, fontWeight:600, cursor:'pointer' }}>
            <LogOut size={12} /> Logout All Devices
          </button>
        </div>

        {isLoading && <div style={{ color:'#6b6b80', textAlign:'center', padding:20 }}>Loading…</div>}

        {sessions?.map((s: any) => {
          const { device, icon: Icon } = parseUA(s.userAgent);
          const isExpired = new Date(s.expiresAt) < new Date();
          return (
            <div key={s.id} style={{ ...row, opacity: isExpired ? 0.5 : 1 }}>
              <div style={{ width:36, height:36, borderRadius:8, background:'#22222e', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Icon size={18} color="#6b6b80" />
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {device || 'Unknown device'}
                </div>
                <div style={{ display:'flex', gap:12, marginTop:4, flexWrap:'wrap' }}>
                  {s.ip && (
                    <span style={{ fontSize:11, fontFamily:'monospace', color:'#6b6b80' }}>
                      🌐 {s.ip}
                    </span>
                  )}
                  <span style={{ fontSize:11, fontFamily:'monospace', color:'#6b6b80' }}>
                    Last seen {fmtDate(s.lastSeen)}
                  </span>
                  <span style={{ fontSize:11, fontFamily:'monospace', color: isExpired ? '#ff4444' : '#6b6b80' }}>
                    {isExpired ? 'Expired' : `Expires ${fmtDate(s.expiresAt)}`}
                  </span>
                </div>
              </div>
              <button
                onClick={() => revokeMut.mutate(s.id)}
                disabled={revokeMut.isPending}
                style={{ background:'none', border:'1px solid rgba(255,68,68,.3)', borderRadius:6, color:'#ff4444', padding:'6px 8px', cursor:'pointer', flexShrink:0 }}
                title="Revoke session">
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}

        {!isLoading && sessions?.length === 0 && (
          <div style={{ padding:20, textAlign:'center', color:'#6b6b80', fontSize:13 }}>No active sessions</div>
        )}
      </div>

      {/* Security tips */}
      <div style={{ ...card, borderColor:'rgba(93,79,255,.2)' }}>
        <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
          <Shield size={18} color="#5d4fff" style={{ flexShrink:0, marginTop:2 }} />
          <div>
            <div style={{ fontWeight:600, marginBottom:8, fontSize:14 }}>Security Tips</div>
            {[
              'Revoke any session you don\'t recognise immediately.',
              'If you see an unfamiliar IP, change your password and logout all devices.',
              'Sessions expire automatically after 24 hours of inactivity.',
            ].map(tip => (
              <div key={tip} style={{ fontSize:12, color:'#6b6b80', marginBottom:6, lineHeight:1.5 }}>
                • {tip}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Confirm logout all modal */}
      {confirmLogoutAll && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'#16161f', border:'1px solid #2e2e3e', borderRadius:12, padding:28, width:380, textAlign:'center' }}>
            <LogOut size={32} color="#ff4444" style={{ margin:'0 auto 12px' }} />
            <div style={{ fontSize:16, fontWeight:700, marginBottom:8 }}>Logout All Devices?</div>
            <div style={{ fontSize:13, color:'#6b6b80', marginBottom:20 }}>
              This will immediately terminate all active sessions including this one. You'll need to log in again.
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
              <button onClick={() => setConfirmLogoutAll(false)} style={{ padding:'8px 20px', borderRadius:6, fontSize:13, fontWeight:600, cursor:'pointer', background:'none', border:'1px solid #22222e', color:'#6b6b80' }}>
                Cancel
              </button>
              <button onClick={() => { setConfirmLogoutAll(false); logoutAllMut.mutate(); }} style={{ padding:'8px 20px', borderRadius:6, fontSize:13, fontWeight:600, cursor:'pointer', background:'rgba(255,68,68,.15)', border:'1px solid rgba(255,68,68,.4)', color:'#ff4444' }}>
                Logout All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
