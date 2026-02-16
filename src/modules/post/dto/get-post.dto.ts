import { IsString, IsOptional } from "class-validator";

export class GetPostDto {
    @IsOptional()
    @IsString()
    cursor?: string;

    @IsOptional()
    @IsString()
    limit?: string;
}
