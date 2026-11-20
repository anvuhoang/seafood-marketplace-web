# ai-service

Python side of the project: anything that runs a model of our own, instead of calling
an AI service over HTTP (that is done from the NestJS backend, for example Smart Import
in `backend/src/module/smart-import`).

Each module lives in its own sub-folder with its own README and requirements, so they
do not get in each other's way. This folder only holds what they share.

| Folder | What it is |
|---|---|
| `speech/` | Speech recognition for Smart Import's voice input: a FastAPI service the backend calls, and (in `speech/finetune/`) the Colab scripts that train and measure a better Whisper on regional Vietnamese speech. |

Add your module as a new sub-folder (for example `visual-search/`) rather than putting
files directly in this folder.

## Shared rules

- Use Python 3.11 or 3.12 for machine-learning packages; 3.14 is too new for most of them.
- One virtual environment per module (`python -m venv .venv`, already git-ignored).
- Never commit datasets, audio, images, model weights or API keys. The `.gitignore` here
  covers `data/`, `outputs/`, `.cache/`, `.env` and common model file types; keep
  anything else of that kind out of git too.
- Check the licence of every dataset and pretrained model before using it, and note it
  in the module's README.
- Training happens on Colab or Kaggle (a laptop with 4 GB of GPU memory is only good for
  small checks). The backend talks to a model through a small adapter, so a model can be
  swapped without changing the API or the screens.
