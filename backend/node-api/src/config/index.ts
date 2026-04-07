import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

export const config = {
  port: parseInt(process.env.PORT || "3001", 10),
  nodeEnv: process.env.NODE_ENV || "development",

  // Python microservice URLs
  speechToTextUrl: process.env.SPEECH_TO_TEXT_URL || "http://localhost:8001",
  nlpProcessorUrl: process.env.NLP_PROCESSOR_URL || "http://localhost:8002",
  textToSignUrl: process.env.TEXT_TO_SIGN_URL || "http://localhost:8003",

  // Database
  mongodbUri:
    process.env.MONGODB_URI ||
    "mongodb://localhost:27017/sign-language-interpreter",
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",

  // Auth
  jwtSecret: process.env.JWT_SECRET || "dev-secret-change-me",
  jwtExpiry: process.env.JWT_EXPIRY || "24h",

  // Logging
  logLevel: process.env.LOG_LEVEL || "info",

  // CORS
  corsOrigins: process.env.CORS_ORIGINS?.split(",") || [
    "http://localhost:3000",
  ],
} as const;
