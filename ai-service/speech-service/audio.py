"""Decode an uploaded recording (webm/opus, ogg, wav, mp3, m4a) to 16 kHz mono float samples.

PyAV bundles its own ffmpeg libraries, so nothing has to be installed on the machine.
The backend has already checked the file type and size; the limits here are a second
line of defence, because this service can also be reached directly.
"""

from __future__ import annotations

import io

import numpy as np

SAMPLE_RATE = 16_000
MAX_BYTES = 5 * 1024 * 1024
MAX_SECONDS = 60
MIN_SECONDS = 0.3


class AudioError(ValueError):
    """The recording cannot be used. `status` is the HTTP code to answer with."""

    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.status = status


def decode_audio(data: bytes) -> np.ndarray:
    """Float32 samples in [-1, 1] at 16 kHz, mono."""
    if not data:
        raise AudioError("Empty recording.")
    if len(data) > MAX_BYTES:
        raise AudioError("Recording is too large.", 413)

    import av  # imported here so the module loads even where PyAV is missing

    try:
        container = av.open(io.BytesIO(data))
    except Exception as error:  # av raises several error types for unreadable input
        raise AudioError("Not a readable audio file.") from error

    chunks: list[np.ndarray] = []
    try:
        stream = next((s for s in container.streams if s.type == "audio"), None)
        if stream is None:
            raise AudioError("The file has no audio track.")
        resampler = av.AudioResampler(format="s16", layout="mono", rate=SAMPLE_RATE)
        for frame in container.decode(stream):
            for converted in resampler.resample(frame):
                chunks.append(converted.to_ndarray().reshape(-1))
        for converted in resampler.resample(None) or []:
            chunks.append(converted.to_ndarray().reshape(-1))
    except AudioError:
        raise
    except Exception as error:
        raise AudioError("The audio could not be decoded.") from error
    finally:
        container.close()

    if not chunks:
        raise AudioError("The recording is silent or empty.")
    samples = np.concatenate(chunks).astype(np.float32) / 32768.0

    seconds = len(samples) / SAMPLE_RATE
    if seconds > MAX_SECONDS:
        raise AudioError(f"Recording is longer than {MAX_SECONDS} seconds.", 422)
    if seconds < MIN_SECONDS:
        raise AudioError("Recording is too short.", 422)
    return samples
