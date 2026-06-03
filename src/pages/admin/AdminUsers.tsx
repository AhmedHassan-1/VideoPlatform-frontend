// src/pages/admin/AdminUsers.tsx — Redesigned with SweetAlert2
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/api';

declare const Swal: any;

const fmt = (b: number) => b===0?'∞':b>=1e9?(b/1e9).toFixed(1)+'GB':(b/1e6).toFixed(0)+'MB';

function SModal({ title, onClose, onSave, children, saving }: { title:string; onClose:()=>void; onSave:()=>void; children:React.ReactNode; saving?:boolean }) {
  return (
    <div onClick={e => { if(e.target===e.currentTarget) onClose(); }}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, backdropFilter:'blur(4px)', animation:'fadeIn .2s ease' }}>
      <div className="s-card animate-bounceIn" style={{ padding:28, width:500, maxHeight:'88vh', overflow:'auto' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22 }}>
          <div style={{ fontSize:16, fontWeight:800 }}>{title}</div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:18, padding:4 }}><i className="bi bi-x"></i></button>
        </div>
        {children}
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:22 }}>
          <button onClick={onClose} className="s-btn s-btn-ghost"><i className="bi bi-x-circle"></i> Cancel</button>
          <button onClick={onSave} disabled={saving} className="s-btn s-btn-primary">
            {saving ? <><span style={{ display:'inline-block', width:13, height:13, border:'2px solid rgba(255,255,255,.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin .7s linear infinite' }}></span> Saving…</> : <><i className="bi bi-check2"></i> Save</>}
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
  const [form, setForm]     = useState({ username:'', password:'', role:'user', storageLimitGB:'10', notes:'' });
  const [editForm, setEditForm] = useState({ role:'user', storageLimitGB:'10', password:'', notes:'' });

  const { data: users, isLoading } = useQuery({ queryKey:['admin','users'], queryFn:()=>adminApi.users().then(r=>r.data) });

  const createMut = useMutation({
    mutationFn: () => adminApi.createUser({ ...form, storageLimitBytes:parseInt(form.storageLimitGB)*1073741824 }),
    onSuccess: () => {
      Swal.fire({ icon:'success', title:'User created', timer:1500, showConfirmButton:false });
      setShowCreate(false);
      setForm({ username:'', password:'', role:'user', storageLimitGB:'10', notes:'' });
      qc.invalidateQueries({ queryKey:['admin','users'] });
    },
    onError: (e:any) => Swal.fire({ icon:'error', title:'Failed', text:e.response?.data?.message||'Create failed' }),
  });

  const updateMut = useMutation({
    mutationFn: () => adminApi.updateUser(editUser.id, { role:editForm.role, storageLimitBytes:parseInt(editForm.storageLimitGB)*1073741824, notes:editForm.notes||null, ...(editForm.password?{password:editForm.password}:{}) }),
    onSuccess: () => { Swal.fire({ icon:'success', title:'User updated', timer:1200, showConfirmButton:false }); setEditUser(null); qc.invalidateQueries({ queryKey:['admin','users'] }); },
    onError: (e:any) => Swal.fire({ icon:'error', title:'Update failed', text:e.response?.data?.message }),
  });

  const deleteMut = useMutation({
    mutationFn: (id:string) => adminApi.deleteUser(id),
    onSuccess: () => { Swal.fire({ icon:'info', title:'User deactivated', timer:1200, showConfirmButton:false }); qc.invalidateQueries({ queryKey:['admin','users'] }); },
    onError: (e:any) => Swal.fire({ icon:'error', title:'Failed', text:e.response?.data?.message }),
  });

  async function handleDelete(u: any) {
    const r = await Swal.fire({
      title:`Deactivate "${u.username}"?`,
      text:'This will prevent the user from logging in.',
      icon:'warning', showCancelButton:true,
      confirmButtonText:'Yes, deactivate', cancelButtonText:'Cancel', reverseButtons:true,
    });
    if (r.isConfirmed) deleteMut.mutate(u.id);
  }

  function openEdit(u: any) {
    setEditUser(u);
    setEditForm({ role:u.role, storageLimitGB:u.storageLimitBytes===0?'0':String(Math.round(u.storageLimitBytes/1073741824)), password:'', notes:u.notes||'' });
  }

  const userList = ((users as any[]) || []).filter((u:any) => !search || u.username.toLowerCase().includes(search.toLowerCase()));

  const lStyle: React.CSSProperties = { display:'block', fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:1, marginBottom:6, fontWeight:700 };

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

      {/* Search */}
      <div className="animate-fadeInUp delay-1" style={{ marginBottom:16 }}>
        <div style={{ position:'relative', maxWidth:320 }}>
          <i className="bi bi-search" style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', fontSize:14 }}></i>
          <input className="s-input" style={{ paddingLeft:36 }} placeholder="Search users…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="s-card animate-fadeInUp delay-2" style={{ overflow:'hidden' }}>
        {isLoading ? (
          <div style={{ padding:32 }}>{[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height:44, marginBottom:8 }} />)}</div>
        ) : userList.length === 0 ? (
          <div style={{ padding:'48px', textAlign:'center', color:'var(--text-muted)' }}>
            <i className="bi bi-people" style={{ fontSize:36, display:'block', marginBottom:12, opacity:.35 }}></i>
            <div style={{ fontSize:15, fontWeight:600 }}>No users found</div>
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table className="s-table">
              <thead>
                <tr>
                  {['User','Role','Storage','Videos','Last Login','Actions'].map(h => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {userList.map((u:any, i:number) => {
                  const pct = u.storageLimitBytes===0 ? 0 : Math.min(100, Math.round((u.storageUsedBytes/u.storageLimitBytes)*100));
                  return (
                    <tr key={u.id} className={`animate-fadeInUp delay-${Math.min(i+1,6)}`}>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <div style={{ width:30, height:30, borderRadius:8, background: u.role==='admin'?'linear-gradient(135deg,#ff4d8d,#ffb800)':'linear-gradient(135deg,#6c63ff,#ff4d8d)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:12, color:'#fff', flexShrink:0 }}>
                            {u.username[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize:13, fontWeight:600 }}>{u.username}</div>
                            {u.notes && <div style={{ fontSize:11, color:'var(--text-muted)' }}>{u.notes}</div>}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`s-badge ${u.role==='admin'?'badge-error':'badge-processing'}`}>{u.role}</span>
                      </td>
                      <td>
                        <div style={{ width:120 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, fontFamily:'JetBrains Mono,monospace', marginBottom:3, color:'var(--text-muted)' }}>
                            <span>{fmt(u.storageUsedBytes)}</span>
                            <span>{fmt(u.storageLimitBytes)}</span>
                          </div>
                          <div className="s-progress" style={{ height:4 }}>
                            <div className="s-progress-bar" style={{ width:`${pct}%`, background:pct>90?'var(--accent-err)':pct>70?'var(--accent-warn)':'var(--accent)' }} />
                          </div>
                        </div>
                      </td>
                      <td><span className="mono" style={{ fontSize:13, color:'var(--text-dim)' }}>{u.videoCount}</span></td>
                      <td><span className="mono" style={{ fontSize:11, color:'var(--text-muted)' }}>{u.lastLoginAt?new Date(u.lastLoginAt).toLocaleDateString():'—'}</span></td>
                      <td>
                        <div style={{ display:'flex', gap:5 }}>
                          <button onClick={() => openEdit(u)} className="s-btn s-btn-ghost s-btn-sm" style={{ padding:'5px 9px' }} title="Edit"><i className="bi bi-pencil" style={{ fontSize:12 }}></i></button>
                          <button onClick={() => handleDelete(u)} className="s-btn s-btn-sm" style={{ padding:'5px 9px', background:'rgba(255,71,87,.1)', border:'1px solid rgba(255,71,87,.3)', color:'var(--accent-err)' }} title="Deactivate"><i className="bi bi-person-x" style={{ fontSize:12 }}></i></button>
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
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label style={lStyle}>Storage Limit GB (0=∞)</label>
              <input className="s-input" type="number" min="0" value={form.storageLimitGB} onChange={e => setForm(f=>({...f,storageLimitGB:e.target.value}))} />
            </div>
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
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label style={lStyle}>Storage GB (0=∞)</label>
              <input className="s-input" type="number" min="0" value={editForm.storageLimitGB} onChange={e => setEditForm(f=>({...f,storageLimitGB:e.target.value}))} />
            </div>
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
    </div>
  );
}
