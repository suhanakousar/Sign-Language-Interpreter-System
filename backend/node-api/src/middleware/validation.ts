import { Request, Response, NextFunction } from "express";

export function validateAudioStream(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const contentType = req.headers["content-type"];
  if (
    !contentType?.includes("audio") &&
    !contentType?.includes("octet-stream") &&
    !contentType?.includes("multipart")
  ) {
    return res.status(400).json({
      error: "Invalid content type. Expected audio stream.",
    });
  }

  // Max 10MB per chunk
  const contentLength = parseInt(req.headers["content-length"] || "0", 10);
  if (contentLength > 10 * 1024 * 1024) {
    return res.status(413).json({ error: "Audio chunk too large (max 10MB)" });
  }

  next();
}

export function sanitizeInput(input: string): string {
  return input.replace(/[<>'"]/g, "").trim().slice(0, 10000);
}
