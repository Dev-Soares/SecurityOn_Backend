import { Comment } from '@prisma/client';

export type CommentWithUser = Comment & { user: { id: string; name: string } };
