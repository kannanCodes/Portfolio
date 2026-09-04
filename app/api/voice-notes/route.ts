import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  VOICE_NOTE_BUCKET,
  VOICE_NOTE_DURATION_GRACE_SECONDS,
  VOICE_NOTE_MAX_DURATION_SECONDS,
} from "@/lib/voice-notes/constants";
import { sendVoiceNoteNotification } from "@/lib/voice-notes/email";
import { checkVoiceNoteRateLimit } from "@/lib/voice-notes/rate-limit";
import {
  createVoiceNoteSignedUrl,
  deleteVoiceNoteAudio,
  saveVoiceNoteMetadata,
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

function logFailure(event: string, voiceNoteId?: string, error?: unknown) {
  const reason =
    error instanceof Error ? error.message : typeof error === "string" ? error : "Unknown error";
  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      event,
      ...(voiceNoteId ? { voiceNoteId } : {}),
      reason,
    })
  );
}

function logInfo(event: string, voiceNoteId?: string) {
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      event,
      ...(voiceNoteId ? { voiceNoteId } : {}),
    })
  );
}

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

export async function POST(request: NextRequest) {
  // 1. Rate Limiting
  const clientKey = getClientKey(request);
  const rateLimit = checkVoiceNoteRateLimit(clientKey);
  if (!rateLimit.allowed) {
    logFailure("voice_note_rate_limited", undefined, "Rate limit exceeded");
    const retryAfter = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
    return jsonError(
      429,
      "rate_limited",
      "Too many submissions. Please try again later.",
      { "Retry-After": String(retryAfter) }
    );
  }

  // 2. Parse Form Data
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (error) {
    logFailure("voice_note_form_parse_failed", undefined, error);
    return jsonError(400, "malformed_upload", "Upload could not be read. Please try again.");
  }

  const parsed = parseVoiceNoteForm(formData);
  if (isVoiceNoteUploadFailure(parsed)) {
    return jsonError(400, parsed.code, parsed.error);
  }

  // 3. Buffer Audio & Validate
  let buffer: Buffer;
  try {
    buffer = Buffer.from(await parsed.audio.arrayBuffer());
  } catch (error) {
    logFailure("voice_note_buffer_failed", undefined, error);
    return jsonError(400, "malformed_upload", "Upload could not be read. Please try again.");
  }

  const validation = await validateVoiceNoteFile(buffer, parsed.audio.type, parsed.clientDuration);
  if (!validation.valid) {
    return jsonError(400, validation.code, validation.message);
  }

  // 4. Generate Voice Note ID BEFORE upload (used consistently across Storage, DB, Email, Logs)
  const id = randomUUID();
  const createdAt = new Date();
  let objectPath: string | null = null;

  // 5. Upload Audio to Storage
  try {
    const upload = await uploadVoiceNoteAudio({
      id,
      extension: validation.extension,
      buffer,
      mimeType: validation.mimeType,
    });
    objectPath = upload.objectPath;
  } catch (error) {
    logFailure("voice_note_storage_upload_failed", id, error);
    return jsonError(
      500,
      "upload_failed",
      "Something went wrong while sending your voice note. Please try again."
    );
  }

  // 6. Generate 7-day Signed URL
  let signedUrl: string;
  try {
    signedUrl = await createVoiceNoteSignedUrl(objectPath);
  } catch (error) {
    logFailure("voice_note_signed_url_failed", id, error);
    // Cleanup orphaned file since signed URL could not be generated and submission is incomplete
    try {
      await deleteVoiceNoteAudio(objectPath);
    } catch (cleanupError) {
      logFailure("voice_note_storage_cleanup_failed", id, cleanupError);
    }
    return jsonError(
      500,
      "server_error",
      "Something went wrong while sending your voice note. Please try again."
    );
  }

  // 7. Send Email Notification
  let notificationSucceeded = false;
  try {
    await sendVoiceNoteNotification({
      id,
      name: parsed.name,
      email: parsed.email,
      duration: validation.duration,
      createdAt,
      signedUrl,
    });
    notificationSucceeded = true;
  } catch (error) {
    // Audio is already received and stored safely. Do NOT delete audio, do NOT pretend it wasn't received.
    logFailure("voice_note_notification_failed", id, error);
  }

  // 8. Log Metadata to Database (Best-effort, non-blocking)
  const lifecycleStatus = notificationSucceeded ? "notified" : "notification_failed";
  try {
    await saveVoiceNoteMetadata({
      id,
      name: parsed.name,
      email: parsed.email,
      storagePath: `${VOICE_NOTE_BUCKET}/${objectPath}`,
      mimeType: validation.mimeType,
      fileSize: buffer.length,
      duration: validation.duration,
      status: lifecycleStatus,
    });
  } catch (dbError) {
    logFailure("voice_note_database_logging_failed", id, dbError);
  }

  // 9. Return Clear User-Facing Response
  if (notificationSucceeded) {
    logInfo("voice_note_completed_successfully", id);
    return jsonSuccess("Your voice note was sent successfully.");
  } else {
    // Audio was safely received in storage, but notification failed internally
    logInfo("voice_note_received_notification_failed", id);
    return jsonSuccess("Your voice note was received successfully.");
  }
}
