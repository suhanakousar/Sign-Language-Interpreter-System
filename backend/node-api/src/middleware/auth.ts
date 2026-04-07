import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { config } from "../config";
import { logger } from "../config/logger";

export interface AuthRequest extends Request {
  userId?: string;
}

// Validate JWT secret strength at startup
const MIN_SECRET_LENGTH = 32;
const WEAK_SECRETS = new Set([
  "dev-secret-change-me",
  "secret",
  "password",
  "changeme",
  "your-secret-key-change-in-production",
]);

function validateJwtSecret(): string {
  const secret = config.jwtSecret;

  if (config.nodeEnv === "production") {
    if (WEAK_SECRETS.has(secret) || secret.length < MIN_SECRET_LENGTH) {
      logger.error(
        "FATAL: JWT_SECRET is weak or default. Set a strong secret (32+ chars) in production."
      );
      // Generate a random one and warn (don't crash, but tokens won't persist across restarts)
      const generated = crypto.randomBytes(48).toString("hex");
      logger.warn("Using auto-generated JWT secret (tokens will not survive restarts)");
      return generated;
    }
  }

  if (WEAK_SECRETS.has(secret)) {
    logger.warn(
      "JWT_SECRET is using a default value. Set JWT_SECRET environment variable for security."
    );
  }

  return secret;
}

const effectiveSecret = validateJwtSecret();

export function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    if (config.nodeEnv === "development") {
      // Development only: allow unauthenticated with a generated session ID
      req.userId = `dev-${crypto.randomBytes(4).toString("hex")}`;
      return next();
    }
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const decoded = jwt.verify(token, effectiveSecret) as {
      userId: string;
      iat: number;
    };

    // Reject tokens older than 7 days even if expiry is longer
    const tokenAge = Date.now() / 1000 - decoded.iat;
    if (tokenAge > 7 * 24 * 3600) {
      return res.status(401).json({ error: "Token expired" });
    }

    req.userId = decoded.userId;
    next();
  } catch (err) {
    logger.warn("Invalid JWT token attempt");
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, effectiveSecret, {
    expiresIn: config.jwtExpiry,
  });
}
