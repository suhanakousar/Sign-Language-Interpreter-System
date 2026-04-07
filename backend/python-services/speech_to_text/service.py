"""Speech-to-Text service using OpenAI Whisper."""

import os
import tempfile
import logging
from pathlib import Path

import whisper
import numpy as np

logger = logging.getLogger(__name__)

WHISPER_MODEL = os.getenv("WHISPER_MODEL", "base")
WHISPER_DEVICE = os.getenv("WHISPER_DEVICE", "cpu")


class SpeechToTextService:
    def __init__(self):
        self.model = None

    def load_model(self):
        """Load Whisper model (called at startup)."""
        logger.info(f"Loading Whisper model '{WHISPER_MODEL}' on {WHISPER_DEVICE}...")
        self.model = whisper.load_model(WHISPER_MODEL, device=WHISPER_DEVICE)
        logger.info("Whisper model loaded successfully")

    async def transcribe(
        self, audio_bytes: bytes, language: str = "en"
    ) -> dict:
        """Transcribe audio bytes to text.

        Args:
            audio_bytes: Raw audio data (webm/opus format)
            language: Target language code

        Returns:
            dict with text, confidence, language, is_final
        """
        if self.model is None:
            self.load_model()

        # Write audio to temp file (Whisper requires file path)
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as f:
            f.write(audio_bytes)
            temp_path = f.name

        try:
            result = self.model.transcribe(
                temp_path,
                language=language if language != "auto" else None,
                fp16=WHISPER_DEVICE == "cuda",
                task="transcribe",
            )

            text = result.get("text", "").strip()

            # Calculate average confidence from segments
            segments = result.get("segments", [])
            if segments:
                avg_confidence = sum(
                    s.get("avg_logprob", -1.0) for s in segments
                ) / len(segments)
                # Convert log probability to 0-1 confidence
                confidence = min(1.0, max(0.0, 1.0 + avg_confidence))
            else:
                confidence = 0.0 if not text else 0.8

            detected_lang = result.get("language", language)

            return {
                "text": text,
                "is_final": True,
                "confidence": round(confidence, 3),
                "language": detected_lang,
            }

        finally:
            Path(temp_path).unlink(missing_ok=True)


# Singleton
speech_service = SpeechToTextService()
