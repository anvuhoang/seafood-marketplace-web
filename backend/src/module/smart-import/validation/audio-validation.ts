import { BadRequestException } from '@nestjs/common';

/** A short spoken description is well under this; it also keeps the AI call quick. */
export const AUDIO_MAX_BYTES = 5 * 1024 * 1024;
/** Smaller than this cannot hold any speech. */
const AUDIO_MIN_BYTES = 1_000;

export const AUDIO_INVALID = 'File ghi âm không hợp lệ. Vui lòng ghi âm lại.';
export const AUDIO_TOO_LARGE = 'File ghi âm quá lớn (tối đa 5MB). Hãy nói ngắn hơn.';
export const AUDIO_EMPTY = 'Không nhận được âm thanh. Vui lòng ghi âm lại.';

/** The file's real format, read from its first bytes; the declared type is not trusted. */
export type AudioFormat = 'webm' | 'ogg' | 'wav' | 'mp3' | 'mp4';

const ascii = (buffer: Buffer, start: number, end: number) =>
  buffer.toString('latin1', start, end);

export function detectAudioFormat(buffer: Buffer): AudioFormat | null {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) {
    return 'webm';
  }
  if (ascii(buffer, 0, 4) === 'OggS') return 'ogg';
  if (ascii(buffer, 0, 4) === 'RIFF' && ascii(buffer, 8, 12) === 'WAVE') return 'wav';
  if (ascii(buffer, 0, 3) === 'ID3' || (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0)) {
    return 'mp3';
  }
  if (ascii(buffer, 4, 8) === 'ftyp') return 'mp4';
  return null;
}

const FORMAT_FILES: Record<AudioFormat, { extension: string; mimeType: string }> = {
  webm: { extension: 'webm', mimeType: 'audio/webm' },
  ogg: { extension: 'ogg', mimeType: 'audio/ogg' },
  wav: { extension: 'wav', mimeType: 'audio/wav' },
  mp3: { extension: 'mp3', mimeType: 'audio/mpeg' },
  mp4: { extension: 'm4a', mimeType: 'audio/mp4' },
};

export interface ValidAudio {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}

/**
 * Accepts a recording only when it is small enough and really is audio. The
 * name and type sent to the AI come from the detected format, never from the
 * client, and nothing is written to disk.
 */
export function validateAudio(file: { buffer?: Buffer } | undefined): ValidAudio {
  const buffer = file?.buffer;
  if (!buffer || buffer.length === 0) throw new BadRequestException(AUDIO_EMPTY);
  if (buffer.length > AUDIO_MAX_BYTES) throw new BadRequestException(AUDIO_TOO_LARGE);
  if (buffer.length < AUDIO_MIN_BYTES) throw new BadRequestException(AUDIO_EMPTY);

  const format = detectAudioFormat(buffer);
  if (!format) throw new BadRequestException(AUDIO_INVALID);

  const { extension, mimeType } = FORMAT_FILES[format];
  return { buffer, filename: `recording.${extension}`, mimeType };
}
