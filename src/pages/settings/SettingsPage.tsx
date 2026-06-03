import React from 'react';
// src/pages/settings/SettingsPage.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, RefreshCw, Eye, EyeOff, Copy, Check } from 'lucide-react';
import { usersApi, authApi, authExtApi } from '../../services/api';
import toast from 'react-hot-toast';

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); toast.success('Copied!'); setTimeout(() => setCopied(false), 2000); }}
      style={{ background:'none', border:'1px solid #22222e', borderRadius:4, color:'#6b6b80', padding:'4px 8px', cursor:'pointer', display:'flex', alignItems:'center', gap:4, fontSize:11 }}>
      {copied ? <Check size={10} color="#2dffb4" /> : <Copy size={10} />}
    </button>
  );
}

export default function SettingsPage() {
  const qc = useQueryClient();
  const [newDomain, setNewDomain]     = useState('');
  const [showToken, setShowToken]     = useState(false);
  const [curPw, setCurPw]             = useState('');
  const [newPw, setNewPw]             = useState('');
  const [confirmPw, setConfirmPw]     = useState('');

  const { data: profile, isLoading } = useQuery({
    queryKey: ['me'], queryFn: () => usersApi.me().then(r => r.data),
  });

  const addDomainMut = useMutation({
    mutationFn: (domain: string) => usersApi.addDomain(domain),
    onSuccess: () => { toast.success('Domain added'); setNewDomain(''); qc.invalidateQueries({ queryKey: ['me'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const removeDomainMut = useMutation({
    mutationFn: (id: string) => usersApi.removeDomain(id),
    onSuccess: () => { toast.success('Domain removed'); qc.invalidateQueries({ queryKey: ['me'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const regenTokenMut = useMutation({
    mutationFn: () => usersApi.regenerateToken(),
    onSuccess: () => { toast.success('API token regenerated'); qc.invalidateQueries({ queryKey: ['me'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const changePwMut = useMutation({
    mutationFn: () => authApi.changePassword(curPw, newPw),
    onSuccess: () => { toast.success('Password changed'); setCurPw(''); setNewPw(''); setConfirmPw(''); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  function handleChangePw(e: React.FormEvent) {
    e.preventDefault();
    if (newPw !== confirmPw) { toast.error('Passwords do not match'); return; }
    if (newPw.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    changePwMut.mutate();
  }

  const fmt = (b: number) => b === 0 ? '∞' : b >= 1e9 ? (b/1e9).toFixed(1)+'GB' : (b/1e6).toFixed(0)+'MB';
  const storage = profile?.storage;
  const pct = storage?.unlimited ? 0 : Math.min(100, Math.round((storage?.used / storage?.limit) * 100)) || 0;

  const s = {
    card:  { background:'#16161f', border:'1px solid #22222e', borderRadius:10, padding:24, marginBottom:16 } as React.CSSProperties,
    title: { fontSize:11, color:'#6b6b80', textTransform:'uppercase' as const, letterSpacing:2, fontFamily:'monospace', marginBottom:16 },
    label: { display:'block', fontSize:11, color:'#6b6b80', textTransform:'uppercase' as const, letterSpacing:1, marginBottom:6, fontFamily:'monospace' },
    input: { width:'100%', background:'#111118', border:'1px solid #22222e', borderRadius:6, color:'#e8e8f0', padding:'9px 12px', fontSize:13, outline:'none', fontFamily:'inherit' },
    row:   { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid #22222e' } as React.CSSProperties,
  };

  if (isLoading) return <div style={{ color:'#6b6b80', padding:40, textAlign:'center' }}>Loading…</div>;

  return (
    <div style={{ maxWidth:680 }}>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>Settings</h1>
        <p style={{ color:'#6b6b80', fontSize:13 }}>Manage your account and API access</p>
      </div>

      {/* Profile Info */}
      <div style={s.card}>
        <div style={s.title}>Account</div>
        <div style={s.row}>
          <div><div style={{ fontWeight:600 }}>{profile?.username}</div><div style={{ fontSize:11, color:'#6b6b80', fontFamily:'monospace' }}>Username</div></div>
          <span style={{ fontSize:11, fontFamily:'monospace', color: profile?.role==='admin'?'#ff4f7b':'#6b6b80', background: profile?.role==='admin'?'rgba(255,79,123,.12)':'rgba(255,255,255,.06)', padding:'2px 10px', borderRadius:4 }}>{profile?.role}</span>
        </div>
        {storage && (
          <div style={{ ...s.row, borderBottom:'none' }}>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:600, marginBottom:6 }}>Storage</div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, fontFamily:'monospace', marginBottom:6 }}>
                <span style={{ color:'#5d4fff' }}>{fmt(storage.used)} used</span>
                <span style={{ color:'#6b6b80' }}>{fmt(storage.limit)} limit</span>
              </div>
              <div style={{ height:6, background:'#22222e', borderRadius:3 }}>
                <div style={{ height:'100%', width:`${pct}%`, background: pct>90?'#ff4444':pct>70?'#ffb830':'#5d4fff', borderRadius:3 }} />
              </div>
              <div style={{ fontSize:11, color:'#6b6b80', marginTop:4, fontFamily:'monospace' }}>{storage.unlimited ? 'Unlimited storage' : `${pct}% used`}</div>
            </div>
          </div>
        )}
      </div>

      {/* API Token */}
      <div style={s.card}>
        <div style={s.title}>API Token</div>
        <p style={{ fontSize:12, color:'#6b6b80', marginBottom:16, lineHeight:1.6 }}>
          Use this token to call <code style={{ color:'#5d4fff', background:'rgba(93,79,255,.1)', padding:'1px 6px', borderRadius:3 }}>POST /api/embed</code> from your external sites to generate iframe embeds.
        </p>
        <div style={{ display:'flex', gap:8, marginBottom:12 }}>
          <div style={{ flex:1, background:'#0a0a0f', border:'1px solid #22222e', borderRadius:6, padding:'9px 12px', fontFamily:'monospace', fontSize:12, color:'#a0a0b8', wordBreak:'break-all' }}>
            {showToken ? profile?.apiToken : '•'.repeat(40)}
          </div>
          <button onClick={() => setShowToken(s => !s)} style={{ background:'none', border:'1px solid #22222e', borderRadius:6, color:'#6b6b80', padding:'0 12px', cursor:'pointer' }}>
            {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          {profile?.apiToken && <CopyBtn text={profile.apiToken} />}
        </div>
        {/* Email verification badge */}
        {profile?.email && (
          <div style={{ marginTop:12, padding:12, background:'#111118', borderRadius:6, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <div style={{ fontSize:11, color:'#6b6b80', fontFamily:'monospace', marginBottom:3 }}>EMAIL</div>
              <div style={{ fontSize:13 }}>{profile.email}</div>
            </div>
            {profile.emailVerified
              ? <span style={{ fontSize:11, fontFamily:'monospace', color:'#2dffb4', background:'rgba(45,255,180,.1)', padding:'3px 8px', borderRadius:4 }}>✓ Verified</span>
              : <button onClick={() => authExtApi.resendVerification().then(() => toast.success('Verification email sent!')).catch(e => toast.error(e.response?.data?.message || 'Failed'))}
                  style={{ fontSize:11, background:'rgba(255,184,48,.1)', border:'1px solid rgba(255,184,48,.3)', borderRadius:4, color:'#ffb830', padding:'4px 10px', cursor:'pointer' }}>
                  Resend Verification
                </button>
            }
          </div>
        )}

        <button onClick={() => { if(confirm('Regenerate API token? Old token will stop working immediately.')) regenTokenMut.mutate(); }}
          style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(255,184,48,.08)', border:'1px solid rgba(255,184,48,.2)', borderRadius:6, color:'#ffb830', padding:'7px 14px', fontSize:12, fontWeight:600, cursor:'pointer' }}>
          <RefreshCw size={12} /> Regenerate Token
        </button>

        {/* API Usage Example */}
        <div style={{ marginTop:16, padding:12, background:'#0a0a0f', borderRadius:6 }}>
          <div style={{ fontSize:10, color:'#6b6b80', textTransform:'uppercase', letterSpacing:1, fontFamily:'monospace', marginBottom:8 }}>Example Request</div>
          <pre style={{ fontSize:11, fontFamily:'monospace', color:'#a0a0b8', overflow:'auto', margin:0 }}>{`POST /api/embed
{
  "apiToken": "${showToken ? profile?.apiToken || '...' : '...your-api-token...'}",
  "videoId": "video-uuid-here",
  "watermark": "viewer@yoursite.com"
}`}</pre>
        </div>
      </div>

      {/* Allowed Domains */}
      <div style={s.card}>
        <div style={s.title}>Allowed Domains</div>
        <p style={{ fontSize:12, color:'#6b6b80', marginBottom:16, lineHeight:1.6 }}>
          Restrict which domains can embed your videos. Leave empty to allow all domains.<br />
          Supports wildcards: <code style={{ color:'#5d4fff', background:'rgba(93,79,255,.1)', padding:'1px 6px', borderRadius:3 }}>*.example.com</code>
        </p>

        {/* Domain list */}
        <div style={{ marginBottom:12 }}>
          {profile?.domains?.length === 0 && (
            <div style={{ padding:'12px 0', fontSize:13, color:'#6b6b80', fontStyle:'italic' }}>No domain restrictions — all origins allowed</div>
          )}
          {profile?.domains?.map((d: { id: string; domain: string }) => (
            <div key={d.id} style={s.row}>
              <span style={{ fontFamily:'monospace', fontSize:13 }}>{d.domain}</span>
              <button onClick={() => removeDomainMut.mutate(d.id)} style={{ background:'none', border:'none', color:'#6b6b80', cursor:'pointer', padding:4 }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        {/* Add domain */}
        <div style={{ display:'flex', gap:8 }}>
          <input
            value={newDomain}
            onChange={e => setNewDomain(e.target.value)}
            placeholder="example.com or *.example.com"
            style={{ ...s.input, flex:1 }}
            onKeyDown={e => { if (e.key === 'Enter' && newDomain.trim()) { e.preventDefault(); addDomainMut.mutate(newDomain.trim()); }}}
          />
          <button
            onClick={() => { if (newDomain.trim()) addDomainMut.mutate(newDomain.trim()); }}
            disabled={!newDomain.trim() || addDomainMut.isPending}
            style={{ display:'flex', alignItems:'center', gap:6, background:'#5d4fff', border:'none', borderRadius:6, color:'#fff', padding:'0 16px', fontSize:12, fontWeight:600, cursor:'pointer', opacity: !newDomain.trim()?0.5:1 }}>
            <Plus size={12} /> Add
          </button>
        </div>
      </div>

      {/* Change Password */}
      <div style={s.card}>
        <div style={s.title}>Change Password</div>
        <form onSubmit={handleChangePw} style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div>
            <label style={s.label}>Current Password</label>
            <input type="password" value={curPw} onChange={e => setCurPw(e.target.value)} style={s.input} placeholder="Current password" required />
          </div>
          <div>
            <label style={s.label}>New Password</label>
            <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} style={s.input} placeholder="Min 8 characters" required />
          </div>
          <div>
            <label style={s.label}>Confirm New Password</label>
            <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} style={s.input} placeholder="Repeat new password" required />
          </div>
          <button type="submit" disabled={changePwMut.isPending || !curPw || !newPw || !confirmPw}
            style={{ alignSelf:'flex-start', background:'#5d4fff', border:'none', borderRadius:6, color:'#fff', padding:'9px 20px', fontSize:13, fontWeight:600, cursor:'pointer', opacity: changePwMut.isPending?0.6:1 }}>
            {changePwMut.isPending ? 'Saving…' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
