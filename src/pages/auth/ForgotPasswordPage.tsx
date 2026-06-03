// src/pages/auth/ForgotPasswordPage.tsx — Redesigned
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authExtApi } from '../../services/api';

declare const Swal: any;

function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg-deep)', padding:'24px' }}>
      <div style={{ position:'absolute', top:'20%', left:'18%', width:260, height:260, borderRadius:'50%', background:'radial-gradient(circle, rgba(108,99,255,.1) 0%, transparent 70%)', filter:'blur(40px)', pointerEvents:'none' }} />
      <div className="animate-bounceIn s-card" style={{ width:400, padding:'36px', position:'relative', zIndex:1 }}>
        {children}
      </div>
    </div>
  );
}

function LogoHeader({ subtitle }: { subtitle: string }) {
  return (
    <div style={{ textAlign:'center', marginBottom:28 }}>
      <div style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:50, height:50, borderRadius:12, background:'linear-gradient(135deg,#6c63ff,#ff4d8d)', marginBottom:12, boxShadow:'0 6px 20px rgba(108,99,255,.4)' }}>
        <i className="bi bi-play-fill" style={{ fontSize:22, color:'#fff' }}></i>
      </div>
      <div style={{ fontSize:22, fontWeight:800 }} className="text-gradient">StreamOS</div>
      <div style={{ fontSize:15, fontWeight:600, color:'var(--text)', marginTop:6 }}>{subtitle}</div>
    </div>
  );
}

export function ForgotPasswordPage() {
  const nav = useNavigate();
  const [username, setUsername] = useState('');
  const [sent, setSent]         = useState(false);
  const [loading, setLoading]   = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await authExtApi.forgotPassword(username);
      setSent(true);
    } catch {
      Swal.fire({ icon:'error', title:'Something went wrong', text:'Please try again later.' });
    } finally { setLoading(false); }
  }

  return (
    <AuthCard>
      <LogoHeader subtitle="Reset Password" />
      {sent ? (
        <div style={{ textAlign:'center' }}>
          <div style={{ width:56, height:56, borderRadius:'50%', background:'rgba(0,229,176,.15)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
            <i className="bi bi-envelope-check-fill" style={{ fontSize:24, color:'var(--accent-3)' }}></i>
          </div>
          <div style={{ fontSize:16, fontWeight:700, color:'var(--accent-3)', marginBottom:8 }}>Check your email</div>
          <p style={{ color:'var(--text-muted)', fontSize:13, lineHeight:1.7, marginBottom:22 }}>
            If an account with that username exists and has an email, we've sent a reset link. It expires in 1 hour.
          </p>
          <button onClick={() => nav('/login')} className="s-btn s-btn-primary" style={{ width:'100%', justifyContent:'center' }}>
            <i className="bi bi-box-arrow-in-right"></i> Back to Sign In
          </button>
        </div>
      ) : (
        <form onSubmit={submit}>
          <p style={{ color:'var(--text-muted)', fontSize:13, marginBottom:22, textAlign:'center' }}>Enter your username and we'll send you a reset link.</p>
          <div style={{ marginBottom:18 }}>
            <label style={{ display:'block', fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:1, marginBottom:6, fontWeight:700 }}>Username</label>
            <div style={{ position:'relative' }}>
              <i className="bi bi-person" style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', fontSize:15 }}></i>
              <input className="s-input" style={{ paddingLeft:36 }} value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter your username" autoFocus required />
            </div>
          </div>
          <button className="s-btn s-btn-primary" style={{ width:'100%', justifyContent:'center', padding:11 }} type="submit" disabled={loading || !username.trim()}>
            {loading ? <><span style={{ display:'inline-block', width:14, height:14, border:'2px solid rgba(255,255,255,.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin .7s linear infinite' }}></span> Sending…</> : <><i className="bi bi-send-fill"></i> Send Reset Link</>}
          </button>
          <div style={{ textAlign:'center', marginTop:16 }}>
            <Link to="/login" style={{ color:'var(--accent)', textDecoration:'none', fontSize:13, fontWeight:600 }}>
              <i className="bi bi-arrow-left me-1"></i> Back to Login
            </Link>
          </div>
        </form>
      )}
    </AuthCard>
  );
}

export function ResetPasswordPage() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const token    = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [done,     setDone]     = useState(false);
  const [loading,  setLoading]  = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { Swal.fire({ icon:'error', title:'Passwords don\'t match' }); return; }
    if (password.length < 8)  { Swal.fire({ icon:'warning', title:'Password too short', text:'Min 8 characters required.' }); return; }
    setLoading(true);
    try {
      await authExtApi.resetPassword(token, password);
      setDone(true);
    } catch (err:any) {
      Swal.fire({ icon:'error', title:'Failed', text:err.response?.data?.message||'Invalid or expired token.' });
    } finally { setLoading(false); }
  }

  if (!token) return (
    <AuthCard>
      <div style={{ textAlign:'center', padding:20 }}>
        <i className="bi bi-exclamation-triangle-fill" style={{ fontSize:36, color:'var(--accent-err)', display:'block', marginBottom:12 }}></i>
        <div style={{ color:'var(--accent-err)', fontSize:15, fontWeight:700, marginBottom:16 }}>Invalid reset link</div>
        <button onClick={() => nav('/login')} className="s-btn s-btn-primary" style={{ width:'100%', justifyContent:'center' }}>Back to Login</button>
      </div>
    </AuthCard>
  );

  return (
    <AuthCard>
      <LogoHeader subtitle="Set New Password" />
      {done ? (
        <div style={{ textAlign:'center' }}>
          <div style={{ width:56, height:56, borderRadius:'50%', background:'rgba(0,229,176,.15)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
            <i className="bi bi-shield-check-fill" style={{ fontSize:26, color:'var(--accent-3)' }}></i>
          </div>
          <div style={{ fontSize:16, fontWeight:700, color:'var(--accent-3)', marginBottom:8 }}>Password Updated!</div>
          <p style={{ color:'var(--text-muted)', fontSize:13, marginBottom:22 }}>You can now log in with your new password.</p>
          <button onClick={() => nav('/login')} className="s-btn s-btn-primary" style={{ width:'100%', justifyContent:'center' }}><i className="bi bi-box-arrow-in-right"></i> Go to Login</button>
        </div>
      ) : (
        <form onSubmit={submit}>
          {[
            { l:'New Password', v:password, s:setPassword, p:'Min 8 characters' },
            { l:'Confirm Password', v:confirm, s:setConfirm, p:'Repeat new password' },
          ].map(({ l, v, s, p }) => (
            <div key={l} style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:1, marginBottom:6, fontWeight:700 }}>{l}</label>
              <div style={{ position:'relative' }}>
                <i className="bi bi-lock" style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', fontSize:14 }}></i>
                <input className="s-input" style={{ paddingLeft:36 }} type="password" value={v} onChange={e => s(e.target.value)} placeholder={p} required />
              </div>
            </div>
          ))}
          <button className="s-btn s-btn-primary" style={{ width:'100%', justifyContent:'center', padding:11, marginTop:6 }} type="submit" disabled={loading}>
            {loading ? <><span style={{ display:'inline-block', width:14, height:14, border:'2px solid rgba(255,255,255,.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin .7s linear infinite' }}></span> Updating…</> : <><i className="bi bi-check2-circle"></i> Update Password</>}
          </button>
        </form>
      )}
    </AuthCard>
  );
}

export function VerifyEmailPage() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const token  = params.get('token') || '';
  const [status, setStatus] = useState<'loading'|'success'|'error'>('loading');

  useEffect(() => {
    if (!token) { setStatus('error'); return; }
    authExtApi.verifyEmail(token).then(() => setStatus('success')).catch(() => setStatus('error'));
  }, [token]);

  return (
    <AuthCard>
      <LogoHeader subtitle="Email Verification" />
      {status === 'loading' && (
        <div style={{ textAlign:'center', padding:'20px 0' }}>
          <div style={{ width:44, height:44, border:'3px solid var(--border)', borderTopColor:'var(--accent)', borderRadius:'50%', animation:'spin 1s linear infinite', margin:'0 auto 14px' }}></div>
          <div style={{ color:'var(--text-muted)', fontSize:13 }}>Verifying your email…</div>
        </div>
      )}
      {status === 'success' && (
        <div style={{ textAlign:'center' }}>
          <div style={{ width:56, height:56, borderRadius:'50%', background:'rgba(0,229,176,.15)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}>
            <i className="bi bi-patch-check-fill" style={{ fontSize:26, color:'var(--accent-3)' }}></i>
          </div>
          <div style={{ fontSize:16, fontWeight:700, color:'var(--accent-3)', marginBottom:8 }}>Email Verified!</div>
          <p style={{ color:'var(--text-muted)', fontSize:13, marginBottom:22 }}>Your email has been verified successfully.</p>
          <button onClick={() => nav('/dashboard')} className="s-btn s-btn-primary" style={{ width:'100%', justifyContent:'center' }}><i className="bi bi-grid-fill"></i> Go to Dashboard</button>
        </div>
      )}
      {status === 'error' && (
        <div style={{ textAlign:'center' }}>
          <div style={{ width:56, height:56, borderRadius:'50%', background:'rgba(255,71,87,.12)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}>
            <i className="bi bi-x-circle-fill" style={{ fontSize:26, color:'var(--accent-err)' }}></i>
          </div>
          <div style={{ fontSize:16, fontWeight:700, color:'var(--accent-err)', marginBottom:8 }}>Verification Failed</div>
          <p style={{ color:'var(--text-muted)', fontSize:13, marginBottom:22 }}>The link is invalid or has expired.</p>
          <button onClick={() => nav('/settings')} className="s-btn s-btn-primary" style={{ width:'100%', justifyContent:'center' }}><i className="bi bi-gear-fill"></i> Go to Settings</button>
        </div>
      )}
    </AuthCard>
  );
}
