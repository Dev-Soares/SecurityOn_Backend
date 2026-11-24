import { Article } from '@prisma/client';

// Recorte público do autor do artigo. Só o que o feed precisa para renderizar
// a assinatura, nada do resto do User vaza por aqui.
export type ArticleAuthor = {
  id: string;
  name: string;
};

// Resposta das rotas de leitura de artigo.
export type ArticleWithAuthor = Article & {
  user: ArticleAuthor;
};
