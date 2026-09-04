export type VoiceRecordingState =
  | "idle"
  | "initializing"
  | "recording"
  | "paused"
  | "stopped"
  | "uploading"
  | "success"
  | "error";

export type VoiceNoteStatus =
  | "uploaded"
  | "notified"
  | "notification_failed"
  | "email_failed"
  | "signed_url_failed";

export type VoiceNoteUploadErrorCode =
  | "malformed_upload"
  | "missing_name"
  | "invalid_name"
  | "missing_email"
  | "invalid_email"
  | "empty_file"
  | "file_too_large"
  | "unsupported_format"
  | "duration_exceeded"
  | "invalid_audio"
  | "rate_limited"
  | "upload_failed"
  | "database_failed"
  | "signed_url_failed"
  | "email_failed"
  | "network_failed"
  | "server_not_configured"
  | "server_error";

export type VoiceNoteUploadResponse =
  | {
      success: true;
      message: string;
    }
  | {
      success: false;
      error: string;
      code: VoiceNoteUploadErrorCode;
    };

export type VoiceNoteMetadataInput = {
  id: string;
  name: string;
  email: string;
  storagePath: string;
  mimeType: string;
  fileSize: number;
  duration: number;
  status: VoiceNoteStatus;
};
