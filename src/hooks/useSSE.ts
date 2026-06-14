// src/hooks/useSSE.ts — FIXED: removed react-hot-toast → SweetAlert2 toasts via custom event
import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

declare const Swal: any;

type SSEEvent =
  | { type: 'video.progress'; videoId: string; progress: number; status: string }
  | { type: 'video.ready';    videoId: string; masterUrl: string }
  | { type: 'video.error';    videoId: string; error: string }
  | { type: 'video.queued';   videoId: string; position: number }
  | { type: 'connected';      connectionId: string };

function toast(msg: string, icon: 'success'|'error'|'info' = 'info') {
  Swal.mixin({
    toast: true, position: 'top-end', showConfirmButton: false,
    timer: 4000, timerProgressBar: true,
  }).fire({ icon, title: msg });
}

export function useSSE() {
  const esRef = useRef<EventSource | null>(null);
  const qc    = useQueryClient();

  const connect = useCallback(() => {
    if (esRef.current) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    // FIX: use correct path — no /api prefix, token as query param for SSE
    const url = `/notifications/stream?token=${encodeURIComponent(token)}`;
    const es  = new EventSource(url);
    esRef.current = es;

    const handle = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as SSEEvent;
        handleSSEData(data, qc);
      } catch {}
    };

    ['video.progress','video.ready','video.error','video.queued','connected'].forEach(ev =>
      es.addEventListener(ev, handle as EventListener)
    );
    es.onmessage = handle;

    let retryDelay = 3000;
    es.onerror = () => {
      es.close();
      esRef.current = null;
      setTimeout(connect, retryDelay);
      retryDelay = Math.min(retryDelay * 2, 30_000); // exponential backoff
    };
  }, [qc]);

  useEffect(() => {
    connect();
    return () => { esRef.current?.close(); esRef.current = null; };
  }, [connect]);
}

function handleSSEData(data: any, qc: ReturnType<typeof useQueryClient>) {
  switch (data.type) {
    case 'video.ready':
      toast('Video ready!', 'success');
      qc.invalidateQueries({ queryKey: ['videos'] });
      qc.invalidateQueries({ queryKey: ['video', data.videoId] });
      break;
    case 'video.error':
      toast('Video processing failed', 'error');
      qc.invalidateQueries({ queryKey: ['videos'] });
      qc.invalidateQueries({ queryKey: ['video', data.videoId] });
      break;
    case 'video.progress':
      if (data.progress % 25 === 0 || data.progress >= 99) {
        qc.invalidateQueries({ queryKey: ['video', data.videoId] });
        qc.invalidateQueries({ queryKey: ['videos', 'queue'] });
      }
      break;
    case 'video.queued':
      qc.invalidateQueries({ queryKey: ['videos', 'queue'] });
      break;
  }
}
