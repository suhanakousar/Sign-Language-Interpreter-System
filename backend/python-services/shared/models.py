"""Shared Pydantic models used across all Python microservices."""

from pydantic import BaseModel, Field


class TranscriptionRequest(BaseModel):
    language: str = Field(default="en", description="Language code (en, hi)")


class TranscriptionResponse(BaseModel):
    text: str
    is_final: bool = True
    confidence: float = Field(ge=0.0, le=1.0)
    language: str = "en"


class NLPRequest(BaseModel):
    text: str = Field(min_length=1, max_length=10000)
    sign_language: str = Field(default="ASL", description="Target sign language")


class NLPResponse(BaseModel):
    processed_text: str
    original_text: str
    tokens: list[str]
    sentiment: str = "neutral"


class GestureConvertRequest(BaseModel):
    tokens: list[str]
    sign_language: str = Field(default="ASL")


class GestureCommand(BaseModel):
    word: str
    animation: str
    duration: float = Field(ge=0.1, le=10.0)
    transition: float = Field(default=0.3, ge=0.0, le=2.0)
    facial_expression: str = "neutral"


class GestureResponse(BaseModel):
    sequence: list[GestureCommand]
    source_text: str
    unknown_words: list[str] = []


class HealthResponse(BaseModel):
    status: str = "ok"
    service: str
    version: str = "1.0.0"
