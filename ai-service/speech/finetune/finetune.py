"""Step 3: fine-tune Whisper on ViMD speech from the chosen provinces.

Meant for a Colab/Kaggle GPU (about 16 GB). The 4 GB card in a laptop is only good for small checks.

    python finetune.py --train-provinces QuangNgai,KhanhHoa,BaRiaVungTau --max-steps 1000

Train on the provinces you care about, plus a few others if you want the model to keep
its general ability (the more provinces, the more files to download: about 0.4 GB each).
Validation uses the `valid` split of the same provinces. Do not tune on `test`; keep it
for the final before/after comparison made with eval_wer.py.
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from typing import Any

from vimd import DEFAULT_PROVINCES, ROOT, SAMPLE_RATE, load_subset, normalize_text, parse_provinces

MAX_SECONDS = 30  # Whisper reads at most 30 s of audio at a time


@dataclass
class SpeechCollator:
    """Pads audio features and label ids to the longest item in the batch."""

    processor: Any
    decoder_start_token_id: int

    def __call__(self, features: list[dict]) -> dict:
        import torch

        batch = self.processor.feature_extractor.pad(
            [{"input_features": f["input_features"]} for f in features], return_tensors="pt"
        )
        labels = self.processor.tokenizer.pad([{"input_ids": f["labels"]} for f in features], return_tensors="pt")
        ids = labels["input_ids"].masked_fill(labels.attention_mask.ne(1), -100)
        # The model adds the start token itself when it shifts the labels.
        if (ids[:, 0] == self.decoder_start_token_id).all().cpu().item():
            ids = ids[:, 1:]
        batch["labels"] = ids
        return batch


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--base-model", default="openai/whisper-small")
    parser.add_argument("--train-provinces", default=DEFAULT_PROVINCES, help="names, coastal, region:Central or all (60 GB!)")
    parser.add_argument("--output-dir", default=str(ROOT / "outputs" / "whisper-small-vimd"))
    parser.add_argument("--max-steps", type=int, default=1000)
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--grad-accum", type=int, default=2)
    parser.add_argument("--learning-rate", type=float, default=1e-5)
    parser.add_argument("--eval-steps", type=int, default=200)
    args = parser.parse_args()

    import jiwer
    from transformers import (
        Seq2SeqTrainer,
        Seq2SeqTrainingArguments,
        WhisperForConditionalGeneration,
        WhisperProcessor,
    )

    provinces = parse_provinces(args.train_provinces)
    processor = WhisperProcessor.from_pretrained(args.base_model, language="vietnamese", task="transcribe")
    model = WhisperForConditionalGeneration.from_pretrained(args.base_model)
    model.generation_config.language = "vi"
    model.generation_config.task = "transcribe"
    model.generation_config.forced_decoder_ids = None
    model.config.use_cache = False  # needed with gradient checkpointing

    def prepare(row: dict) -> dict:
        audio = row["audio"]
        row["input_features"] = processor.feature_extractor(audio["array"], sampling_rate=SAMPLE_RATE).input_features[0]
        row["seconds"] = len(audio["array"]) / SAMPLE_RATE
        # Train on the text as written (case and punctuation help Whisper); WER ignores them later.
        row["labels"] = processor.tokenizer(row["text"].strip()).input_ids
        return row

    def load(split: str):
        data = load_subset(split, provinces)
        data = data.map(prepare, remove_columns=[c for c in data.column_names if c != "audio"], desc=f"features {split}")
        data = data.filter(lambda seconds: seconds <= MAX_SECONDS, input_columns="seconds")
        return data.remove_columns(["audio", "seconds"])

    train, valid = load("train"), load("valid")
    print(f"train clips: {len(train)}  valid clips: {len(valid)}")

    def compute_metrics(pred) -> dict:
        label_ids = pred.label_ids
        label_ids[label_ids == -100] = processor.tokenizer.pad_token_id
        hypotheses = processor.tokenizer.batch_decode(pred.predictions, skip_special_tokens=True)
        references = processor.tokenizer.batch_decode(label_ids, skip_special_tokens=True)
        pairs = [(normalize_text(r), normalize_text(h)) for r, h in zip(references, hypotheses)]
        pairs = [(r, h) for r, h in pairs if r]
        return {"wer": jiwer.wer([r for r, _ in pairs], [h for _, h in pairs])}

    arguments = Seq2SeqTrainingArguments(
        output_dir=args.output_dir,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=args.batch_size,
        gradient_accumulation_steps=args.grad_accum,
        learning_rate=args.learning_rate,
        warmup_steps=min(50, args.max_steps // 10),
        max_steps=args.max_steps,
        gradient_checkpointing=True,
        fp16=True,
        eval_strategy="steps",
        eval_steps=args.eval_steps,
        save_steps=args.eval_steps,
        save_total_limit=2,
        logging_steps=25,
        predict_with_generate=True,
        generation_max_length=225,
        load_best_model_at_end=True,
        metric_for_best_model="wer",
        greater_is_better=False,
        report_to=[],
    )
    trainer = Seq2SeqTrainer(
        model=model,
        args=arguments,
        train_dataset=train,
        eval_dataset=valid,
        data_collator=SpeechCollator(processor, model.config.decoder_start_token_id),
        compute_metrics=compute_metrics,
        processing_class=processor.feature_extractor,
    )
    trainer.train()
    trainer.save_model(args.output_dir)
    processor.save_pretrained(args.output_dir)
    print(f"Saved the best model to {args.output_dir}")


if __name__ == "__main__":
    main()
