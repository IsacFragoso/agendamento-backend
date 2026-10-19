import { ServiceUnavailableException } from '@nestjs/common';
import { CloudinaryService } from '../../src/common/storage/cloudinary.service';

describe('CloudinaryService', () => {
  it('allows startup without credentials and rejects image uploads', async () => {
    const configService = { get: jest.fn().mockReturnValue(undefined) };
    const service = new CloudinaryService(configService as any);

    await expect(
      service.uploadImage({ buffer: Buffer.from('image'), mimetype: 'image/png', size: 5 }, 'test'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
