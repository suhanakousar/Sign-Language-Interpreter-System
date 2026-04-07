import { create } from "zustand";
import type {
  AppState,
  AppActions,
  GestureCommand,
  TranscriptEntry,
  AppSettings,
  ConnectionStatus,
} from "@/types";
import { DEFAULT_SETTINGS } from "./constants";

type Store = AppState & AppActions;

export const useAppStore = create<Store>((set, get) => ({
  // ─── State ───
  connectionStatus: "disconnected",
  sessionId: null,
  isRecording: false,
  transcripts: [],
  currentPartial: "",
  gestureQueue: [],
  currentGesture: null,
  isPlaying: false,
  settings: { ...DEFAULT_SETTINGS },

  // ─── Actions ───
  setConnectionStatus: (status: ConnectionStatus) =>
    set({ connectionStatus: status }),

  setSessionId: (id: string | null) => set({ sessionId: id }),

  setRecording: (recording: boolean) => set({ isRecording: recording }),

  addTranscript: (entry: TranscriptEntry) =>
    set((state) => ({
      transcripts: [...state.transcripts.slice(-99), entry],
      currentPartial: "",
    })),

  setCurrentPartial: (text: string) => set({ currentPartial: text }),

  clearTranscripts: () => set({ transcripts: [], currentPartial: "" }),

  enqueueGestures: (gestures: GestureCommand[]) =>
    set((state) => ({
      gestureQueue: [...state.gestureQueue, ...gestures],
    })),

  dequeueGesture: () => {
    const { gestureQueue } = get();
    if (gestureQueue.length === 0) return null;
    const [next, ...rest] = gestureQueue;
    set({ gestureQueue: rest, currentGesture: next });
    return next;
  },

  setCurrentGesture: (gesture: GestureCommand | null) =>
    set({ currentGesture: gesture }),

  setPlaying: (playing: boolean) => set({ isPlaying: playing }),

  updateSettings: (partial: Partial<AppSettings>) =>
    set((state) => ({
      settings: { ...state.settings, ...partial },
    })),
}));
