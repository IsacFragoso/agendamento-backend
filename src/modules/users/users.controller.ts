import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Req,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  ParseFilePipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { AdminGuard } from '../auth/strategies/admin.guard';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { BecomeProviderDto } from './dto/become-provider.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { UpsertPerfilPrestadorDto } from './dto/upsert-perfil-prestador.dto';
import { UsersService } from './users.service';
import { UploadedImageFile } from '../../common/storage/cloudinary.service';

@Controller('usuarios')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() dto: CreateUsuarioDto) {
    return this.usersService.create(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, AdminGuard)
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id', ParseIntPipe) id: number, @Req() request: Request) {
    const user = request.user as { sub: number; tipo_conta: string };
    return this.usersService.findOne(id, user.sub, user.tipo_conta);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUsuarioDto,
    @Req() request: Request,
  ) {
    const user = request.user as { sub: number; tipo_conta: string };
    return this.usersService.update(id, dto, user.sub, user.tipo_conta);
  }

  @Patch(':id/senha')
  @UseGuards(JwtAuthGuard)
  changePassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangePasswordDto,
    @Req() request: Request,
  ) {
    const user = request.user as { sub: number; tipo_conta: string };
    return this.usersService.changePassword(id, dto, user.sub, user.tipo_conta);
  }

  @Post(':id/tornar-prestador')
  @UseGuards(JwtAuthGuard)
  becomeProvider(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: BecomeProviderDto,
    @Req() request: Request,
  ) {
    const user = request.user as { sub: number; tipo_conta: string };
    return this.usersService.becomeProvider(id, dto, user.sub, user.tipo_conta);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id', ParseIntPipe) id: number, @Req() request: Request) {
    const user = request.user as { sub: number; tipo_conta: string };
    return this.usersService.remove(id, user.sub, user.tipo_conta);
  }

  @Post(':id/foto-perfil')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  uploadProfilePhoto(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /^image\/(jpeg|png|webp)$/ }),
        ],
      }),
    )
    file: UploadedImageFile,
    @Req() request: Request,
  ) {
    const user = request.user as { sub: number; tipo_conta: string };
    return this.usersService.uploadProfilePhoto(id, file, user.sub, user.tipo_conta);
  }

  @Post(':id/banner')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  uploadProviderBanner(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /^image\/(jpeg|png|webp)$/ }),
        ],
      }),
    )
    file: UploadedImageFile,
    @Req() request: Request,
  ) {
    const user = request.user as { sub: number; tipo_conta: string };
    return this.usersService.uploadProviderBanner(id, file, user.sub, user.tipo_conta);
  }

  @Put(':id/perfil-prestador')
  @UseGuards(JwtAuthGuard)
  upsertProfile(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpsertPerfilPrestadorDto,
    @Req() request: Request,
  ) {
    const user = request.user as { sub: number; tipo_conta: string };
    return this.usersService.upsertProfile(id, dto, user.sub, user.tipo_conta);
  }
}
