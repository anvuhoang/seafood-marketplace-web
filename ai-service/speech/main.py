"""Entry point: uvicorn main:app --host 127.0.0.1 --port 8000"""

import logging
import os

from app import create_app
from engine import WhisperEngine

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

app = create_app(WhisperEngine.from_env(), token=os.environ.get("AI_SERVICE_TOKEN") or None)
