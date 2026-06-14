// src/pages/settings/ApiKeysPage.tsx — Improved token UI with copy/show/hide
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Copy, Check, Key, Eye, EyeOff, RefreshCw, Shield } from 'lucide-react';
import { apiKeysApi } from '../../services/api';

declare const Swal: any;

function CopyBtn({ text, label = 'Copy', size = 14 }: { text: string; label?: string; size?: number }) {
  const [copied, setCopied] = useState(false);
  function doCopy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button onClick={doCopy} title="Copy to clipboard"
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        background: copied ? 'rgba(45,255,180,.1)' : 'rgba(108,99,255,.08)',
        border: `1px solid ${copied ? 'rgba(45,255,180,.35)' : 'rgba(108,99,255,.25)'}`,
        borderRadius: 7, padding: '6px 12px',
        color: copied ? '#2dffb4' : 'var(--accent)',
        fontSize: 12, fontWeight: 700, cursor: 'pointer',
        transition: 'all .2s',
      }}>
      {copied ? <Check size={size - 2} /> : <Copy size={size - 2} />}
      {copied ? 'Copied!' : label}
    </button>
  );
}

function TokenReveal({ token }: { token: string }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ background: 'rgba(45,255,180,.04)', border: '1px solid rgba(45,255,180,.2)', borderRadius: 10, overflow: 'hidden', marginBottom: 20 }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(45,255,180,.15)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Shield size={14} color="#2dffb4" />
        <span style={{ fontSize: 11, fontWeight: 700, color: '#2dffb4', textTransform: 'uppercase', letterSpacing: 1.5 }}>New Key Created</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,.35)', fontFamily: 'JetBrains Mono,monospace' }}>Save this — shown once only</span>
      </div>

      {/* Token value */}
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <code style={{
          flex: 1, fontFamily: 'JetBrains Mono,monospace', fontSize: 12, lineHeight: 1.6,
          wordBreak: 'break-all', color: show ? '#2dffb4' : 'transparent',
          background: show ? 'transparent' : 'rgba(45,255,180,.08)',
          borderRadius: show ? 0 : 6, padding: show ? 0 : '2px 6px',
          userSelect: show ? 'text' : 'none', transition: 'all .2s',
        }}>
          {show ? token : '•'.repeat(Math.min(token.length, 48))}
        </code>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={() => setShow(s => !s)} title={show ? 'Hide' : 'Reveal'}
            style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 7, padding: '6px 10px', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12 }}>
            {show ? <EyeOff size={12} /> : <Eye size={12} />}
            {show ? 'Hide' : 'Reveal'}
          </button>
          <CopyBtn text={token} label="Copy Key" />
        </div>
      </div>

      {/* Warning */}
      <div style={{ padding: '10px 16px', background: 'rgba(255,184,0,.06)', borderTop: '1px solid rgba(255,184,0,.15)', fontSize: 11, color: 'rgba(255,184,0,.8)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 14 }}>⚠</span>
        This key will not be shown again. Copy it to a secure location before closing this page.
      </div>
    </div>
  );
}

const fmtDate = (d: string) => new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
const isExpired = (d: string | null) => d ? new Date(d) < new Date() : false;

export default function ApiKeysPage() {
  const qc = useQueryClient();
  const [label, setLabel]     = useState('');
  const [expires, setExpires] = useState('');
  const [newKey, setNewKey]   = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId]   = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');

  const { data: keys, isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn:  () => apiKeysApi.list().then(r => r.data),
  });

  const createMut = useMutation({
    mutationFn: () => apiKeysApi.create(label.trim() || 'API Key', expires || undefined),
    onSuccess: (res) => {
      setNewKey(res.data.apiKey || res.data.key);
      setLabel(''); setExpires(''); setShowForm(false);
      qc.invalidateQueries({ queryKey: ['api-keys'] });
    },
    onError: (e: any) => Swal.fire({ icon: 'error', title: 'Failed', text: e.response?.data?.message || 'Could not create key' }),
  });

  const revokeMut = useMutation({
    mutationFn: (id: string) => apiKeysApi.revoke(id),
    onSuccess: () => {
      Swal.fire({ icon: 'success', title: 'Key revoked', timer: 1500, showConfirmButton: false });
      qc.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });

  const updateLabelMut = useMutation({
    mutationFn: ({ id, label }: { id: string; label: string }) => apiKeysApi.updateLabel(id, label),
    onSuccess: () => { setEditId(null); qc.invalidateQueries({ queryKey: ['api-keys'] }); },
  });

  const revokeAllMut = useMutation({
    mutationFn: () => apiKeysApi.revoke_all(),
    onSuccess: () => {
      Swal.fire({ icon: 'info', title: 'All keys revoked', timer: 1500, showConfirmButton: false });
      qc.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });

  async function handleRevoke(id: string, lbl: string) {
    const r = await Swal.fire({
      title: `Revoke "${lbl}"?`,
      text: 'Any integrations using this key will stop working immediately.',
      icon: 'warning', showCancelButton: true,
      confirmButtonText: 'Revoke', confirmButtonColor: '#ff4757',
      cancelButtonText: 'Cancel', reverseButtons: true,
    });
    if (r.isConfirmed) revokeMut.mutate(id);
  }

  async function handleRevokeAll() {
    const r = await Swal.fire({
      title: 'Revoke ALL keys?',
      html: '<div style="color:#ff6b6b">All your API keys will be deleted. This cannot be undone.</div>',
      icon: 'error', showCancelButton: true,
      confirmButtonText: 'Yes, revoke all', confirmButtonColor: '#ff4757',
      cancelButtonText: 'Cancel', reverseButtons: true,
    });
    if (r.isConfirmed) revokeAllMut.mutate();
  }

  const keyList = (keys as any[]) || [];
  const today = new Date().toISOString().split('T')[0];

  return (
    <div style={{ maxWidth: 680 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <Key size={18} color="var(--accent)" />
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>API Keys</h1>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.6 }}>
          Use API keys to authenticate programmatic access. Each key can be labelled and optionally set to expire.
        </p>
      </div>

      {/* Newly created key banner */}
      {newKey && <TokenReveal token={newKey} />}

      {/* Create form */}
      <div className="s-card animate-fadeInUp" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showForm ? 16 : 0 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-dim)' }}>
            {keyList.length} key{keyList.length !== 1 ? 's' : ''}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            {keyList.length > 0 && (
              <button onClick={handleRevokeAll} disabled={revokeAllMut.isPending}
                className="s-btn s-btn-sm"
                style={{ background: 'rgba(255,71,87,.08)', border: '1px solid rgba(255,71,87,.25)', color: 'var(--accent-err)', padding: '6px 12px', fontSize: 12 }}>
                <Trash2 size={12} /> Revoke all
              </button>
            )}
            <button onClick={() => { setShowForm(f => !f); setNewKey(null); }}
              className="s-btn s-btn-primary s-btn-sm">
              <Plus size={13} /> New Key
            </button>
          </div>
        </div>

        {showForm && (
          <div className="animate-fadeInUp" style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label className="s-label">Label</label>
                <input className="s-input" value={label} onChange={e => setLabel(e.target.value)}
                  placeholder="e.g. My Integration" maxLength={80} autoFocus />
              </div>
              <div>
                <label className="s-label">Expires <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                <input className="s-input" type="date" value={expires} min={today}
                  onChange={e => setExpires(e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => createMut.mutate()} disabled={createMut.isPending} className="s-btn s-btn-primary">
                {createMut.isPending
                  ? <><span style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite' }}></span> Creating…</>
                  : <><Plus size={13} /> Create Key</>}
              </button>
              <button onClick={() => { setShowForm(false); setLabel(''); setExpires(''); }}
                className="s-btn s-btn-ghost">Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* Keys list */}
      {isLoading ? (
        <div className="s-card" style={{ padding: 24 }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 56, marginBottom: 8 }} />)}
        </div>
      ) : keyList.length === 0 ? (
        <div className="s-card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <i className="bi bi-key" style={{ fontSize: 40, display: 'block', marginBottom: 14, opacity: .25 }}></i>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 6 }}>No API keys</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Create a key to start integrating.</div>
        </div>
      ) : (
        <div className="s-card animate-fadeInUp delay-1" style={{ overflow: 'hidden' }}>
          {keyList.map((k: any, i: number) => {
            const expired = isExpired(k.expiresAt);
            const expiringSoon = k.expiresAt && !expired
              ? (new Date(k.expiresAt).getTime() - Date.now()) < 7 * 24 * 3600 * 1000
              : false;

            return (
              <div key={k.id}
                className={`animate-fadeInUp delay-${Math.min(i + 1, 5)}`}
                style={{
                  padding: '14px 18px',
                  borderBottom: i < keyList.length - 1 ? '1px solid var(--border)' : 'none',
                  display: 'flex', alignItems: 'center', gap: 14,
                  opacity: expired ? .55 : 1,
                  transition: 'background .15s',
                }}>

                {/* Icon */}
                <div style={{
                  width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                  background: expired ? 'rgba(255,71,87,.1)' : 'rgba(108,99,255,.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Key size={14} color={expired ? 'var(--accent-err)' : 'var(--accent)'} />
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {editId === k.id ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input className="s-input" style={{ flex: 1, padding: '5px 10px', fontSize: 12 }}
                        value={editLabel} onChange={e => setEditLabel(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') updateLabelMut.mutate({ id: k.id, label: editLabel }); if (e.key === 'Escape') setEditId(null); }}
                        autoFocus />
                      <button onClick={() => updateLabelMut.mutate({ id: k.id, label: editLabel })}
                        className="s-btn s-btn-primary s-btn-sm" style={{ padding: '4px 10px' }}>
                        <Check size={12} />
                      </button>
                      <button onClick={() => setEditId(null)} className="s-btn s-btn-ghost s-btn-sm" style={{ padding: '4px 10px' }}>✕</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{k.label}</span>
                      {expired && <span className="s-badge badge-error">Expired</span>}
                      {expiringSoon && !expired && <span className="s-badge badge-warning">Expiring soon</span>}
                      <button onClick={() => { setEditId(k.id); setEditLabel(k.label); }}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0 4px', opacity: .6, fontSize: 11 }}>
                        ✎
                      </button>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono,monospace', color: 'var(--text-muted)' }}>
                      <span style={{ opacity: .6 }}>PREFIX </span>
                      <span style={{ color: 'var(--accent)', background: 'rgba(108,99,255,.1)', padding: '1px 5px', borderRadius: 4 }}>
                        {k.keyPrefix || k.prefix || (k.id || '').slice(0, 8)}…
                      </span>
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono,monospace' }}>
                      Created {fmtDate(k.createdAt)}
                    </span>
                    {k.expiresAt && (
                      <span style={{ fontSize: 11, color: expiringSoon ? 'var(--accent-warn)' : expired ? 'var(--accent-err)' : 'var(--text-muted)', fontFamily: 'JetBrains Mono,monospace' }}>
                        {expired ? 'Expired' : 'Expires'} {fmtDate(k.expiresAt)}
                      </span>
                    )}
                    {k.lastUsedAt && (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono,monospace' }}>
                        Last used {fmtDate(k.lastUsedAt)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <button onClick={() => handleRevoke(k.id, k.label)}
                  disabled={revokeMut.isPending}
                  title="Revoke key"
                  style={{ background: 'none', border: '1px solid rgba(255,71,87,.25)', borderRadius: 7, color: 'var(--accent-err)', cursor: 'pointer', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, flexShrink: 0, transition: 'all .15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,71,87,.1)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                  <Trash2 size={12} /> Revoke
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Usage note */}
      <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(108,99,255,.06)', border: '1px solid rgba(108,99,255,.2)', borderRadius: 10, fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.7 }}>
        <i className="bi bi-info-circle" style={{ color: 'var(--accent)', marginRight: 8 }}></i>
        API keys are used in <code style={{ fontFamily: 'JetBrains Mono,monospace', color: 'var(--accent)', background: 'rgba(108,99,255,.1)', padding: '1px 5px', borderRadius: 4 }}>X-Api-Key</code> header or as a Bearer token to access protected endpoints.
      </div>
    </div>
  );
}
