"use client";

import { Mic, MicOff, Loader2 } from "lucide-react";
import { useAppStore } from "@/lib/store";
import type { ConnectionStatus } from "@/types";

interface MicrophoneButtonProps {
  onToggle: () => void;
}

const statusLabels: Record<ConnectionStatus, string> = {
  disconnected: "Connect to start",
  connecting: "Connecting...",
  connected: "Ready",
  error: "Connection error — retrying",
};

export function MicrophoneButton({ onToggle }: MicrophoneButtonProps) {
  const { isRecording, connectionStatus } = useAppStore();
  const isConnected = connectionStatus === "connected";
  const isConnecting = connectionStatus === "connecting";

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={onToggle}
        disabled={!isConnected}
        className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-primary-300 focus:ring-offset-2 ${
          isRecording
            ? "bg-red-500 hover:bg-red-600 text-white shadow-[0_0_30px_rgba(239,68,68,0.4)]"
            : isConnected
              ? "bg-primary-600 hover:bg-primary-700 text-white shadow-lg hover:shadow-xl"
              : "bg-slate-200 text-slate-400 cursor-not-allowed"
        }`}
        aria-label={
          isConnecting
            ? "Connecting to server"
            : isRecording
              ? "Stop recording (Space)"
              : isConnected
                ? "Start recording (Space)"
                : "Disconnected — cannot record"
        }
        aria-pressed={isRecording}
      >
        {isConnecting ? (
          <Loader2 className="w-8 h-8 animate-spin" aria-hidden="true" />
        ) : isRecording ? (
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
          className={`status-dot status-dot--${connectionStatus}`}
          aria-hidden="true"
        />
        <span className="text-sm text-slate-500">
          {isRecording ? "Listening..." : statusLabels[connectionStatus]}
        </span>
      </div>
    </div>
  );
}
