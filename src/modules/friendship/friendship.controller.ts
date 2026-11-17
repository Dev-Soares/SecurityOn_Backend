import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { FriendshipService } from './friendship.service';
import { CreateFriendshipDto } from './dto/create-friendship.dto';
import { AuthGuard } from 'src/common/guards/auth/auth.guard';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import type { AuthenticatedRequest } from 'src/common/types/req-types';

@Controller('friendship')
export class FriendshipController {
  constructor(private readonly friendshipService: FriendshipService) {}

  @Post()
  @UseGuards(AuthGuard)
  create(
    @Body() createFriendshipDto: CreateFriendshipDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.friendshipService.create(createFriendshipDto, req.user.sub);
  }

  @Get('requests/received')
  @UseGuards(AuthGuard)
  findReceived(
    @Query() query: PaginationDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.friendshipService.findReceived(query, req.user.sub);
  }

  @Get('requests/sent')
  @UseGuards(AuthGuard)
  findSent(
    @Query() query: PaginationDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.friendshipService.findSent(query, req.user.sub);
  }

  @Get('status/:id')
  @UseGuards(AuthGuard)
  findStatus(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.friendshipService.findStatus(id, req.user.sub);
  }

  @Get('all/:id')
  findFriends(@Query() query: PaginationDto, @Param('id') id: string) {
    return this.friendshipService.findFriends(query, id);
  }

  @Patch(':id/accept')
  @UseGuards(AuthGuard)
  accept(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.friendshipService.accept(id, req.user.sub);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.friendshipService.remove(id, req.user.sub);
  }
}
