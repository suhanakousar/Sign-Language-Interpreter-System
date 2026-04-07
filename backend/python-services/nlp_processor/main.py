"""NLP Processor FastAPI microservice."""

import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from shared.models import NLPRequest, NLPResponse, HealthResponse
from service import nlp_processor

ALLOWED_ORIGINS = os.getenv(
    "CORS_ORIGINS", "http://localhost:3000,http://localhost:3001"
).split(",")

app = FastAPI(
    title="NLP Processor Service",
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
    return HealthResponse(service="nlp-processor")


@app.post("/process", response_model=NLPResponse)
async def process_text(request: NLPRequest):
    """Process English text into sign-language-friendly structure."""
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    result = nlp_processor.process(request.text, request.sign_language)
    return NLPResponse(**result)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
