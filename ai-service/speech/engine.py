"""The speech model. Whisper, loaded on first use from a Hub id or a folder.

Set ASR_MODEL to a folder saved by `ai-service/speech/finetune/finetune.py` to serve the
fine-tuned model; the default is the stock openai/whisper-small.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Protocol

import numpy as np

DEFAULT_MODEL = "openai/whisper-small"


class Engine(Protocol):
    """What the web app needs from a speech model (tests use a fake one)."""

    name: str

    def transcribe(self, samples: np.ndarray) -> str: ...


class WhisperEngine:
    def __init__(self, model: str = DEFAULT_MODEL):
        self.model = model
        # A short name for logs and for the label the vendor sees: the folder name or the Hub id tail.
        self.name = Path(model).name or model
        self._pipeline = None

    @classmethod
    def from_env(cls) -> "WhisperEngine":
        return cls(os.environ.get("ASR_MODEL", DEFAULT_MODEL))

    @property
    def loaded(self) -> bool:
        return self._pipeline is not None

    def _load(self):
        import torch
        from transformers import pipeline

        use_gpu = torch.cuda.is_available()
        self._pipeline = pipeline(
            "automatic-speech-recognition",
            model=self.model,
            device=0 if use_gpu else -1,
            torch_dtype=torch.float16 if use_gpu else torch.float32,
            chunk_length_s=30,
        )
        return self._pipeline

    def transcribe(self, samples: np.ndarray) -> str:
        asr = self._pipeline or self._load()
        result = asr(
            {"raw": samples, "sampling_rate": 16_000},
            generate_kwargs={"language": "vi", "task": "transcribe"},
        )
        return str(result["text"]).strip()
