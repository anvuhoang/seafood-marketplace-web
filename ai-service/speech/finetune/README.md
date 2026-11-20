# speech/finetune: regional-accent training and measurement

Does fine-tuning Whisper on Vietnamese speech from many provinces lower its word error
rate (WER) on those provinces? This folder holds the scripts to train and to measure it,
before and after, on public data. It runs on Colab, not on the web server.

It is the training half of the `speech` module. The half the web app calls is the service
in the parent folder (`../README.md`), which can serve the model produced here.

Shared rules for everything under `ai-service/` are in `../../README.md`.

## Data: ViMD

[ViMD](https://huggingface.co/datasets/nguyendv02/ViMD_Dataset) (Dinh et al., EMNLP 2024):
about 102 hours of read speech from the news of 63 provinces, 12,955 speakers.

| split | records | hours |
|---|---|---|
| train | 15,023 | 81.4 |
| valid | 1,900 | 10.3 |
| test | 2,026 | 10.9 |

- **Licence CC BY-NC-ND 4.0**: non-commercial, no derivatives. Fine for coursework and
  research; do not ship a model trained on it in a commercial product, and cite the paper.
- The whole dataset is about 60 GB, but its parquet files are grouped by province: one
  province lives in 1 to 3 files of about 0.4 to 0.5 GB. `shard_index.json` records which,
  and the scripts download only those files.
- Province names have no accents: `QuangNgai`, `KhanhHoa`, `BaRiaVungTau`, `NgheAn`,
  `ThuaThienHue`, ... The full list, with the region of each, is printed by `scan_shards.py`.

## Choosing provinces

Every script takes `--provinces` (or `--train-provinces`), and tokens can be mixed:

| Value | Meaning |
|---|---|
| `QuangNgai,KhanhHoa` | those provinces |
| `coastal` | the 28 coastal provinces (a seafood trade's home ground) |
| `region:Central` | every province of North, Central or South |
| `all` | all 63 |

`python plan_download.py --provinces coastal` shows what a choice would cost before you
download anything. Measured on the real files:

| Choice | Clips for training | Download (train+valid+test) |
|---|---|---|
| `QuangNgai,KhanhHoa,BaRiaVungTau` | 740 | 6.5 GB |
| `region:Central` (19 provinces) | 4,705 | 22.6 GB |
| `coastal` (28 provinces) | 6,778 | 36.8 GB |
| `all` | 15,023 | about 60 GB |

**Disk is the limit.** `datasets` keeps a converted copy next to the downloaded files, so
plan for about twice the download plus a few GB of features. Colab's free disk is about
70 GB, which fits `region:Central` but not `coastal` or `all`. Options for a larger
group: train on a part (for example `region:Central`) and **evaluate on all of `coastal`**
(only 5.4 GB for the test files), or use a runtime with more disk.

Do a **smoke test with the 3-province default first** (about 6.5 GB, a few minutes of
training) so a mistake shows up before you download 20 GB.

## Limits to state in the report
- **The test set is small per province**: about 26 to 43 clips (roughly 10 minutes). WER
  for one province moves a lot with a handful of clips, so also report the region or the
  group, and say how many clips each number is based on. With many provinces, the group
  numbers are the reliable ones.
- The speech is read news, not a vendor talking at a market, and it has no seafood or
  price vocabulary. Gains here show better listening to regional accents, not better
  product terms (the app handles those in its prompt and in the text it corrects).
- Whisper's pretraining already covers a lot of Vietnamese. The fair comparison is the
  same base model before and after, on the same clips. A fine-tuned Whisper small will
  probably not beat the Whisper large-v3-turbo that Groq serves; measure it and report it.

## How to run

The easy way is `dialect_asr_colab.ipynb` on Colab (GPU runtime). It clones the repo, so
the repository must be readable from Colab; if it is private, upload this folder to Drive.

Or run the steps yourself (Python 3.11 or 3.12; Colab already has torch):

```bash
pip install -r requirements.txt
python -m unittest test_vimd -v           # helpers only, no download

# 0. what will it cost? (shard_index.json is already committed; scan_shards.py rebuilds it)
python plan_download.py --provinces region:Central

# 1. baseline, before any training
python eval_wer.py --model openai/whisper-small --provinces coastal --name baseline-whisper-small
GROQ_API_KEY=... python eval_wer.py --model groq:whisper-large-v3-turbo --provinces coastal --limit 5 --name baseline-groq

# 2. fine-tune (GPU; about an hour for 1000 steps on a T4 with a few thousand clips)
python finetune.py --train-provinces region:Central --max-steps 1000

# 3. the same test clips again, with the new model
python eval_wer.py --model outputs/whisper-small-vimd --provinces coastal --name finetuned-whisper-small
```

`eval_wer.py` prints WER overall, per region and per province, and saves
`results/<name>-test.json`. Keep those files: they are the numbers for the report.
`--limit N` keeps N clips per province (use it for Groq, whose free tier allows about 20
requests a minute: 28 provinces x 5 clips = 140 clips = about 8 minutes).

Do not tune on `test`. `finetune.py` picks the best checkpoint on `valid`.

## Using the result in the app

The service in the parent folder already connects to Smart Import. To serve the model
saved by `finetune.py`, start it with `ASR_MODEL=/path/to/outputs/whisper-small-vimd`
(see `../README.md`). Do that only if the numbers here show a clear gain over Groq, and
check the licence above first: ViMD is non-commercial.
