import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';

export interface UploadedImageFile {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

@Injectable()
export class CloudinaryService {
  constructor(configService: ConfigService) {
    const cloudName = configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = configService.get<string>('CLOUDINARY_API_SECRET');

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error('Cloudinary environment variables are not configured');
    }

    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
  }

  async uploadImage(file: UploadedImageFile, folder: string) {
    return new Promise<{ url: string; publicId: string }>((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          transformation: [{ width: 1600, height: 1600, crop: 'limit' }],
        },
        (error, result?: UploadApiResponse) => {
          if (error || !result) {
            reject(new InternalServerErrorException('Não foi possível armazenar a imagem'));
            return;
          }
          resolve({ url: result.secure_url, publicId: result.public_id });
        },
      );

      Readable.from(file.buffer).pipe(upload);
    });
  }
}
