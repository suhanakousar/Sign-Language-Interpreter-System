"use client";

import { useState, useCallback, type FormEvent, type KeyboardEvent } from "react";
import { Send, Type } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { processTextToGestures } from "@/lib/textToSign";

export function TextInput() {
  const [text, setText] = useState("");
  const enqueueGestures = useAppStore((s) => s.enqueueGestures);
  const addTranscript = useAppStore((s) => s.addTranscript);

  const handleConvert = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const { gestures, processedText } = processTextToGestures(trimmed);

    // Add to transcript panel
    addTranscript({
      id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      text: trimmed,
      processed_text: processedText || trimmed,
      timestamp: Date.now(),
      is_final: true,
    });

    // Enqueue gestures for avatar animation
    if (gestures.length > 0) {
      enqueueGestures(gestures);
    }

    setText("");
  }, [text, enqueueGestures, addTranscript]);

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      handleConvert();
    },
    [handleConvert]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleConvert();
      }
    },
    [handleConvert]
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2"
      role="search"
      aria-label="Text to sign language converter"
    >
      <div className="relative flex-1">
        <Type
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
          aria-hidden="true"
        />
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type text to convert to sign language..."
          className="w-full pl-10 pr-4 py-2.5 bg-white/80 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
          aria-label="Text to convert to sign language"
        />
      </div>
      <button
        type="submit"
        disabled={!text.trim()}
        className={`p-2.5 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
          text.trim()
            ? "bg-primary-600 hover:bg-primary-700 text-white shadow-md hover:shadow-lg"
            : "bg-slate-100 text-slate-300 cursor-not-allowed"
        }`}
        aria-label="Convert to sign language"
        title="Convert to sign (Enter)"
      >
        <Send className="w-4 h-4" />
      </button>
    </form>
  );
}
