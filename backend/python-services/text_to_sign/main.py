"""Text-to-Sign FastAPI microservice."""

import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from shared.models import GestureConvertRequest, GestureResponse, HealthResponse
from service import text_to_sign_service

ALLOWED_ORIGINS = os.getenv(
    "CORS_ORIGINS", "http://localhost:3000,http://localhost:3001"
).split(",")

app = FastAPI(
    title="Text-to-Sign Service",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)


@app.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(service="text-to-sign")


@app.post("/convert", response_model=GestureResponse)
async def convert_to_gestures(request: GestureConvertRequest):
    """Convert processed tokens to sign language gesture sequence."""
    if not request.tokens:
        raise HTTPException(status_code=400, detail="Tokens list cannot be empty")

    result = text_to_sign_service.convert(
        tokens=request.tokens,
        sign_language=request.sign_language,
    )
    return GestureResponse(**result)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
