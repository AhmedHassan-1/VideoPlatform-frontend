// src/pages/admin/AdminConfig.tsx — Updated:
//   - FFmpeg settings have detailed descriptions with defaults
//   - Stream IP Binding removed completely
//   - Number inputs: no spinners (appearance: textfield)
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/api';

declare const Swal: any;

const GPU_TYPES      = ['auto','nvidia','intel','amd','cpu'];
const PRESETS        = ['ultrafast','superfast','veryfast','faster','fast','medium','slow','slower','veryslow'];
const PIX_FMTS       = ['yuv420p','yuv422p','yuv444p','yuv420p10le'];
const AUDIO_CODECS   = ['aac','libopus','ac3','mp3'];
const QUALITY_LABELS = ['2160p','1440p','1080p','720p','480p','360p','240p'];

// ── Reusable UI ───────────────────────────────────────────────────────────────
function SettingRow({ label, desc, hint, children }: { label: string; desc?: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: desc ? 2 : 0 }}>{label}</div>
          {desc && <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.55, marginTop: 2 }}>{desc}</div>}
        </div>
        <div style={{ flexShrink: 0 }}>{children}</div>
      </div>
      {hint && (
        <div style={{ marginTop: 6, padding: '6px 10px', background: 'rgba(108,99,255,.06)', borderRadius: 6, fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.6 }}>
          {hint}
        </div>
      )}
    </div>
  );
}

// Number input — no spinner arrows
function NumInput({ value, onChange, min = 0, max = 9999, style: s }: { value: number|string; onChange: (v: number) => void; min?: number; max?: number; style?: React.CSSProperties }) {
  return (
    <input type="number" min={min} max={max}
      value={value ?? ''}
      onChange={e => onChange(parseInt(e.target.value) || 0)}
      className="s-input mono"
      style={{ width: 88, textAlign: 'center', padding: '6px 8px', fontSize: 14, MozAppearance: 'textfield', ...s } as React.CSSProperties}
    />
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      style={{ position: 'relative', width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
        background: checked ? 'var(--accent)' : 'var(--border)', transition: 'background .25s', padding: 0, flexShrink: 0 }}>
      <span style={{ position: 'absolute', width: 18, height: 18, left: checked ? 23 : 3, top: 3,
        background: '#fff', borderRadius: '50%', transition: 'left .25s', boxShadow: '0 1px 4px rgba(0,0,0,.3)' }} />
    </button>
  );
}

function SelectInput({ value, onChange, options, width = 140 }: { value: string; onChange: (v: string) => void; options: string[]; width?: number }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className="s-input" style={{ width, padding: '6px 10px', fontSize: 13 }}>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function TextInput({ value, onChange, placeholder = '', width = 160, mono = true }: { value: string; onChange: (v: string) => void; placeholder?: string; width?: number; mono?: boolean }) {
  return (
    <input className={`s-input${mono ? ' mono' : ''}`}
      value={value ?? ''} onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ width, padding: '6px 10px', fontSize: 13 }} />
  );
}

function InfoBadge({ label, value, accent }: { label: string; value: any; accent?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>{label}</span>
      <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono,monospace', color: accent || 'var(--text)', fontWeight: 600 }}>{String(value ?? '—')}</span>
    </div>
  );
}

function SaveBar({ dirty, saving, onSave, onDiscard }: { dirty: boolean; saving: boolean; onSave: () => void; onDiscard: () => void }) {
  return (
    <div style={{ display: 'flex', gap: 10, marginTop: 24, paddingTop: 18, borderTop: '1px solid var(--border)' }}>
      <button onClick={onSave} disabled={saving || !dirty} className="s-btn s-btn-primary" style={{ opacity: (!dirty || saving) ? .55 : 1 }}>
        {saving
          ? <><span style={{ display: 'inline-block', width: 13, height: 13, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite' }}></span> Saving…</>
          : <><i className="bi bi-check2-circle"></i> Save Changes</>}
      </button>
      {dirty && <button onClick={onDiscard} className="s-btn s-btn-ghost"><i className="bi bi-arrow-counterclockwise"></i> Discard</button>}
    </div>
  );
}

function SkeletonRows({ n = 5 }: { n?: number }) {
  return (
    <div className="s-card" style={{ padding: 28 }}>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} style={{ padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
          <div style={{ flex: 1 }}><div className="skeleton" style={{ height: 13, width: '40%', marginBottom: 7 }} /><div className="skeleton" style={{ height: 10, width: '60%' }} /></div>
        </div>
      ))}
    </div>
  );
}

function ErrorBanner({ title, msg }: { title: string; msg: string }) {
  return (
    <div style={{ padding: '14px 18px', background: 'rgba(255,71,87,.08)', border: '1px solid rgba(255,71,87,.25)', borderRadius: 10, marginBottom: 16, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <i className="bi bi-exclamation-triangle-fill" style={{ color: 'var(--accent-err)', fontSize: 18, marginTop: 1, flexShrink: 0 }}></i>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent-err)', marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>{msg}</div>
      </div>
    </div>
  );
}

// ── FFmpeg setting descriptors ─────────────────────────────────────────────────
const FFMPEG_SETTINGS = [
  {
    key: 'videoCodec',
    label: 'Video Codec',
    desc: 'Encoder used for all video streams. libx264 is the most compatible software encoder. Use h264_nvenc (NVIDIA), h264_qsv (Intel), or h264_amf (AMD) for GPU encoding.',
    hint: <>Default: <code className="mono">libx264</code> — Most compatible. GPU encoders are faster but require hardware support.</>,
    type: 'text',
    placeholder: 'libx264',
    width: 160,
  },
  {
    key: 'audioCodec',
    label: 'Audio Codec',
    desc: 'Encoder for the shared audio track. AAC is universally supported. libopus has better quality at low bitrates.',
    hint: <>Default: <code className="mono">aac</code> — Supported by all major players and browsers.</>,
    type: 'select',
    options: AUDIO_CODECS,
  },
  {
    key: 'preset',
    label: 'Encoding Preset',
    desc: 'Speed vs. compression quality tradeoff. Slower presets produce smaller files at the same quality. On a server, "fast" or "veryfast" is usually the best balance.',
    hint: <>Default: <code className="mono">fast</code> — Slower = better compression but longer encoding time.</>,
    type: 'select',
    options: PRESETS,
  },
  {
    key: 'crf',
    label: 'CRF (Constant Rate Factor)',
    desc: 'Quality control used alongside per-quality bitrate limits. Lower = better quality / larger files. 0 = lossless, 51 = worst quality. This is a baseline; per-quality bitrate caps take priority.',
    hint: <>Default: <code className="mono">23</code> — Recommended range: 18–28. Lower values increase quality and file size.</>,
    type: 'num',
    min: 0,
    max: 51,
  },
  {
    key: 'pixelFormat',
    label: 'Pixel Format',
    desc: 'Output color sampling format. yuv420p is required for compatibility with all browsers and devices. Use yuv420p10le for 10-bit HDR content (requires compatible player).',
    hint: <>Default: <code className="mono">yuv420p</code> — Use yuv420p10le only if your source is HDR 10-bit.</>,
    type: 'select',
    options: PIX_FMTS,
  },
  {
    key: 'audioBitrate',
    label: 'Audio Bitrate',
    desc: 'Bitrate for the shared audio stream. Higher = better audio quality. 128k is adequate for most content; use 192k or 256k for music or high-quality audio.',
    hint: <>Default: <code className="mono">128k</code> — Accepted values: 96k, 128k, 192k, 256k, 320k.</>,
    type: 'text',
    placeholder: '128k',
    width: 100,
  },
  {
    key: 'hwAccel',
    label: 'Hardware Acceleration',
    desc: 'FFmpeg -hwaccel flag for GPU-assisted decoding. This controls decoding (input), not encoding (output — set Video Codec for that). "none" disables hardware decoding.',
    hint: <>Default: <code className="mono">none</code> — Options: none, cuda, vaapi, qsv, videotoolbox.</>,
    type: 'text',
    placeholder: 'none',
    width: 140,
  },
  {
    key: 'extraArgs',
    label: 'Extra FFmpeg Arguments',
    desc: 'Additional command-line arguments appended to every FFmpeg call. Useful for advanced tuning. Multiple args separated by spaces. Applied after all other flags.',
    hint: <>Default: <code className="mono">(empty)</code> — Example: <code className="mono">-threads 4 -movflags +faststart</code></>,
    type: 'text',
    placeholder: '-threads 4',
    width: 220,
  },
];

type TabKey = 'proc' | 'ffmpeg' | 'quality' | 'main';

export default function AdminConfig() {
  const qc  = useQueryClient();
  const [tab, setTab] = useState<TabKey>('proc');

  const [proc, setProc]         = useState<Record<string,any>>({});
  const [procDirty, setProcDirty] = useState(false);
  const [ff, setFf]             = useState<Record<string,any>>({});
  const [ffDirty, setFfDirty]   = useState(false);
  const [qualEditing, setQualEditing] = useState<string | null>(null);
  const [qualDraft,   setQualDraft]   = useState<Record<string,any>>({});
  const [main, setMain]         = useState<Record<string,any>>({});
  const [mainDirty, setMainDirty] = useState(false);

  const { data: serverCfg,  isLoading: loadingProc,  error: procErr  } = useQuery({ queryKey: ['admin','config','server'],  queryFn: () => adminApi.serverConfig().then(r => r.data),      retry: 1 });
  const { data: ffmpegData, isLoading: loadingFf,    error: ffErr    } = useQuery({ queryKey: ['admin','config','ffmpeg'],  queryFn: () => adminApi.ffmpegConfig().then(r => r.data),      retry: 1 });
  const { data: qualData,   isLoading: loadingQual,  error: qualErr  } = useQuery({ queryKey: ['admin','config','quality'], queryFn: () => adminApi.qualityProfiles().then(r => r.data),   retry: 1 });
  const { data: mainData,   isLoading: loadingMain,  error: mainErr  } = useQuery({ queryKey: ['admin','config','main'],   queryFn: () => adminApi.mainConfig().then(r => r.data),        retry: 1 });

  useEffect(() => { if (serverCfg)  { setProc(serverCfg);  setProcDirty(false); } }, [serverCfg]);
  useEffect(() => { if (ffmpegData) { setFf(ffmpegData);   setFfDirty(false);   } }, [ffmpegData]);
  useEffect(() => { if (mainData)   { setMain(mainData);   setMainDirty(false); } }, [mainData]);

  function updProc(k: string, v: any) { setProc(c  => ({ ...c, [k]: v })); setProcDirty(true); }
  function updFf(k: string,   v: any) { setFf(c    => ({ ...c, [k]: v })); setFfDirty(true);   }
  function updMain(k: string, v: any) { setMain(c  => ({ ...c, [k]: v })); setMainDirty(true); }

  function swalOk(title: string) { Swal.fire({ icon: 'success', title, timer: 2000, timerProgressBar: true, showConfirmButton: false }); }
  function swalErr(title: string, text: string) { Swal.fire({ icon: 'error', title, text }); }

  async function confirm(title: string, text: string): Promise<boolean> {
    const r = await Swal.fire({ title, text, icon: 'question', showCancelButton: true, confirmButtonText: 'Apply', reverseButtons: true });
    return r.isConfirmed;
  }

  const saveProc = useMutation({
    mutationFn: () => adminApi.updateServerConfig({
      concurrency:            Math.max(1, Math.min(32, parseInt(proc.concurrency) || 1)),
      defaultSegmentDuration: Math.max(2, Math.min(60, parseInt(proc.defaultSegmentDuration) || 6)),
      defaultKeyRotation:     Math.max(0, parseInt(proc.defaultKeyRotation) || 0),
      maxRetries:             Math.max(0, Math.min(5, parseInt(proc.maxRetries) || 2)),
      gpuEnabled:             Boolean(proc.gpuEnabled),
      gpuType:                proc.gpuType || 'auto',
    }),
    onSuccess: () => { setProcDirty(false); qc.invalidateQueries({ queryKey: ['admin','config','server'] }); swalOk('Processing config saved'); },
    onError:   (e: any) => swalErr('Save failed', e?.response?.data?.message || e?.message),
  });

  const saveFf = useMutation({
    mutationFn: () => adminApi.updateFfmpegConfig({
      videoCodec:   ff.videoCodec   || 'libx264',
      audioCodec:   ff.audioCodec   || 'aac',
      preset:       ff.preset       || 'fast',
      crf:          parseInt(ff.crf) || 23,
      pixelFormat:  ff.pixelFormat  || 'yuv420p',
      audioBitrate: ff.audioBitrate || '128k',
      hwAccel:      ff.hwAccel      || 'none',
      extraArgs:    ff.extraArgs    || '',
    }),
    onSuccess: () => { setFfDirty(false); qc.invalidateQueries({ queryKey: ['admin','config','ffmpeg'] }); swalOk('FFmpeg config saved'); },
    onError:   (e: any) => swalErr('Save failed', e?.response?.data?.message || e?.message),
  });

  const saveQual = useMutation({
    mutationFn: ({ label, data }: { label: string; data: Record<string,any> }) => adminApi.updateQualityProfile(label, data),
    onSuccess:  () => { setQualEditing(null); qc.invalidateQueries({ queryKey: ['admin','config','quality'] }); swalOk('Quality profile updated'); },
    onError:    (e: any) => swalErr('Save failed', e?.response?.data?.message || e?.message),
  });

  const resetQual = useMutation({
    mutationFn: () => adminApi.resetQualityProfiles(),
    onSuccess:  () => { setQualEditing(null); qc.invalidateQueries({ queryKey: ['admin','config','quality'] }); swalOk('Profiles reset to defaults'); },
    onError:    (e: any) => swalErr('Reset failed', e?.response?.data?.message || e?.message),
  });

  const saveMain = useMutation({
    mutationFn: () => adminApi.updateMainConfig({
      streamTtlSec: parseInt(main.streamTtlSec) || 14400,
      corsOrigin:   main.corsOrigin || '*',
      trustProxy:   Boolean(main.trustProxy),
      baseUrl:      main.baseUrl || '',
      // streamIpBinding intentionally excluded — always disabled
    }),
    onSuccess: () => { setMainDirty(false); qc.invalidateQueries({ queryKey: ['admin','config','main'] }); swalOk('Main config saved'); },
    onError:   (e: any) => swalErr('Save failed', e?.response?.data?.message || e?.message),
  });

  const qualProfiles: any[] = Array.isArray(qualData) ? qualData : (qualData ? Object.values(qualData) : []);
  const resolvedProfiles: any[] = qualProfiles.length > 0
    ? qualProfiles
    : QUALITY_LABELS.map(label => ({ label, enabled: true, isOverridden: false }));

  function openQualEdit(profile: any) {
    setQualDraft({
      videoBitrate: profile.videoBitrate || '',
      audioBitrate: profile.audioBitrate || '',
      bandwidth:    profile.bandwidth    || '',
      width:        profile.width        || '',
      height:       profile.height       || '',
      crf:          profile.crf          ?? '',
      preset:       profile.preset       || '',
      extraArgs:    profile.extraArgs    || '',
      enabled:      profile.enabled      ?? true,
    });
    setQualEditing(profile.label);
  }

  const tabs: [TabKey, string, string][] = [
    ['proc',    'Processing',       'cpu'],
    ['ffmpeg',  'FFmpeg',           'camera-video'],
    ['quality', 'Quality Profiles', 'layers'],
    ['main',    'Main Server',      'server'],
  ];

  const anyDirty = procDirty || ffDirty || mainDirty;

  return (
    <div style={{ maxWidth: 860 }}>
      {/* Header */}
      <div className="animate-fadeInUp" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 3 }}>Configuration</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>All server settings — changes apply immediately and persist across restarts</p>
        </div>
        {anyDirty && (
          <span className="s-badge animate-bounceIn" style={{ background: 'rgba(255,184,0,.15)', color: 'var(--accent-warn)', border: '1px solid rgba(255,184,0,.3)' }}>
            <i className="bi bi-circle-fill" style={{ fontSize: 7, marginRight: 5 }}></i>Unsaved changes
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="animate-fadeInUp delay-1" style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 1 }}>
        {tabs.map(([t, l, icon]) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              color: tab === t ? 'var(--accent)' : 'var(--text-muted)',
              background: 'none', border: 'none',
              borderBottom: `2px solid ${tab === t ? 'var(--accent)' : 'transparent'}`,
              transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 7 }}>
            <i className={`bi bi-${icon}`} style={{ fontSize: 14 }}></i>{l}
          </button>
        ))}
      </div>

      {/* ── Processing Tab ── */}
      {tab === 'proc' && (
        <div className="animate-fadeInUp delay-2">
          {procErr && <ErrorBanner title="Processing server unreachable" msg="Check that it's running and PROCESSING_SERVER_URL is correct." />}
          {loadingProc && !procErr ? <SkeletonRows n={6} /> : (
            <div className="s-card" style={{ padding: '8px 22px 22px' }}>
              <SettingRow label="Concurrency" desc="Number of parallel encoding jobs (1–32). Increase for servers with many CPU cores or multiple GPUs.">
                <NumInput value={proc.concurrency ?? 1} onChange={v => updProc('concurrency', v)} min={1} max={32} />
              </SettingRow>
              <SettingRow label="Default Segment Duration"
                desc="HLS segment length in seconds (2–60). Shorter segments = better seek precision but more files and HTTP requests. 6s is a good balance."
                hint={<>Default: <code className="mono">6</code> — Apple recommends 6s. Lower values increase playlist size.</>}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <NumInput value={proc.defaultSegmentDuration ?? 6} onChange={v => updProc('defaultSegmentDuration', v)} min={2} max={60} />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>sec</span>
                </div>
              </SettingRow>
              <SettingRow label="Default Key Rotation"
                desc="0 = one encryption key per quality (simpler). N = new key every N segments (more secure, more keys in DB). Applies to new jobs only."
                hint={<>Default: <code className="mono">0</code> — Use 0 unless you need per-segment key rotation for DRM-like protection.</>}>
                <NumInput value={proc.defaultKeyRotation ?? 0} onChange={v => updProc('defaultKeyRotation', v)} min={0} max={1000} />
              </SettingRow>
              <SettingRow label="Max Retries per Track"
                desc="How many times to retry encoding a failed quality track before marking it as error (0–5)."
                hint={<>Default: <code className="mono">2</code></>}>
                <NumInput value={proc.maxRetries ?? 2} onChange={v => updProc('maxRetries', v)} min={0} max={5} />
              </SettingRow>
              <SettingRow label="GPU Encoding" desc="Use hardware acceleration (NVENC / QSV / AMF). Server must have compatible hardware installed and drivers configured.">
                <Toggle checked={Boolean(proc.gpuEnabled)} onChange={v => updProc('gpuEnabled', v)} />
              </SettingRow>
              <SettingRow label="GPU Type"
                desc="Force a specific GPU encoder, or 'auto' to detect the available GPU automatically. Only relevant when GPU Encoding is enabled."
                hint={<>Default: <code className="mono">auto</code> — nvidia = NVENC, intel = QSV, amd = AMF.</>}>
                <SelectInput value={proc.gpuType || 'auto'} onChange={v => updProc('gpuType', v)} options={GPU_TYPES} />
              </SettingRow>

              {serverCfg?.qualityProfiles?.length > 0 && (
                <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, marginBottom: 14, fontFamily: 'JetBrains Mono,monospace' }}>Quality Profiles (default)</div>
                  <table className="s-table">
                    <thead><tr>{['Label','Resolution','Video Bitrate','Audio Bitrate'].map(h => <th key={h}>{h}</th>)}</tr></thead>
                    <tbody>
                      {serverCfg.qualityProfiles.map((p: any) => (
                        <tr key={p.label}>
                          <td><span className="s-badge badge-processing">{p.label}</span></td>
                          <td><span className="mono" style={{ fontSize: 12 }}>{p.resolution}</span></td>
                          <td><span className="mono" style={{ fontSize: 12, color: 'var(--accent-3)' }}>{p.videoBitrate}</span></td>
                          <td><span className="mono" style={{ fontSize: 12, color: 'var(--text-dim)' }}>{p.audioBitrate}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <SaveBar dirty={procDirty} saving={saveProc.isPending}
                onSave={async () => { if (await confirm('Apply processing config?', 'Affects all new encoding jobs.')) saveProc.mutate(); }}
                onDiscard={() => { if (serverCfg) { setProc(serverCfg); setProcDirty(false); } }} />
            </div>
          )}
        </div>
      )}

      {/* ── FFmpeg Tab ── */}
      {tab === 'ffmpeg' && (
        <div className="animate-fadeInUp delay-2">
          {ffErr && <ErrorBanner title="Cannot load FFmpeg config" msg="Processing server may be offline." />}
          {loadingFf && !ffErr ? <SkeletonRows n={8} /> : (
            <div className="s-card" style={{ padding: '8px 22px 22px' }}>
              {FFMPEG_SETTINGS.map(s => (
                <SettingRow key={s.key} label={s.label} desc={s.desc} hint={s.hint}>
                  {s.type === 'select' && (
                    <SelectInput value={ff[s.key] || (s.options?.[0] ?? '')} onChange={v => updFf(s.key, v)} options={s.options!} width={s.width} />
                  )}
                  {s.type === 'text' && (
                    <TextInput value={ff[s.key] || ''} onChange={v => updFf(s.key, v)} placeholder={s.placeholder} width={s.width ?? 160} />
                  )}
                  {s.type === 'num' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <NumInput value={ff[s.key] ?? 23} onChange={v => updFf(s.key, v)} min={s.min ?? 0} max={s.max ?? 9999} />
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.min}–{s.max}</span>
                    </div>
                  )}
                </SettingRow>
              ))}

              <div style={{ marginTop: 18, padding: '12px 16px', background: 'rgba(255,184,0,.06)', border: '1px solid rgba(255,184,0,.2)', borderRadius: 8 }}>
                <div style={{ fontSize: 12, color: 'var(--accent-warn)', fontWeight: 600, marginBottom: 4 }}>
                  <i className="bi bi-info-circle" style={{ marginRight: 6 }}></i>Per-quality overrides
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.6 }}>
                  Individual quality profiles can override <code className="mono" style={{ fontSize: 11, background: 'var(--bg-base)', padding: '1px 5px', borderRadius: 4 }}>preset</code>, <code className="mono" style={{ fontSize: 11, background: 'var(--bg-base)', padding: '1px 5px', borderRadius: 4 }}>crf</code>, and <code className="mono" style={{ fontSize: 11, background: 'var(--bg-base)', padding: '1px 5px', borderRadius: 4 }}>extraArgs</code> in the <strong>Quality Profiles</strong> tab.
                </div>
              </div>

              <SaveBar dirty={ffDirty} saving={saveFf.isPending}
                onSave={async () => { if (await confirm('Apply FFmpeg config?', 'Affects all new encoding jobs.')) saveFf.mutate(); }}
                onDiscard={() => { if (ffmpegData) { setFf(ffmpegData); setFfDirty(false); } }} />
            </div>
          )}
        </div>
      )}

      {/* ── Quality Profiles Tab ── */}
      {tab === 'quality' && (
        <div className="animate-fadeInUp delay-2">
          {qualErr && <ErrorBanner title="Cannot load quality profiles" msg="Processing server may be offline." />}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Per-quality settings override the global FFmpeg config. Leave a field blank to use the global default.
            </div>
            <button className="s-btn s-btn-ghost s-btn-sm"
              style={{ color: 'var(--accent-warn)', borderColor: 'rgba(255,184,0,.3)' }}
              onClick={async () => {
                const r = await Swal.fire({ title: 'Reset all quality profiles?', text: 'All custom overrides will be removed.', icon: 'warning', showCancelButton: true, confirmButtonText: 'Reset', reverseButtons: true });
                if (r.isConfirmed) resetQual.mutate();
              }}>
              <i className="bi bi-arrow-counterclockwise"></i> Reset All
            </button>
          </div>

          {loadingQual && !qualErr ? <SkeletonRows n={7} /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {resolvedProfiles.map((profile: any) => (
                <div key={profile.label} className="s-card" style={{ padding: '14px 18px' }}>
                  {qualEditing === profile.label ? (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span className="s-badge badge-processing" style={{ fontSize: 13, padding: '4px 12px' }}>{profile.label}</span>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Editing overrides — blank = use global default</span>
                        </div>
                        <button className="s-btn s-btn-ghost s-btn-sm" onClick={() => setQualEditing(null)}><i className="bi bi-x"></i> Cancel</button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        {[
                          { key: 'videoBitrate', label: 'Video Bitrate',  placeholder: 'e.g. 5000k',    hint: 'Override bitrate for this quality. Example: 5000k, 8000k' },
                          { key: 'audioBitrate', label: 'Audio Bitrate',  placeholder: 'e.g. 192k',     hint: 'Override audio bitrate. Example: 128k, 192k' },
                          { key: 'width',        label: 'Width (px)',     placeholder: 'e.g. 1920',     hint: 'Override output width in pixels.',  isNum: true },
                          { key: 'height',       label: 'Height (px)',    placeholder: 'e.g. 1080',     hint: 'Override output height in pixels.', isNum: true },
                          { key: 'bandwidth',    label: 'Bandwidth (bps)',placeholder: 'e.g. 5500000',  hint: 'HLS manifest bandwidth hint. Helps players pick the right quality.', isNum: true },
                          { key: 'crf',          label: 'CRF Override',   placeholder: 'e.g. 20',       hint: 'Override CRF for this quality (0–51). Lower = better quality.', isNum: true },
                        ].map(({ key, label, placeholder, hint, isNum }) => (
                          <div key={key}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{label}</div>
                            <input
                              type={isNum ? 'number' : 'text'}
                              className="s-input mono"
                              style={{ width: '100%', fontSize: 13, padding: '7px 10px', MozAppearance: 'textfield' } as React.CSSProperties}
                              value={qualDraft[key] ?? ''}
                              onChange={e => setQualDraft(d => ({ ...d, [key]: isNum ? (parseInt(e.target.value) || '') : e.target.value }))}
                              placeholder={placeholder}
                            />
                            {hint && <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 3 }}>{hint}</div>}
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                        <div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Preset Override</div>
                          <select className="s-input" style={{ width: '100%', fontSize: 13 }}
                            value={qualDraft.preset || ''}
                            onChange={e => setQualDraft(d => ({ ...d, preset: e.target.value }))}>
                            <option value="">— use global —</option>
                            {PRESETS.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                          <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 3 }}>Override encoding speed/quality for this profile only.</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Extra FFmpeg Args</div>
                          <input className="s-input mono" style={{ width: '100%', fontSize: 12, padding: '7px 10px' }}
                            value={qualDraft.extraArgs || ''}
                            onChange={e => setQualDraft(d => ({ ...d, extraArgs: e.target.value }))}
                            placeholder="-pix_fmt yuv422p" />
                          <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 3 }}>Additional FFmpeg args for this quality only.</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', color: 'var(--text-dim)' }}>
                          <Toggle checked={qualDraft.enabled ?? true} onChange={v => setQualDraft(d => ({ ...d, enabled: v }))} />
                          Enabled (include in encoding)
                        </label>
                        <div style={{ flex: 1 }} />
                        <button className="s-btn s-btn-primary" disabled={saveQual.isPending}
                          onClick={() => saveQual.mutate({ label: profile.label, data: {
                            ...qualDraft,
                            width:     qualDraft.width     ? parseInt(qualDraft.width)     : undefined,
                            height:    qualDraft.height    ? parseInt(qualDraft.height)    : undefined,
                            bandwidth: qualDraft.bandwidth ? parseInt(qualDraft.bandwidth) : undefined,
                            crf:       qualDraft.crf !== '' && qualDraft.crf != null ? parseInt(qualDraft.crf) : undefined,
                          }})}>
                          {saveQual.isPending ? 'Saving…' : <><i className="bi bi-check2-circle"></i> Save Override</>}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <span className={`s-badge ${profile.enabled !== false ? 'badge-processing' : 'badge-cancelled'}`}
                        style={{ fontSize: 13, padding: '4px 12px', minWidth: 52, textAlign: 'center' }}>
                        {profile.label}
                      </span>
                      <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                        {profile.videoBitrate && <span style={{ fontSize: 12, color: 'var(--accent-3)' }} className="mono"><i className="bi bi-camera-video" style={{ marginRight: 4, fontSize: 10 }}></i>{profile.videoBitrate}</span>}
                        {profile.audioBitrate && <span style={{ fontSize: 12, color: 'var(--text-dim)' }} className="mono"><i className="bi bi-music-note" style={{ marginRight: 4, fontSize: 10 }}></i>{profile.audioBitrate}</span>}
                        {profile.width && profile.height && <span style={{ fontSize: 12, color: 'var(--text-muted)' }} className="mono">{profile.width}×{profile.height}</span>}
                        {profile.crf != null && <span style={{ fontSize: 11, color: 'var(--accent-warn)' }} className="mono">CRF:{profile.crf}</span>}
                        {profile.preset && <span style={{ fontSize: 11, color: 'var(--text-muted)' }} className="mono">{profile.preset}</span>}
                        {profile.extraArgs && <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }} className="mono" title={profile.extraArgs}>extra args</span>}
                        {profile.isOverridden && <span className="s-badge" style={{ background: 'rgba(108,99,255,.15)', color: 'var(--accent)', fontSize: 10 }}>overridden</span>}
                        {profile.enabled === false && <span className="s-badge badge-error" style={{ fontSize: 10 }}>disabled</span>}
                      </div>
                      <button className="s-btn s-btn-ghost s-btn-sm" onClick={() => openQualEdit(profile)}><i className="bi bi-pencil"></i> Edit</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Main Server Tab ── */}
      {tab === 'main' && (
        <div className="animate-fadeInUp delay-2">
          {mainErr && <ErrorBanner title="Cannot load main config" msg="Server error." />}
          {loadingMain ? <SkeletonRows n={5} /> : mainData ? (
            <>
              <div className="s-card" style={{ padding: '8px 22px 22px', marginBottom: 14 }}>
                <SettingRow label="Stream Token TTL"
                  desc="How long streaming tokens are valid after generation (in seconds). Tokens expire after this period, requiring a new embed to continue playback."
                  hint={<>Default: <code className="mono">14400</code> (4 hours). Min: 300s (5 min). Max: 86400s (24 hours).</>}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <NumInput value={main.streamTtlSec ?? 14400} onChange={v => updMain('streamTtlSec', v)} min={300} max={86400} style={{ width: 100 }} />
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>sec</span>
                  </div>
                </SettingRow>
                <SettingRow label="CORS Origin"
                  desc="Allowed origin for API cross-origin requests. Use '*' to allow all origins (development only). In production, set to your domain."
                  hint={<>Default: <code className="mono">*</code> — Example: <code className="mono">https://yourdomain.com</code></>}>
                  <TextInput value={main.corsOrigin || '*'} onChange={v => updMain('corsOrigin', v)} placeholder="https://yourdomain.com" width={220} mono={false} />
                </SettingRow>
                <SettingRow label="Base URL"
                  desc="Public URL of this main server, used when generating absolute URLs (HLS playlists, poster links, webhook callbacks)."
                  hint={<>Default: <code className="mono">(empty)</code> — Example: <code className="mono">https://api.yourdomain.com</code></>}>
                  <TextInput value={main.baseUrl || ''} onChange={v => updMain('baseUrl', v)} placeholder="https://api.yourdomain.com" width={220} mono={false} />
                </SettingRow>
                <SettingRow label="Trust Proxy"
                  desc="Trust the X-Forwarded-For header from a reverse proxy. Enable when running behind nginx, Cloudflare, or any load balancer. Required for correct client IP detection.">
                  <Toggle checked={Boolean(main.trustProxy)} onChange={v => updMain('trustProxy', v)} />
                </SettingRow>

                {/* Note about IP binding being removed */}
                <div style={{ margin: '16px 0', padding: '10px 14px', background: 'rgba(0,229,176,.06)', border: '1px solid rgba(0,229,176,.2)', borderRadius: 8 }}>
                  <div style={{ fontSize: 12, color: 'var(--accent-3)', fontWeight: 600, marginBottom: 3 }}>
                    <i className="bi bi-shield-check" style={{ marginRight: 6 }}></i>Stream IP Binding — Disabled
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-dim)', lineHeight: 1.6 }}>
                    Stream token IP binding is permanently disabled to ensure compatibility with CDNs, mobile networks, and clients where the IP address can change between requests.
                  </div>
                </div>

                <div style={{ paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, marginBottom: 10, fontFamily: 'JetBrains Mono,monospace' }}>Read-only (from .env)</div>
                  <InfoBadge label="Processing Server URL" value={mainData.mainServerUrl || 'Not set'} accent="var(--accent)" />
                  <InfoBadge label="Environment" value={mainData.nodeEnv} accent={mainData.nodeEnv === 'production' ? 'var(--accent-3)' : 'var(--accent-warn)'} />
                </div>

                <SaveBar dirty={mainDirty} saving={saveMain.isPending}
                  onSave={async () => { if (await confirm('Apply main server config?', 'Some settings apply immediately, others may need a restart.')) saveMain.mutate(); }}
                  onDiscard={() => { if (mainData) { setMain(mainData); setMainDirty(false); } }} />
              </div>

              <div style={{ padding: '12px 16px', background: 'rgba(108,99,255,.06)', border: '1px solid rgba(108,99,255,.2)', borderRadius: 10, display: 'flex', gap: 12 }}>
                <i className="bi bi-info-circle-fill" style={{ color: 'var(--accent)', fontSize: 16, flexShrink: 0, marginTop: 1 }}></i>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.7 }}>
                  Settings saved here are persisted in the database and override <code className="mono" style={{ fontSize: 11, background: 'var(--bg-base)', padding: '1px 5px', borderRadius: 4 }}>.env</code> values at runtime.
                  Core secrets (<code className="mono" style={{ fontSize: 11, background: 'var(--bg-base)', padding: '1px 5px', borderRadius: 4 }}>PROCESSING_SECRET</code>, <code className="mono" style={{ fontSize: 11, background: 'var(--bg-base)', padding: '1px 5px', borderRadius: 4 }}>JWT_SECRET</code>, DB credentials) must always be set in <code className="mono" style={{ fontSize: 11, background: 'var(--bg-base)', padding: '1px 5px', borderRadius: 4 }}>.env</code>.
                </div>
              </div>
            </>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Failed to load main server config.</div>
          )}
        </div>
      )}

      {/* Global CSS for no-spinner number inputs */}
      <style>{`input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}`}</style>
    </div>
  );
}
