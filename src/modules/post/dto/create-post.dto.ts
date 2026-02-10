import { IsOptional, IsString } from "class-validator";

export class CreatePostDto {
    @IsString()
    content: string;

    @IsString()
    authorId: string;

    @IsOptional()
    @IsString()
    imgUrl?: string;
}
