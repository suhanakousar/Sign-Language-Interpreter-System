"use client";

import { useEffect, useRef } from "react";
import { MessageSquare, Trash2, Download } from "lucide-react";
import { useAppStore } from "@/lib/store";

export function TranscriptPanel() {
  const { transcripts, currentPartial, clearTranscripts } = useAppStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcripts, currentPartial]);

  const exportTranscript = () => {
    const text = transcripts
      .map(
        (t) =>
          `[${new Date(t.timestamp).toLocaleTimeString()}] ${t.text}${
            t.processed_text !== t.text ? ` → ${t.processed_text}` : ""
          }`
      )
      .join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transcript-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="glass-panel flex flex-col h-full"
      role="region"
      aria-label="Live transcript"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/50">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary-600" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-slate-700">Transcript</h2>
          <span className="text-xs text-slate-400" aria-label={`${transcripts.length} entries`}>
            ({transcripts.length})
          </span>
        </div>
        <div className="flex items-center gap-1">
          {transcripts.length > 0 && (
            <>
              <button
                onClick={exportTranscript}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
                aria-label="Export transcript as text file"
                title="Export transcript"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={clearTranscripts}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-red-500 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
                aria-label="Clear all transcripts"
                title="Clear transcripts"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        tabIndex={0}
      >
        {transcripts.length === 0 && !currentPartial && (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <MessageSquare className="w-10 h-10 mb-2 opacity-30" aria-hidden="true" />
            <p className="text-sm">Transcripts will appear here</p>
            <p className="text-xs mt-1">Start recording to begin</p>
          </div>
        )}

        {transcripts.map((entry) => (
          <div key={entry.id} className="animate-fade-in" role="article">
            <div className="text-sm text-slate-800 leading-relaxed">
              {entry.text}
            </div>
            {entry.processed_text !== entry.text && (
              <div className="mt-1 text-xs text-primary-600 font-mono" aria-label={`Sign language: ${entry.processed_text}`}>
                Sign: {entry.processed_text}
              </div>
            )}
            <time
              className="mt-1 block text-[10px] text-slate-300"
              dateTime={new Date(entry.timestamp).toISOString()}
            >
              {new Date(entry.timestamp).toLocaleTimeString()}
            </time>
          </div>
        ))}

        {currentPartial && (
          <div
            className="text-sm text-slate-400 italic animate-pulse"
            role="status"
            aria-label="Partial transcript"
          >
            {currentPartial}...
          </div>
        )}
      </div>
    </div>
  );
}
