import { Post } from '@prisma/client';

export type PostCounts = {
  likes: number;
};

// Resposta das rotas de leitura de post.
export type PostWithCounts = Post & {
  _count: PostCounts;
  liked: boolean;
};

// Linha crua devolvida pelo Prisma. A relação likes é filtrada pelo usuário logado
// e não entra no include quando a requisição é anônima — daí ser opcional.
export type PostQueryRow = Post & {
  _count: PostCounts;
  likes?: { id: string }[];
};
