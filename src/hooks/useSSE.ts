// src/hooks/useSSE.ts
// Server-Sent Events hook for real-time video progress + system notifications.

import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

type SSEEvent =
  | { type: 'video.progress'; videoId: string; progress: number; status: string }
  | { type: 'video.ready';    videoId: string; masterUrl: string }
  | { type: 'video.error';    videoId: string; error: string }
  | { type: 'video.queued';   videoId: string; position: number }
  | { type: 'connected';      connectionId: string };

export function useSSE() {
  const esRef   = useRef<EventSource | null>(null);
  const qc      = useQueryClient();
  const token   = localStorage.getItem('token') || '';

  const connect = useCallback(() => {
    if (esRef.current) return; // already connected
    if (!token) return;

    const url = `/notifications/stream?token=${encodeURIComponent(token)}`;
    const es  = new EventSource(url);
    esRef.current = es;

    const handleEvent = (eventName: string) => (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as SSEEvent;
        handleSSEData(eventName, data, qc);
      } catch {}
    };

    es.addEventListener('video.progress', handleEvent('video.progress'));
    es.addEventListener('video.ready',    handleEvent('video.ready'));
    es.addEventListener('video.error',    handleEvent('video.error'));
    es.addEventListener('video.queued',   handleEvent('video.queued'));
    es.addEventListener('connected',      handleEvent('connected'));

    es.onerror = () => {
      es.close();
      esRef.current = null;
      // Reconnect after 5s
      setTimeout(connect, 5000);
    };
  }, [token, qc]);

  const disconnect = useCallback(() => {
    esRef.current?.close();
    esRef.current = null;
  }, []);

  useEffect(() => {
    connect();
    return disconnect;
  }, [connect, disconnect]);
}

function handleSSEData(eventName: string, data: any, qc: ReturnType<typeof useQueryClient>) {
  switch (data.type || eventName) {
    case 'video.ready':
      toast.success(`✓ Video ready!`, { duration: 5000 });
      qc.invalidateQueries({ queryKey: ['videos'] });
      qc.invalidateQueries({ queryKey: ['video', data.videoId] });
      break;

    case 'video.error':
      toast.error(`Video processing failed`, { duration: 6000 });
      qc.invalidateQueries({ queryKey: ['videos'] });
      qc.invalidateQueries({ queryKey: ['video', data.videoId] });
      break;

    case 'video.progress':
      // Only invalidate at key milestones to avoid too many re-renders
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
