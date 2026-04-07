"""Speech-to-Text FastAPI microservice."""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware

import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from shared.models import TranscriptionResponse, HealthResponse
from service import speech_service

ALLOWED_ORIGINS = os.getenv(
    "CORS_ORIGINS", "http://localhost:3000,http://localhost:3001"
).split(",")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load Whisper model on startup."""
    speech_service.load_model()
    yield


app = FastAPI(
    title="Speech-to-Text Service",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)


@app.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(service="speech-to-text")


@app.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe(
    audio: UploadFile = File(...),
    language: str = Form(default="en"),
):
    """Transcribe uploaded audio file to text."""
    audio_bytes = await audio.read()
    if len(audio_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty audio file")

    if len(audio_bytes) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Audio file too large (max 25MB)")

    # Validate language parameter
    if language not in ("en", "hi", "auto"):
        raise HTTPException(status_code=400, detail="Unsupported language. Use: en, hi, auto")

    result = await speech_service.transcribe(audio_bytes, language)
    return TranscriptionResponse(**result)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
