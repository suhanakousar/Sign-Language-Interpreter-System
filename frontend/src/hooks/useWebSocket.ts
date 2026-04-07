"use client";

import { useCallback, useEffect, useRef } from "react";
import { useAppStore } from "@/lib/store";
import { WS_URL } from "@/lib/constants";
import type {
  WSMessage,
  TranscriptPayload,
  GesturePayload,
  StatusPayload,
  ErrorPayload,
} from "@/types";

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const {
    setConnectionStatus,
    setSessionId,
    addTranscript,
    setCurrentPartial,
    enqueueGestures,
  } = useAppStore();

  const connect = useCallback(() => {
    if (
      wsRef.current?.readyState === WebSocket.OPEN ||
      wsRef.current?.readyState === WebSocket.CONNECTING
    ) {
      return;
    }

    setConnectionStatus("connecting");
    const ws = new WebSocket(`${WS_URL}/live-translation`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionStatus("connected");
      reconnectAttempts.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data);
        handleMessage(message);
      } catch {
        console.error("Failed to parse WebSocket message");
      }
    };

    ws.onclose = () => {
      setConnectionStatus("disconnected");
      wsRef.current = null;
      attemptReconnect();
    };

    ws.onerror = () => {
      setConnectionStatus("error");
    };
  }, [setConnectionStatus, setSessionId, addTranscript, setCurrentPartial, enqueueGestures]);

  const handleMessage = useCallback(
    (message: WSMessage) => {
      switch (message.type) {
        case "status": {
          const status = message.payload as StatusPayload;
          if (message.session_id) setSessionId(message.session_id);
          if (status.status === "error") setConnectionStatus("error");
          break;
        }

        case "transcript_partial": {
          const partial = message.payload as TranscriptPayload;
          setCurrentPartial(partial.text);
          break;
        }

        case "transcript_final": {
          const final_t = message.payload as TranscriptPayload;
          addTranscript({
            id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            text: final_t.text,
            processed_text: final_t.processed_text || final_t.text,
            timestamp: message.timestamp,
            is_final: true,
          });
          break;
        }

        case "gesture_sequence": {
          const gestureData = message.payload as GesturePayload;
          enqueueGestures(gestureData.sequence);
          break;
        }

        case "error": {
          const error = message.payload as ErrorPayload;
          console.error(`[WS Error] ${error.code}: ${error.message}`);
          break;
        }

        case "pong":
          break;
      }
    },
    [setSessionId, setConnectionStatus, setCurrentPartial, addTranscript, enqueueGestures]
  );

  const attemptReconnect = useCallback(() => {
    if (reconnectAttempts.current >= maxReconnectAttempts) return;
    const delay = Math.min(1000 * 2 ** reconnectAttempts.current, 10000);
    reconnectTimerRef.current = setTimeout(() => {
      reconnectAttempts.current++;
      connect();
    }, delay);
  }, [connect]);

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnectionStatus("disconnected");
    setSessionId(null);
  }, [setConnectionStatus, setSessionId]);

  const sendAudioChunk = useCallback((audioData: ArrayBuffer) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(audioData);
    }
  }, []);

  const sendMessage = useCallback((message: WSMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  // Heartbeat
  useEffect(() => {
    const interval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        sendMessage({
          type: "ping",
          payload: null,
          timestamp: Date.now(),
        });
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [sendMessage]);

  return { connect, disconnect, sendAudioChunk, sendMessage };
}
