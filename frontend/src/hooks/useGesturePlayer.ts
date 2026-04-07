"use client";

import { useCallback, useEffect, useRef } from "react";
import { useAppStore } from "@/lib/store";

export function useGesturePlayer() {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const {
    gestureQueue,
    currentGesture,
    isPlaying,
    settings,
    dequeueGesture,
    setCurrentGesture,
    setPlaying,
  } = useAppStore();

  const playNext = useCallback(() => {
    const next = dequeueGesture();
    if (next) {
      setPlaying(true);
      const adjustedDuration = (next.duration * 1000) / settings.playback_speed;
      timerRef.current = setTimeout(() => {
        setCurrentGesture(null);
        playNext();
      }, adjustedDuration);
    } else {
      setPlaying(false);
      setCurrentGesture(null);
    }
  }, [dequeueGesture, setCurrentGesture, setPlaying, settings.playback_speed]);

  // Auto-play when gestures arrive and not currently playing
  useEffect(() => {
    if (gestureQueue.length > 0 && !isPlaying && !currentGesture) {
      playNext();
    }
  }, [gestureQueue.length, isPlaying, currentGesture, playNext]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const stop = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setPlaying(false);
    setCurrentGesture(null);
  }, [setPlaying, setCurrentGesture]);

  return { currentGesture, isPlaying, playNext, stop };
}
