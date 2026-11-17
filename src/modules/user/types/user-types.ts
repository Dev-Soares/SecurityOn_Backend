import { User } from '@prisma/client';

// Os números que o perfil mostra. Sem eles o front precisaria paginar cada
// lista inteira — posts, denúncias, artigos, amigos — só para escrever um
// total em cima da página.
export type UserCounts = {
  posts: number;
  complaints: number;
  articles: number;
  friends: number;
};

// Recorte público do usuário: tudo menos a senha, mais as contagens.
export type PublicUser = Omit<User, 'password'> & { _count: UserCounts };
