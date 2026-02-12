export class CreateComplaintDto {
    content: string;
    authorId: string;
    author: {
        id: string;
        name: string;
        email: string;
    }
}
