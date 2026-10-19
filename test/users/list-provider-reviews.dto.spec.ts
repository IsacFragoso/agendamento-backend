import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ListProviderReviewsDto } from '../../src/modules/users/dto/list-provider-reviews.dto';

describe('ListProviderReviewsDto', () => {
  it('transforms and accepts valid pagination values', async () => {
    const dto = plainToInstance(ListProviderReviewsDto, { pagina: '2', limite: '5' });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.pagina).toBe(2);
    expect(dto.limite).toBe(5);
  });

  it('rejects pagination values outside the allowed bounds', async () => {
    const dto = plainToInstance(ListProviderReviewsDto, { pagina: '0', limite: '101' });

    expect(await validate(dto)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ property: 'pagina' }),
        expect.objectContaining({ property: 'limite' }),
      ]),
    );
  });
});
