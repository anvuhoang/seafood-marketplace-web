"""Step 2 and 4: measure the word error rate (WER) of a speech model, per province and per region.

    # A Whisper model from the Hub or a folder saved by finetune.py (needs a GPU for speed)
    python eval_wer.py --model openai/whisper-small --provinces QuangNgai,KhanhHoa,BaRiaVungTau
    python eval_wer.py --model outputs/whisper-small-vimd --provinces QuangNgai,KhanhHoa,BaRiaVungTau

    # The model the app uses today, through Groq (free tier, about 20 requests a minute)
    GROQ_API_KEY=... python eval_wer.py --model groq:whisper-large-v3-turbo --provinces QuangNgai --limit 30

Both sides are normalised the same way (see vimd.normalize_text) before comparing.
Results are printed and saved to results/<name>.json so before/after runs can be compared.
"""

from __future__ import annotations

import argparse
import io
import json
import os
import time
from collections import defaultdict
from pathlib import Path

from vimd import DEFAULT_PROVINCES, ROOT, SAMPLE_RATE, load_subset, normalize_text, parse_provinces

RESULTS_DIR = ROOT / "results"


def corpus_wer(pairs: list[tuple[str, str]]) -> float:
    """WER over a group: total word errors divided by total reference words (not an average of averages)."""
    import jiwer

    pairs = [(ref, hyp) for ref, hyp in pairs if ref]
    if not pairs:
        return float("nan")
    return jiwer.wer([ref for ref, _ in pairs], [hyp for _, hyp in pairs])


def transcribe_with_whisper(model_name: str, samples: list[dict], batch_size: int) -> list[str]:
    import torch
    from transformers import pipeline

    asr = pipeline(
        "automatic-speech-recognition",
        model=model_name,
        device=0 if torch.cuda.is_available() else -1,
        torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
        chunk_length_s=30,
    )
    inputs = [{"raw": s["audio"]["array"], "sampling_rate": SAMPLE_RATE} for s in samples]
    outputs = asr(inputs, batch_size=batch_size, generate_kwargs={"language": "vi", "task": "transcribe"})
    return [o["text"] for o in outputs]


def transcribe_with_groq(model: str, samples: list[dict]) -> list[str]:
    """One request per clip, slowly enough for the free tier. The clips are from a public dataset."""
    import requests
    import soundfile

    key = os.environ.get("GROQ_API_KEY")
    if not key:
        raise SystemExit("Set GROQ_API_KEY to evaluate a Groq model.")

    texts = []
    for number, sample in enumerate(samples, 1):
        buffer = io.BytesIO()
        soundfile.write(buffer, sample["audio"]["array"], SAMPLE_RATE, format="WAV")
        for attempt in range(6):
            response = requests.post(
                "https://api.groq.com/openai/v1/audio/transcriptions",
                headers={"Authorization": f"Bearer {key}"},
                files={"file": ("clip.wav", buffer.getvalue(), "audio/wav")},
                data={"model": model, "language": "vi", "response_format": "json", "temperature": "0"},
                timeout=60,
            )
            if response.status_code == 429:
                time.sleep(5 * (attempt + 1))
                continue
            response.raise_for_status()
            texts.append(response.json()["text"])
            break
        else:
            raise SystemExit(f"Groq kept answering 429 at clip {number}; try again later or lower --limit.")
        print(f"  groq {number}/{len(samples)}", end="\r", flush=True)
        time.sleep(3.2)  # stay under 20 requests a minute
    print()
    return texts


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--model", required=True, help="Hub id, local folder, or groq:<model>")
    parser.add_argument("--provinces", default=DEFAULT_PROVINCES, help="names, coastal, region:Central or all (see vimd.py)")
    parser.add_argument("--split", default="test", choices=("valid", "test"))
    parser.add_argument("--limit", type=int, default=0, help="clips per province (0 = all)")
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--name", default="", help="result file name (default: derived from the model)")
    args = parser.parse_args()

    provinces = parse_provinces(args.provinces)
    dataset = load_subset(args.split, provinces)

    samples, seen = [], defaultdict(int)
    for row in dataset:
        if args.limit and seen[row["province_name"]] >= args.limit:
            continue
        seen[row["province_name"]] += 1
        samples.append(row)
    print(f"Evaluating {len(samples)} clips from {len(seen)} provinces with {args.model}")

    if args.model.startswith("groq:"):
        hypotheses = transcribe_with_groq(args.model.split(":", 1)[1], samples)
    else:
        hypotheses = transcribe_with_whisper(args.model, samples, args.batch_size)

    by_province: dict[str, list] = defaultdict(list)
    by_region: dict[str, list] = defaultdict(list)
    everything: list = []
    examples = []
    for row, hypothesis in zip(samples, hypotheses):
        pair = (normalize_text(row["text"]), normalize_text(hypothesis))
        by_province[row["province_name"]].append(pair)
        by_region[row["region"]].append(pair)
        everything.append(pair)
        if len(examples) < 8 and pair[0] != pair[1]:
            examples.append({"province": row["province_name"], "reference": pair[0], "hypothesis": pair[1]})

    result = {
        "model": args.model,
        "split": args.split,
        "clips": len(samples),
        "overall_wer": corpus_wer(everything),
        "by_region": {k: {"clips": len(v), "wer": corpus_wer(v)} for k, v in sorted(by_region.items())},
        "by_province": {k: {"clips": len(v), "wer": corpus_wer(v)} for k, v in sorted(by_province.items())},
        "examples": examples,
    }

    print(f"\nOverall WER: {result['overall_wer']:.1%} ({len(samples)} clips)")
    for name, group in (("region", result["by_region"]), ("province", result["by_province"])):
        for key, value in group.items():
            print(f"  {name:<9}{key:<18}{value['wer']:>7.1%}  ({value['clips']} clips)")

    RESULTS_DIR.mkdir(exist_ok=True)
    name = args.name or Path(args.model.replace(":", "-")).name
    out = RESULTS_DIR / f"{name}-{args.split}.json"
    out.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nSaved {out}")


if __name__ == "__main__":
    main()
