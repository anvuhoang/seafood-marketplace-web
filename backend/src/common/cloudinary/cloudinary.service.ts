import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';

/** Root folder for every upload this app signs. */
export const CLOUDINARY_FOLDER_ROOT = 'haisan-express';
export const CLOUDINARY_ALLOWED_FORMATS = 'jpg,jpeg,png,webp';
export const CLOUDINARY_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export interface CloudinarySettings {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

/** Fields the browser needs for one signed direct upload (multipart POST to uploadUrl). */
export interface CloudinaryUploadSignature {
  uploadUrl: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  allowedFormats: string;
  maxFileSizeBytes: number;
}

/**
 * Cloudinary API signature: SHA-1 of the sorted `key=value` pairs joined by
 * `&`, followed by the API secret.
 */
export function signCloudinaryParams(params: Record<string, string | number>, apiSecret: string): string {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  return createHash('sha1').update(payload + apiSecret).digest('hex');
}

/**
 * Signs direct browser uploads into a fixed folder and checks that a URL sent
 * back by the client really is an image uploaded into that folder on our cloud.
 */
@Injectable()
export class CloudinaryService {
  constructor(private readonly config: ConfigService) {}

  /** Settings when all three values are present, otherwise null. */
  settings(): CloudinarySettings | null {
    const settings = this.config.get<CloudinarySettings>('cloudinary');
    return settings?.cloudName && settings.apiKey && settings.apiSecret ? settings : null;
  }

  isEnabled(): boolean {
    return this.settings() !== null;
  }

  /** Signature for one upload into `folder`. 503 until Cloudinary is configured. */
  createUploadSignature(folder: string): CloudinaryUploadSignature {
    const cloudinary = this.settings();
    if (!cloudinary) {
      throw new ServiceUnavailableException('Chức năng tải ảnh chưa được cấu hình.');
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const signature = signCloudinaryParams(
      { allowed_formats: CLOUDINARY_ALLOWED_FORMATS, folder, timestamp },
      cloudinary.apiSecret,
    );

    return {
      uploadUrl: `https://api.cloudinary.com/v1_1/${cloudinary.cloudName}/image/upload`,
      apiKey: cloudinary.apiKey,
      timestamp,
      signature,
      folder,
      allowedFormats: CLOUDINARY_ALLOWED_FORMATS,
      maxFileSizeBytes: CLOUDINARY_IMAGE_MAX_BYTES,
    };
  }

  /**
   * True only for `https://res.cloudinary.com/<our cloud>/image/upload/[v123/]<folder>/<file>.<ext>`
   * where the file sits directly in `folder` (no nested path) and has an allowed extension.
   */
  isUploadedImageInFolder(url: string, folder: string): boolean {
    const cloudinary = this.settings();
    if (!cloudinary) return false;
    const prefix = `https://res.cloudinary.com/${cloudinary.cloudName}/image/upload/`;
    if (!url.startsWith(prefix)) return false;
    // Optional version segment, then the folder, then a single file name.
    const rest = url.slice(prefix.length).replace(/^v\d+\//, '');
    const folderPrefix = `${folder}/`;
    return rest.startsWith(folderPrefix) && /^[\w-]+\.(jpe?g|png|webp)$/i.test(rest.slice(folderPrefix.length));
  }
}
