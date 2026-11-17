import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ example: '9f1b6d7c-2e3a-4b5c-8d9e-0f1a2b3c4d5e' })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  postId: string;

  @ApiProperty({ example: 'Comment content text' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;
}
