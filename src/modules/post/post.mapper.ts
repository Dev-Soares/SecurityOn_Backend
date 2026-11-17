import { Prisma } from '@prisma/client';
import { PostQueryRow, PostWithCounts } from './types/post-types';

const counts = { _count: { select: { likes: true, comments: true } } };

// Include das rotas de leitura de post.
// Para usuário autenticado acrescenta a relação likes filtrada por ele, com take 1:
// é o que responde "curtido por mim" na mesma query do post.
// Para usuário anônimo a relação não entra no include, então o banco não avalia
// subconsulta nenhuma e o liked já é falso por construção.
export const postReadInclude = (userId: string | null): Prisma.PostInclude =>
  userId
    ? {
        ...counts,
        likes: { where: { userId: userId }, select: { id: true }, take: 1 },
      }
    : counts;

// A relação likes existe só para responder "curtido por mim" — é achatada em liked
// e não vai na resposta.
export const toPostWithCounts = (row: PostQueryRow): PostWithCounts => {
  const { likes, ...post } = row;
  return { ...post, liked: Boolean(likes?.length) };
};
