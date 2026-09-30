import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateServicoDto } from '../../src/modules/services/dto/update-servico.dto';

describe('UpdateServicoDto', () => {
  it.each([true, false])('accepts boolean ativo value %s after transformation', async (ativo) => {
    const dto = plainToInstance(UpdateServicoDto, { ativo });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });
});
