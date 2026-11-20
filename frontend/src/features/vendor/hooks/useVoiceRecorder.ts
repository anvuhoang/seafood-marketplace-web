"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

/** Recording stops by itself here; a product description never needs more. */
export const MAX_RECORDING_SECONDS = 60;

const MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];

const noopSubscribe = () => () => undefined;
const detectSupport = () =>
  typeof navigator !== "undefined" &&
  typeof navigator.mediaDevices?.getUserMedia === "function" &&
  typeof MediaRecorder !== "undefined";

/** True when this browser can record from the microphone; false while rendering on the server. */
export function useRecordingSupported(): boolean {
  return useSyncExternalStore(noopSubscribe, detectSupport, () => false);
}

function describeStartError(error: unknown): string {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Bạn chưa cho phép dùng micro. Hãy cấp quyền micro cho trang này rồi thử lại.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return "Không tìm thấy micro trên thiết bị này.";
  }
  return "Không thể bắt đầu ghi âm. Vui lòng thử lại hoặc gõ mô tả.";
}

interface Options {
  /** Called with the finished recording. */
  onRecorded: (recording: Blob) => void;
  onError: (message: string) => void;
}

/** Records the microphone with MediaRecorder. Nothing is kept: the audio goes to `onRecorded` and is dropped. */
export function useVoiceRecorder({ onRecorded, onError }: Options) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const discardRef = useRef(false);
  const handlers = useRef({ onRecorded, onError });

  useEffect(() => {
    handlers.current = { onRecorded, onError };
  });

  const release = useCallback(() => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    setRecording(false);
    setSeconds(0);
  }, []);

  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state === "recording") recorder.stop();
  }, []);

  const start = useCallback(async () => {
    if (recorderRef.current) return;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      handlers.current.onError(describeStartError(error));
      return;
    }

    const mimeType = MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type));
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    } catch {
      stream.getTracks().forEach((track) => track.stop());
      handlers.current.onError("Trình duyệt này không ghi âm được. Vui lòng gõ mô tả.");
      return;
    }

    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onstop = () => {
      const discard = discardRef.current;
      discardRef.current = false;
      const blob = new Blob(chunks, { type: recorder.mimeType });
      release();
      if (discard) return;
      if (blob.size === 0) handlers.current.onError("Không thu được âm thanh. Vui lòng thử lại.");
      else handlers.current.onRecorded(blob);
    };

    streamRef.current = stream;
    recorderRef.current = recorder;
    discardRef.current = false;
    recorder.start();
    setRecording(true);

    const startedAt = Date.now();
    timerRef.current = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      setSeconds(elapsed);
      if (elapsed >= MAX_RECORDING_SECONDS) stop();
    }, 250);
  }, [release, stop]);

  // Leaving the page must release the microphone and drop the recording.
  useEffect(() => {
    // React may mount, clean up and mount again (Strict Mode); a mount must clear what a clean-up set.
    discardRef.current = false;
    return () => {
      discardRef.current = true;
      const recorder = recorderRef.current;
      if (recorder && recorder.state === "recording") recorder.stop();
      else release();
    };
  }, [release]);

  return { recording, seconds, start, stop };
}
