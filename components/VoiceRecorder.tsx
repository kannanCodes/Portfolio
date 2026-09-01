"use client";

import { useMemo, useRef, useState } from "react";
import { LoaderCircle, Mic, Pause, Play, RotateCcw, Send, Square } from "lucide-react";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import {
  getVoiceNoteExtension,
  VOICE_NOTE_MAX_FILE_SIZE_BYTES,
} from "@/lib/voice-notes/constants";
import type { VoiceNoteUploadResponse } from "@/lib/voice-notes/types";

type VoiceContactState = {
  name: string;
  email: string;
};

type VoiceContactTouched = {
  name: boolean;
  email: boolean;
};

type UploadStatus = "idle" | "uploading" | "success" | "error";

function formatTime(seconds: number) {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const minutes = Math.floor(safeSeconds / 60)
    .toString()
    .padStart(2, "0");
  const remainingSeconds = (safeSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
}

function validateVoiceContact(contact: VoiceContactState) {
  const errors: Partial<VoiceContactState> = {};
  const name = contact.name.trim();
  const email = contact.email.trim();

  if (!name) {
    errors.name = "Name is required.";
  } else if (name.length < 3) {
    errors.name = "Name must be at least 3 characters.";
  }

  if (!email) {
    errors.email = "Email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Enter a valid email address.";
  }

  return errors;
}

function VoiceLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="font-mono text-neutral-500 uppercase"
      style={{ fontSize: "9px", letterSpacing: "0.18em", display: "block", marginBottom: "6px" }}
    >
      {children}
    </label>
  );
}

function VoiceFieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p
      id={id}
      className="font-mono text-red-400"
      style={{ fontSize: "9px", letterSpacing: "0.04em", marginTop: "5px" }}
    >
      {message}
    </p>
  );
}

function VoiceButton({
  children,
  icon,
  onClick,
  disabled,
  ariaLabel,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="inline-flex items-center gap-2 font-mono text-neutral-900 hover:text-neutral-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200"
      style={{
        fontSize: "10px",
        letterSpacing: "0.18em",
        paddingBottom: "2px",
        borderBottom: "1px solid currentColor",
      }}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}

export default function VoiceRecorder() {
  const recorder = useVoiceRecorder();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [contact, setContact] = useState<VoiceContactState>({ name: "", email: "" });
  const [touched, setTouched] = useState<VoiceContactTouched>({ name: false, email: false });
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const contactErrors = validateVoiceContact(contact);
  const totalDuration = audioDuration > 0 ? audioDuration : recorder.elapsedSeconds;
  const playbackProgress = totalDuration > 0 ? Math.min(100, (currentPlaybackTime / totalDuration) * 100) : 0;
  const isUploading = uploadStatus === "uploading";

  const statusText = useMemo(() => {
    if (uploadStatus === "success") return "Voice note sent. Thanks for reaching out.";
    if (uploadStatus === "uploading") return "Uploading voice note.";
    if (recorder.status === "recording") {
      return `Recording. Microphone active. ${formatTime(recorder.elapsedSeconds)} elapsed.`;
    }
    if (recorder.status === "paused") {
      return `Paused. ${formatTime(recorder.elapsedSeconds)} recorded.`;
    }
    if (recorder.status === "stopped") {
      return `Recording ready. ${formatTime(recorder.elapsedSeconds)} recorded.`;
    }
    if (recorder.status === "error") return recorder.errorMessage ?? "Voice recording is unavailable.";
    return "Voice recorder idle.";
  }, [recorder.elapsedSeconds, recorder.errorMessage, recorder.status, uploadStatus]);

  const inputStyle = (field: keyof VoiceContactState): React.CSSProperties => ({
    width: "100%",
    padding: "10px 13px",
    background: "#ffffff",
    border: `1px solid ${touched[field] && contactErrors[field] ? "#fca5a5" : "#e5e3df"}`,
    borderRadius: "7px",
    fontSize: "13px",
    fontFamily: "inherit",
    color: "#111111",
    outline: "none",
    transition: "border-color 0.18s ease, box-shadow 0.18s ease",
  });

  const handleContactChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setContact((previous) => ({ ...previous, [event.target.name]: event.target.value }));
  };

  const handleContactBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    setTouched((previous) => ({ ...previous, [event.target.name]: true }));
  };

  const handleRetake = () => {
    audioRef.current?.pause();
    setIsPlaying(false);
    setCurrentPlaybackTime(0);
    setAudioDuration(0);
    setUploadStatus("idle");
    setUploadMessage(null);
    recorder.retakeRecording();
  };

  const handlePlayToggle = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    try {
      await audio.play();
      setIsPlaying(true);
      setUploadMessage(null);
    } catch (error) {
      console.error("Voice note playback failed:", error);
      setUploadStatus("error");
      setUploadMessage("Playback could not start. Please try again.");
    }
  };

  const handleSend = async () => {
    setTouched({ name: true, email: true });
    setUploadMessage(null);

    if (Object.keys(contactErrors).length > 0) {
      setUploadStatus("error");
      setUploadMessage("Please add your name and email before sending.");
      return;
    }

    if (!recorder.audioBlob) {
      setUploadStatus("error");
      setUploadMessage("Please record a voice note before sending.");
      return;
    }

    if (recorder.audioBlob.size > VOICE_NOTE_MAX_FILE_SIZE_BYTES) {
      setUploadStatus("error");
      setUploadMessage("Voice note is too large. Please retake it under 60 seconds.");
      return;
    }

    setUploadStatus("uploading");

    const extension = getVoiceNoteExtension(recorder.mimeType ?? recorder.audioBlob.type);
    const formData = new FormData();
    formData.append("audio", recorder.audioBlob, `voice-note.${extension}`);
    formData.append("name", contact.name.trim());
    formData.append("email", contact.email.trim());
    formData.append("duration", String(recorder.elapsedSeconds));

    try {
      const response = await fetch("/api/voice-notes", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json().catch(() => null)) as VoiceNoteUploadResponse | null;

      if (!response.ok || !payload?.success) {
        setUploadStatus("error");
        setUploadMessage(payload?.success === false ? payload.error : "Upload failed. Please try again.");
        return;
      }

      audioRef.current?.pause();
      setIsPlaying(false);
      setUploadStatus("success");
      setUploadMessage(payload.message);
    } catch (error) {
      console.error("Voice note upload failed:", error);
      setUploadStatus("error");
      setUploadMessage("Network error. Please try again.");
    }
  };

  return (
    <div style={{ borderTop: "1px solid #e5e3df", marginTop: "26px", paddingTop: "24px" }}>
      <div style={{ marginBottom: "18px" }}>
        <p
          className="text-neutral-900 font-semibold"
          style={{ fontSize: "15px", marginBottom: "4px" }}
        >
          Prefer talking?
        </p>
        <p className="text-neutral-400" style={{ fontSize: "13px", lineHeight: 1.7 }}>
          Send me a quick voice note.
        </p>
      </div>

      <p
        id="voice-note-status"
        role="status"
        aria-live="polite"
        className="font-mono text-neutral-500"
        style={{ fontSize: "10px", letterSpacing: "0.05em", marginBottom: "14px" }}
      >
        {statusText}
      </p>

      {recorder.status === "recording" && (
        <div
          className="font-mono text-neutral-700"
          style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "10px", marginBottom: "14px" }}
        >
          <span
            aria-hidden="true"
            style={{
              width: "7px",
              height: "7px",
              borderRadius: "999px",
              background: "#dc2626",
              display: "inline-block",
            }}
          />
          <span>Recording - microphone active - {formatTime(recorder.elapsedSeconds)}</span>
        </div>
      )}

      {uploadStatus === "success" ? (
        <div style={{ display: "grid", gap: "12px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 12px",
              border: "1px solid #bbf7d0",
              borderRadius: "7px",
              background: "#f0fdf4",
              fontFamily: "inherit",
              fontSize: "12px",
              color: "#166534",
              lineHeight: 1.4,
            }}
          >
            <span aria-hidden="true">✓</span>
            <span>Voice note sent. Thanks for reaching out.</span>
          </div>
          <div>
            <VoiceButton
              ariaLabel="Record another voice note"
              icon={<RotateCcw size={12} aria-hidden="true" />}
              onClick={handleRetake}
            >
              RECORD ANOTHER
            </VoiceButton>
          </div>
        </div>
      ) : (
        <>
          {(recorder.status === "idle" || recorder.status === "error") && (
            <VoiceButton
              ariaLabel="Start recording voice note"
              icon={<Mic size={12} aria-hidden="true" />}
              onClick={recorder.startRecording}
              disabled={recorder.isSupported === false}
            >
              START RECORDING
            </VoiceButton>
          )}

          {(recorder.status === "recording" || recorder.status === "paused") && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "14px" }}>
              {recorder.status === "recording" ? (
                <VoiceButton
                  ariaLabel="Pause voice note recording"
                  icon={<Pause size={12} aria-hidden="true" />}
                  onClick={recorder.pauseRecording}
                >
                  PAUSE
                </VoiceButton>
              ) : (
                <VoiceButton
                  ariaLabel="Resume voice note recording"
                  icon={<Mic size={12} aria-hidden="true" />}
                  onClick={recorder.resumeRecording}
                >
                  RESUME
                </VoiceButton>
              )}
              <VoiceButton
                ariaLabel="Stop voice note recording"
                icon={<Square size={12} aria-hidden="true" />}
                onClick={recorder.stopRecording}
              >
                STOP
              </VoiceButton>
            </div>
          )}

          {recorder.audioUrl && recorder.status === "stopped" && (
            <div style={{ display: "grid", gap: "16px" }}>
              <audio
                ref={audioRef}
                src={recorder.audioUrl}
                preload="metadata"
                onLoadedMetadata={(event) => {
                  const nextDuration = event.currentTarget.duration;
                  if (Number.isFinite(nextDuration) && nextDuration > 0) {
                    setAudioDuration(nextDuration);
                  }
                }}
                onTimeUpdate={(event) => setCurrentPlaybackTime(event.currentTarget.currentTime)}
                onEnded={() => {
                  setIsPlaying(false);
                  setCurrentPlaybackTime(0);
                }}
              />

              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "8px" }}>
                  <VoiceButton
                    ariaLabel={isPlaying ? "Pause voice note preview" : "Play voice note preview"}
                    icon={isPlaying ? <Pause size={12} aria-hidden="true" /> : <Play size={12} aria-hidden="true" />}
                    onClick={handlePlayToggle}
                    disabled={isUploading}
                  >
                    {isPlaying ? "PAUSE" : "PLAY"}
                  </VoiceButton>
                  <span
                    className="font-mono text-neutral-400"
                    style={{ fontSize: "10px", letterSpacing: "0.05em" }}
                  >
                    {formatTime(currentPlaybackTime)} / {formatTime(totalDuration)}
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-label="Voice note playback progress"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(playbackProgress)}
                  style={{
                    width: "100%",
                    height: "4px",
                    borderRadius: "999px",
                    background: "#e5e3df",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${playbackProgress}%`,
                      height: "100%",
                      background: "#111111",
                    }}
                  />
                </div>
              </div>

              <div
                className="grid grid-cols-1 sm:grid-cols-2"
                style={{ gap: "16px" }}
              >
                <div>
                  <VoiceLabel htmlFor="voice-note-name">Name</VoiceLabel>
                  <input
                    id="voice-note-name"
                    name="name"
                    type="text"
                    placeholder="Kannan S"
                    value={contact.name}
                    onChange={handleContactChange}
                    onBlur={handleContactBlur}
                    autoComplete="name"
                    style={inputStyle("name")}
                    aria-describedby={touched.name && contactErrors.name ? "voice-note-name-error" : undefined}
                    disabled={isUploading}
                    onFocus={(event) => {
                      event.currentTarget.style.borderColor = "#a3a09b";
                      event.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,0,0,0.04)";
                    }}
                    onBlurCapture={(event) => {
                      event.currentTarget.style.borderColor =
                        touched.name && contactErrors.name ? "#fca5a5" : "#e5e3df";
                      event.currentTarget.style.boxShadow = "none";
                    }}
                  />
                  <VoiceFieldError id="voice-note-name-error" message={touched.name ? contactErrors.name : undefined} />
                </div>

                <div>
                  <VoiceLabel htmlFor="voice-note-email">Email</VoiceLabel>
                  <input
                    id="voice-note-email"
                    name="email"
                    type="email"
                    placeholder="hello@example.com"
                    value={contact.email}
                    onChange={handleContactChange}
                    onBlur={handleContactBlur}
                    autoComplete="email"
                    style={inputStyle("email")}
                    aria-describedby={touched.email && contactErrors.email ? "voice-note-email-error" : undefined}
                    disabled={isUploading}
                    onFocus={(event) => {
                      event.currentTarget.style.borderColor = "#a3a09b";
                      event.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,0,0,0.04)";
                    }}
                    onBlurCapture={(event) => {
                      event.currentTarget.style.borderColor =
                        touched.email && contactErrors.email ? "#fca5a5" : "#e5e3df";
                      event.currentTarget.style.boxShadow = "none";
                    }}
                  />
                  <VoiceFieldError id="voice-note-email-error" message={touched.email ? contactErrors.email : undefined} />
                </div>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "14px", alignItems: "center" }}>
                <VoiceButton
                  ariaLabel="Retake voice note"
                  icon={<RotateCcw size={12} aria-hidden="true" />}
                  onClick={handleRetake}
                  disabled={isUploading}
                >
                  RETAKE
                </VoiceButton>
                <VoiceButton
                  ariaLabel="Send voice note"
                  icon={
                    isUploading ? (
                      <LoaderCircle size={12} aria-hidden="true" className="animate-spin" />
                    ) : (
                      <Send size={12} aria-hidden="true" />
                    )
                  }
                  onClick={handleSend}
                  disabled={isUploading}
                >
                  {isUploading ? "SENDING..." : "SEND"}
                </VoiceButton>
              </div>
            </div>
          )}

          {(recorder.errorMessage || uploadMessage) && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 12px",
                border: "1px solid #fecaca",
                borderRadius: "7px",
                background: "#fef2f2",
                fontFamily: "inherit",
                fontSize: "12px",
                color: "#991b1b",
                lineHeight: 1.4,
                marginTop: "16px",
              }}
            >
              <span aria-hidden="true">⚠</span>
              <span>{uploadMessage ?? recorder.errorMessage}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
