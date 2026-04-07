// ─── Core Domain Types ───

export interface GestureEntry {
  word: string;
  animation_file: string;
  duration: number;
  category: "common" | "greeting" | "emotion" | "fingerspell" | "phrase";
  tags?: string[];
}

export interface GestureSequence {
  id: string;
  gestures: GestureCommand[];
  timestamp: number;
  source_text: string;
}

export interface GestureCommand {
  word: string;
  animation: string;
  duration: number;
  transition: number;
  facial_expression?: FacialExpression;
}

export type FacialExpression =
  | "neutral"
  | "happy"
  | "sad"
  | "surprised"
  | "questioning"
  | "emphatic";

// ─── WebSocket Messages ───

export type WSMessageType =
  | "audio_chunk"
  | "transcript_partial"
  | "transcript_final"
  | "gesture_sequence"
  | "error"
  | "status"
  | "ping"
  | "pong";

export interface WSMessage<T = unknown> {
  type: WSMessageType;
  payload: T;
  timestamp: number;
  session_id?: string;
}

export interface TranscriptPayload {
  text: string;
  is_final: boolean;
  confidence: number;
  processed_text?: string;
}

export interface GesturePayload {
  sequence: GestureCommand[];
  source_text: string;
}

export interface StatusPayload {
  status: "connected" | "processing" | "ready" | "error";
  message?: string;
}

export interface ErrorPayload {
  code: string;
  message: string;
}

// ─── Application State ───

export type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export interface TranscriptEntry {
  id: string;
  text: string;
  processed_text: string;
  timestamp: number;
  is_final: boolean;
}

export interface AppSettings {
  language: "en" | "hi";
  sign_language: "ASL" | "ISL";
  playback_speed: number;
  show_subtitles: boolean;
  avatar_quality: "low" | "medium" | "high";
  auto_detect_language: boolean;
}

export interface AppState {
  // Connection
  connectionStatus: ConnectionStatus;
  sessionId: string | null;

  // Recording
  isRecording: boolean;

  // Transcript
  transcripts: TranscriptEntry[];
  currentPartial: string;

  // Gestures
  gestureQueue: GestureCommand[];
  currentGesture: GestureCommand | null;
  isPlaying: boolean;

  // Settings
  settings: AppSettings;
}

// ─── Actions ───

export interface AppActions {
  setConnectionStatus: (status: ConnectionStatus) => void;
  setSessionId: (id: string | null) => void;
  setRecording: (recording: boolean) => void;
  addTranscript: (entry: TranscriptEntry) => void;
  setCurrentPartial: (text: string) => void;
  clearTranscripts: () => void;
  enqueueGestures: (gestures: GestureCommand[]) => void;
  dequeueGesture: () => GestureCommand | null;
  setCurrentGesture: (gesture: GestureCommand | null) => void;
  setPlaying: (playing: boolean) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
}
