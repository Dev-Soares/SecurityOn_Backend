import { IsString } from "class-validator";

export class CreateComplaintDto {

    @IsString()
    content: string;

    @IsString()
    userId: string;
}
