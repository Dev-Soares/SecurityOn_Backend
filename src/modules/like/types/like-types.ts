import { Like } from '@prisma/client';

export type LikeWithUser = Like & { user: { id: string; name: string } };

// Estado da curtida devolvido pelas mutações, para o cliente não precisar de uma
// requisição de follow-up só para descobrir o novo total.
export type LikeStatus = {
  postId: string;
  total: number;
  liked: boolean;
};
