"use client";

import { Hand, Play, Square } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useGesturePlayer } from "@/hooks/useGesturePlayer";

export function GestureQueue() {
  const { gestureQueue, currentGesture, isPlaying } = useAppStore();
  const { stop } = useGesturePlayer();

  return (
    <div className="glass-panel p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Hand className="w-4 h-4 text-primary-600" />
          <h2 className="text-sm font-semibold text-slate-700">
            Gesture Queue
          </h2>
          <span className="text-xs text-slate-400">
            ({gestureQueue.length} pending)
          </span>
        </div>
        {isPlaying && (
          <button
            onClick={stop}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-red-500 transition-colors"
            aria-label="Stop playback"
          >
            <Square className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {currentGesture && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-100 text-primary-700 rounded-lg text-xs font-medium shrink-0 animate-pulse">
            <Play className="w-3 h-3" />
            {currentGesture.word.toUpperCase()}
          </div>
        )}

        {gestureQueue.slice(0, 10).map((g, i) => (
          <div
            key={`${g.word}-${i}`}
            className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium shrink-0"
          >
            {g.word.toUpperCase()}
          </div>
        ))}

        {gestureQueue.length > 10 && (
          <div className="px-2 py-1.5 text-xs text-slate-400">
            +{gestureQueue.length - 10} more
          </div>
        )}

        {!currentGesture && gestureQueue.length === 0 && (
          <div className="text-xs text-slate-400">
            No gestures queued
          </div>
        )}
      </div>
    </div>
  );
}
