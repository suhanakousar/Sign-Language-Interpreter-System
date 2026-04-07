import express from "express";
import cors from "cors";
import helmet from "helmet";
import { createServer } from "http";
import { config } from "./config";
import { logger } from "./config/logger";
import { WebSocketManager } from "./services/websocket";
import { apiLimiter } from "./middleware/rateLimiter";
import apiRouter from "./routes/api";

const app = express();

// ─── Security middleware ───
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-eval'"], // Required for Three.js
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'", "ws:", "wss:"],
        workerSrc: ["'self'", "blob:"],
      },
    },
    crossOriginEmbedderPolicy: false, // Required for Three.js assets
  })
);
app.use(
  cors({
    origin: config.corsOrigins,
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
  })
);

// Global rate limiter
app.use(apiLimiter);

// ─── Body parsing ───
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// ─── Request logging with timing ───
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.debug(
      `${req.method} ${req.path} ${res.statusCode} ${duration}ms`
    );
  });
  next();
});

// ─── Routes ───
app.use("/api", apiRouter);

// ─── 404 handler ───
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ─── Error handler ───
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    logger.error("Unhandled error:", err);
    // Don't leak error details in production
    const message =
      config.nodeEnv === "production"
        ? "Internal server error"
        : err.message;
    res.status(500).json({ error: message });
  }
);

// ─── Start server ───
const server = createServer(app);
const wsManager = new WebSocketManager(server);

server.listen(config.port, () => {
  logger.info(`API server running on port ${config.port}`);
  logger.info(
    `WebSocket endpoint: ws://localhost:${config.port}/live-translation`
  );
  logger.info(`Environment: ${config.nodeEnv}`);
  logger.info(`Active connections: ${wsManager.getActiveConnections()}`);
});

// Graceful shutdown
const shutdown = (signal: string) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  server.close(() => {
    logger.info("HTTP server closed");
    process.exit(0);
  });
  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

export { app, server, wsManager };
