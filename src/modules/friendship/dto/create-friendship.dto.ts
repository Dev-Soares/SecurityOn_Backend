import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateFriendshipDto {
  @ApiProperty({ example: '9f1b6d7c-2e3a-4b5c-8d9e-0f1a2b3c4d5e' })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  addresseeId: string;
}
