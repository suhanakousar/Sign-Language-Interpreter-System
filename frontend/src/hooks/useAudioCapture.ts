"use client";

import { useCallback, useRef } from "react";
import { useAppStore } from "@/lib/store";
import { processTextToGestures } from "@/lib/textToSign";

interface UseAudioCaptureOptions {
  onAudioChunk?: (data: ArrayBuffer) => void;
}

// Browser-native Speech Recognition (Chrome, Edge, Safari)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getSpeechRecognition = (): (new () => any) | null => {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
};

export function useAudioCapture({ onAudioChunk }: UseAudioCaptureOptions = {}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const isRecording = useAppStore((s) => s.isRecording);

  const startRecording = useCallback(async () => {
    const SpeechRecognitionCtor = getSpeechRecognition();
    if (!SpeechRecognitionCtor) {
      console.error(
        "Speech Recognition not supported. Use Chrome or Edge for speech input."
      );
      return;
    }

    const { setRecording, addTranscript, enqueueGestures, setCurrentPartial } =
      useAppStore.getState();

    try {
      const recognition = new SpeechRecognitionCtor();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang =
        useAppStore.getState().settings.language === "hi" ? "hi-IN" : "en-US";

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        let interimTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const text: string = result[0].transcript;

          if (result.isFinal) {
            // Process final speech result into gestures
            const { gestures, processedText } = processTextToGestures(text);

            addTranscript({
              id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              text: text.trim(),
              processed_text: processedText || text.trim(),
              timestamp: Date.now(),
              is_final: true,
            });

            if (gestures.length > 0) {
              enqueueGestures(gestures);
            }

            setCurrentPartial("");
          } else {
            interimTranscript += text;
          }
        }

        if (interimTranscript) {
          setCurrentPartial(interimTranscript);
        }
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        // Don't stop for transient "no-speech" errors
        if (event.error !== "no-speech") {
          setRecording(false);
          recognitionRef.current = null;
        }
      };

      recognition.onend = () => {
        // Auto-restart if user hasn't stopped recording
        if (useAppStore.getState().isRecording && recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch {
            setRecording(false);
            recognitionRef.current = null;
          }
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
      setRecording(true);
    } catch (error) {
      console.error("Failed to start speech recognition:", error);
      useAppStore.getState().setRecording(false);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    useAppStore.getState().setRecording(false);
    useAppStore.getState().setCurrentPartial("");
  }, []);

  const toggleRecording = useCallback(() => {
    if (useAppStore.getState().isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [startRecording, stopRecording]);

  return { isRecording, startRecording, stopRecording, toggleRecording };
}
