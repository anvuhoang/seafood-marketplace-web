"""HTTP API of the speech service.

    POST /transcribe   multipart form, one file field named "audio"  ->  {"text", "engine", "seconds"}
    GET  /health       {"status": "ok", "engine": ..., "loaded": ...}

Only the NestJS backend should call this. Set AI_SERVICE_TOKEN (the same value as on the
backend) and the service answers 401 to callers that do not send it in X-AI-Token.
The recording is decoded in memory, transcribed and dropped; nothing is written to disk
and the text is not logged.
"""

from __future__ import annotations

import hmac
import logging
import time

from fastapi import FastAPI, File, Header, HTTPException, UploadFile

from audio import MAX_BYTES, AudioError, decode_audio
from engine import Engine

log = logging.getLogger("speech")


def create_app(engine: Engine, token: str | None = None) -> FastAPI:
    app = FastAPI(title="HaiSan Express speech service", docs_url=None, redoc_url=None)

    def check_token(sent: str | None) -> None:
        if token and not (sent and hmac.compare_digest(sent, token)):
            raise HTTPException(status_code=401, detail="Invalid or missing token.")

    @app.get("/health")
    def health() -> dict:
        return {"status": "ok", "engine": engine.name, "loaded": getattr(engine, "loaded", True)}

    @app.post("/transcribe")
    async def transcribe(
        audio: UploadFile = File(...),
        x_ai_token: str | None = Header(default=None),
    ) -> dict:
        check_token(x_ai_token)

        # Read one byte past the limit to know the file is too big without loading all of it.
        data = await audio.read(MAX_BYTES + 1)
        try:
            samples = decode_audio(data)
        except AudioError as error:
            raise HTTPException(status_code=error.status, detail=str(error)) from error

        started = time.perf_counter()
        try:
            text = engine.transcribe(samples)
        except Exception as error:  # a model failure must not leak details to the caller
            log.exception("Speech model failed")
            raise HTTPException(status_code=500, detail="The speech model failed.") from error
        log.info("transcribed %.1fs of audio in %.1fs", len(samples) / 16_000, time.perf_counter() - started)

        if not text.strip():
            raise HTTPException(status_code=422, detail="No speech was recognised.")
        return {"text": text.strip(), "engine": engine.name, "seconds": round(len(samples) / 16_000, 2)}

    return app
