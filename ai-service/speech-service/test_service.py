"""Tests with a fake model (no torch, no download): python -m unittest test_service -v

The recordings are real: tones encoded as webm/opus (what Chrome records), wav and ogg,
so the decoding path that production uses is exercised.
"""

import io
import unittest
import wave

import av
import numpy as np
from fastapi.testclient import TestClient

from app import create_app
from audio import MAX_BYTES, AudioError, decode_audio


def tone(seconds: float, rate: int, hz: float = 440.0) -> np.ndarray:
    t = np.arange(int(seconds * rate)) / rate
    return (0.3 * np.sin(2 * np.pi * hz * t) * 32767).astype(np.int16)


def encode(container: str, codec: str, seconds: float = 1.0, rate: int = 48_000) -> bytes:
    """A tone in a real container, written with the same library that reads it back."""
    buffer = io.BytesIO()
    out = av.open(buffer, mode="w", format=container)
    stream = out.add_stream(codec, rate=rate, layout="mono")
    samples = tone(seconds, rate)
    step = 960  # 20 ms at 48 kHz, a frame size every audio encoder accepts
    for start in range(0, len(samples) - step + 1, step):
        frame = av.AudioFrame.from_ndarray(samples[start : start + step].reshape(1, -1), format="s16", layout="mono")
        frame.sample_rate = rate
        for packet in stream.encode(frame):
            out.mux(packet)
    for packet in stream.encode(None):
        out.mux(packet)
    out.close()
    return buffer.getvalue()


def wav_bytes(seconds: float = 1.0, rate: int = 16_000) -> bytes:
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as handle:
        handle.setnchannels(1)
        handle.setsampwidth(2)
        handle.setframerate(rate)
        handle.writeframes(tone(seconds, rate).tobytes())
    return buffer.getvalue()


class FakeEngine:
    name = "fake-whisper"

    def __init__(self, text="tôm sú ba trăm rưỡi một ký", fail=False):
        self.text, self.fail, self.heard = text, fail, []

    def transcribe(self, samples):
        self.heard.append(len(samples))
        if self.fail:
            raise RuntimeError("model exploded: secret detail")
        return self.text


def post(client, data, name="recording.webm", type_="audio/webm", headers=None):
    return client.post("/transcribe", files={"audio": (name, data, type_)}, headers=headers or {})


class Decoding(unittest.TestCase):
    def test_webm_opus_from_the_browser_becomes_16k_mono(self):
        samples = decode_audio(encode("webm", "libopus", 1.0))
        self.assertEqual(samples.dtype, np.float32)
        self.assertAlmostEqual(len(samples) / 16_000, 1.0, delta=0.15)
        self.assertGreater(float(np.abs(samples).max()), 0.1)  # the tone survived
        self.assertLessEqual(float(np.abs(samples).max()), 1.0)

    def test_wav_and_ogg_decode_too(self):
        self.assertAlmostEqual(len(decode_audio(wav_bytes(2.0))) / 16_000, 2.0, delta=0.05)
        self.assertAlmostEqual(len(decode_audio(encode("ogg", "libopus", 1.0))) / 16_000, 1.0, delta=0.15)

    def test_rejects_what_is_not_audio(self):
        for data in (b"", b"<html>not audio</html>" * 100, bytes(2000)):
            with self.assertRaises(AudioError) as caught:
                decode_audio(data)
            self.assertEqual(caught.exception.status, 400)

    def test_rejects_too_large_too_long_and_too_short(self):
        with self.assertRaises(AudioError) as large:
            decode_audio(bytes(MAX_BYTES + 1))
        self.assertEqual(large.exception.status, 413)
        with self.assertRaises(AudioError) as long:
            decode_audio(wav_bytes(61.0, 8_000))
        self.assertEqual(long.exception.status, 422)
        with self.assertRaises(AudioError) as short:
            decode_audio(wav_bytes(0.1))
        self.assertEqual(short.exception.status, 422)


class Api(unittest.TestCase):
    def setUp(self):
        self.engine = FakeEngine()
        self.client = TestClient(create_app(self.engine))

    def test_transcribes_a_browser_recording(self):
        response = post(self.client, encode("webm", "libopus", 1.5))
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["text"], "tôm sú ba trăm rưỡi một ký")
        self.assertEqual(body["engine"], "fake-whisper")
        self.assertAlmostEqual(body["seconds"], 1.5, delta=0.2)

    def test_health(self):
        self.assertEqual(self.client.get("/health").json()["engine"], "fake-whisper")

    def test_a_file_that_is_not_audio_never_reaches_the_model(self):
        response = post(self.client, b"<html>" * 500, "evil.webm", "audio/webm")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(self.engine.heard, [])

    def test_silence_or_empty_text_is_422(self):
        client = TestClient(create_app(FakeEngine(text="   ")))
        self.assertEqual(post(client, wav_bytes()).status_code, 422)

    def test_a_model_failure_is_500_without_internal_details(self):
        client = TestClient(create_app(FakeEngine(fail=True)))
        response = post(client, wav_bytes())
        self.assertEqual(response.status_code, 500)
        self.assertNotIn("secret detail", response.text)

    def test_missing_file_field_is_rejected(self):
        self.assertEqual(self.client.post("/transcribe").status_code, 422)


class Token(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(create_app(FakeEngine(), token="s3cret"))

    def test_without_or_with_a_wrong_token_is_401(self):
        self.assertEqual(post(self.client, wav_bytes()).status_code, 401)
        self.assertEqual(post(self.client, wav_bytes(), headers={"X-AI-Token": "nope"}).status_code, 401)

    def test_with_the_right_token_it_works(self):
        self.assertEqual(post(self.client, wav_bytes(), headers={"X-AI-Token": "s3cret"}).status_code, 200)

    def test_no_token_configured_means_open_for_local_development(self):
        self.assertEqual(post(TestClient(create_app(FakeEngine())), wav_bytes()).status_code, 200)


if __name__ == "__main__":
    unittest.main()
