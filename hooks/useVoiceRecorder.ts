"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  VOICE_NOTE_MAX_DURATION_SECONDS,
  VOICE_NOTE_SUPPORTED_MIME_TYPES,
} from "@/lib/voice-notes/constants";
import type { VoiceRecordingState } from "@/lib/voice-notes/types";

function hasRecordingSupport() {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function" &&
    typeof MediaRecorder !== "undefined"
  );
}

function selectSupportedMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  return (
    VOICE_NOTE_SUPPORTED_MIME_TYPES.find((config) => {
      try {
        return MediaRecorder.isTypeSupported(config.mimeType);
      } catch {
        return false;
      }
    })?.mimeType ?? null
  );
}

export function useVoiceRecorder() {
  const [status, setStatus] = useState<VoiceRecordingState>("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState<boolean | null>(null);

  // Refs for MediaRecorder machinery — never cause re-renders
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const selectedMimeTypeRef = useRef<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  // Timer refs
  const intervalRef = useRef<number | null>(null);
  const elapsedRef = useRef(0);
  const fallbackTimerRef = useRef<number | null>(null);

  // Flags
  const discardRef = useRef(false);      // true → ignore the next stop event
  const stoppingRef = useRef(false);     // true → stopRecording already in flight
  const maxDurationRef = useRef(false);  // true → stopped at 60s limit
  const epochRef = useRef(0);            // increments on each new startRecording call

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const clearInterval_ = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const clearFallback = useCallback(() => {
    if (fallbackTimerRef.current !== null) {
      window.clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }, []);

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const revokeUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const setElapsed = useCallback((s: number) => {
    elapsedRef.current = s;
    setElapsedSeconds(s);
  }, []);

  // ─── Core stop handler (runs inside the "stop" event) ───────────────────────

  const handleStopEvent = useCallback(() => {
    // 1. Cancel the safety-net timer — stop fired in time.
    clearFallback();

    // 2. Reset flags for the next recording session.
    stoppingRef.current = false;

    // 3. Release the microphone stream.
    releaseStream();

    // 4. If we discarded this recording, clean up and go idle.
    if (discardRef.current) {
      discardRef.current = false;
      chunksRef.current = [];
      return;
    }

    // 5. Build the blob from chunks collected during recording.
    const blob = new Blob(chunksRef.current, {
      type: selectedMimeTypeRef.current ?? "",
    });
    chunksRef.current = [];

    if (!mountedRef.current) return;

    if (blob.size === 0) {
      setStatus("error");
      setErrorMessage("The recording was empty. Please try again.");
      return;
    }

    // 6. Create a preview URL and expose everything.
    revokeUrl();
    const url = URL.createObjectURL(blob);
    objectUrlRef.current = url;

    setAudioBlob(blob);
    setAudioUrl(url);
    setMimeType(selectedMimeTypeRef.current);
    setStatus("stopped");

    if (maxDurationRef.current) {
      maxDurationRef.current = false;
      setErrorMessage("Recording stopped at the 60-second limit.");
    }
  }, [clearFallback, releaseStream, revokeUrl]);

  // ─── Internal: actually call recorder.stop() safely ─────────────────────────

  const commitStop = useCallback(
    (recorder: MediaRecorder) => {
      if (stoppingRef.current) return;
      stoppingRef.current = true;
      clearInterval_();

      try {
        // Resume first if paused — some browsers discard buffered data otherwise.
        if (recorder.state === "paused") recorder.resume();
        recorder.stop();
      } catch (err) {
        console.error("recorder.stop() threw:", err);
        clearFallback();
        stoppingRef.current = false;
        releaseStream();
        setStatus("error");
        setErrorMessage("Could not stop the recording. Please try again.");
        return;
      }

      // Safety-net: if the browser never fires the stop event, force an error.
      fallbackTimerRef.current = window.setTimeout(() => {
        clearFallback();
        stoppingRef.current = false;
        releaseStream();
        setStatus("error");
        setErrorMessage("Recording did not finish. Please try again.");
      }, 2000);
    },
    [clearFallback, clearInterval_, releaseStream]
  );

  // ─── Public actions ──────────────────────────────────────────────────────────

  const startRecording = useCallback(async () => {
    // Increment epoch — any pending getUserMedia from a previous call will bail out.
    const myEpoch = ++epochRef.current;

    // Tear down any previous session first.
    clearInterval_();
    clearFallback();
    discardRef.current = true; // discard any lingering stop event from old recorder
    stoppingRef.current = false;
    maxDurationRef.current = false;

    const oldRecorder = mediaRecorderRef.current;
    if (oldRecorder && oldRecorder.state !== "inactive") {
      try { oldRecorder.stop(); } catch { /* ignore */ }
    }
    mediaRecorderRef.current = null;
    selectedMimeTypeRef.current = null;
    chunksRef.current = [];

    revokeUrl();
    setAudioBlob(null);
    setAudioUrl(null);
    setMimeType(null);
    setElapsed(0);
    setErrorMessage(null);

    // Check support
    if (!hasRecordingSupport()) {
      setStatus("error");
      setErrorMessage("Your browser does not support voice recording.");
      return;
    }

    const mimeType_ = selectSupportedMimeType();
    if (!mimeType_) {
      setStatus("error");
      setErrorMessage("Your browser audio format is not supported.");
      return;
    }

    setStatus("initializing");

    // Wrap getUserMedia in a 15-second timeout so the UI never hangs forever.
    // Chrome often shows the permission prompt as a tiny icon in the address bar
    // rather than a blocking modal, so users can miss it entirely.
    let stream: MediaStream;
    try {
      const micTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 15000)
      );
      stream = await Promise.race([
        navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
        }),
        micTimeout,
      ]);
    } catch (err) {
      const isTimeout = err instanceof Error && err.message === "timeout";
      setStatus("error");
      setErrorMessage(
        isTimeout
          ? "Microphone access timed out. Click Allow in your browser's address bar, then try again."
          : "Microphone access was denied. Click Allow in your browser's address bar, then try again."
      );
      return;
    }

    if (!mountedRef.current || epochRef.current !== myEpoch) {
      // A newer startRecording call was made while we were waiting for permission.
      stream.getTracks().forEach((t) => t.stop());
      return;
    }

    // Build the MediaRecorder
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType: mimeType_ });
    } catch {
      stream.getTracks().forEach((t) => t.stop());
      setStatus("error");
      setErrorMessage("Could not start the recorder. Please try another browser.");
      return;
    }

    streamRef.current = stream;
    mediaRecorderRef.current = recorder;
    selectedMimeTypeRef.current = mimeType_;
    discardRef.current = false; // new recorder — accept its stop event

    // ── Event listeners (once: true prevents stale handlers on retake) ────────
    recorder.addEventListener("dataavailable", (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    });

    recorder.addEventListener("stop", handleStopEvent, { once: true });

    recorder.addEventListener("error", () => {
      clearFallback();
      clearInterval_();
      stoppingRef.current = false;
      releaseStream();
      setStatus("error");
      setErrorMessage("Recording failed. Please try again.");
    }, { once: true });

    // FIX 1: Use a 250ms timeslice so chunks accumulate before stop() is called.
    // This prevents the empty-blob bug when stopping while paused.
    recorder.start(250);

    // Start the elapsed timer
    setStatus("recording");
    setElapsed(0);
    intervalRef.current = window.setInterval(() => {
      const next = elapsedRef.current + 1;
      if (next >= VOICE_NOTE_MAX_DURATION_SECONDS) {
        maxDurationRef.current = true;
        const r = mediaRecorderRef.current;
        if (r && r.state !== "inactive") commitStop(r);
        return;
      }
      setElapsed(next);
    }, 1000);
  }, [clearFallback, clearInterval_, commitStop, handleStopEvent, releaseStream, revokeUrl, setElapsed]);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      // Already stopped or never started — show error so UI un-sticks
      clearInterval_();
      stoppingRef.current = false;
      setStatus("error");
      setErrorMessage("Recording was interrupted. Please try again.");
      return;
    }
    commitStop(recorder);
  }, [clearInterval_, commitStop]);

  const pauseRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "recording") return;
    try {
      recorder.pause();
      clearInterval_();
      setStatus("paused");
    } catch {
      setStatus("error");
      setErrorMessage("Could not pause. Please try again.");
    }
  }, [clearInterval_]);

  const resumeRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "paused") return;
    try {
      recorder.resume();
      setStatus("recording");
      // Restart the elapsed timer from where we left off
      intervalRef.current = window.setInterval(() => {
        const next = elapsedRef.current + 1;
        if (next >= VOICE_NOTE_MAX_DURATION_SECONDS) {
          maxDurationRef.current = true;
          const r = mediaRecorderRef.current;
          if (r && r.state !== "inactive") commitStop(r);
          return;
        }
        setElapsed(next);
      }, 1000);
    } catch {
      setStatus("error");
      setErrorMessage("Could not resume. Please try again.");
    }
  }, [commitStop, setElapsed]);

  const retakeRecording = useCallback(() => {
    discardRef.current = true;
    clearInterval_();
    clearFallback();
    stoppingRef.current = false;

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      try { recorder.stop(); } catch { /* ignore */ }
    }
    mediaRecorderRef.current = null;
    selectedMimeTypeRef.current = null;
    chunksRef.current = [];

    releaseStream();
    revokeUrl();

    setAudioBlob(null);
    setAudioUrl(null);
    setMimeType(null);
    setElapsed(0);
    setErrorMessage(null);
    setStatus("idle");
  }, [clearFallback, clearInterval_, releaseStream, revokeUrl, setElapsed]);

  // ─── Cleanup on unmount ──────────────────────────────────────────────────────

  useEffect(() => {
    const t = window.setTimeout(() => setIsSupported(hasRecordingSupport()), 0);

    return () => {
      mountedRef.current = false;
      window.clearTimeout(t);
      clearInterval_();
      clearFallback();
      discardRef.current = true;

      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        try { recorder.stop(); } catch { /* ignore */ }
      }

      releaseStream();
      revokeUrl();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    status,
    elapsedSeconds,
    audioBlob,
    audioUrl,
    mimeType,
    errorMessage,
    isSupported,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    retakeRecording,
  };
}
