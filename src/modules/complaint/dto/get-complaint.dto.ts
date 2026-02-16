import { IsString, IsOptional } from "class-validator";

export class GetComplaintDto {
    @IsOptional()
    @IsString()
    cursor?: string;

    @IsOptional()
    @IsString()
    limit?: string;
}