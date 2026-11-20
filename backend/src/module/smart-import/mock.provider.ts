import { Injectable } from '@nestjs/common';
import { parseVietnameseAmount } from './normalize-draft.js';
import {
  AiProviderError,
  type DraftExtractor,
  type ExtractionContext,
  type SpeechToText,
} from './smart-import.types.js';

const SAMPLE_TRANSCRIPT =
  'Tôm sú size 30 con một ký, giá 350 nghìn một ký, còn 40 ký, bắt sáng nay ở Cà Mau';

/**
 * A stand-in that needs no key (SMART_IMPORT_PROVIDER=mock), so the screens and
 * the save flow can be tried offline. It reads simple sentences with patterns;
 * the real model is far better. Never used unless asked for.
 */
@Injectable()
export class MockProvider implements SpeechToText, DraftExtractor {
  transcribe(): Promise<string> {
    return Promise.resolve(SAMPLE_TRANSCRIPT);
  }

  extract(text: string, context: ExtractionContext): Promise<unknown> {
    const lower = text.toLowerCase();

    const price = /(\d[\d.,]*\s*(?:k|nghìn|ngàn|triệu|tr)\b)/.exec(lower)?.[1];
    const stock = /(?:còn|có)\s*(\d+(?:[.,]\d+)?)/.exec(lower)?.[1];
    // "30 con một ký" is sold by the kilo, so weight words win over "con".
    const unit =
      /\b(kg|ký|kí|cân)(?![\p{L}])/u.exec(lower)?.[1] ??
      /\b(hộp|con)(?![\p{L}])/u.exec(lower)?.[1] ??
      null;
    const size = /size\s*(\d+)/.exec(lower)?.[1];
    // The product name is whatever comes before the first number or comma.
    const name = /^[^\d,]+/.exec(text.trim())?.[0].replace(/\bsize\b/i, '').trim() || null;
    const category = context.categories.find((item) =>
      lower.includes(item.name.toLowerCase()),
    );

    if (!name && !price && !stock) {
      return Promise.reject(new AiProviderError('bad_response', 'Nothing to read.'));
    }

    return Promise.resolve({
      name,
      description: null,
      categoryId: category?.id ?? null,
      variants: [
        {
          name: size ? `Size ${size}` : null,
          unit,
          sizeLabel: size ? `${size} con/kg` : null,
          price: price ? parseVietnameseAmount(price) : null,
          stock: stock ? Number(stock.replace(',', '.')) : null,
        },
      ],
    });
  }
}
