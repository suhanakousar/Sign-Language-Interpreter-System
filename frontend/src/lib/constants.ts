export const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001";
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

export const AUDIO_CONFIG = {
  sampleRate: 16000,
  channelCount: 1,
  chunkDuration: 1000, // ms — send audio every 1 second
  mimeType: "audio/webm;codecs=opus",
} as const;

export const AVATAR_CONFIG = {
  modelPath: "/models/avatar.glb",
  idleAnimation: "idle",
  transitionDuration: 0.3,
  cameraPosition: [0, 1.2, 3] as [number, number, number],
  cameraTarget: [0, 1, 0] as [number, number, number],
} as const;

export const DEFAULT_SETTINGS = {
  language: "en" as const,
  sign_language: "ASL" as const,
  playback_speed: 1.0,
  show_subtitles: true,
  avatar_quality: "medium" as const,
  auto_detect_language: false,
};

export const GESTURE_TRANSITION_MS = 300;
