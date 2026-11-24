import { Prisma } from '@prisma/client';
import { PostQueryRow, PostWithCounts } from './types/post-types';

const counts = { _count: { select: { likes: true, comments: true } } };

// O autor vem junto do post. Sem isso o front precisa de um GET /user por post
// renderizado para ter o nome de quem escreveu, o N+1 clássico.
// Só id e name: o resto do User (email, password) é dado privado e não cabe num feed.
const author = { user: { select: { id: true, name: true } } };

// Include das rotas de leitura de post.
// Para usuário autenticado acrescenta a relação likes filtrada por ele, com take 1:
// é o que responde "curtido por mim" na mesma query do post.
// Para usuário anônimo a relação não entra no include, então o banco não avalia
// subconsulta nenhuma e o liked já é falso por construção.
export const postReadInclude = (userId: string | null): Prisma.PostInclude =>
  userId
    ? {
        ...counts,
        ...author,
        likes: { where: { userId: userId }, select: { id: true }, take: 1 },
      }
    : { ...counts, ...author };

// A relação likes existe só para responder "curtido por mim", é achatada em liked
// e não vai na resposta.
export const toPostWithCounts = (row: PostQueryRow): PostWithCounts => {
  const { likes, ...post } = row;
  return { ...post, liked: Boolean(likes?.length) };
};
