// src/hooks/useUpload.ts
import { useState, useCallback, useRef } from 'react';
import { uploadApi } from '../services/api';
import toast from 'react-hot-toast';

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

interface UploadOptions {
  file: File;
  title: string;
  poster?: File | null;
  qualities?: string[] | null;
  segmentDuration?: number;
  keyRotationInterval?: number;
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
      // 1. Init
      const ext = opts.file.name.split('.').pop() || 'mp4';
      const initRes = await uploadApi.init({
        filename: opts.file.name,
        totalSize: opts.file.size,
        title: opts.title,
        qualities: opts.qualities ?? undefined,
        segmentDuration: opts.segmentDuration,
        keyRotationInterval: opts.keyRotationInterval,
      });
      const { uploadId, chunkSize, totalChunks } = initRes.data;
      setState(s => ({ ...s, phase: 'chunks', uploadId }));

      // 2. Upload chunks
      for (let i = 0; i < totalChunks; i++) {
        if (abortRef.current) throw new Error('Upload cancelled');
        const start  = i * chunkSize;
        const end    = Math.min(start + chunkSize, opts.file.size);
        const chunk  = opts.file.slice(start, end);
        const buffer = await chunk.arrayBuffer();
        await uploadApi.chunk(uploadId, i, buffer);
        const progress = Math.round(((i + 1) / totalChunks) * 85);
        setState(s => ({ ...s, progress }));
        opts.onProgress?.(progress);
      }

      // 3. Upload poster (optional)
      if (opts.poster) {
        setState(s => ({ ...s, phase: 'poster', progress: 87 }));
        const buf = await opts.poster.arrayBuffer();
        const pExt = '.' + (opts.poster.name.split('.').pop() || 'jpg');
        await uploadApi.poster(uploadId, buf, pExt);
      }

      // 4. Complete
      setState(s => ({ ...s, phase: 'completing', progress: 95 }));
      const completeRes = await uploadApi.complete(uploadId);
      const { videoId } = completeRes.data;

      setState({ uploading: false, progress: 100, phase: 'done', error: null, uploadId, videoId });
      toast.success('Video uploaded successfully!');
      return videoId as string;

    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Upload failed';
      setState(s => ({ ...s, uploading: false, phase: 'error', error: msg }));
      toast.error(msg);
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
