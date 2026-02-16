import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class CreateComplaintDto {

    @ApiProperty({ example: 'Complaint description text' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(5000)
    content: string;
}
