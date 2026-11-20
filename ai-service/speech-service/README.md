# speech-service

A small Python (FastAPI) service that turns a short voice recording into text with a
Whisper model **we host**. The NestJS backend calls it for Smart Import when
`SMART_IMPORT_SPEECH_PROVIDER=local`; if it is down or too slow, the backend falls back
to Groq, so the feature never dead-ends.

```
browser  ->  NestJS /vendors/me/smart-import/transcribe  ->  speech-service /transcribe  ->  Whisper
                                      \__ on failure __>  Groq Whisper
```

Only the backend should reach it: bind it to localhost and set a shared token.

## Run it

Python 3.11 or 3.12 (not 3.14), in its own virtual environment:

```bash
cd ai-service/speech-service
python -m venv .venv && . .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install torch                                   # pick the build for your machine: https://pytorch.org
pip install -r requirements.txt

export AI_SERVICE_TOKEN=change-me                   # Windows PowerShell: $env:AI_SERVICE_TOKEN="change-me"
export ASR_MODEL=openai/whisper-small               # or a folder saved by asr-finetune/finetune.py
uvicorn main:app --host 127.0.0.1 --port 8000
```

The model downloads and loads on the first request (about half a minute for Whisper
small on CPU), so the first recording is slow; the backend waits `AI_SERVICE_TIMEOUT_MS`
(30 s by default) and then uses Groq.

Then in `backend/.env`:

```
SMART_IMPORT_SPEECH_PROVIDER=local
AI_SERVICE_URL=http://localhost:8000
AI_SERVICE_TOKEN=change-me          # the same value
```

Speech uses this service; turning the text into a product draft still uses
`SMART_IMPORT_PROVIDER` (Groq), so keep `GROQ_API_KEY` set. The vendor sees which engine
heard them under the text box ("Whisper tự host: whisper-small" or "Groq").

## API

| | |
|---|---|
| `POST /transcribe` | multipart, one file field `audio` (webm/opus, ogg, wav, mp3 or m4a, up to 5 MB and 60 s). Returns `{"text", "engine", "seconds"}`. |
| `GET /health` | `{"status": "ok", "engine": "...", "loaded": false}` (`loaded` turns true after the first recording). |

Errors: 400 not readable audio, 413 too large, 422 too short, too long or no speech
recognised, 401 wrong token, 500 model failure (no details in the answer).

The recording is decoded in memory and dropped. Nothing is written to disk and the text is not logged.

## Serving the fine-tuned model

Train with `../asr-finetune` (Colab), download the saved folder, and start with
`ASR_MODEL=/path/to/whisper-small-vimd`. Nothing else changes. Only do this if the
numbers from `asr-finetune` show a clear gain over Groq, and check the licence of the
training data (ViMD is CC BY-NC-ND 4.0, non-commercial).

## Tests

```bash
python -m unittest test_service -v     # fake model, real webm/opus/wav recordings, no torch needed
```

## Limits

- On a laptop CPU, Whisper small takes several seconds for a short clip and is usually
  less accurate than the larger Whisper Groq serves. This service exists so the project
  can run, and later improve, a model of its own; keep Groq as the default until it wins.
- One request at a time per process is the safe assumption on a small machine.
