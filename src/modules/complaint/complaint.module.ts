import { Module } from '@nestjs/common';
import { ComplaintService } from './complaint.service';
import { ComplaintController } from './complaint.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  controllers: [ComplaintController],
  providers: [ComplaintService],
  imports: [DatabaseModule],
})
export class ComplaintModule {}
