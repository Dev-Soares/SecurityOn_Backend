import { IsString, IsOptional } from "class-validator";

export class GetArticleDto {
    @IsOptional()
    @IsString()
    cursor?: string;

    @IsOptional()
    @IsString()
    limit?: string;
}
