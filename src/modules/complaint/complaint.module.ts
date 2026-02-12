import { Module } from '@nestjs/common';
import { ComplaintService } from './complaint.service';
import { ComplaintController } from './complaint.controller';
import { PrismaService } from '../database/prisma.service';

@Module({
  controllers: [ComplaintController],
  providers: [ComplaintService],
  imports: [ PrismaService ],
})
export class ComplaintModule {}
