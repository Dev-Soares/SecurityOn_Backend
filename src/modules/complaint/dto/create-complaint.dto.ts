import { ApiProperty } from '@nestjs/swagger';
import { IsString } from "class-validator";

export class CreateComplaintDto {

    @ApiProperty({ example: 'Complaint description text' })
    @IsString()
    content: string;
}
