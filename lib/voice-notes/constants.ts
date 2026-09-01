export const VOICE_NOTE_MAX_DURATION_SECONDS = 60;
export const VOICE_NOTE_DURATION_GRACE_SECONDS = 1;
export const VOICE_NOTE_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const VOICE_NOTE_BUCKET = "voice-notes";
export const VOICE_NOTE_SIGNED_URL_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 7;
export const VOICE_NOTE_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
export const VOICE_NOTE_RATE_LIMIT_MAX_REQUESTS = 5;

export const VOICE_NOTE_SUPPORTED_MIME_TYPES = [
  {
    mimeType: "audio/webm;codecs=opus",
    baseMimeType: "audio/webm",
    extension: "webm",
  },
  {
    mimeType: "audio/webm",
    baseMimeType: "audio/webm",
    extension: "webm",
  },
  {
    mimeType: "audio/ogg;codecs=opus",
    baseMimeType: "audio/ogg",
    extension: "ogg",
  },
  {
    mimeType: "audio/ogg",
    baseMimeType: "audio/ogg",
    extension: "ogg",
  },
  {
    mimeType: "audio/mp4;codecs=mp4a.40.2",
    baseMimeType: "audio/mp4",
    extension: "m4a",
  },
  {
    mimeType: "audio/mp4",
    baseMimeType: "audio/mp4",
    extension: "m4a",
  },
] as const;

export type VoiceNoteMimeConfig = (typeof VOICE_NOTE_SUPPORTED_MIME_TYPES)[number];
export type VoiceNoteBaseMimeType = VoiceNoteMimeConfig["baseMimeType"];

export function normalizeMimeType(mimeType: string | null | undefined) {
  return mimeType?.toLowerCase().split(";")[0]?.trim() ?? "";
}

export function getVoiceNoteMimeConfig(mimeType: string | null | undefined) {
  const normalized = normalizeMimeType(mimeType);
  return VOICE_NOTE_SUPPORTED_MIME_TYPES.find((config) => config.baseMimeType === normalized);
}

export function getVoiceNoteExtension(mimeType: string | null | undefined) {
  return getVoiceNoteMimeConfig(mimeType)?.extension ?? "webm";
}
