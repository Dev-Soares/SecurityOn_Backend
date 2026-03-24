import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateComplaintDto {

    @ApiProperty({ example: 'Golpe no site falso' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    title: string;

    @ApiProperty({ example: 'Complaint description text' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(5000)
    content: string;

    @ApiProperty({ example: 'aviso', required: false })
    @IsString()
    @IsOptional()
    danger?: string;

    @ApiProperty({ example: 'Loja X', required: false })
    @IsString()
    @IsOptional()
    store?: string;

    @ApiProperty({ example: 'https://exemplo.com', required: false })
    @IsString()
    @IsOptional()
    link?: string;
}
