"use client";

import { Mic, MicOff } from "lucide-react";
import { useAppStore } from "@/lib/store";

interface MicrophoneButtonProps {
  onToggle: () => void;
}

// Check if browser supports Speech Recognition
const hasSpeechSupport =
  typeof window !== "undefined" &&
  !!(
    (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: unknown })
      .webkitSpeechRecognition
  );

export function MicrophoneButton({ onToggle }: MicrophoneButtonProps) {
  const isRecording = useAppStore((s) => s.isRecording);

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={onToggle}
        disabled={!hasSpeechSupport}
        className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-primary-300 focus:ring-offset-2 ${
          isRecording
            ? "bg-red-500 hover:bg-red-600 text-white shadow-[0_0_30px_rgba(239,68,68,0.4)]"
            : hasSpeechSupport
              ? "bg-primary-600 hover:bg-primary-700 text-white shadow-lg hover:shadow-xl"
              : "bg-slate-200 text-slate-400 cursor-not-allowed"
        }`}
        aria-label={
          isRecording
            ? "Stop recording (Space)"
            : hasSpeechSupport
              ? "Start recording (Space)"
              : "Speech not supported in this browser"
        }
        aria-pressed={isRecording}
      >
        {isRecording ? (
          <MicOff className="w-8 h-8" aria-hidden="true" />
        ) : (
          <Mic className="w-8 h-8" aria-hidden="true" />
        )}
        {isRecording && (
          <span
            className="absolute inset-0 rounded-full border-2 border-red-400 animate-ping motion-reduce:animate-none"
            aria-hidden="true"
          />
        )}
      </button>

      <div className="flex items-center gap-2" role="status" aria-live="polite">
        <span
          className={`w-2 h-2 rounded-full ${isRecording ? "bg-red-500 animate-pulse" : "bg-green-500"}`}
          aria-hidden="true"
        />
        <span className="text-sm text-slate-500">
          {isRecording
            ? "Listening..."
            : hasSpeechSupport
              ? "Ready — click or press Space"
              : "Use Chrome or Edge for speech"}
        </span>
      </div>
    </div>
  );
}
