// src/hooks/useUpload.ts — Updated: qualities param, no toast (use Swal in page)
import { useState, useCallback, useRef } from 'react';
import { uploadApi } from '../services/api';

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

interface UploadOptions {
  file: File;
  title: string;
  poster?: File | null;
  qualities?: string[] | null;  // null = auto (server decides)
  onProgress?: (percent: number) => void;
}

interface UploadState {
  uploading: boolean;
  progress: number;
  phase: 'idle' | 'init' | 'chunks' | 'poster' | 'completing' | 'done' | 'error';
  error: string | null;
  uploadId: string | null;
  videoId: string | null;
}

export function useUpload() {
  const [state, setState] = useState<UploadState>({
    uploading: false, progress: 0, phase: 'idle',
    error: null, uploadId: null, videoId: null,
  });
  const abortRef = useRef(false);

  const upload = useCallback(async (opts: UploadOptions) => {
    abortRef.current = false;
    setState({ uploading: true, progress: 0, phase: 'init', error: null, uploadId: null, videoId: null });

    try {
      // 1. Init upload session
      const initRes = await uploadApi.init({
        filename:  opts.file.name,
        totalSize: opts.file.size,
        title:     opts.title,
        qualities: opts.qualities ?? null,
      });
      const { uploadId, chunkSize, totalChunks } = initRes.data;
      setState(s => ({ ...s, phase: 'chunks', uploadId }));

      // 2. Upload chunks
      const effectiveChunkSize = chunkSize || CHUNK_SIZE;
      const effectiveTotalChunks = totalChunks || Math.ceil(opts.file.size / effectiveChunkSize);

      for (let i = 0; i < effectiveTotalChunks; i++) {
        if (abortRef.current) throw new Error('Upload cancelled');
        const start  = i * effectiveChunkSize;
        const end    = Math.min(start + effectiveChunkSize, opts.file.size);
        const chunk  = opts.file.slice(start, end);
        const buffer = await chunk.arrayBuffer();
        await uploadApi.chunk(uploadId, i, buffer);
        const progress = Math.round(((i + 1) / effectiveTotalChunks) * 85);
        setState(s => ({ ...s, progress }));
        opts.onProgress?.(progress);
      }

      // 3. Upload poster (optional)
      if (opts.poster) {
        setState(s => ({ ...s, phase: 'poster', progress: 87 }));
        const buf  = await opts.poster.arrayBuffer();
        const pExt = '.' + (opts.poster.name.split('.').pop() || 'jpg');
        await uploadApi.poster(uploadId, buf, pExt);
      }

      // 4. Complete
      setState(s => ({ ...s, phase: 'completing', progress: 95 }));
      const completeRes = await uploadApi.complete(uploadId);
      const { videoId } = completeRes.data;

      setState({ uploading: false, progress: 100, phase: 'done', error: null, uploadId, videoId });
      return videoId as string;

    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Upload failed';
      setState(s => ({ ...s, uploading: false, phase: 'error', error: msg }));
      return null;
    }
  }, []);

  const cancel = useCallback(async () => {
    abortRef.current = true;
    if (state.uploadId) {
      await uploadApi.cancel(state.uploadId).catch(() => {});
    }
    setState({ uploading: false, progress: 0, phase: 'idle', error: null, uploadId: null, videoId: null });
  }, [state.uploadId]);

  const reset = useCallback(() => {
    setState({ uploading: false, progress: 0, phase: 'idle', error: null, uploadId: null, videoId: null });
  }, []);

  return { ...state, upload, cancel, reset };
}
