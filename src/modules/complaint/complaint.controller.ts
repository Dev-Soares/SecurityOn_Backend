import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { ComplaintService } from './complaint.service';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { UpdateComplaintDto } from './dto/update-complaint.dto';
import { SearchComplaintDto } from './dto/search-complaint.dto';
import { AuthGuard } from 'src/common/guards/auth/auth.guard';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import type { AuthenticatedRequest } from 'src/common/types/req-types';

@Controller('complaint')
export class ComplaintController {
  constructor(private readonly complaintService: ComplaintService) {}

  @Post()
  @UseGuards(AuthGuard)
  create(@Body() createComplaintDto: CreateComplaintDto, @Request() req: AuthenticatedRequest) {
    return this.complaintService.create(createComplaintDto, req.user.sub);
  }

  @Get()
  findAll(@Query() query: PaginationDto) {
    return this.complaintService.findAll(query);
  }

  @Get('all/:id')
  findByUser(@Query() query: PaginationDto, @Param('id') id: string) {
    return this.complaintService.findByUser(query, id);
  }

  // Antes de @Get(':id'): o Nest casa na ordem de declaração e 'search' cairia
  // como id de denúncia.
  @Get('search')
  findByLink(@Query() query: SearchComplaintDto) {
    return this.complaintService.findByLink(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.complaintService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  update(@Param('id') id: string, @Body() updateComplaintDto: UpdateComplaintDto, @Request() req: AuthenticatedRequest) {
    return this.complaintService.update(id, updateComplaintDto, req.user.sub);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.complaintService.remove(id, req.user.sub);
  }
}
