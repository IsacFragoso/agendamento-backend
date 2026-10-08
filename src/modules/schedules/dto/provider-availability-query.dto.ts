import { Type } from 'class-transformer';
import { IsDateString, IsInt, Min } from 'class-validator';

export class ProviderAvailabilityQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  servico_id: number;

  @IsDateString({ strict: true })
  data: string;
}