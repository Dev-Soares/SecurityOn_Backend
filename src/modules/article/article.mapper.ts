import { Prisma } from '@prisma/client';

// O autor vem junto do artigo. Sem isso o feed precisa de um GET /user por card
// renderizado para assinar o artigo, o N+1 clássico.
// Só id e name: o resto do User (email, password) é dado privado e não cabe num feed.
export const articleReadInclude = {
  user: { select: { id: true, name: true } },
} satisfies Prisma.ArticleInclude;
