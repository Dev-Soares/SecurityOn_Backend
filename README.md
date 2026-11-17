# SecurityOn — Backend

API REST do projeto **SecurityOn**, uma plataforma comunitária de segurança digital onde usuários podem compartilhar posts, fazer denúncias de golpes/fraudes e publicar artigos informativos. Posts podem receber curtidas e comentários, e os usuários podem se conectar por pedidos de amizade.

Construída com **NestJS**, **PostgreSQL** e **Prisma**, com autenticação JWT via cookies HTTP-only.

---

## Sumário

- [Estrutura do projeto](#estrutura-do-projeto)
- [Tecnologias](#tecnologias)
- [Pré-requisitos](#pré-requisitos)
- [Instalação](#instalação)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Banco de dados](#banco-de-dados)
- [Rodando o projeto](#rodando-o-projeto)
  - [Sem Docker (desenvolvimento local)](#sem-docker-desenvolvimento-local)
  - [Com Docker](#com-docker)
- [Documentação da API (Swagger)](#documentação-da-api-swagger)
- [Endpoints](#endpoints)
  - [Auth](#auth)
  - [User](#user)
  - [Post](#post)
  - [Complaint (Denúncias)](#complaint-denúncias)
  - [Article](#article)
  - [Like (Curtidas)](#like-curtidas)
  - [Comment (Comentários)](#comment-comentários)
  - [Friendship (Amizades)](#friendship-amizades)
  - [Health](#health)
- [Paginação](#paginação)
- [Autenticação](#autenticação)
- [Segurança](#segurança)
- [Scripts disponíveis](#scripts-disponíveis)

---

## Estrutura do projeto

```
src/
├── app.module.ts                    # Módulo raiz (registra todos os módulos)
├── main.ts                          # Bootstrap da aplicação
│
├── common/
│   ├── config/
│   │   └── cookie.config.ts         # Configuração do cookie JWT
│   ├── dto/
│   │   └── pagination.dto.ts        # DTO de paginação por cursor
│   ├── filters/
│   │   └── all-exceptions.filter.ts # Filtro global de exceções com logging
│   ├── guards/
│   │   └── auth/
│   │       ├── auth.guard.ts        # Guard JWT obrigatório
│   │       ├── auth.module.ts       # Módulo do guard
│   │       └── optionalAuth.guard.ts # Guard JWT opcional (retorna user ou null)
│   ├── hash/
│   │   ├── hash.module.ts
│   │   └── hash.service.ts          # bcrypt: hashPassword e comparePassword
│   ├── logger/
│   │   └── pino.ts                  # Configuração do Pino logger
│   └── types/
│       ├── query-types.ts           # Tipo PaginatedQuery<T>
│       └── req-types.ts             # Tipos AuthenticatedRequest e OptionalAuthRequest
│
└── modules/
    ├── auth/                        # Login e logout
    ├── article/                     # Artigos informativos
    ├── comment/                     # Comentários em posts
    ├── complaint/                   # Denúncias de golpes e fraudes
    ├── database/                    # PrismaService (conexão com o banco)
    ├── friendship/                  # Pedidos de amizade e lista de amigos
    ├── health/                      # Health check
    ├── like/                        # Curtidas em posts
    ├── post/                        # Posts da comunidade
    └── user/                        # Gerenciamento de usuários

prisma/
├── schema.prisma                    # Modelos e datasource
└── migrations/                      # Histórico de migrations SQL
```

---

## Tecnologias

| Tecnologia | Uso |
|---|---|
| [NestJS](https://nestjs.com/) | Framework principal |
| [PostgreSQL](https://www.postgresql.org/) | Banco de dados relacional |
| [Prisma](https://www.prisma.io/) | ORM e migrations |
| [JWT](https://jwt.io/) + [@nestjs/jwt](https://github.com/nestjs/jwt) | Autenticação stateless |
| [bcrypt](https://github.com/kelektiv/node.bcrypt.js) | Hash de senhas |
| [Helmet](https://helmetjs.github.io/) | Headers de segurança HTTP |
| [nestjs-pino](https://github.com/iamolegga/nestjs-pino) | Logging estruturado |
| [@nestjs/throttler](https://github.com/nestjs/throttler) | Rate limiting |
| [@nestjs/swagger](https://docs.nestjs.com/openapi/introduction) | Documentação automática |
| [class-validator](https://github.com/typestack/class-validator) | Validação de DTOs |
| [cookie-parser](https://github.com/expressjs/cookie-parser) | Leitura de cookies HTTP-only |

---

## Pré-requisitos

- **Node.js** >= 20
- **pnpm** (recomendado) ou npm/yarn
- **PostgreSQL** rodando localmente ou em nuvem (ex: Neon, Supabase, Railway)

---

## Instalação

```bash
# Clone o repositório
git clone <url-do-repositorio>
cd SecurityOn_Backend

# Instale as dependências
pnpm install
```

---

## Variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto com base no `.env.example`:

```bash
cp .env.example .env
```

Preencha as variáveis:

```env
PORT=3333

# URL de conexão do PostgreSQL (usada pelo Prisma via connection pooling)
DATABASE_URL="postgresql://usuario:senha@host:5432/nome_do_banco"

# URL direta (necessária para migrations com alguns provedores como Neon)
DIRECT_URL="postgresql://usuario:senha@host:5432/nome_do_banco"

# Origem permitida pelo CORS (URL do frontend)
CORS_ORIGIN="http://localhost:5173"

# Chave secreta para assinar os tokens JWT (use uma string longa e aleatória)
JWT_SECRET="sua_chave_super_secreta_aqui"

# Tempo de expiração do JWT em segundos (padrão: 86400 = 24h)
JWT_EXPIRES_IN=86400

# Credenciais para proteger a rota do Swagger (/api-docs)
SWAGGER_USER="admin"
SWAGGER_PASSWORD="senha_do_swagger"

# Rounds do bcrypt (padrão: 10)
SALT_ROUNDS=10
```

> **Nota:** O cookie de autenticação usa `secure: true` e `sameSite: 'none'` automaticamente quando `NODE_ENV=production`.

---

## Banco de dados

Com o `.env` configurado, rode as migrations para criar as tabelas:

```bash
# Executa as migrations existentes
pnpm prisma migrate deploy

# OU, em desenvolvimento, cria e aplica uma nova migration
pnpm prisma migrate dev

# Gera o Prisma Client após alterações no schema
pnpm prisma generate
```

Para visualizar os dados no banco com uma UI:

```bash
pnpm prisma studio
```

### Modelos do banco

```
User        → id, name, email, password
Post        → id, content, imgUrl?, userId, createdAt
Complaint   → id, title, content, danger, store?, link?, userId, createdAt
Article     → id, title, content, bgUrl?, userId, createdAt
Like        → id, userId, postId, createdAt            (UNIQUE userId + postId)
Comment     → id, content, userId, postId, createdAt
Friendship  → id, requesterId, addresseeId, status, createdAt
                                                        (UNIQUE requesterId + addresseeId)
```

`Friendship.status` é um enum: `PENDING` (pedido enviado, aguardando resposta) ou
`ACCEPTED` (amizade confirmada). Recusar, cancelar ou desfazer amizade apaga a linha —
não existe status `REJECTED`.

Todas as FKs usam `ON DELETE CASCADE`. Logo, apagar um post apaga suas curtidas e
comentários, e apagar um usuário apaga seu conteúdo, suas curtidas, seus comentários e
todas as suas amizades.

---

## Rodando o projeto

### Sem Docker (desenvolvimento local)

```bash
# Desenvolvimento (com hot reload)
pnpm start:dev

# Produção (requer build prévio)
pnpm build
pnpm start:prod

# Debug
pnpm start:debug
```

O servidor sobe em `http://localhost:3333` (ou na `PORT` definida no `.env`).

---

### Com Docker

O projeto possui um `Dockerfile` que empacota **apenas a aplicação**. O banco de dados PostgreSQL **não sobe junto** — você precisa fornecê-lo externamente (ex: Neon, Supabase, Railway, ou uma instância local).

#### Build da imagem

```bash
docker build -t securityon-backend .
```

#### Rodando o container

Passe todas as variáveis de ambiente necessárias via `-e` ou use um arquivo `.env`:

```bash
docker run -d \
  --name securityon-api \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://usuario:senha@host:5432/nome_do_banco" \
  -e DIRECT_URL="postgresql://usuario:senha@host:5432/nome_do_banco" \
  -e JWT_SECRET="sua_chave_secreta" \
  -e CORS_ORIGIN="http://localhost:5173" \
  -e SWAGGER_USER="admin" \
  -e SWAGGER_PASSWORD="senha" \
  -e NODE_ENV="production" \
  securityon-backend
```

Ou usando um arquivo `.env` já preenchido:

```bash
docker run -d \
  --name securityon-api \
  -p 3000:3000 \
  --env-file .env \
  securityon-backend
```

> **Atenção:** O `Dockerfile` expõe a porta `3000`. Se seu `.env` usa uma `PORT` diferente, ajuste o mapeamento `-p <porta-local>:3000` ou passe `-e PORT=3000` explicitamente.

#### Quer subir o banco junto? Use docker-compose

O projeto ainda não possui um `docker-compose.yml`. Se quiser subir API + banco com um único comando, crie o arquivo na raiz:

```yaml
# docker-compose.yml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: securityon
      POSTGRES_PASSWORD: securityon
      POSTGRES_DB: securityon
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  api:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env
    depends_on:
      - db

volumes:
  postgres_data:
```

E suba tudo com:

```bash
docker compose up -d
```

Lembre de ajustar o `DATABASE_URL` no `.env` para apontar para o serviço `db`:

```env
DATABASE_URL="postgresql://securityon:securityon@db:5432/securityon"
DIRECT_URL="postgresql://securityon:securityon@db:5432/securityon"
```

---

## Documentação da API (Swagger)

A documentação interativa está disponível em:

```
http://localhost:3333/api-docs
```

O acesso é protegido por autenticação básica (Basic Auth). Use as credenciais definidas em `SWAGGER_USER` e `SWAGGER_PASSWORD` no `.env`.

---

## Endpoints

### Auth

| Método | Rota | Autenticação | Descrição |
|---|---|---|---|
| `POST` | `/auth/login` | Não | Autentica o usuário e seta o cookie `access_token` |
| `POST` | `/auth/logout` | Não | Limpa o cookie `access_token` |

**Body do login:**
```json
{
  "email": "user@email.com",
  "password": "minhasenha123"
}
```

**Resposta do login:**
```json
{ "message": "Sign In successful" }
```
> O token JWT é enviado como cookie HTTP-only (`access_token`). Não aparece no corpo da resposta.

---

### User

| Método | Rota | Autenticação | Descrição |
|---|---|---|---|
| `POST` | `/user` | Não | Cria um novo usuário |
| `GET` | `/user/me` | Opcional | Retorna o usuário logado (ou `null`) |
| `GET` | `/user/:id` | Não | Busca um usuário por ID |
| `PATCH` | `/user/:id` | Obrigatória | Atualiza o nome do usuário (somente o próprio) |
| `DELETE` | `/user/:id` | Obrigatória | Remove o usuário (somente o próprio) |

**Body para criar usuário:**
```json
{
  "name": "João Silva",
  "email": "joao@email.com",
  "password": "minhasenha123"
}
```

> A senha é armazenada com hash bcrypt. O campo `password` nunca é retornado nas respostas.

---

### Post

| Método | Rota | Autenticação | Descrição |
|---|---|---|---|
| `POST` | `/post` | Obrigatória | Cria um novo post |
| `GET` | `/post` | Opcional | Lista todos os posts (paginado) |
| `GET` | `/post/all/:id` | Opcional | Lista posts de um usuário específico (paginado) |
| `GET` | `/post/:id` | Opcional | Busca um post por ID |
| `PATCH` | `/post/:id` | Obrigatória | Atualiza um post (somente o autor) |
| `DELETE` | `/post/:id` | Obrigatória | Remove um post (somente o autor) |

**Body para criar post:**
```json
{
  "content": "Conteúdo do post aqui (máx. 5000 caracteres)",
  "imgUrl": "https://exemplo.com/imagem.png"
}
```

As rotas de leitura (`GET /post`, `GET /post/all/:id` e `GET /post/:id`) usam
**autenticação opcional** e já devolvem tudo que um feed precisa — totais de curtidas e
comentários **e** se o usuário logado curtiu — em uma única query por requisição:

```json
{
  "id": "uuid-do-post",
  "content": "Conteúdo do post",
  "imgUrl": null,
  "userId": "uuid-do-autor",
  "createdAt": "2026-11-17T12:00:00.000Z",
  "_count": { "likes": 12, "comments": 3 },
  "liked": true
}
```

> Sem cookie de autenticação, `liked` vem sempre `false`.
>
> É por isso que não existe uma rota separada de status de curtida: o feed já chega
> pronto, e `POST /like` / `DELETE /like/:postId` devolvem o novo total.

---

### Complaint (Denúncias)

| Método | Rota | Autenticação | Descrição |
|---|---|---|---|
| `POST` | `/complaint` | Obrigatória | Cria uma nova denúncia |
| `GET` | `/complaint` | Não | Lista todas as denúncias (paginado) |
| `GET` | `/complaint/all/:id` | Não | Lista denúncias de um usuário (paginado) |
| `GET` | `/complaint/:id` | Não | Busca uma denúncia por ID |
| `PATCH` | `/complaint/:id` | Obrigatória | Atualiza uma denúncia (somente o autor) |
| `DELETE` | `/complaint/:id` | Obrigatória | Remove uma denúncia (somente o autor) |

**Body para criar denúncia:**
```json
{
  "title": "Golpe no site falso",
  "content": "Descrição detalhada do golpe (máx. 5000 caracteres)",
  "danger": "aviso",
  "store": "Nome da Loja",
  "link": "https://site-suspeito.com"
}
```

> `danger` aceita qualquer string (ex: `"aviso"`, `"perigo"`, `"crítico"`). Valor padrão: `"aviso"`.
> `store` e `link` são opcionais.

---

### Article

| Método | Rota | Autenticação | Descrição |
|---|---|---|---|
| `POST` | `/article` | Obrigatória | Cria um novo artigo |
| `GET` | `/article` | Não | Lista todos os artigos (paginado) |
| `GET` | `/article/all/:id` | Não | Lista artigos de um usuário (paginado) |
| `GET` | `/article/:id` | Não | Busca um artigo por ID |
| `PATCH` | `/article/:id` | Obrigatória | Atualiza um artigo (somente o autor) |
| `DELETE` | `/article/:id` | Obrigatória | Remove um artigo (somente o autor) |

**Body para criar artigo:**
```json
{
  "title": "Como se proteger de phishing",
  "content": "Conteúdo do artigo (máx. 5000 caracteres)",
  "bgUrl": "https://exemplo.com/capa.png"
}
```

---

### Like (Curtidas)

Curtidas valem para **posts**. Um usuário pode curtir o mesmo post apenas uma vez.

| Método | Rota | Autenticação | Descrição |
|---|---|---|---|
| `POST` | `/like` | Obrigatória | Curte um post |
| `DELETE` | `/like/:postId` | Obrigatória | Descurte o post (remove a própria curtida) |
| `GET` | `/like/all/:postId` | Não | Lista quem curtiu um post (paginado) |
| `GET` | `/like/user/:id` | Não | Lista as curtidas de um usuário (paginado) |

**Body para curtir:**
```json
{
  "postId": "uuid-do-post"
}
```

**As duas mutações devolvem o estado já atualizado**, para o cliente não precisar de uma
requisição extra depois de curtir ou descurtir:
```json
{
  "postId": "uuid-do-post",
  "total": 13,
  "liked": true
}
```
> `liked` é `true` no `POST` e `false` no `DELETE`; `total` é a contagem após a operação.
> As duas rodam em uma única ida ao banco (`$transaction`), então o `total` nunca fica
> defasado em relação à escrita que acabou de acontecer.

> **Não existe rota de leitura de status.** Para saber se o usuário logado curtiu um post,
> use `GET /post`, `GET /post/all/:id` ou `GET /post/:id` — todas já devolvem `liked` e
> `_count.likes` na mesma query do post. Uma rota `GET /like/status/:postId` seria um
> subconjunto estrito dessa resposta com o dobro de queries, e um feed de 20 posts
> precisaria chamá-la 20 vezes.

**Resposta de `GET /like/all/:postId`:** cada item inclui o autor da curtida.
```json
{
  "data": [
    {
      "id": "uuid-da-curtida",
      "userId": "uuid-do-usuario",
      "postId": "uuid-do-post",
      "createdAt": "2026-11-17T12:00:00.000Z",
      "user": { "id": "uuid-do-usuario", "name": "João Silva" }
    }
  ],
  "nextCursor": null,
  "hasNextPage": false
}
```

**Erros específicos:**

| Status | Quando |
|---|---|
| `409 Conflict` | O usuário já curtiu este post |
| `404 Not Found` | Post inexistente (no `POST`) ou curtida inexistente (no `DELETE`) |

---

### Comment (Comentários)

Comentários valem para **posts** e são uma lista plana (não há resposta a comentário).

| Método | Rota | Autenticação | Descrição |
|---|---|---|---|
| `POST` | `/comment` | Obrigatória | Cria um comentário em um post |
| `GET` | `/comment/all/:postId` | Não | Lista os comentários de um post (paginado) |
| `GET` | `/comment/user/:id` | Não | Lista os comentários de um usuário (paginado) |
| `GET` | `/comment/:id` | Não | Busca um comentário por ID |
| `PATCH` | `/comment/:id` | Obrigatória | Edita o comentário (somente o autor) |
| `DELETE` | `/comment/:id` | Obrigatória | Remove o comentário (autor do comentário **ou** autor do post) |

**Body para comentar:**
```json
{
  "postId": "uuid-do-post",
  "content": "Conteúdo do comentário (máx. 2000 caracteres)"
}
```

**Body para editar** (apenas `content` — o post de destino não muda):
```json
{
  "content": "Conteúdo corrigido"
}
```

> `GET /comment/all/:postId` inclui o autor de cada comentário (`user: { id, name }`),
> no mesmo formato de `GET /like/all/:postId`.

> **Moderação:** o `DELETE` aceita tanto o autor do comentário quanto o autor do post
> comentado, para que o dono do post possa remover comentários indevidos. O `PATCH`
> continua restrito ao autor do comentário.

---

### Friendship (Amizades)

Fluxo de pedido de amizade em duas etapas: o remetente envia (`PENDING`) e o
destinatário aceita (`ACCEPTED`).

| Método | Rota | Autenticação | Descrição |
|---|---|---|---|
| `POST` | `/friendship` | Obrigatória | Envia um pedido de amizade |
| `GET` | `/friendship/requests/received` | Obrigatória | Pedidos pendentes recebidos (paginado) |
| `GET` | `/friendship/requests/sent` | Obrigatória | Pedidos pendentes enviados (paginado) |
| `GET` | `/friendship/status/:id` | Obrigatória | Relação entre o usuário logado e o usuário `:id` |
| `GET` | `/friendship/all/:id` | Não | Lista de amigos de um usuário (paginado) |
| `PATCH` | `/friendship/:id/accept` | Obrigatória | Aceita o pedido (somente o destinatário) |
| `DELETE` | `/friendship/:id` | Obrigatória | Cancela, recusa ou desfaz a amizade |

**Body para enviar pedido:**
```json
{
  "addresseeId": "uuid-do-usuario"
}
```

**Resposta de `GET /friendship/all/:id`** — já resolve qual dos dois lados é o amigo:
```json
{
  "data": [
    {
      "friendshipId": "uuid-da-amizade",
      "friendsSince": "2026-11-17T12:00:00.000Z",
      "user": { "id": "uuid-do-amigo", "name": "Maria Souza" }
    }
  ],
  "nextCursor": null,
  "hasNextPage": false
}
```

**Resposta de `GET /friendship/status/:id`:**
```json
{
  "userId": "uuid-do-outro-usuario",
  "relation": "pending_received",
  "friendshipId": "uuid-da-amizade"
}
```

Valores possíveis de `relation`:

| Valor | Significado |
|---|---|
| `self` | O `:id` consultado é o próprio usuário logado |
| `none` | Não existe nenhuma relação entre os dois |
| `pending_sent` | O usuário logado enviou um pedido e aguarda resposta |
| `pending_received` | O outro usuário enviou um pedido ao usuário logado |
| `friends` | Amizade aceita |

> `friendshipId` é `null` quando `relation` é `self` ou `none`.

**O `DELETE` cobre três situações**, porque qualquer um dos dois lados da relação pode
remover a linha:

| Situação | Quem chama | Estado da amizade |
|---|---|---|
| Cancelar pedido enviado | Remetente | `PENDING` |
| Recusar pedido recebido | Destinatário | `PENDING` |
| Desfazer amizade | Qualquer um dos dois | `ACCEPTED` |

**Erros específicos:**

| Status | Quando |
|---|---|
| `400 Bad Request` | Pedido de amizade para si mesmo |
| `404 Not Found` | Usuário de destino inexistente, ou amizade/pedido inexistente |
| `409 Conflict` | Já são amigos, pedido já enviado, pedido já existe no sentido inverso, ou pedido já aceito |
| `401 Unauthorized` | Aceitar um pedido do qual não é destinatário, ou remover amizade da qual não participa |

---

### Health

| Método | Rota | Autenticação | Descrição |
|---|---|---|---|
| `GET` | `/health` | Não | Verifica se a API está no ar |

**Resposta:**
```json
{ "status": "ok" }
```

---

## Paginação

Todos os endpoints de listagem usam **paginação por cursor**: `GET /post`, `GET /complaint`,
`GET /article` e suas variantes por usuário, além de `GET /like/all/:postId`,
`GET /like/user/:id`, `GET /comment/all/:postId`, `GET /comment/user/:id`,
`GET /friendship/all/:id`, `GET /friendship/requests/received` e
`GET /friendship/requests/sent`.

### Query params disponíveis

| Parâmetro | Tipo | Padrão | Descrição |
|---|---|---|---|
| `limit` | `string` (número) | `10` | Quantidade de itens por página (máximo: 99) |
| `cursor` | `string` (UUID) | — | ID do último item da página anterior |

### Exemplo de uso

```
GET /post?limit=10
GET /post?limit=10&cursor=uuid-do-ultimo-post
```

### Formato da resposta

```json
{
  "data": [ /* array de itens */ ],
  "nextCursor": "uuid-do-proximo-cursor",
  "hasNextPage": true
}
```

> Quando `hasNextPage` for `false`, `nextCursor` será `null` — você chegou na última página.

### Como iterar páginas

1. Faça a primeira requisição sem `cursor`
2. Se `hasNextPage === true`, faça a próxima requisição passando `cursor=<nextCursor>`
3. Repita até `hasNextPage === false`

---

## Autenticação

A autenticação é baseada em **JWT armazenado em cookie HTTP-only**.

### Fluxo

1. O cliente faz `POST /auth/login` com email e senha
2. A API valida as credenciais, gera um JWT e o envia como cookie `access_token` (HTTP-only)
3. O navegador inclui o cookie automaticamente em todas as requisições subsequentes
4. Rotas protegidas validam o token via `AuthGuard`
5. Para sair, faça `POST /auth/logout` — o cookie é removido

### Token

- Expiração padrão: **24 horas** (configurável via `JWT_EXPIRES_IN`)
- Payload: `{ sub: userId, name: userName }`

### Autorização de recursos

Rotas de edição e exclusão verificam se o `userId` do token corresponde ao dono do recurso. Caso contrário, retorna `401 Unauthorized`.

Duas exceções, por serem recursos de relação entre usuários:

- `DELETE /comment/:id` aceita o autor do comentário **ou** o autor do post comentado (moderação).
- `PATCH /friendship/:id/accept` aceita somente o destinatário do pedido, e `DELETE /friendship/:id` aceita qualquer um dos dois lados da relação.

---

## Segurança

A API implementa diversas camadas de segurança:

| Mecanismo | Descrição |
|---|---|
| **Helmet** | Define headers HTTP de segurança (CSP, HSTS, etc.) |
| **CORS** | Aceita requisições somente da origem definida em `CORS_ORIGIN` |
| **Rate Limiting** | Máximo de **100 requisições por minuto** por IP (global) |
| **HTTP-only Cookie** | O JWT não é acessível via JavaScript no cliente |
| **bcrypt** | Senhas nunca são armazenadas em texto puro |
| **ValidationPipe** | Rejeita campos extras não declarados no DTO (`forbidNonWhitelisted: true`) |
| **Swagger protegido** | Documentação acessível somente com Basic Auth |
| **Pino Logger** | Erros logados com método, URL e status code (sem dados sensíveis) |

---

## Scripts disponíveis

```bash
# Inicia em modo desenvolvimento com watch
pnpm start:dev

# Compila o projeto para produção
pnpm build

# Inicia a versão compilada
pnpm start:prod

# Roda os testes unitários
pnpm test

# Roda os testes em modo watch
pnpm test:watch

# Gera relatório de cobertura de testes
pnpm test:cov

# Roda os testes E2E
pnpm test:e2e

# Formata o código com Prettier
pnpm format

# Roda o ESLint com auto-fix
pnpm lint

# Abre o Prisma Studio (UI do banco)
pnpm prisma studio

# Cria e aplica uma nova migration
pnpm prisma migrate dev --name nome_da_migration

# Aplica migrations em produção
pnpm prisma migrate deploy
```
