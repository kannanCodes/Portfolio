import {
  VOICE_NOTE_RATE_LIMIT_MAX_REQUESTS,
  VOICE_NOTE_RATE_LIMIT_WINDOW_MS,
} from "@/lib/voice-notes/constants";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

export function checkVoiceNoteRateLimit(key: string, now = Date.now()) {
  const existing = rateLimitStore.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + VOICE_NOTE_RATE_LIMIT_WINDOW_MS;
    rateLimitStore.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: VOICE_NOTE_RATE_LIMIT_MAX_REQUESTS - 1, resetAt };
  }

  if (existing.count >= VOICE_NOTE_RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: VOICE_NOTE_RATE_LIMIT_MAX_REQUESTS - existing.count,
    resetAt: existing.resetAt,
  };
}
