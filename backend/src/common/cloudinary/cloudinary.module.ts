import { Module } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service.js';

/** Signed direct uploads to Cloudinary, shared by reviews and vendor stores. */
@Module({
  providers: [CloudinaryService],
  exports: [CloudinaryService],
})
export class CloudinaryModule {}
