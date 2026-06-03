// src/pages/auth/RegisterPage.tsx — Redesigned
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authExtApi } from '../../services/api';

declare const Swal: any;

export default function RegisterPage() {
  const nav = useNavigate();
  const [form, setForm]       = useState({ username:'', password:'', confirm:'', email:'' });
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw]   = useState(false);

  const strength = (() => {
    const p = form.password;
    if (!p) return 0;
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^a-zA-Z0-9]/.test(p)) s++;
    return s;
  })();
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColor = ['', '#ff4757', '#ffb800', '#6c63ff', '#00e5b0'];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirm) {
      Swal.fire({ icon:'error', title:'Passwords don\'t match', text:'Please make sure both passwords are identical.' });
      return;
    }
    if (form.password.length < 8) {
      Swal.fire({ icon:'warning', title:'Password too short', text:'Your password must be at least 8 characters.' });
      return;
    }
    setLoading(true);
    try {
      await authExtApi.register(form.username, form.password, form.email || undefined);
      await Swal.fire({
        icon: 'success',
        title: 'Account Created!',
        text: 'Your account is ready. Please sign in.',
        confirmButtonText: 'Go to Sign In',
      });
      nav('/login');
    } catch (err: any) {
      Swal.fire({ icon:'error', title:'Registration failed', text: err.response?.data?.message || 'Please try again.' });
    } finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg-deep)', padding:'24px 0' }}>
      <div style={{ position:'absolute', top:'15%', right:'20%', width:280, height:280, borderRadius:'50%', background:'radial-gradient(circle, rgba(255,77,141,.1) 0%, transparent 70%)', filter:'blur(40px)', pointerEvents:'none' }} />

      <div className="animate-fadeInUp" style={{ width:420, position:'relative', zIndex:1 }}>
        <div className="s-card" style={{ padding:'36px' }}>
          <div style={{ textAlign:'center', marginBottom:28 }}>
            <div style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:50, height:50, borderRadius:12, background:'linear-gradient(135deg,#ff4d8d,#6c63ff)', marginBottom:12, boxShadow:'0 6px 20px rgba(255,77,141,.35)' }}>
              <i className="bi bi-person-plus-fill" style={{ fontSize:22, color:'#fff' }}></i>
            </div>
            <div style={{ fontSize:22, fontWeight:800 }} className="text-gradient">StreamOS</div>
            <div style={{ fontSize:16, fontWeight:700, color:'var(--text)', marginTop:6 }}>Create your account</div>
          </div>

          <form onSubmit={submit}>
            {[
              { key:'username', label:'Username', icon:'person', placeholder:'3–32 chars, letters/numbers/_.-', type:'text' },
              { key:'email',    label:'Email (optional)', icon:'envelope', placeholder:'For password reset & notifications', type:'email' },
            ].map(({ key, label, icon, placeholder, type }) => (
              <div key={key} style={{ marginBottom:14 }}>
                <label style={{ display:'block', fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:1, marginBottom:6, fontWeight:700 }}>{label}</label>
                <div style={{ position:'relative' }}>
                  <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', fontSize:15 }}><i className={`bi bi-${icon}`}></i></span>
                  <input
                    className="s-input"
                    style={{ paddingLeft:36 }}
                    type={type}
                    value={(form as any)[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    required={key !== 'email'}
                    autoFocus={key === 'username'}
                  />
                </div>
              </div>
            ))}

            {/* Password */}
            <div style={{ marginBottom:6 }}>
              <label style={{ display:'block', fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:1, marginBottom:6, fontWeight:700 }}>Password *</label>
              <div style={{ position:'relative' }}>
                <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', fontSize:15 }}><i className="bi bi-lock"></i></span>
                <input className="s-input" style={{ paddingLeft:36, paddingRight:40 }} type={showPw ? 'text' : 'password'} value={form.password} onChange={e => setForm(f => ({ ...f, password:e.target.value }))} placeholder="Min 8 characters" required />
                <button type="button" onClick={() => setShowPw(v => !v)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:15 }}>
                  <i className={`bi bi-eye${showPw ? '-slash' : ''}`}></i>
                </button>
              </div>
            </div>

            {/* Strength bar */}
            {form.password && (
              <div style={{ marginBottom:14 }}>
                <div style={{ display:'flex', gap:4, marginBottom:3 }}>
                  {[1,2,3,4].map(i => (
                    <div key={i} style={{ flex:1, height:3, borderRadius:2, background: i <= strength ? strengthColor[strength] : 'var(--border)', transition:'all .3s' }} />
                  ))}
                </div>
                <div style={{ fontSize:11, color: strengthColor[strength], fontWeight:600 }}>{strengthLabel[strength]}</div>
              </div>
            )}

            <div style={{ marginBottom:18 }}>
              <label style={{ display:'block', fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:1, marginBottom:6, fontWeight:700 }}>Confirm Password *</label>
              <div style={{ position:'relative' }}>
                <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', fontSize:15 }}><i className="bi bi-shield-check"></i></span>
                <input className="s-input" style={{ paddingLeft:36, borderColor: form.confirm && form.password !== form.confirm ? 'var(--accent-err)' : undefined }} type="password" value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm:e.target.value }))} placeholder="Repeat password" required />
              </div>
              {form.confirm && form.password !== form.confirm && (
                <div style={{ fontSize:12, color:'var(--accent-err)', marginTop:4 }}><i className="bi bi-x-circle me-1"></i>Passwords don't match</div>
              )}
            </div>

            <button type="submit" disabled={loading} className="s-btn s-btn-primary" style={{ width:'100%', justifyContent:'center', padding:'11px', fontSize:14, borderRadius:9 }}>
              {loading ? <><span style={{ display:'inline-block', width:16, height:16, border:'2px solid rgba(255,255,255,.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin .7s linear infinite' }}></span> Creating…</> : <><i className="bi bi-person-check-fill"></i> Create Account</>}
            </button>
          </form>

          <div style={{ textAlign:'center', marginTop:18, fontSize:13, color:'var(--text-muted)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color:'var(--accent)', textDecoration:'none', fontWeight:600 }}>Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
