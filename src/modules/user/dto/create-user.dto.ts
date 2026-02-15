import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class CreateUserDto {
    @ApiProperty({ example: 'user@email.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'strongPassword123' })
    @IsString()
    password: string;

    @ApiProperty({ example: 'John Doe' })
    @IsString()
    name: string;
}
