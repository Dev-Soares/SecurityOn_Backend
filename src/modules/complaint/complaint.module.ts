import { Module } from '@nestjs/common';
import { ComplaintService } from './complaint.service';
import { ComplaintController } from './complaint.controller';
import { DatabaseModule } from '../database/database.module';
import { JwtModule } from '@nestjs/jwt';
import { AuthGuardModule } from 'src/common/guards/auth/auth.module';

@Module({
  controllers: [ComplaintController],
  providers: [ComplaintService],
  imports: [DatabaseModule, JwtModule, AuthGuardModule],
})
export class ComplaintModule {}
