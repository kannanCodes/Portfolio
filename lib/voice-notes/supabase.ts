import { createClient } from "@supabase/supabase-js";
import { VOICE_NOTE_BUCKET, VOICE_NOTE_SIGNED_URL_EXPIRES_IN_SECONDS } from "@/lib/voice-notes/constants";
import type { VoiceNoteMetadataInput, VoiceNoteStatus } from "@/lib/voice-notes/types";

export class SupabaseConfigurationError extends Error {
  constructor(message = "Voice note storage is not configured.") {
    super(message);
    this.name = "SupabaseConfigurationError";
  }
}

function createSupabaseAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new SupabaseConfigurationError();
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function uploadVoiceNoteAudio(input: {
  id: string;
  extension: string;
  buffer: Buffer;
  mimeType: string;
}) {
  const supabase = createSupabaseAdminClient();
  const objectPath = `${input.id}.${input.extension}`;
  const storagePath = `${VOICE_NOTE_BUCKET}/${objectPath}`;

  const { error } = await supabase.storage.from(VOICE_NOTE_BUCKET).upload(objectPath, input.buffer, {
    contentType: input.mimeType,
    cacheControl: "0",
    upsert: false,
  });

  if (error) {
    throw error;
  }

  return { objectPath, storagePath };
}

export async function deleteVoiceNoteAudio(objectPath: string) {
  const supabase = createSupabaseAdminClient();
  await supabase.storage.from(VOICE_NOTE_BUCKET).remove([objectPath]);
}

export async function createVoiceNoteSignedUrl(objectPath: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(VOICE_NOTE_BUCKET)
    .createSignedUrl(objectPath, VOICE_NOTE_SIGNED_URL_EXPIRES_IN_SECONDS);

  if (error || !data?.signedUrl) {
    throw error ?? new Error("Signed URL was not created.");
  }

  return data.signedUrl;
}

export async function saveVoiceNoteMetadata(input: VoiceNoteMetadataInput) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("voice_notes").insert({
    id: input.id,
    name: input.name,
    email: input.email,
    storage_path: input.storagePath,
    mime_type: input.mimeType,
    file_size: input.fileSize,
    duration: input.duration,
    status: input.status,
  });

  if (error) {
    throw error;
  }
}

export async function updateVoiceNoteStatus(id: string, status: VoiceNoteStatus) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("voice_notes").update({ status }).eq("id", id);

  if (error) {
    throw error;
  }
}
