import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import { v4 as uuidv4 } from "uuid";
import { pipelineService } from "./pipeline";
import { logger } from "../config/logger";

interface ClientSession {
  id: string;
  ws: WebSocket;
  language: string;
  signLanguage: string;
  isProcessing: boolean;
  audioBuffer: Buffer[];
}

export class WebSocketManager {
  private wss: WebSocketServer;
  private sessions = new Map<string, ClientSession>();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: "/live-translation" });
    this.init();
  }

  private init() {
    this.wss.on("connection", (ws) => {
      const sessionId = uuidv4();
      const session: ClientSession = {
        id: sessionId,
        ws,
        language: "en",
        signLanguage: "ASL",
        isProcessing: false,
        audioBuffer: [],
      };

      this.sessions.set(sessionId, session);
      logger.info(`Client connected: ${sessionId}`);

      // Send welcome
      this.send(ws, {
        type: "status",
        payload: { status: "connected", message: "Ready for audio" },
        timestamp: Date.now(),
        session_id: sessionId,
      });

      ws.on("message", (data, isBinary) => {
        if (isBinary) {
          this.handleAudioChunk(session, data as Buffer);
        } else {
          this.handleTextMessage(session, data.toString());
        }
      });

      ws.on("close", () => {
        this.sessions.delete(sessionId);
        logger.info(`Client disconnected: ${sessionId}`);
      });

      ws.on("error", (error) => {
        logger.error(`WebSocket error for ${sessionId}:`, error);
        this.sessions.delete(sessionId);
      });
    });

    logger.info("WebSocket server initialized at /live-translation");
  }

  private handleTextMessage(session: ClientSession, raw: string) {
    try {
      const message = JSON.parse(raw);

      switch (message.type) {
        case "ping":
          this.send(session.ws, {
            type: "pong",
            payload: null,
            timestamp: Date.now(),
          });
          break;

        case "settings":
          if (message.payload?.language)
            session.language = message.payload.language;
          if (message.payload?.sign_language)
            session.signLanguage = message.payload.sign_language;
          break;

        default:
          logger.warn(`Unknown message type: ${message.type}`);
      }
    } catch {
      logger.warn("Invalid JSON message received");
    }
  }

  private async handleAudioChunk(session: ClientSession, data: Buffer) {
    if (session.isProcessing) {
      // Buffer audio while processing
      session.audioBuffer.push(data);
      return;
    }

    session.isProcessing = true;

    try {
      const result = await pipelineService.processAudioChunk(
        data,
        session.language,
        session.signLanguage
      );

      // Send transcript
      if (result.transcript.text.trim()) {
        this.send(session.ws, {
          type: "transcript_final",
          payload: {
            text: result.transcript.text,
            is_final: result.transcript.is_final,
            confidence: result.transcript.confidence,
            processed_text: result.nlp.processed_text,
          },
          timestamp: Date.now(),
          session_id: session.id,
        });

        // Send gesture sequence
        if (result.gestures.sequence.length > 0) {
          this.send(session.ws, {
            type: "gesture_sequence",
            payload: {
              sequence: result.gestures.sequence,
              source_text: result.gestures.source_text,
            },
            timestamp: Date.now(),
            session_id: session.id,
          });
        }
      }
    } catch (error) {
      logger.error("Pipeline processing error:", error);
      this.send(session.ws, {
        type: "error",
        payload: {
          code: "PIPELINE_ERROR",
          message: "Failed to process audio chunk",
        },
        timestamp: Date.now(),
        session_id: session.id,
      });
    } finally {
      session.isProcessing = false;

      // Process buffered audio
      if (session.audioBuffer.length > 0) {
        const buffered = Buffer.concat(session.audioBuffer);
        session.audioBuffer = [];
        this.handleAudioChunk(session, buffered);
      }
    }
  }

  private send(ws: WebSocket, message: object) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  getActiveConnections(): number {
    return this.sessions.size;
  }
}
