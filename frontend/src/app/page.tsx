"use client";

import dynamic from "next/dynamic";
import { useEffect, useCallback } from "react";
import { MicrophoneButton } from "@/components/MicrophoneButton";
import { TranscriptPanel } from "@/components/TranscriptPanel";
import { SettingsPanel } from "@/components/SettingsPanel";
import { GestureQueue } from "@/components/GestureQueue";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Notifications } from "@/components/Notifications";
import { AvatarSkeleton } from "@/components/SkeletonLoader";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useAudioCapture } from "@/hooks/useAudioCapture";
import { useAppStore } from "@/lib/store";
import { Keyboard, Monitor } from "lucide-react";

// Dynamic import for 3D canvas (no SSR) with loading skeleton
const Avatar3D = dynamic(
  () => import("@/components/Avatar3D").then((m) => ({ default: m.Avatar3D })),
  {
    ssr: false,
    loading: () => <AvatarSkeleton />,
  }
);

export default function Home() {
  const { connect, disconnect, sendAudioChunk } = useWebSocket();
  const { toggleRecording } = useAudioCapture({
    onAudioChunk: sendAudioChunk,
  });
  const connectionStatus = useAppStore((s) => s.connectionStatus);
  const isRecording = useAppStore((s) => s.isRecording);

  // Auto-connect on mount
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  // Keyboard shortcut: Space to toggle recording
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.code === "Space" && connectionStatus === "connected") {
        e.preventDefault();
        toggleRecording();
      }
    },
    [connectionStatus, toggleRecording]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <>
      {/* Notifications */}
      <Notifications />

      {/* Skip to main content (a11y) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-lg focus:outline-none"
      >
        Skip to main content
      </a>

      <main
        id="main-content"
        className="h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50"
        role="application"
        aria-label="Sign Language Interpreter"
      >
        {/* Header */}
        <header
          className="flex items-center justify-between px-6 py-3 border-b border-slate-200/50 bg-white/60 backdrop-blur-sm"
          role="banner"
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-xl bg-primary-600 flex items-center justify-center"
              aria-hidden="true"
            >
              <span className="text-white text-sm font-bold">SL</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">
                Sign Language Interpreter
              </h1>
              <p className="text-xs text-slate-400">
                Real-time AI-powered translation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Keyboard shortcut hint */}
            <div
              className="hidden md:flex items-center gap-1.5 text-xs text-slate-400"
              aria-label="Press spacebar to toggle recording"
            >
              <Keyboard className="w-3.5 h-3.5" />
              <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono">
                Space
              </kbd>
              <span>to record</span>
            </div>
            <SettingsPanel />
          </div>
        </header>

        {/* Main content */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 min-h-0">
          {/* Avatar panel */}
          <div
            className="lg:col-span-2 flex flex-col gap-4 min-h-0"
            role="region"
            aria-label="Sign language avatar"
          >
            <ErrorBoundary
              fallbackTitle="Avatar Error"
              fallbackMessage="The 3D avatar failed to load. Try refreshing the page."
            >
              <div className="flex-1 min-h-[300px]">
                <Avatar3D />
              </div>
            </ErrorBoundary>

            <ErrorBoundary fallbackTitle="Gesture Queue Error">
              <GestureQueue />
            </ErrorBoundary>
          </div>

          {/* Right sidebar */}
          <div
            className="flex flex-col gap-4 min-h-0"
            role="complementary"
            aria-label="Transcript and controls"
          >
            <ErrorBoundary fallbackTitle="Transcript Error">
              <div className="flex-1 min-h-[200px]">
                <TranscriptPanel />
              </div>
            </ErrorBoundary>

            {/* Controls */}
            <div
              className="glass-panel p-6 flex flex-col items-center gap-4"
              role="toolbar"
              aria-label="Recording controls"
            >
              <MicrophoneButton onToggle={toggleRecording} />

              <div
                className="flex items-center gap-2 text-xs text-slate-400"
                role="status"
                aria-live="polite"
              >
                <span
                  className={`status-dot status-dot--${connectionStatus}`}
                  aria-hidden="true"
                />
                <span>
                  {connectionStatus === "connected"
                    ? "WebSocket connected"
                    : connectionStatus === "connecting"
                      ? "Connecting to server..."
                      : connectionStatus === "error"
                        ? "Connection failed"
                        : "Disconnected"}
                </span>
              </div>

              {/* Screen reader only: announce recording state */}
              <div className="sr-only" aria-live="assertive" aria-atomic="true">
                {isRecording
                  ? "Recording in progress. Listening to microphone."
                  : "Recording stopped."}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="flex items-center justify-center px-6 py-2 border-t border-slate-200/30 bg-white/40">
          <div className="flex items-center gap-4 text-[10px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <Monitor className="w-3 h-3" />
              <span>Supports ASL &amp; ISL</span>
            </div>
            <span>|</span>
            <span>130+ gestures with fingerspelling fallback</span>
          </div>
        </footer>
      </main>
    </>
  );
}
