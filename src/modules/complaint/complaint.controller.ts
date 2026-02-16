import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { ComplaintService } from './complaint.service';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { UpdateComplaintDto } from './dto/update-complaint.dto';
import { AuthGuard } from 'src/common/guards/auth/auth.guard';
import { GetComplaintDto } from './dto/get-complaint.dto';
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
  findAll(@Query() query: GetComplaintDto) {
    return this.complaintService.findAll(query);
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
