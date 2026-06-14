// src/pages/auth/LoginPage.tsx  — Redesigned with Bootstrap + SweetAlert2
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { authApi } from '../../services/api';

declare const Swal: any;

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPw, setShowPw]     = useState(false);
  const { login } = useAuthStore();
  const navigate  = useNavigate();

  // Animated particles background
  useEffect(() => {
    const canvas = document.getElementById('bg-canvas') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + .5,
      dx: (Math.random() - .5) * .4,
      dy: (Math.random() - .5) * .4,
      alpha: Math.random() * .5 + .1,
    }));

    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(108,99,255,${p.alpha})`;
        ctx.fill();
        p.x += p.dx; p.y += p.dy;
        if (p.x < 0 || p.x > canvas.width)  p.dx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res  = await authApi.login(username, password);
      const data = res.data;
      login(data.token, { userId: data.userId, username: data.username, role: data.role });
      await Swal.fire({
        icon: 'success',
        title: `Welcome back, ${data.username}!`,
        text: 'Redirecting to your dashboard…',
        timer: 1400,
        timerProgressBar: true,
        showConfirmButton: false,
      });
      navigate(data.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Invalid credentials. Please try again.';
      Swal.fire({ icon: 'error', title: 'Sign-in failed', text: msg, confirmButtonText: 'Try again' });
    } finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-deep)', position: 'relative', overflow: 'hidden' }}>
      <canvas id="bg-canvas" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />

      {/* Glow blobs */}
      <div style={{ position:'absolute', top:'20%', left:'15%', width:300, height:300, borderRadius:'50%', background:'radial-gradient(circle, rgba(108,99,255,.12) 0%, transparent 70%)', filter:'blur(40px)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:'25%', right:'15%', width:250, height:250, borderRadius:'50%', background:'radial-gradient(circle, rgba(255,77,141,.1) 0%, transparent 70%)', filter:'blur(40px)', pointerEvents:'none' }} />

      <div className="animate-bounceIn" style={{ width: 400, position: 'relative', zIndex: 1 }}>
        {/* Card */}
        <div className="s-card" style={{ padding: '40px 36px' }}>
          {/* Logo */}
          <div style={{ marginBottom: 28, textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: 14, background: 'linear-gradient(135deg,#6c63ff,#ff4d8d)', marginBottom: 14, boxShadow: '0 8px 24px rgba(108,99,255,.4)' }}>
              <i className="bi bi-play-fill" style={{ fontSize: 26, color: '#fff' }}></i>
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: -.5 }} className="text-gradient">StreamOS</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>Video Platform</div>
          </div>

          <div style={{ marginBottom: 22, textAlign: 'center' }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Sign in to your account</div>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Username */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, fontWeight: 700 }}>
                Username
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', fontSize:15 }}>
                  <i className="bi bi-person"></i>
                </span>
                <input
                  className="s-input"
                  style={{ paddingLeft: 36 }}
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  autoFocus
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, fontWeight: 700 }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', fontSize:15 }}>
                  <i className="bi bi-lock"></i>
                </span>
                <input
                  className="s-input"
                  style={{ paddingLeft: 36, paddingRight: 40 }}
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:15, padding:0 }}>
                  <i className={`bi bi-eye${showPw ? '-slash' : ''}`}></i>
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="s-btn s-btn-primary w-100" style={{ width:'100%', justifyContent:'center', padding:'11px', fontSize:14, borderRadius:9, position:'relative', overflow:'hidden' }}>
              {loading ? (
                <>
                  <span style={{ display:'inline-block', width:16, height:16, border:'2px solid rgba(255,255,255,.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin .7s linear infinite' }}></span>
                  Signing in…
                </>
              ) : (
                <><i className="bi bi-box-arrow-in-right"></i> Sign In</>
              )}
            </button>
          </form>

          <hr className="divider" style={{ margin: '20px 0' }} />

          <div style={{ textAlign:'center', fontSize:12, color:'var(--text-muted)' }}>
            Contact your administrator if you need access.
          </div>
        </div>
      </div>
    </div>
  );
}
