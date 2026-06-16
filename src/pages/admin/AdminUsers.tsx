// src/pages/admin/AdminUsers.tsx — Updated:
//   - allowedQualities: checkbox picker (any combination) instead of int dropdown
//   - Bandwidth per user, English numbers, no spinners
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/api';

declare const Swal: any;

const ALL_QUALITIES = ['2160p','1440p','1080p','720p','480p','360p','240p'];

function fmtBytes(b: number): string {
  if (!b || b <= 0) return '0 B';
  const u = ['B','KB','MB','GB','TB'];
  const i = Math.floor(Math.log(b) / Math.log(1024));
  return (b / Math.pow(1024, i)).toFixed(1).replace(/\.0$/, '') + ' ' + u[i];
}
function fmtStorage(b: number) { return b === 0 ? '∞' : fmtBytes(b); }

const numStyle: React.CSSProperties = { MozAppearance: 'textfield' } as any;
const lStyle: React.CSSProperties = { display:'block', fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:1, marginBottom:6, fontWeight:700 };

// ── Quality checkbox picker ────────────────────────────────────────────────────
function QualityPicker({ value, onChange }: {
  value: string[] | null;  // null = all allowed
  onChange: (v: string[] | null) => void;
}) {
  const isAll  = value === null;
  const active = new Set(value ?? ALL_QUALITIES);

  function toggle(q: string) {
    if (isAll) {
      // Switch from "all" to explicit list with this one deselected
      onChange(ALL_QUALITIES.filter(x => x !== q));
    } else {
      const next = active.has(q) ? [...active].filter(x => x !== q) : [...active, q].sort((a,b) => ALL_QUALITIES.indexOf(a)-ALL_QUALITIES.indexOf(b));
      // If all selected → set to null (unlimited)
      onChange(next.length === ALL_QUALITIES.length ? null : next);
    }
  }

  return (
    <div>
      <div style={{ display:'flex', gap:6, marginBottom:8 }}>
        <button type="button" onClick={() => onChange(null)}
          className="s-btn s-btn-sm"
          style={{ fontSize:11, background:isAll?'var(--accent)':'var(--bg-elevated)', color:isAll?'#fff':'var(--text-muted)', border:isAll?'none':'1px solid var(--border)' }}>
          All (Unlimited)
        </button>
        <button type="button" onClick={() => onChange([])}
          className="s-btn s-btn-sm"
          style={{ fontSize:11, background:'none', color:'var(--text-muted)', border:'1px solid var(--border)' }}>
          Clear
        </button>
      </div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
        {ALL_QUALITIES.map(q => {
          const checked = isAll || active.has(q);
          return (
            <button key={q} type="button" onClick={() => toggle(q)}
              style={{
                padding:'5px 12px', borderRadius:6, fontSize:12, fontWeight:checked?700:400,
                cursor:'pointer', border:`1.5px solid ${checked?'var(--accent)':'var(--border)'}`,
                background:checked?'rgba(108,99,255,.12)':'var(--bg-base)',
                color:checked?'var(--accent)':'var(--text-muted)',
                transition:'all .15s', display:'flex', alignItems:'center', gap:5,
              }}>
              {checked && <i className="bi bi-check2" style={{ fontSize:11 }}></i>}
              {q}
            </button>
          );
        })}
      </div>
      {value !== null && value.length === 0 && (
        <div style={{ fontSize:11, color:'var(--accent-err)', marginTop:6 }}>
          <i className="bi bi-exclamation-triangle" style={{ marginRight:4 }}></i>
          No qualities selected — user won't be able to upload.
        </div>
      )}
      {value !== null && value.length > 0 && (
        <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:6 }}>
          Allowed: <strong style={{ color:'var(--text)' }}>{value.join(', ')}</strong>
        </div>
      )}
      {value === null && (
        <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:6 }}>
          All qualities allowed — no restriction.
        </div>
      )}
    </div>
  );
}

function SModal({ title, onClose, onSave, children, saving }: {
  title:string; onClose:()=>void; onSave:()=>void; children:React.ReactNode; saving?:boolean;
}) {
  return (
    <div onClick={e => { if(e.target===e.currentTarget) onClose(); }}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, backdropFilter:'blur(4px)' }}>
      <div className="s-card animate-bounceIn" style={{ padding:28, width:580, maxHeight:'90vh', overflow:'auto' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22 }}>
          <div style={{ fontSize:16, fontWeight:800 }}>{title}</div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:18 }}>×</button>
        </div>
        {children}
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:22 }}>
          <button onClick={onClose} className="s-btn s-btn-ghost"><i className="bi bi-x-circle"></i> Cancel</button>
          <button onClick={onSave} disabled={saving} className="s-btn s-btn-primary">
            {saving
              ? <><span style={{ display:'inline-block', width:13, height:13, border:'2px solid rgba(255,255,255,.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin .7s linear infinite' }}></span> Saving…</>
              : <><i className="bi bi-check2"></i> Save</>}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminUsers() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editUser,   setEditUser]   = useState<any>(null);
  const [search,     setSearch]     = useState('');

  const emptyCreate = { username:'', password:'', role:'user', storageLimitGB:'10', bandwidthLimitGB:'0', notes:'', allowedQualities: null as string[] | null };
  const emptyEdit   = { role:'user', storageLimitGB:'10', bandwidthLimitGB:'0', password:'', notes:'', allowedQualities: null as string[] | null };

  const [form,     setForm]     = useState(emptyCreate);
  const [editForm, setEditForm] = useState(emptyEdit);

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin','users'],
    queryFn: () => adminApi.users().then(r => r.data),
  });

  const createMut = useMutation({
    mutationFn: () => adminApi.createUser({
      username:            form.username,
      password:            form.password,
      role:                form.role,
      storageLimitBytes:   parseFloat(form.storageLimitGB)   * 1073741824,
      bandwidthLimitBytes: parseFloat(form.bandwidthLimitGB) * 1073741824,
      notes:               form.notes || undefined,
      allowedQualities:    form.allowedQualities,
    }),
    onSuccess: () => {
      Swal.fire({ icon:'success', title:'User created', timer:1500, showConfirmButton:false });
      setShowCreate(false); setForm(emptyCreate);
      qc.invalidateQueries({ queryKey:['admin','users'] });
    },
    onError: (e: any) => Swal.fire({ icon:'error', title:'Failed', text:e.response?.data?.message||'Create failed' }),
  });

  const updateMut = useMutation({
    mutationFn: () => adminApi.updateUser(editUser.id, {
      role:                editForm.role,
      storageLimitBytes:   parseFloat(editForm.storageLimitGB)   * 1073741824,
      bandwidthLimitBytes: parseFloat(editForm.bandwidthLimitGB) * 1073741824,
      notes:               editForm.notes || null,
      allowedQualities:    editForm.allowedQualities,
      ...(editForm.password ? { password: editForm.password } : {}),
    }),
    onSuccess: () => {
      Swal.fire({ icon:'success', title:'User updated', timer:1200, showConfirmButton:false });
      setEditUser(null);
      qc.invalidateQueries({ queryKey:['admin','users'] });
    },
    onError: (e: any) => Swal.fire({ icon:'error', title:'Update failed', text:e.response?.data?.message }),
  });

  const disableMut = useMutation({
    mutationFn: (id: string) => adminApi.disableUser(id),
    onSuccess: () => { Swal.fire({ icon:'info', title:'User disabled', timer:1200, showConfirmButton:false }); qc.invalidateQueries({ queryKey:['admin','users'] }); },
  });
  const enableMut = useMutation({
    mutationFn: (id: string) => adminApi.enableUser(id),
    onSuccess: () => { Swal.fire({ icon:'success', title:'User enabled', timer:1200, showConfirmButton:false }); qc.invalidateQueries({ queryKey:['admin','users'] }); },
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => adminApi.deleteUser(id),
    onSuccess: () => { Swal.fire({ icon:'success', title:'User deleted', timer:1500, showConfirmButton:false }); qc.invalidateQueries({ queryKey:['admin','users'] }); },
    onError: (e: any) => Swal.fire({ icon:'error', title:'Delete failed', text:e.response?.data?.message }),
  });
  const resetBandwidthMut = useMutation({
    mutationFn: (id: string) => adminApi.resetBandwidth(id),
    onSuccess: () => { Swal.fire({ icon:'success', title:'Bandwidth reset', timer:1200, showConfirmButton:false }); qc.invalidateQueries({ queryKey:['admin','users'] }); },
  });

  async function handleDisable(u: any) {
    const r = await Swal.fire({ title:`Disable "${u.username}"?`, icon:'warning', showCancelButton:true, confirmButtonText:'Disable', reverseButtons:true });
    if (r.isConfirmed) disableMut.mutate(u.id);
  }
  async function handleDelete(u: any) {
    const r = await Swal.fire({
      title:`Permanently delete "${u.username}"?`,
      html:`<div style="color:#ff4757">This will delete the user and all their videos. This <strong>cannot be undone</strong>.</div>`,
      icon:'error', showCancelButton:true, input:'text', inputPlaceholder:`Type "${u.username}" to confirm`,
      confirmButtonText:'Yes, delete permanently', confirmButtonColor:'#ff4757', reverseButtons:true,
      preConfirm: (val: string) => { if(val!==u.username){Swal.showValidationMessage('Username does not match');return false;} }
    });
    if (r.isConfirmed) deleteMut.mutate(u.id);
  }

  function openEdit(u: any) {
    setEditUser(u);
    setEditForm({
      role:             u.role,
      storageLimitGB:   u.storageLimitBytes  === 0 ? '0' : String((u.storageLimitBytes  / 1073741824).toFixed(1)),
      bandwidthLimitGB: u.bandwidthLimitBytes === 0 ? '0' : String((u.bandwidthLimitBytes / 1073741824).toFixed(1)),
      password:         '',
      notes:            u.notes || '',
      allowedQualities: u.allowedQualities ?? null,
    });
  }

  const userList = ((users as any[]) || []).filter((u: any) => !search || u.username.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="animate-fadeInUp" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:800, marginBottom:4 }}>Users</h1>
          <p style={{ color:'var(--text-muted)', fontSize:14 }}>{userList.length} user{userList.length!==1?'s':''}</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="s-btn s-btn-primary">
          <i className="bi bi-person-plus-fill"></i> Create User
        </button>
      </div>

      <div className="animate-fadeInUp delay-1" style={{ marginBottom:16 }}>
        <div style={{ position:'relative', maxWidth:320 }}>
          <i className="bi bi-search" style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', fontSize:14 }}></i>
          <input className="s-input" style={{ paddingLeft:36 }} placeholder="Search users…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="s-card animate-fadeInUp delay-2" style={{ overflow:'hidden' }}>
        {isLoading ? (
          <div style={{ padding:32 }}>{[1,2,3,4,5].map(i=><div key={i} className="skeleton" style={{ height:44, marginBottom:8 }} />)}</div>
        ) : userList.length === 0 ? (
          <div style={{ padding:'48px', textAlign:'center', color:'var(--text-muted)' }}>
            <i className="bi bi-people" style={{ fontSize:36, display:'block', marginBottom:12, opacity:.35 }}></i>
            <div style={{ fontSize:15, fontWeight:600 }}>No users found</div>
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table className="s-table">
              <thead>
                <tr>{['User','Role','Storage','Bandwidth','Qualities','Videos','Status','Actions'].map(h=><th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {userList.map((u: any, i: number) => {
                  const sPct = u.storageLimitBytes  === 0 ? 0 : Math.min(100, Math.round((u.storageUsedBytes  / u.storageLimitBytes)  * 100));
                  const bPct = u.bandwidthLimitBytes === 0 ? 0 : Math.min(100, Math.round((u.bandwidthUsedBytes / u.bandwidthLimitBytes) * 100));
                  const aq: string[] | null = u.allowedQualities ?? null;
                  return (
                    <tr key={u.id} className={`animate-fadeInUp delay-${Math.min(i+1,6)}`} style={{ opacity:u.isActive?1:0.55 }}>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <div style={{ width:30, height:30, borderRadius:8, background:u.role==='admin'?'linear-gradient(135deg,#ff4d8d,#ffb800)':'linear-gradient(135deg,#6c63ff,#ff4d8d)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:12, color:'#fff', flexShrink:0 }}>
                            {u.username[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize:13, fontWeight:600 }}>{u.username}</div>
                            {u.notes && <div style={{ fontSize:11, color:'var(--text-muted)' }}>{u.notes}</div>}
                          </div>
                        </div>
                      </td>
                      <td><span className={`s-badge ${u.role==='admin'?'badge-error':'badge-processing'}`}>{u.role}</span></td>
                      <td>
                        <div style={{ minWidth:110 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, fontFamily:'JetBrains Mono,monospace', marginBottom:3, color:'var(--text-muted)' }}>
                            <span>{fmtBytes(u.storageUsedBytes)}</span><span>{fmtStorage(u.storageLimitBytes)}</span>
                          </div>
                          <div className="s-progress" style={{ height:4 }}>
                            <div className="s-progress-bar" style={{ width:`${sPct}%`, background:sPct>90?'var(--accent-err)':sPct>70?'var(--accent-warn)':'var(--accent)' }} />
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ minWidth:110 }}>
                          {u.bandwidthLimitBytes===0 ? (
                            <span style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'JetBrains Mono,monospace' }}>Unlimited</span>
                          ) : (
                            <>
                              <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, fontFamily:'JetBrains Mono,monospace', marginBottom:3, color:'var(--text-muted)' }}>
                                <span>{fmtBytes(u.bandwidthUsedBytes)}</span><span>{fmtBytes(u.bandwidthLimitBytes)}</span>
                              </div>
                              <div className="s-progress" style={{ height:4 }}>
                                <div className="s-progress-bar" style={{ width:`${bPct}%`, background:bPct>90?'var(--accent-err)':bPct>70?'var(--accent-warn)':'var(--accent-3)' }} />
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                      <td>
                        {aq === null ? (
                          <span style={{ fontSize:11, color:'var(--accent-3)', fontFamily:'JetBrains Mono,monospace' }}>All</span>
                        ) : aq.length === 0 ? (
                          <span style={{ fontSize:11, color:'var(--accent-err)' }}>None</span>
                        ) : (
                          <div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>
                            {aq.map(q => (
                              <span key={q} style={{ fontSize:10, background:'rgba(108,99,255,.12)', color:'var(--accent)', padding:'2px 6px', borderRadius:4, fontFamily:'JetBrains Mono,monospace' }}>{q}</span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td><span className="mono" style={{ fontSize:13, color:'var(--text-dim)' }}>{u.videoCount}</span></td>
                      <td><span className={`s-badge ${u.isActive?'badge-ready':'badge-cancelled'}`}>{u.isActive?'Active':'Disabled'}</span></td>
                      <td>
                        <div style={{ display:'flex', gap:4 }}>
                          <button onClick={() => openEdit(u)} className="s-btn s-btn-ghost s-btn-sm" style={{ padding:'5px 9px' }} title="Edit">
                            <i className="bi bi-pencil" style={{ fontSize:12 }}></i>
                          </button>
                          {u.bandwidthLimitBytes>0 && (
                            <button onClick={() => resetBandwidthMut.mutate(u.id)} className="s-btn s-btn-ghost s-btn-sm" title="Reset bandwidth" style={{ padding:'5px 9px', color:'var(--accent-3)' }}>
                              <i className="bi bi-arrow-clockwise" style={{ fontSize:12 }}></i>
                            </button>
                          )}
                          {u.isActive ? (
                            <button onClick={() => handleDisable(u)} className="s-btn s-btn-sm" title="Disable" style={{ padding:'5px 9px', background:'rgba(255,184,48,.1)', border:'1px solid rgba(255,184,48,.3)', color:'var(--accent-warn)' }}>
                              <i className="bi bi-pause-circle" style={{ fontSize:12 }}></i>
                            </button>
                          ) : (
                            <button onClick={() => enableMut.mutate(u.id)} className="s-btn s-btn-sm" title="Enable" style={{ padding:'5px 9px', background:'rgba(45,255,180,.1)', border:'1px solid rgba(45,255,180,.3)', color:'#2dffb4' }}>
                              <i className="bi bi-play-circle" style={{ fontSize:12 }}></i>
                            </button>
                          )}
                          <button onClick={() => handleDelete(u)} className="s-btn s-btn-sm" title="Delete" style={{ padding:'5px 9px', background:'rgba(255,71,87,.1)', border:'1px solid rgba(255,71,87,.3)', color:'var(--accent-err)' }}>
                            <i className="bi bi-trash" style={{ fontSize:12 }}></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <SModal title="Create New User" onClose={() => setShowCreate(false)} onSave={() => createMut.mutate()} saving={createMut.isPending}>
          <div style={{ marginBottom:14 }}>
            <label style={lStyle}>Username *</label>
            <input className="s-input" value={form.username} onChange={e => setForm(f=>({...f,username:e.target.value}))} placeholder="johndoe" autoFocus />
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={lStyle}>Password *</label>
            <input className="s-input" type="password" value={form.password} onChange={e => setForm(f=>({...f,password:e.target.value}))} placeholder="Min 8 characters" />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
            <div>
              <label style={lStyle}>Role</label>
              <select className="s-input" value={form.role} onChange={e => setForm(f=>({...f,role:e.target.value}))}>
                <option value="user">User</option><option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label style={lStyle}>Storage (GB, 0 = Unlimited)</label>
              <input className="s-input" type="number" min="0" style={numStyle} value={form.storageLimitGB} onChange={e => setForm(f=>({...f,storageLimitGB:e.target.value}))} />
            </div>
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={lStyle}>Bandwidth (GB/mo, 0 = Unlimited)</label>
            <input className="s-input" type="number" min="0" style={numStyle} value={form.bandwidthLimitGB} onChange={e => setForm(f=>({...f,bandwidthLimitGB:e.target.value}))} />
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={lStyle}>Allowed Qualities</label>
            <QualityPicker value={form.allowedQualities} onChange={v => setForm(f=>({...f,allowedQualities:v}))} />
          </div>
          <div>
            <label style={lStyle}>Notes (optional)</label>
            <input className="s-input" value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))} placeholder="Internal notes" />
          </div>
        </SModal>
      )}

      {/* Edit Modal */}
      {editUser && (
        <SModal title={`Edit — ${editUser.username}`} onClose={() => setEditUser(null)} onSave={() => updateMut.mutate()} saving={updateMut.isPending}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
            <div>
              <label style={lStyle}>Role</label>
              <select className="s-input" value={editForm.role} onChange={e => setEditForm(f=>({...f,role:e.target.value}))}>
                <option value="user">User</option><option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label style={lStyle}>Storage (GB, 0 = Unlimited)</label>
              <input className="s-input" type="number" min="0" style={numStyle} value={editForm.storageLimitGB} onChange={e => setEditForm(f=>({...f,storageLimitGB:e.target.value}))} />
            </div>
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={lStyle}>Bandwidth (GB/mo, 0 = Unlimited)</label>
            <input className="s-input" type="number" min="0" style={numStyle} value={editForm.bandwidthLimitGB} onChange={e => setEditForm(f=>({...f,bandwidthLimitGB:e.target.value}))} />
            <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:4 }}>
              Current usage: <span style={{ fontFamily:'JetBrains Mono,monospace', color:'var(--text)' }}>{fmtBytes(editUser.bandwidthUsedBytes||0)}</span>
            </div>
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={lStyle}>Allowed Qualities</label>
            <QualityPicker value={editForm.allowedQualities} onChange={v => setEditForm(f=>({...f,allowedQualities:v}))} />
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={lStyle}>New Password (leave blank to keep)</label>
            <input className="s-input" type="password" value={editForm.password} onChange={e => setEditForm(f=>({...f,password:e.target.value}))} placeholder="Leave blank to keep current" />
          </div>
          <div>
            <label style={lStyle}>Notes</label>
            <input className="s-input" value={editForm.notes} onChange={e => setEditForm(f=>({...f,notes:e.target.value}))} placeholder="Internal notes" />
          </div>
        </SModal>
      )}

      <style>{`input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}`}</style>
    </div>
  );
}
