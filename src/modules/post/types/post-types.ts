import { Post } from '@prisma/client';

export type PostCounts = {
  likes: number;
  comments: number;
};

// Recorte público do autor do post. Só o que o feed precisa para renderizar
// a assinatura, nada do resto do User vaza por aqui.
export type PostAuthor = {
  id: string;
  name: string;
};

// Resposta das rotas de leitura de post.
export type PostWithCounts = Post & {
  user: PostAuthor;
  _count: PostCounts;
  liked: boolean;
};

// Linha crua devolvida pelo Prisma. A relação likes é filtrada pelo usuário logado
// e não entra no include quando a requisição é anônima, daí ser opcional.
export type PostQueryRow = Post & {
  user: PostAuthor;
  _count: PostCounts;
  likes?: { id: string }[];
};
