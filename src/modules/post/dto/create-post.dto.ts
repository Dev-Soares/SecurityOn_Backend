import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from "class-validator";

export class CreatePostDto {
    @ApiProperty({ example: 'Post content text' })
    @IsString()
    content: string;

    @ApiProperty({ example: 'user-uuid-here' })
    @IsString()
    userId: string;

    @ApiPropertyOptional({ example: 'https://example.com/image.png' })
    @IsOptional()
    @IsString()
    imgUrl?: string;
}
