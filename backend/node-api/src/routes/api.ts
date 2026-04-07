import { Router, Request, Response } from "express";
import { pipelineService } from "../services/pipeline";
import { authMiddleware, AuthRequest, generateToken } from "../middleware/auth";
import { validateAudioStream, sanitizeInput } from "../middleware/validation";
import { authLimiter, audioLimiter } from "../middleware/rateLimiter";
import { logger } from "../config/logger";
import { wsManager } from "../server";

const router = Router();

// ─── Health check (public) ───
router.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    memory: {
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    },
    version: "1.0.0",
  });
});

// ─── Service health (check all microservices) ───
router.get("/health/services", async (_req: Request, res: Response) => {
  const services = [
    { name: "speech-to-text", url: `${process.env.SPEECH_TO_TEXT_URL || "http://localhost:8001"}/health` },
    { name: "nlp-processor", url: `${process.env.NLP_PROCESSOR_URL || "http://localhost:8002"}/health` },
    { name: "text-to-sign", url: `${process.env.TEXT_TO_SIGN_URL || "http://localhost:8003"}/health` },
  ];

  const results = await Promise.allSettled(
    services.map(async (svc) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      try {
        const resp = await fetch(svc.url, { signal: controller.signal });
        return { name: svc.name, status: resp.ok ? "healthy" : "unhealthy", code: resp.status };
      } finally {
        clearTimeout(timeout);
      }
    })
  );

  const serviceStatuses = results.map((r, i) => ({
    name: services[i].name,
    status: r.status === "fulfilled" ? r.value.status : "unreachable",
    ...(r.status === "rejected" ? { error: "Connection failed" } : {}),
  }));

  const allHealthy = serviceStatuses.every((s) => s.status === "healthy");

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? "ok" : "degraded",
    services: serviceStatuses,
  });
});

// ─── Auth token (with rate limiting) ───
router.post("/auth/token", authLimiter, (req: Request, res: Response) => {
  const userId = sanitizeInput(req.body?.userId || `user-${Date.now()}`);
  if (userId.length < 1 || userId.length > 100) {
    return res.status(400).json({ error: "Invalid userId" });
  }
  const token = generateToken(userId);
  res.json({ token, userId });
});

// ─── Process audio file (non-streaming) ───
router.post(
  "/audio-stream",
  audioLimiter,
  authMiddleware,
  validateAudioStream,
  async (req: AuthRequest, res: Response) => {
    try {
      const chunks: Buffer[] = [];
      let totalSize = 0;
      const MAX_SIZE = 10 * 1024 * 1024; // 10MB

      req.on("data", (chunk: Buffer) => {
        totalSize += chunk.length;
        if (totalSize > MAX_SIZE) {
          res.status(413).json({ error: "Audio too large (max 10MB)" });
          req.destroy();
          return;
        }
        chunks.push(chunk);
      });

      req.on("end", async () => {
        if (res.headersSent) return;

        const audioBuffer = Buffer.concat(chunks);
        const language = sanitizeInput((req.query.language as string) || "en");
        const signLanguage = sanitizeInput(
          (req.query.sign_language as string) || "ASL"
        );

        // Validate allowed values
        if (!["en", "hi"].includes(language)) {
          return res.status(400).json({ error: "Unsupported language" });
        }
        if (!["ASL", "ISL"].includes(signLanguage)) {
          return res.status(400).json({ error: "Unsupported sign language" });
        }

        const result = await pipelineService.processAudioChunk(
          audioBuffer,
          language,
          signLanguage
        );

        res.json(result);
      });

      req.on("error", (error) => {
        logger.error("Audio stream error:", error);
        if (!res.headersSent) {
          res.status(500).json({ error: "Audio stream failed" });
        }
      });
    } catch (error) {
      logger.error("Audio processing error:", error);
      res.status(500).json({ error: "Audio processing failed" });
    }
  }
);

// ─── Get gesture sequence from text ───
router.get(
  "/gesture-sequence",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const text = sanitizeInput((req.query.text as string) || "");
      const signLanguage = sanitizeInput(
        (req.query.sign_language as string) || "ASL"
      );

      if (!text) {
        return res.status(400).json({ error: "Text parameter required" });
      }

      if (!["ASL", "ISL"].includes(signLanguage)) {
        return res.status(400).json({ error: "Unsupported sign language" });
      }

      const nlp = await pipelineService.processText(text, signLanguage);
      const gestures = await pipelineService.textToGestures(
        nlp.tokens,
        signLanguage
      );

      res.json({ text, processed: nlp, gestures });
    } catch (error) {
      logger.error("Gesture sequence error:", error);
      res.status(500).json({ error: "Gesture conversion failed" });
    }
  }
);

// ─── Process text directly (skip audio) ───
router.post(
  "/process-text",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { text, sign_language = "ASL" } = req.body;

      if (!text || typeof text !== "string") {
        return res.status(400).json({ error: "Text field required (string)" });
      }

      const sanitized = sanitizeInput(text);
      if (sanitized.length === 0) {
        return res.status(400).json({ error: "Text cannot be empty" });
      }

      if (!["ASL", "ISL"].includes(sign_language)) {
        return res.status(400).json({ error: "Unsupported sign language" });
      }

      const nlp = await pipelineService.processText(sanitized, sign_language);
      const gestures = await pipelineService.textToGestures(
        nlp.tokens,
        sign_language
      );

      res.json({
        transcript: { text: sanitized, is_final: true, confidence: 1.0 },
        nlp,
        gestures,
      });
    } catch (error) {
      logger.error("Text processing error:", error);
      res.status(500).json({ error: "Processing failed" });
    }
  }
);

// ─── Stats endpoint (dev only) ───
router.get("/stats", authMiddleware, (req: AuthRequest, res: Response) => {
  res.json({
    uptime: Math.floor(process.uptime()),
    memory: process.memoryUsage(),
    pid: process.pid,
    nodeVersion: process.version,
  });
});

export default router;
