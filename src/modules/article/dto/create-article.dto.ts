import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateArticleDto {
    @ApiProperty({ example: 'Article title' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    title: string;

    @ApiProperty({ example: 'Article content text' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(5000)
    content: string;

    @IsString()
    @IsOptional()
    bgUrl?: string;
}
