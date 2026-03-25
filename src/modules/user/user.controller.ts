import { Controller, Get, Post, Body, Patch, Param, Delete, ValidationPipe, UseGuards, Request, Req } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthGuard } from '../../common/guards/auth/auth.guard';
import type { AuthenticatedRequest, OptionalAuthRequest } from 'src/common/types/req-types';
import { OptionalAuthGuard } from 'src/common/guards/auth/optionalAuth.guard';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @UseGuards(OptionalAuthGuard)
  @Get('me')
  async findMe(@Req() req: OptionalAuthRequest) {
    const user = req.user;

    if (!user) return null;

    return this.userService.findOne({ id: user.sub });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne({ id });
  }
  @Patch(':id')
  @UseGuards(AuthGuard)
  update(@Param('id') id: string, @Body(ValidationPipe) updateUserDto: UpdateUserDto, @Request() req: AuthenticatedRequest) {
    return this.userService.update(id, updateUserDto, req.user.sub);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.userService.remove(id, req.user.sub);
  }
}
