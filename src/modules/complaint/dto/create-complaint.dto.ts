import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from "class-validator";

export class CreateComplaintDto {

    @ApiProperty({ example: 'Complaint description text' })
    @IsString()
    @IsNotEmpty()
    content: string;
}
