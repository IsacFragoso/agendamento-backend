import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateSuggestionDto {
  @IsString()
  @MinLength(2)
  @MaxLength(2000)
  sugestao: string;
}
