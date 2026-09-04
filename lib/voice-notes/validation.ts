import { parseBuffer } from "music-metadata";
import {
  getVoiceNoteMimeConfig,
  normalizeMimeType,
  VOICE_NOTE_DURATION_GRACE_SECONDS,
  VOICE_NOTE_MAX_DURATION_SECONDS,
  VOICE_NOTE_MAX_FILE_SIZE_BYTES,
} from "@/lib/voice-notes/constants";
import type { VoiceNoteUploadErrorCode } from "@/lib/voice-notes/types";

type ValidationSuccess = {
  valid: true;
  mimeType: string;
  extension: string;
  duration: number;
};

type ValidationFailure = {
  valid: false;
  code: VoiceNoteUploadErrorCode;
  message: string;
};

export type VoiceNoteFileValidationResult = ValidationSuccess | ValidationFailure;

function detectAudioMimeType(buffer: Buffer) {
  if (buffer.length >= 4 && buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) {
    return "audio/webm";
  }

  if (buffer.length >= 4 && buffer.subarray(0, 4).toString("ascii") === "OggS") {
    return "audio/ogg";
  }

  if (buffer.length >= 12 && buffer.subarray(4, 8).toString("ascii") === "ftyp") {
    return "audio/mp4";
  }

  return null;
}

export async function validateVoiceNoteFile(
  buffer: Buffer,
  declaredMimeType: string | null | undefined,
  clientDuration?: number
): Promise<VoiceNoteFileValidationResult> {
  if (buffer.length === 0) {
    return {
      valid: false,
      code: "empty_file",
      message: "Please record a voice note before sending.",
    };
  }

  if (buffer.length > VOICE_NOTE_MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      code: "file_too_large",
      message: "Voice note is too large. Please keep it under 60 seconds.",
    };
  }

  const detectedMimeType = detectAudioMimeType(buffer);
  const config = getVoiceNoteMimeConfig(detectedMimeType);

  if (!detectedMimeType || !config) {
    return {
      valid: false,
      code: "unsupported_format",
      message: "This audio format is not supported. Please try another browser.",
    };
  }

  const declaredBaseMimeType = normalizeMimeType(declaredMimeType);
  if (declaredBaseMimeType && declaredBaseMimeType !== detectedMimeType) {
    return {
      valid: false,
      code: "unsupported_format",
      message: "This audio format is not supported. Please try recording again.",
    };
  }

  try {
    const metadata = await parseBuffer(
      buffer,
      { mimeType: detectedMimeType, size: buffer.length },
      { duration: false, skipCovers: true }
    );
    const parsedDuration = metadata.format.duration;
    const hasVideo =
      metadata.format.hasVideo === true ||
      (metadata.format.trackInfo?.some((track) => Boolean(track.video)) ?? false);

    if (hasVideo) {
      return {
        valid: false,
        code: "invalid_audio",
        message: "Video is not allowed. Please send an audio recording.",
      };
    }

    // MediaRecorder produces WebM/fMP4 streams without container duration in the header.
    // Use metadata parsed duration if finite and positive; otherwise fall back to client duration.
    const duration =
      typeof parsedDuration === "number" && Number.isFinite(parsedDuration) && parsedDuration > 0
        ? parsedDuration
        : clientDuration;

    if (!duration || !Number.isFinite(duration) || duration <= 0) {
      return {
        valid: false,
        code: "invalid_audio",
        message: "The recording duration could not be determined. Please try again.",
      };
    }

    if (duration > VOICE_NOTE_MAX_DURATION_SECONDS + VOICE_NOTE_DURATION_GRACE_SECONDS) {
      return {
        valid: false,
        code: "duration_exceeded",
        message: "Voice notes must be 60 seconds or less.",
      };
    }

    return {
      valid: true,
      mimeType: detectedMimeType,
      extension: config.extension,
      duration,
    };
  } catch (error) {
    console.warn("Voice note deep metadata parse skipped, verifying container format & duration:", error);

    // Fall back to container validation if client duration is valid and buffer is sufficient
    if (clientDuration && Number.isFinite(clientDuration) && clientDuration > 0) {
      if (clientDuration > VOICE_NOTE_MAX_DURATION_SECONDS + VOICE_NOTE_DURATION_GRACE_SECONDS) {
        return {
          valid: false,
          code: "duration_exceeded",
          message: "Voice notes must be 60 seconds or less.",
        };
      }

      return {
        valid: true,
        mimeType: detectedMimeType,
        extension: config.extension,
        duration: clientDuration,
      };
    }

    return {
      valid: false,
      code: "invalid_audio",
      message: "The recording could not be read. Please try again.",
    };
  }
}
