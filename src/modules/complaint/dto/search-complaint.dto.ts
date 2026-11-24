import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SearchComplaintDto {

    @ApiProperty({
        example: 'https://loja-falsa-exemplo.com/produto/1',
        description: 'Endereço do site a verificar. Protocolo opcional.',
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(2048)
    url: string;
}
