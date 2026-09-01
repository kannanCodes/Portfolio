"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  VOICE_NOTE_MAX_DURATION_SECONDS,
  VOICE_NOTE_SUPPORTED_MIME_TYPES,
} from "@/lib/voice-notes/constants";
import type { VoiceRecordingState } from "@/lib/voice-notes/types";

type StopReason = "manual" | "max-duration" | "discard";

function hasRecordingSupport() {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function" &&
    typeof MediaRecorder !== "undefined"
  );
}

function selectSupportedMimeType() {
  if (typeof MediaRecorder === "undefined") {
    return null;
  }

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

  const chunksRef = useRef<BlobPart[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const elapsedRef = useRef(0);
  const objectUrlRef = useRef<string | null>(null);
  const selectedMimeTypeRef = useRef<string | null>(null);
  const stopReasonRef = useRef<StopReason>("manual");
  const discardOnStopRef = useRef(false);
  const mountedRef = useRef(true);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const revokePreviewUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const setElapsed = useCallback((seconds: number) => {
    elapsedRef.current = seconds;
    setElapsedSeconds(seconds);
  }, []);

  const stopRecorderAtLimit = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    stopReasonRef.current = "max-duration";
    clearTimer();
    setElapsed(VOICE_NOTE_MAX_DURATION_SECONDS);
    recorder.stop();
  }, [clearTimer, setElapsed]);

  const startTimer = useCallback(() => {
    clearTimer();
    timerRef.current = window.setInterval(() => {
      const nextSeconds = elapsedRef.current + 1;

      if (nextSeconds >= VOICE_NOTE_MAX_DURATION_SECONDS) {
        stopRecorderAtLimit();
        return;
      }

      setElapsed(nextSeconds);
    }, 1000);
  }, [clearTimer, setElapsed, stopRecorderAtLimit]);

  const resetRecording = useCallback(() => {
    discardOnStopRef.current = true;
    stopReasonRef.current = "discard";
    clearTimer();

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        releaseStream();
      }
    } else {
      releaseStream();
    }

    chunksRef.current = [];
    mediaRecorderRef.current = null;
    selectedMimeTypeRef.current = null;
    revokePreviewUrl();
    setAudioBlob(null);
    setAudioUrl(null);
    setMimeType(null);
    setElapsed(0);
    setErrorMessage(null);
    setStatus("idle");
  }, [clearTimer, releaseStream, revokePreviewUrl, setElapsed]);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    stopReasonRef.current = "manual";
    clearTimer();

    if (!recorder || recorder.state === "inactive") {
      releaseStream();
      return;
    }

    try {
      recorder.requestData();
      recorder.stop();
    } catch (error) {
      console.error("Voice recorder stop failed:", error);
      releaseStream();
      setStatus("error");
      setErrorMessage("Recording could not be stopped. Please try again.");
    }
  }, [clearTimer, releaseStream]);

  const startRecording = useCallback(async () => {
    resetRecording();

    if (!hasRecordingSupport()) {
      setStatus("error");
      setErrorMessage("Your browser does not support voice recording.");
      return;
    }

    const supportedMimeType = selectSupportedMimeType();
    if (!supportedMimeType) {
      setStatus("error");
      setErrorMessage("Your browser does not support the audio formats this site accepts.");
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
    } catch (error) {
      console.error("Microphone permission failed:", error);
      setStatus("error");
      setErrorMessage("Microphone permission was denied. You can still use the text form.");
      return;
    }

    try {
      const recorder = new MediaRecorder(stream, { mimeType: supportedMimeType });
      chunksRef.current = [];
      streamRef.current = stream;
      mediaRecorderRef.current = recorder;
      selectedMimeTypeRef.current = supportedMimeType;
      stopReasonRef.current = "manual";
      discardOnStopRef.current = false;

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      });

      recorder.addEventListener("error", (event) => {
        console.error("Voice recorder error:", event);
        discardOnStopRef.current = true;
        clearTimer();
        releaseStream();
        setStatus("error");
        setErrorMessage("Recording failed. Please try again.");
      });

      recorder.addEventListener("stop", () => {
        releaseStream();

        if (discardOnStopRef.current) {
          discardOnStopRef.current = false;
          chunksRef.current = [];
          return;
        }

        const recordedBlob = new Blob(chunksRef.current, { type: selectedMimeTypeRef.current ?? "" });
        chunksRef.current = [];

        if (!mountedRef.current) {
          return;
        }

        if (recordedBlob.size === 0) {
          setStatus("error");
          setErrorMessage("The recording was empty. Please try again.");
          return;
        }

        revokePreviewUrl();
        const nextUrl = URL.createObjectURL(recordedBlob);
        objectUrlRef.current = nextUrl;
        setAudioBlob(recordedBlob);
        setAudioUrl(nextUrl);
        setMimeType(selectedMimeTypeRef.current);
        setStatus("stopped");

        if (stopReasonRef.current === "max-duration") {
          setErrorMessage("Recording stopped at the 60 second limit.");
        }
      });

      setAudioBlob(null);
      setAudioUrl(null);
      setMimeType(supportedMimeType);
      setElapsed(0);
      setErrorMessage(null);
      setStatus("recording");
      recorder.start(1000);
      startTimer();
    } catch (error) {
      console.error("Voice recorder setup failed:", error);
      releaseStream();
      setStatus("error");
      setErrorMessage("Recording could not start. Please try another browser.");
    }
  }, [clearTimer, releaseStream, resetRecording, revokePreviewUrl, setElapsed, startTimer]);

  const pauseRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "recording") return;

    recorder.pause();
    clearTimer();
    setStatus("paused");
    setErrorMessage(null);
  }, [clearTimer]);

  const resumeRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "paused") return;

    recorder.resume();
    startTimer();
    setStatus("recording");
    setErrorMessage(null);
  }, [startTimer]);

  useEffect(() => {
    const supportTimer = window.setTimeout(() => setIsSupported(hasRecordingSupport()), 0);

    return () => {
      mountedRef.current = false;
      window.clearTimeout(supportTimer);
      discardOnStopRef.current = true;
      clearTimer();

      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        try {
          recorder.stop();
        } catch {
          // Ignore cleanup errors on unmount.
        }
      }

      releaseStream();
      revokePreviewUrl();
    };
  }, [clearTimer, releaseStream, revokePreviewUrl]);

  return {
    status,
    elapsedSeconds,
    audioBlob,
    audioUrl,
    mimeType,
    errorMessage,
    isSupported,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    retakeRecording: resetRecording,
  };
}
