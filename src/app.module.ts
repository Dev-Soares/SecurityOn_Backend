import { Module } from '@nestjs/common';
import { DatabaseModule } from './modules/database/database.module';
import { UserModule } from './modules/user/user.module';
import { PostModule } from './modules/post/post.module';
import { ComplaintModule } from './modules/complaint/complaint.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [DatabaseModule, UserModule, PostModule, ComplaintModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
