"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle, Mic, MicOff, Pause, Play, RotateCcw, Send, Square } from "lucide-react";
import { getVoiceNoteExtension, VOICE_NOTE_MAX_DURATION_SECONDS } from "@/lib/voice-notes/constants";
import type { VoiceNoteUploadResponse } from "@/lib/voice-notes/types";

// ─── Types ───────────────────────────────────────────────────────────────────

type Stage =
  | "permission-unknown"   // checking permission on mount
  | "permission-prompt"    // user hasn't granted mic yet
  | "permission-denied"    // user blocked mic
  | "idle"                 // mic allowed, ready to record
  | "recording"
  | "paused"
  | "review"               // stopped, reviewing before send
  | "uploading"
  | "sent"
  | "error";

type Contact = { name: string; email: string };
type Touched = { name: boolean; email: boolean };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(s: number) {
  const safe = Math.max(0, Math.floor(Number.isFinite(s) ? s : 0));
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

function selectMime(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg",
    "audio/mp4",
  ];
  return candidates.find((m) => { try { return MediaRecorder.isTypeSupported(m); } catch { return false; } }) ?? null;
}

function validateContact(c: Contact): Partial<Contact> {
  const errs: Partial<Contact> = {};
  if (!c.name.trim()) errs.name = "Name is required.";
  else if (c.name.trim().length < 3) errs.name = "At least 3 characters.";
  if (!c.email.trim()) errs.email = "Email is required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) errs.email = "Enter a valid email.";
  return errs;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Btn({
  children, icon, onClick, disabled, variant = "default",
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "default" | "primary";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 font-mono transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        fontSize: "10px",
        letterSpacing: "0.18em",
        paddingBottom: "2px",
        color: variant === "primary" ? "#111" : "#555",
        borderBottom: `1px solid ${variant === "primary" ? "#111" : "#aaa"}`,
      }}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}

function FieldInput({
  id, label, type, placeholder, value, onChange, onBlur, touched, error, disabled,
}: {
  id: string; label: string; type: string; placeholder: string;
  value: string; onChange: (v: string) => void; onBlur: () => void;
  touched: boolean; error?: string; disabled?: boolean;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="font-mono text-neutral-500 uppercase"
        style={{ fontSize: "9px", letterSpacing: "0.18em", display: "block", marginBottom: "6px" }}
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        style={{
          width: "100%", padding: "10px 13px",
          background: "#fff",
          border: `1px solid ${touched && error ? "#fca5a5" : "#e5e3df"}`,
          borderRadius: "7px", fontSize: "13px",
          fontFamily: "inherit", color: "#111", outline: "none",
        }}
      />
      {touched && error && (
        <p className="font-mono text-red-400" style={{ fontSize: "9px", marginTop: "5px" }}>{error}</p>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function VoiceRecorder() {
  const [stage, setStage] = useState<Stage>("permission-unknown");
  const [elapsed, setElapsed] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [uploadErr, setUploadErr] = useState("");
  const [contact, setContact] = useState<Contact>({ name: "", email: "" });
  const [touched, setTouched] = useState<Touched>({ name: false, email: false });
  const [isPlaying, setIsPlaying] = useState(false);
  const [playTime, setPlayTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const intervalRef = useRef<number | null>(null);
  const elapsedRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const segmentStartTimeRef = useRef<number | null>(null);

  // ─── Check mic permission on mount ────────────────────────────────────────

  useEffect(() => {
    if (typeof navigator === "undefined") return;

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setStage("error");
      setErrorMsg("Voice recording isn't supported in this browser.");
      return;
    }

    if (!navigator.permissions?.query) {
      setStage("idle");
      return;
    }

    navigator.permissions
      .query({ name: "microphone" as PermissionName })
      .then((result) => {
        if (result.state === "granted") {
          setStage("idle");
        } else if (result.state === "denied") {
          setStage("permission-denied");
        } else {
          setStage("permission-prompt");
        }

        result.addEventListener("change", () => {
          if (result.state === "granted") setStage("idle");
          else if (result.state === "denied") setStage("permission-denied");
          else setStage("permission-prompt");
        });
      })
      .catch(() => {
        setStage("idle");
      });
  }, []);

  // ─── Cleanup helpers ──────────────────────────────────────────────────────

  function cleanupAudioContext() {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);
  }

  useEffect(() => {
    return () => {
      stopTimer();
      cleanupAudioContext();
      recorderRef.current?.state !== "inactive" && recorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Timer helpers ─────────────────────────────────────────────────────────

  function startTimer() {
    stopTimer();
    intervalRef.current = window.setInterval(() => {
      if (segmentStartTimeRef.current !== null) {
        const secs = Math.max(1, Math.round((Date.now() - segmentStartTimeRef.current) / 1000));
        elapsedRef.current = secs;
        setElapsed(secs);
      } else {
        elapsedRef.current += 1;
        setElapsed(elapsedRef.current);
      }
      if (elapsedRef.current >= VOICE_NOTE_MAX_DURATION_SECONDS) {
        doStop();
      }
    }, 250);
  }

  function stopTimer() {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  // ─── Core recording actions ────────────────────────────────────────────────

  async function requestMicAndStart() {
    const mime = selectMime();
    if (!mime) {
      setStage("error");
      setErrorMsg("Audio format not supported. Try Chrome or Firefox.");
      return;
    }

    let stream: MediaStream;
    try {
      // Raw studio audio: disable echoCancellation & noiseSuppression so browser doesn't duck or gate initial speech
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 1,
          sampleRate: 48000,
        },
      });
    } catch {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        setStage("permission-denied");
        return;
      }
    }

    // Set up live AudioContext for level visualizer & keeping audio hardware pipe active
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        cleanupAudioContext();
        const ctx = new AudioCtx();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        analyser.smoothingTimeConstant = 0.4;
        source.connect(analyser);
        audioContextRef.current = ctx;
        analyserRef.current = analyser;

        const data = new Uint8Array(analyser.frequencyBinCount);
        const loop = () => {
          analyser.getByteFrequencyData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) sum += data[i];
          const avg = sum / data.length;
          setAudioLevel(Math.min(1, avg / 110));
          animFrameRef.current = requestAnimationFrame(loop);
        };
        animFrameRef.current = requestAnimationFrame(loop);
      }
    } catch (e) {
      console.warn("Live visualizer unavailable:", e);
    }

    // Give the hardware track 120ms to stabilize audio clock before starting encoder
    await new Promise((resolve) => setTimeout(resolve, 120));

    beginRecording(stream, mime);
  }

  function beginRecording(stream: MediaStream, mime: string) {
    // Clean up any previous session
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setBlob(null);
    setMimeType(mime);
    setElapsed(0);
    elapsedRef.current = 0;
    segmentStartTimeRef.current = Date.now();
    chunksRef.current = [];

    streamRef.current = stream;

    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, {
        mimeType: mime,
        audioBitsPerSecond: 128000, // 128 kbps studio quality
      });
    } catch {
      recorder = new MediaRecorder(stream, { mimeType: mime });
    }
    recorderRef.current = recorder;

    recorder.addEventListener("dataavailable", (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    });

    recorder.addEventListener("stop", () => {
      cleanupAudioContext();

      // Ensure hardware pipeline completely flushed before terminating stream tracks
      setTimeout(() => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }, 50);

      const recorded = new Blob(chunksRef.current, { type: mime });
      chunksRef.current = [];

      if (recorded.size === 0) {
        setStage("error");
        setErrorMsg("Recording was empty. Please try again.");
        return;
      }

      const url = URL.createObjectURL(recorded);
      setBlob(recorded);
      setAudioUrl(url);
      setStage("review");
    });

    // Use 250ms timeslice so audio buffers stream evenly without missing chunks
    recorder.start(250);
    setStage("recording");
    startTimer();
  }

  function doStop() {
    stopTimer();
    if (segmentStartTimeRef.current !== null) {
      const finalSecs = Math.max(1, Math.round((Date.now() - segmentStartTimeRef.current) / 1000));
      elapsedRef.current = finalSecs;
      setElapsed(finalSecs);
      segmentStartTimeRef.current = null;
    }
    const r = recorderRef.current;
    if (!r || r.state === "inactive") return;
    if (r.state === "paused") {
      try {
        r.resume();
      } catch {}
    }

    // Flush any pending audio samples before stopping so the end is never cut off
    try {
      r.requestData();
    } catch {}

    // Small delay to ensure trailing audio frames are flushed to encoder
    setTimeout(() => {
      if (r.state !== "inactive") {
        r.stop();
      }
    }, 120);
  }

  function doPause() {
    const r = recorderRef.current;
    if (!r || r.state !== "recording") return;
    try {
      r.requestData();
    } catch {}
    r.pause();
    stopTimer();
    if (segmentStartTimeRef.current !== null) {
      const pausedSecs = Math.max(1, Math.round((Date.now() - segmentStartTimeRef.current) / 1000));
      elapsedRef.current = pausedSecs;
      setElapsed(pausedSecs);
      segmentStartTimeRef.current = null;
    }
    setStage("paused");
  }

  function doResume() {
    const r = recorderRef.current;
    if (!r || r.state !== "paused") return;
    segmentStartTimeRef.current = Date.now() - (elapsedRef.current * 1000);
    r.resume();
    startTimer();
    setStage("recording");
  }

  function doRetake() {
    stopTimer();
    cleanupAudioContext();
    segmentStartTimeRef.current = null;
    const r = recorderRef.current;
    if (r && r.state !== "inactive") r.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
    audioRef.current?.pause();
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setBlob(null);
    setElapsed(0);
    elapsedRef.current = 0;
    setIsPlaying(false);
    setPlayTime(0);
    setDuration(0);
    setUploadErr("");
    setStage("idle");
  }

  // ─── Send ─────────────────────────────────────────────────────────────────

  const contactErrors = validateContact(contact);

  async function doSend() {
    setTouched({ name: true, email: true });
    if (Object.keys(contactErrors).length > 0) return;
    if (!blob) return;

    setStage("uploading");
    setUploadErr("");

    const ext = getVoiceNoteExtension(mimeType ?? "");
    const effectiveDuration = Math.max(1, elapsed, Math.round(duration || 0));
    const fd = new FormData();
    fd.append("audio", blob, `voice-note.${ext}`);
    fd.append("name", contact.name.trim());
    fd.append("email", contact.email.trim());
    fd.append("duration", String(effectiveDuration));

    try {
      const res = await fetch("/api/voice-notes", { method: "POST", body: fd });
      const json = (await res.json().catch(() => null)) as VoiceNoteUploadResponse | null;
      if (!res.ok || !json?.success) {
        setStage("review");
        setUploadErr(json?.success === false ? json.error : "Upload failed. Please try again.");
        return;
      }
      setStage("sent");
    } catch {
      setStage("review");
      setUploadErr("Network error. Please try again.");
    }
  }

  // ─── Playback ─────────────────────────────────────────────────────────────

  async function togglePlay() {
    const a = audioRef.current;
    if (!a) return;
    if (isPlaying) {
      a.pause();
      setIsPlaying(false);
    } else {
      try {
        await a.play();
        setIsPlaying(true);
      } catch {
        setUploadErr("Playback failed. Please try again.");
      }
    }
  }

  const progress = duration > 0 ? Math.min(100, (playTime / duration) * 100) : 0;
  const isUploading = stage === "uploading";

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ borderTop: "1px solid #e5e3df", marginTop: "26px", paddingTop: "24px" }}>
      <p className="text-neutral-900 font-semibold" style={{ fontSize: "15px", marginBottom: "4px" }}>
        Prefer talking?
      </p>
      <p className="text-neutral-400" style={{ fontSize: "13px", lineHeight: 1.7, marginBottom: "20px" }}>
        Send me a quick voice note.
      </p>

      {/* ── Checking permission ── */}
      {stage === "permission-unknown" && (
        <p className="font-mono text-neutral-400" style={{ fontSize: "10px" }}>Checking microphone access…</p>
      )}

      {/* ── Permission needs to be granted ── */}
      {stage === "permission-prompt" && (
        <div style={{ display: "grid", gap: "12px" }}>
          <p className="font-mono text-neutral-500" style={{ fontSize: "10px", lineHeight: 1.7 }}>
            Click below. Chrome will ask for microphone access — click <strong>Allow</strong>.
          </p>
          <Btn icon={<Mic size={12} />} onClick={requestMicAndStart} variant="primary">
            ALLOW MIC &amp; START RECORDING
          </Btn>
        </div>
      )}

      {/* ── Permission denied ── */}
      {stage === "permission-denied" && (
        <div style={{ display: "grid", gap: "10px" }}>
          <div style={{ display: "flex", gap: "8px", padding: "10px 12px", border: "1px solid #fecaca", borderRadius: "7px", background: "#fef2f2", fontSize: "12px", color: "#991b1b" }}>
            <MicOff size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <strong>Microphone blocked.</strong> To fix: click the lock icon 🔒 in your address bar → Microphone → Allow → refresh the page.
            </div>
          </div>
          <Btn icon={<RotateCcw size={12} />} onClick={() => window.location.reload()}>
            REFRESH &amp; TRY AGAIN
          </Btn>
        </div>
      )}

      {/* ── Error ── */}
      {stage === "error" && (
        <div style={{ display: "flex", gap: "8px", padding: "10px 12px", border: "1px solid #fecaca", borderRadius: "7px", background: "#fef2f2", fontSize: "12px", color: "#991b1b" }}>
          <MicOff size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ── Idle: ready to record ── */}
      {stage === "idle" && (
        <Btn icon={<Mic size={12} />} onClick={requestMicAndStart} variant="primary">
          START RECORDING
        </Btn>
      )}

      {/* ── Active recording ── */}
      {(stage === "recording" || stage === "paused") && (
        <div style={{ display: "grid", gap: "14px" }}>
          {/* Timer + live indicator + visualizer */}
          <div className="font-mono" style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", color: "#111" }}>
            {stage === "recording" && (
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#dc2626", display: "inline-block", animation: "pulse 1s infinite" }} />
            )}
            {stage === "paused" && (
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b", display: "inline-block" }} />
            )}
            <span style={{ fontWeight: 600 }}>{fmt(elapsed)}</span>
            <span style={{ color: "#999", fontSize: "10px" }}>/ {fmt(VOICE_NOTE_MAX_DURATION_SECONDS)}</span>

            {/* Live audio level visualizer */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: "3px", height: "14px", marginLeft: "4px" }}>
              {[0.5, 1, 0.75, 0.9, 0.6].map((mult, idx) => {
                const height = stage === "recording"
                  ? Math.max(3, Math.min(14, Math.round(audioLevel * 14 * mult * 2)))
                  : 3;
                return (
                  <span
                    key={idx}
                    style={{
                      display: "inline-block",
                      width: 2,
                      height: `${height}px`,
                      backgroundColor: stage === "recording" && audioLevel > 0.08 ? "#dc2626" : "#cbd5e1",
                      borderRadius: 1,
                      transition: "height 0.08s ease, background-color 0.15s ease",
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "center" }}>
            {stage === "recording" ? (
              <Btn icon={<Pause size={12} />} onClick={doPause}>PAUSE</Btn>
            ) : (
              <Btn icon={<Mic size={12} />} onClick={doResume} variant="primary">RESUME</Btn>
            )}
            <Btn icon={<Square size={12} />} onClick={doStop} variant="primary">STOP</Btn>
            <Btn icon={<RotateCcw size={12} />} onClick={doRetake}>RETAKE</Btn>
          </div>
        </div>
      )}

      {/* ── Review + Send ── */}
      {(stage === "review" || stage === "uploading") && audioUrl && (
        <div style={{ display: "grid", gap: "18px" }}>
          {/* Audio preview */}
          <div>
            <audio
              ref={audioRef}
              src={audioUrl}
              preload="metadata"
              onLoadedMetadata={(e) => {
                const d = e.currentTarget.duration;
                if (Number.isFinite(d) && d > 0) setDuration(d);
              }}
              onTimeUpdate={(e) => setPlayTime(e.currentTarget.currentTime)}
              onEnded={() => { setIsPlaying(false); setPlayTime(0); }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "8px" }}>
              <Btn
                icon={isPlaying ? <Pause size={12} /> : <Play size={12} />}
                onClick={togglePlay}
                disabled={isUploading}
              >
                {isPlaying ? "PAUSE" : "PLAY"}
              </Btn>
              <span className="font-mono text-neutral-400" style={{ fontSize: "10px" }}>
                {fmt(playTime)} / {fmt(duration || elapsed)}
              </span>
            </div>
            <div style={{ height: 3, borderRadius: 999, background: "#e5e3df", overflow: "hidden" }}>
              <div style={{ width: `${progress}%`, height: "100%", background: "#111", transition: "width 0.25s linear" }} />
            </div>
          </div>

          {/* Name + Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: "14px" }}>
            <FieldInput
              id="vn-name" label="Name" type="text" placeholder="Kannan S"
              value={contact.name} onChange={(v) => setContact((c) => ({ ...c, name: v }))}
              onBlur={() => setTouched((t) => ({ ...t, name: true }))}
              touched={touched.name} error={contactErrors.name} disabled={isUploading}
            />
            <FieldInput
              id="vn-email" label="Email" type="email" placeholder="hello@example.com"
              value={contact.email} onChange={(v) => setContact((c) => ({ ...c, email: v }))}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              touched={touched.email} error={contactErrors.email} disabled={isUploading}
            />
          </div>

          {/* Upload error */}
          {uploadErr && (
            <div style={{ display: "flex", gap: "8px", padding: "8px 12px", border: "1px solid #fecaca", borderRadius: "7px", background: "#fef2f2", fontSize: "12px", color: "#991b1b" }}>
              ⚠ {uploadErr}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "center" }}>
            <Btn icon={<RotateCcw size={12} />} onClick={doRetake} disabled={isUploading}>RETAKE</Btn>
            <Btn
              icon={isUploading ? <LoaderCircle size={12} className="animate-spin" /> : <Send size={12} />}
              onClick={doSend}
              disabled={isUploading}
              variant="primary"
            >
              {isUploading ? "SENDING..." : "SEND VOICE NOTE"}
            </Btn>
          </div>
        </div>
      )}

      {/* ── Sent ── */}
      {stage === "sent" && (
        <div style={{ display: "grid", gap: "12px" }}>
          <div style={{ display: "flex", gap: "8px", padding: "10px 12px", border: "1px solid #bbf7d0", borderRadius: "7px", background: "#f0fdf4", fontSize: "12px", color: "#166534" }}>
            ✓ Voice note sent. Thanks for reaching out!
          </div>
          <Btn icon={<RotateCcw size={12} />} onClick={doRetake}>RECORD ANOTHER</Btn>
        </div>
      )}
    </div>
  );
}
