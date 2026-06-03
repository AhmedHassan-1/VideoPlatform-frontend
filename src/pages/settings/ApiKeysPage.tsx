// src/pages/settings/ApiKeysPage.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Copy, Check, Key, AlertTriangle } from 'lucide-react';
import { apiKeysApi } from '../../services/api';
import toast from 'react-hot-toast';

const EVENTS = ['video.ready','video.error','video.queued','video.progress'];

export default function ApiKeysPage() {
  const qc = useQueryClient();
  const [label, setLabel]       = useState('');
  const [expires, setExpires]   = useState('');
  const [newKey, setNewKey]     = useState<string|null>(null);
  const [copied, setCopied]     = useState(false);
  const [showForm, setShowForm] = useState(false);

  const { data: keys, isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn:  () => apiKeysApi.list().then(r => r.data),
  });

  const createMut = useMutation({
    mutationFn: () => apiKeysApi.create(label || 'API Key', expires || undefined),
    onSuccess: (res) => {
      setNewKey(res.data.apiKey);
      setLabel(''); setExpires(''); setShowForm(false);
      qc.invalidateQueries({ queryKey: ['api-keys'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const revokeMut = useMutation({
    mutationFn: (id: string) => apiKeysApi.revoke(id),
    onSuccess: () => { toast.success('Key revoked'); qc.invalidateQueries({ queryKey: ['api-keys'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  function copyKey() {
    if (!newKey) return;
    navigator.clipboard.writeText(newKey);
    setCopied(true);
    toast.success('Key copied!');
    setTimeout(() => setCopied(false), 3000);
  }

  const s = {
    card:  { background:'#16161f', border:'1px solid #22222e', borderRadius:10, padding:24, marginBottom:16 } as React.CSSProperties,
    label: { display:'block', fontSize:11, color:'#6b6b80', textTransform:'uppercase' as const, letterSpacing:1, marginBottom:4, fontFamily:'monospace' },
    input: { width:'100%', background:'#111118', border:'1px solid #22222e', borderRadius:6, color:'#e8e8f0', padding:'8px 12px', fontSize:13, outline:'none' } as React.CSSProperties,
    row:   { display:'flex', alignItems:'center', gap:12, padding:'12px 0', borderBottom:'1px solid #22222e' } as React.CSSProperties,
  };

  return (
    <div style={{ maxWidth:680 }}>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>API Keys</h1>
        <p style={{ color:'#6b6b80', fontSize:13 }}>Create keys for programmatic access — each key is shown only once</p>
      </div>

      {/* New key revealed */}
      {newKey && (
        <div style={{ ...s.card, border:'1px solid rgba(45,255,180,.4)', background:'rgba(45,255,180,.05)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
            <AlertTriangle size={16} color="#ffb830" />
            <span style={{ fontWeight:600, color:'#ffb830' }}>Save this key now — it won't be shown again</span>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <div style={{ flex:1, background:'#0a0a0f', border:'1px solid #22222e', borderRadius:6, padding:'10px 12px', fontFamily:'monospace', fontSize:12, color:'#2dffb4', wordBreak:'break-all' }}>
              {newKey}
            </div>
            <button onClick={copyKey} style={{ background:'rgba(45,255,180,.15)', border:'1px solid rgba(45,255,180,.3)', borderRadius:6, color:'#2dffb4', padding:'8px 14px', cursor:'pointer', flexShrink:0 }}>
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
          <button onClick={() => setNewKey(null)} style={{ marginTop:10, background:'none', border:'none', color:'#6b6b80', cursor:'pointer', fontSize:12, padding:0 }}>
            I've saved this key ✓
          </button>
        </div>
      )}

      {/* Create form */}
      <div style={s.card}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom: showForm ? 16 : 0 }}>
          <div style={{ fontSize:11, color:'#6b6b80', textTransform:'uppercase', letterSpacing:2, fontFamily:'monospace' }}>
            {keys?.length || 0} / 10 keys
          </div>
          <button onClick={() => setShowForm(s => !s)}
            style={{ display:'flex', alignItems:'center', gap:6, background: showForm ? 'none' : '#5d4fff', border: showForm ? '1px solid #22222e' : 'none', borderRadius:6, color: showForm ? '#6b6b80' : '#fff', padding:'7px 14px', fontSize:12, fontWeight:600, cursor:'pointer' }}>
            <Plus size={12} /> {showForm ? 'Cancel' : 'New Key'}
          </button>
        </div>

        {showForm && (
          <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
            <div style={{ flex:2, minWidth:180 }}>
              <label style={s.label}>Label</label>
              <input value={label} onChange={e => setLabel(e.target.value)} style={s.input} placeholder="e.g. Production Site" />
            </div>
            <div style={{ flex:1, minWidth:160 }}>
              <label style={s.label}>Expires (optional)</label>
              <input type="date" value={expires} onChange={e => setExpires(e.target.value)} style={s.input} min={new Date().toISOString().split('T')[0]} />
            </div>
            <div style={{ alignSelf:'flex-end' }}>
              <button onClick={() => createMut.mutate()} disabled={createMut.isPending}
                style={{ background:'#5d4fff', border:'none', borderRadius:6, color:'#fff', padding:'9px 18px', fontSize:12, fontWeight:600, cursor:'pointer', opacity: createMut.isPending ? 0.6 : 1 }}>
                {createMut.isPending ? 'Creating…' : 'Create Key'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Keys list */}
      <div style={s.card}>
        {isLoading ? <div style={{ color:'#6b6b80', textAlign:'center', padding:16 }}>Loading…</div> :
          keys?.length === 0 ? <div style={{ color:'#6b6b80', textAlign:'center', padding:20, fontSize:13 }}>No API keys yet</div> :
          keys?.map((k: any) => {
            const expired = k.expiresAt && new Date(k.expiresAt) < new Date();
            return (
              <div key={k.id} style={s.row}>
                <div style={{ width:36, height:36, borderRadius:8, background: k.isActive && !expired ? 'rgba(93,79,255,.15)' : 'rgba(255,68,68,.1)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Key size={16} color={k.isActive && !expired ? '#5d4fff' : '#ff4444'} />
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, fontSize:13 }}>{k.label}</div>
                  <div style={{ fontSize:11, fontFamily:'monospace', color:'#6b6b80', marginTop:2 }}>
                    {k.prefix}
                    {k.lastUsed && ` · Last used ${new Date(k.lastUsed).toLocaleDateString()}`}
                    {k.expiresAt && ` · ${expired ? '⚠ Expired' : `Expires ${new Date(k.expiresAt).toLocaleDateString()}`}`}
                    {!k.isActive && ' · Revoked'}
                  </div>
                </div>
                {k.isActive && !expired && (
                  <button onClick={() => { if(confirm(`Revoke "${k.label}"?`)) revokeMut.mutate(k.id); }}
                    style={{ background:'none', border:'1px solid rgba(255,68,68,.3)', borderRadius:6, color:'#ff4444', padding:'5px 10px', cursor:'pointer', fontSize:11 }}>
                    Revoke
                  </button>
                )}
              </div>
            );
          })
        }
      </div>

      {/* Usage example */}
      <div style={{ ...s.card, background:'#0e0e16' }}>
        <div style={{ fontSize:11, color:'#6b6b80', textTransform:'uppercase', letterSpacing:2, fontFamily:'monospace', marginBottom:10 }}>Usage</div>
        <pre style={{ fontSize:11, fontFamily:'monospace', color:'#a0a0b8', overflow:'auto', margin:0 }}>{`POST /api/embed
Authorization: Bearer sk_your_api_key_here
Content-Type: application/json

{
  "videoId": "your-video-uuid",
  "watermark": "viewer@example.com"
}`}</pre>
      </div>
    </div>
  );
}
