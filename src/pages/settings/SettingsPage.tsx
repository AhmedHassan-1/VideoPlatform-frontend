// src/pages/settings/SettingsPage.tsx — Improved token UI, removed sessions/webhooks
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, RefreshCw, Eye, EyeOff, Copy, Check, Shield, Key } from 'lucide-react';
import { usersApi, authApi } from '../../services/api';
import toast from 'react-hot-toast';

declare const Swal: any;

function CopyBtn({ text, size = 'sm' }: { text: string; size?: 'sm' | 'md' }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); toast.success('Copied!'); setTimeout(() => setCopied(false), 2000); }}
      title="Copy to clipboard"
      style={{ background:'none', border:'1px solid var(--border)', borderRadius:6, color: copied ? '#2dffb4' : 'var(--text-muted)', padding: size === 'md' ? '7px 14px' : '5px 10px', cursor:'pointer', display:'flex', alignItems:'center', gap:5, fontSize:12, transition:'color .2s, border-color .2s', borderColor: copied ? 'rgba(45,255,180,.4)' : undefined }}>
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function TokenDisplay({ token }: { token: string }) {
  const [show, setShow] = useState(false);
  const masked = '•'.repeat(Math.min(40, token.length));

  return (
    <div style={{ background:'var(--bg-base)', border:'1px solid var(--border)', borderRadius:10, overflow:'hidden' }}>
      {/* Token value row */}
      <div style={{ display:'flex', alignItems:'center', gap:0 }}>
        <div style={{ flex:1, padding:'12px 14px', fontFamily:'JetBrains Mono,monospace', fontSize:12, color:'var(--text-dim)', wordBreak:'break-all', lineHeight:1.6, minHeight:44 }}>
          {show ? token : masked}
        </div>
        <div style={{ display:'flex', borderLeft:'1px solid var(--border)' }}>
          <button onClick={() => setShow(s => !s)} title={show ? 'Hide' : 'Show'}
            style={{ background:'none', border:'none', color:'var(--text-muted)', padding:'0 14px', cursor:'pointer', display:'flex', alignItems:'center', borderRight:'1px solid var(--border)', height:'100%' }}>
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          <div style={{ padding:'0 6px', display:'flex', alignItems:'center' }}>
            <CopyBtn text={token} />
          </div>
        </div>
      </div>

      {/* Token meta info */}
      <div style={{ borderTop:'1px solid var(--border)', padding:'10px 14px', display:'flex', gap:16, flexWrap:'wrap' }}>
        <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'JetBrains Mono,monospace' }}>
          <span style={{ opacity:.6 }}>PREFIX</span>{' '}
          <span style={{ color:'var(--accent)', background:'rgba(108,99,255,.12)', padding:'1px 6px', borderRadius:4 }}>{token.slice(0,8)}…</span>
        </div>
        <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'JetBrains Mono,monospace' }}>
          <span style={{ opacity:.6 }}>LENGTH</span>{' '}
          <span style={{ color:'var(--text-dim)' }}>{token.length} chars</span>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const qc = useQueryClient();
  const [newDomain, setNewDomain] = useState('');
  const [curPw, setCurPw]         = useState('');
  const [newPw, setNewPw]         = useState('');
  const [confirmPw, setConfirmPw] = useState('');

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

  async function handleChangePw(e: React.FormEvent) {
    e.preventDefault();
    if (newPw !== confirmPw) { toast.error('Passwords do not match'); return; }
    if (newPw.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    changePwMut.mutate();
  }

  async function handleRegenToken() {
    const r = await Swal.fire({
      title: 'Regenerate API Token?',
      text: 'The old token will stop working immediately. All existing integrations must be updated.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, regenerate',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
    });
    if (r.isConfirmed) regenTokenMut.mutate();
  }

  const fmt = (b: number) => b === 0 ? '∞' : b >= 1e9 ? (b/1e9).toFixed(1)+'GB' : (b/1e6).toFixed(0)+'MB';
  const storage = profile?.storage;
  const pct = storage?.unlimited ? 0 : Math.min(100, Math.round((storage?.used / storage?.limit) * 100)) || 0;

  if (isLoading) return (
    <div style={{ maxWidth:680 }}>
      {[1,2,3].map(i => <div key={i} className="s-card skeleton" style={{ height:140, marginBottom:16 }} />)}
    </div>
  );

  return (
    <div style={{ maxWidth:680 }}>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>Settings</h1>
        <p style={{ color:'var(--text-muted)', fontSize:13 }}>Account, API access, and security settings</p>
      </div>

      {/* ── Account Info ── */}
      <div className="s-card animate-fadeInUp" style={{ padding:22, marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
          <Shield size={15} color="var(--accent)" />
          <span style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:2, fontWeight:700 }}>Account</span>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:16, padding:'14px 16px', background:'var(--bg-base)', borderRadius:10 }}>
          <div style={{ width:44, height:44, borderRadius:12, background: profile?.role === 'admin' ? 'linear-gradient(135deg,#ff4d8d,#ffb800)' : 'linear-gradient(135deg,#6c63ff,#ff4d8d)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:18, color:'#fff', flexShrink:0 }}>
            {profile?.username?.[0]?.toUpperCase()}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700, fontSize:15 }}>{profile?.username}</div>
            <span style={{ fontSize:11, fontFamily:'JetBrains Mono,monospace', color: profile?.role === 'admin' ? '#ff4f7b' : 'var(--text-muted)', background: profile?.role === 'admin' ? 'rgba(255,79,123,.12)' : 'rgba(255,255,255,.06)', padding:'2px 10px', borderRadius:4 }}>
              {profile?.role}
            </span>
          </div>
        </div>

        {storage && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, fontFamily:'JetBrains Mono,monospace', marginBottom:6 }}>
              <span style={{ color:'var(--accent)' }}>{fmt(storage.used)} used</span>
              <span style={{ color:'var(--text-muted)' }}>{fmt(storage.limit)} limit</span>
            </div>
            <div style={{ height:6, background:'var(--border)', borderRadius:3, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${pct}%`, background: pct>90?'var(--accent-err)':pct>70?'var(--accent-warn)':'var(--accent)', borderRadius:3, transition:'width .5s ease' }} />
            </div>
            <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:5, fontFamily:'JetBrains Mono,monospace' }}>
              {storage.unlimited ? 'Unlimited storage' : `${pct}% used`}
            </div>
          </div>
        )}
      </div>

      {/* ── API Token ── */}
      <div className="s-card animate-fadeInUp delay-1" style={{ padding:22, marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
          <Key size={15} color="var(--accent)" />
          <span style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:2, fontWeight:700 }}>API Token</span>
        </div>
        <p style={{ fontSize:12, color:'var(--text-muted)', marginBottom:14, lineHeight:1.7 }}>
          Use this token to generate iframe embed codes via{' '}
          <code style={{ color:'var(--accent)', background:'rgba(108,99,255,.1)', padding:'1px 6px', borderRadius:4, fontFamily:'JetBrains Mono,monospace' }}>POST /api/embed</code>.
          Keep it private — it grants access to your videos.
        </p>

        {profile?.apiToken && <TokenDisplay token={profile.apiToken} />}

        <div style={{ display:'flex', gap:10, marginTop:14, flexWrap:'wrap' }}>
          <button onClick={handleRegenToken} disabled={regenTokenMut.isPending}
            style={{ display:'flex', alignItems:'center', gap:7, background:'rgba(255,184,48,.08)', border:'1px solid rgba(255,184,48,.25)', borderRadius:8, color:'var(--accent-warn)', padding:'8px 16px', fontSize:12, fontWeight:700, cursor:'pointer' }}>
            <RefreshCw size={13} className={regenTokenMut.isPending ? 'spin' : ''} />
            {regenTokenMut.isPending ? 'Regenerating…' : 'Regenerate Token'}
          </button>
        </div>

        {/* Usage example */}
        <details style={{ marginTop:16 }}>
          <summary style={{ fontSize:11, color:'var(--text-muted)', cursor:'pointer', userSelect:'none', fontFamily:'JetBrains Mono,monospace', letterSpacing:1 }}>
            SHOW USAGE EXAMPLE
          </summary>
          <div style={{ marginTop:12, padding:14, background:'var(--bg-base)', borderRadius:8, border:'1px solid var(--border)' }}>
            <div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:1, fontFamily:'JetBrains Mono,monospace', marginBottom:8 }}>Example</div>
            <pre style={{ fontSize:11, fontFamily:'JetBrains Mono,monospace', color:'var(--text-dim)', overflow:'auto', margin:0 }}>{`POST /api/embed
{
  "apiToken": "your-token-here",
  "videoId": "video-uuid",
  "watermark": "optional-user-id"
}`}</pre>
          </div>
        </details>
      </div>

      {/* ── Allowed Domains ── */}
      <div className="s-card animate-fadeInUp delay-2" style={{ padding:22, marginBottom:16 }}>
        <div style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:2, fontWeight:700, marginBottom:6 }}>Allowed Domains</div>
        <p style={{ fontSize:12, color:'var(--text-muted)', marginBottom:16, lineHeight:1.6 }}>
          Only these domains can embed your videos. Leave empty to allow all.
        </p>

        {(profile?.allowedDomains || []).map((d: any) => (
          <div key={d.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:'var(--bg-base)', borderRadius:8, marginBottom:8, border:'1px solid var(--border)' }}>
            <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:13, color:'var(--text)' }}>{d.domain}</span>
            <button onClick={() => removeDomainMut.mutate(d.id)}
              style={{ background:'none', border:'none', color:'var(--accent-err)', cursor:'pointer', padding:'4px 8px', display:'flex', alignItems:'center' }}>
              <Trash2 size={13} />
            </button>
          </div>
        ))}

        <div style={{ display:'flex', gap:8, marginTop:8 }}>
          <input className="s-input" style={{ flex:1 }} value={newDomain}
            onChange={e => setNewDomain(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (newDomain.trim()) addDomainMut.mutate(newDomain.trim()); } }}
            placeholder="example.com" />
          <button onClick={() => { if (newDomain.trim()) addDomainMut.mutate(newDomain.trim()); }}
            disabled={!newDomain.trim() || addDomainMut.isPending}
            className="s-btn s-btn-primary" style={{ padding:'0 16px', whiteSpace:'nowrap' }}>
            <Plus size={14} /> Add
          </button>
        </div>
      </div>

      {/* ── Change Password ── */}
      <div className="s-card animate-fadeInUp delay-3" style={{ padding:22, marginBottom:16 }}>
        <div style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:2, fontWeight:700, marginBottom:16 }}>Change Password</div>
        <form onSubmit={handleChangePw}>
          <div style={{ marginBottom:12 }}>
            <label className="s-label">Current Password</label>
            <input className="s-input" type="password" value={curPw} onChange={e => setCurPw(e.target.value)} placeholder="Current password" required />
          </div>
          <div style={{ marginBottom:12 }}>
            <label className="s-label">New Password</label>
            <input className="s-input" type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Min 8 characters" required minLength={8} />
          </div>
          <div style={{ marginBottom:16 }}>
            <label className="s-label">Confirm New Password</label>
            <input className="s-input" type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Repeat new password" required />
          </div>
          <button type="submit" disabled={changePwMut.isPending} className="s-btn s-btn-primary">
            {changePwMut.isPending ? 'Saving…' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
