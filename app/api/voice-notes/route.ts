import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  VOICE_NOTE_DURATION_GRACE_SECONDS,
  VOICE_NOTE_MAX_DURATION_SECONDS,
} from "@/lib/voice-notes/constants";
import { EmailConfigurationError } from "@/lib/email";
import { sendVoiceNoteNotification } from "@/lib/voice-notes/email";
import { checkVoiceNoteRateLimit } from "@/lib/voice-notes/rate-limit";
import {
  createVoiceNoteSignedUrl,
  deleteVoiceNoteAudio,
  saveVoiceNoteMetadata,
  SupabaseConfigurationError,
  updateVoiceNoteStatus,
  uploadVoiceNoteAudio,
} from "@/lib/voice-notes/supabase";
import type { VoiceNoteUploadErrorCode, VoiceNoteUploadResponse } from "@/lib/voice-notes/types";
import { validateVoiceNoteFile } from "@/lib/voice-notes/validation";

export const runtime = "nodejs";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ParsedVoiceNoteForm = {
  name: string;
  email: string;
  clientDuration: number;
  audio: File;
};

type VoiceNoteUploadFailure = Extract<VoiceNoteUploadResponse, { success: false }>;

function jsonError(status: number, code: VoiceNoteUploadErrorCode, error: string, headers?: HeadersInit) {
  return NextResponse.json<VoiceNoteUploadResponse>(
    { success: false, code, error },
    { status, headers }
  );
}

function jsonSuccess(message: string) {
  return NextResponse.json<VoiceNoteUploadResponse>({ success: true, message });
}

function getClientKey(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    forwardedFor ??
    "unknown-client"
  );
}

function getStringField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parseVoiceNoteForm(formData: FormData): ParsedVoiceNoteForm | VoiceNoteUploadFailure {
  const name = getStringField(formData, "name");
  const email = getStringField(formData, "email");
  const durationValue = getStringField(formData, "duration");
  const audio = formData.get("audio");
  const clientDuration = Number(durationValue);

  if (!name) {
    return { success: false, code: "missing_name", error: "Please add your name before sending." };
  }

  if (name.length < 3 || name.length > 80) {
    return {
      success: false,
      code: "invalid_name",
      error: "Please use a name between 3 and 80 characters.",
    };
  }

  if (!email) {
    return { success: false, code: "missing_email", error: "Please add your email before sending." };
  }

  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return { success: false, code: "invalid_email", error: "Please enter a valid email address." };
  }

  if (!Number.isFinite(clientDuration) || clientDuration <= 0) {
    return {
      success: false,
      code: "malformed_upload",
      error: "Please record a voice note before sending.",
    };
  }

  if (clientDuration > VOICE_NOTE_MAX_DURATION_SECONDS + VOICE_NOTE_DURATION_GRACE_SECONDS) {
    return {
      success: false,
      code: "duration_exceeded",
      error: "Voice notes must be 60 seconds or less.",
    };
  }

  if (!(audio instanceof File)) {
    return {
      success: false,
      code: "malformed_upload",
      error: "Please record a voice note before sending.",
    };
  }

  return { name, email, clientDuration, audio };
}

function isVoiceNoteUploadFailure(
  value: ParsedVoiceNoteForm | VoiceNoteUploadFailure
): value is VoiceNoteUploadFailure {
  return "success" in value && value.success === false;
}

async function markVoiceNoteStatus(id: string, status: "notified" | "email_failed" | "signed_url_failed") {
  try {
    await updateVoiceNoteStatus(id, status);
  } catch (error) {
    console.error(`Voice note status update failed (${status}):`, error);
  }
}

export async function POST(request: NextRequest) {
  const rateLimit = checkVoiceNoteRateLimit(getClientKey(request));
  if (!rateLimit.allowed) {
    const retryAfter = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
    return jsonError(
      429,
      "rate_limited",
      "Too many voice notes. Please try again in a few minutes.",
      { "Retry-After": String(retryAfter) }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (error) {
    console.error("Voice note form parsing failed:", error);
    return jsonError(400, "malformed_upload", "Upload could not be read. Please try again.");
  }

  const parsed = parseVoiceNoteForm(formData);
  if (isVoiceNoteUploadFailure(parsed)) {
    return jsonError(400, parsed.code, parsed.error);
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(await parsed.audio.arrayBuffer());
  } catch (error) {
    console.error("Voice note file buffering failed:", error);
    return jsonError(400, "malformed_upload", "Upload could not be read. Please try again.");
  }

  const validation = await validateVoiceNoteFile(buffer, parsed.audio.type, parsed.clientDuration);
  if (!validation.valid) {
    return jsonError(400, validation.code, validation.message);
  }

  const id = randomUUID();
  const createdAt = new Date();
  let objectPath: string | null = null;

  try {
    const upload = await uploadVoiceNoteAudio({
      id,
      extension: validation.extension,
      buffer,
      mimeType: validation.mimeType,
    });
    objectPath = upload.objectPath;

    let dbSaved = false;
    try {
      await saveVoiceNoteMetadata({
        id,
        name: parsed.name,
        email: parsed.email,
        storagePath: upload.storagePath,
        mimeType: validation.mimeType,
        fileSize: buffer.length,
        duration: validation.duration,
        status: "uploaded",
      });
      dbSaved = true;
    } catch (error) {
      console.warn("Voice note metadata DB insert skipped (proceeding with storage & email delivery):", error);
    }

    let signedUrl: string;
    try {
      signedUrl = await createVoiceNoteSignedUrl(objectPath);
    } catch (error) {
      console.error("Voice note signed URL failed:", error);
      if (dbSaved) await markVoiceNoteStatus(id, "signed_url_failed");
      return jsonError(500, "signed_url_failed", "Voice note could not be prepared. Please try again.");
    }

    try {
      await sendVoiceNoteNotification({
        name: parsed.name,
        email: parsed.email,
        duration: validation.duration,
        createdAt,
        signedUrl,
      });
    } catch (error) {
      console.error("Voice note email notification failed:", error);
      if (dbSaved) await markVoiceNoteStatus(id, "email_failed");
      const code = error instanceof EmailConfigurationError ? "server_not_configured" : "email_failed";
      return jsonError(502, code, "Voice note could not be sent. Please try again.");
    }

    if (dbSaved) {
      await markVoiceNoteStatus(id, "notified");
    }
    return jsonSuccess("Voice note sent. Thanks for reaching out.");
  } catch (error) {
    console.error("Voice note upload failed:", error);

    if (error instanceof SupabaseConfigurationError || error instanceof EmailConfigurationError) {
      return jsonError(503, "server_not_configured", "Voice notes are not available right now.");
    }

    return jsonError(500, "upload_failed", "Voice note could not be uploaded. Please try again.");
  }
}
