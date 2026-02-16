import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength } from "class-validator";

export class CreatePostDto {
    @ApiProperty({ example: 'Post content text' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(5000)
    content: string;

    @ApiPropertyOptional({ example: 'https://example.com/image.png' })
    @IsOptional()
    @IsUrl()
    imgUrl?: string;
}
