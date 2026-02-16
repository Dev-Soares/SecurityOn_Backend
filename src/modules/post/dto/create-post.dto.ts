import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUrl } from "class-validator";

export class CreatePostDto {
    @ApiProperty({ example: 'Post content text' })
    @IsString()
    @IsNotEmpty()
    content: string;

    @ApiPropertyOptional({ example: 'https://example.com/image.png' })
    @IsOptional()
    @IsUrl()
    imgUrl?: string;
}
