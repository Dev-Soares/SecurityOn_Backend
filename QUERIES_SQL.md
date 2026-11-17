# SecurityOn Backend — Queries Prisma traduzidas para SQL

Documento acadêmico. Cada query do ORM (Prisma) usada no projeto está traduzida para
o SQL equivalente em **PostgreSQL** (`provider = "postgresql"` em `prisma/schema.prisma`).

> Observação: o Prisma faz *quoting* de identificadores em PascalCase, então as tabelas
> são referenciadas como `"User"`, `"Post"`, `"Complaint"`, `"Article"`, `"Like"`,
> `"Comment"` e `"Friendship"`.

---

## 1. DDL — Estrutura do banco

Traduzido a partir de `prisma/schema.prisma`.

```sql
-- Extensão necessária para gerar UUID no lado do banco
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE "User" (
    "id"       TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    "name"     TEXT NOT NULL,
    "email"    TEXT NOT NULL,
    "password" TEXT NOT NULL,
    CONSTRAINT "User_email_key" UNIQUE ("email")
);

CREATE TABLE "Post" (
    "id"        TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    "content"   TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "imgUrl"    TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Post_userId_fkey" FOREIGN KEY ("userId")
        REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Complaint" (
    "id"        TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    "title"     TEXT NOT NULL,
    "content"   TEXT NOT NULL,
    "danger"    TEXT NOT NULL DEFAULT 'aviso',
    "store"     TEXT,
    "link"      TEXT,
    "userId"    TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Complaint_userId_fkey" FOREIGN KEY ("userId")
        REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Article" (
    "id"        TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    "bgUrl"     TEXT,
    "title"     TEXT NOT NULL,
    "content"   TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Article_userId_fkey" FOREIGN KEY ("userId")
        REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Enum de status do pedido de amizade
CREATE TYPE "FriendshipStatus" AS ENUM ('PENDING', 'ACCEPTED');

CREATE TABLE "Like" (
    "id"        TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    "userId"    TEXT NOT NULL,
    "postId"    TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Like_userId_postId_key" UNIQUE ("userId", "postId"),
    CONSTRAINT "Like_userId_fkey" FOREIGN KEY ("userId")
        REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Like_postId_fkey" FOREIGN KEY ("postId")
        REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Comment" (
    "id"        TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    "content"   TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "postId"    TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId")
        REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Comment_postId_fkey" FOREIGN KEY ("postId")
        REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Friendship" (
    "id"          TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    "requesterId" TEXT NOT NULL,
    "addresseeId" TEXT NOT NULL,
    "status"      "FriendshipStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Friendship_requesterId_addresseeId_key" UNIQUE ("requesterId", "addresseeId"),
    CONSTRAINT "Friendship_requesterId_fkey" FOREIGN KEY ("requesterId")
        REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Friendship_addresseeId_fkey" FOREIGN KEY ("addresseeId")
        REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Índices criados pela migration (declarados com @@index no schema)
CREATE INDEX "Like_postId_createdAt_idx"    ON "Like"    ("postId", "createdAt");
CREATE INDEX "Comment_postId_createdAt_idx" ON "Comment" ("postId", "createdAt");
CREATE INDEX "Comment_userId_createdAt_idx" ON "Comment" ("userId", "createdAt");
CREATE INDEX "Friendship_addresseeId_status_createdAt_idx" ON "Friendship" ("addresseeId", "status", "createdAt");
CREATE INDEX "Friendship_requesterId_status_createdAt_idx" ON "Friendship" ("requesterId", "status", "createdAt");

-- Índices recomendados para as consultas paginadas por usuário
CREATE INDEX "Post_userId_createdAt_idx"      ON "Post"      ("userId", "createdAt" DESC);
CREATE INDEX "Complaint_userId_createdAt_idx" ON "Complaint" ("userId", "createdAt" DESC);
CREATE INDEX "Article_userId_createdAt_idx"   ON "Article"   ("userId", "createdAt" DESC);
```

### Modelo relacional (resumo)

| Tabela | PK | FK | Cardinalidade |
|---|---|---|---|
| `User` | `id` | — | 1 : N com Post, Complaint, Article, Like, Comment e Friendship |
| `Post` | `id` | `userId → User.id` | N : 1 |
| `Complaint` | `id` | `userId → User.id` | N : 1 |
| `Article` | `id` | `userId → User.id` | N : 1 |
| `Like` | `id` | `userId → User.id`, `postId → Post.id` | tabela associativa N : N entre User e Post |
| `Comment` | `id` | `userId → User.id`, `postId → Post.id` | N : 1 com User e com Post |
| `Friendship` | `id` | `requesterId → User.id`, `addresseeId → User.id` | auto-relacionamento N : N em User |

Todas as FKs usam `ON DELETE CASCADE`: apagar um usuário apaga seus posts,
denúncias, artigos, curtidas, comentários e amizades; apagar um post apaga as
curtidas e os comentários daquele post.

Três detalhes de modelagem valem destaque:

- **`Like` é uma tabela associativa pura** (User ↔ Post) com `UNIQUE ("userId","postId")`.
  É a constraint UNIQUE que impede curtida duplicada — não há checagem na aplicação.
- **`Comment` não é associativa**, apesar de também ter duas FKs: ela carrega dado
  próprio (`content`), então um mesmo par usuário/post pode ter vários comentários.
  Daí a ausência de UNIQUE.
- **`Friendship` é um auto-relacionamento** (as duas FKs apontam para `"User"`). O
  `UNIQUE ("requesterId","addresseeId")` só impede duplicata no *mesmo sentido*;
  impedir que A→B e B→A coexistam exige a verificação por `OR` feita na aplicação
  (item 9.1).

---

## 2. Módulo User (`src/modules/user/user.service.ts`)

### 2.1 `create` — Cadastrar usuário

**Prisma**
```ts
this.prisma.user.create({
  data: { name, email, password: hashedPassword },
  select: { id: true, name: true, email: true },
});
```

**SQL**
```sql
INSERT INTO "User" ("id", "name", "email", "password")
VALUES (uuid_generate_v4()::TEXT, $1, $2, $3)
RETURNING "id", "name", "email";
```
> `$3` já chega com hash bcrypt (`HashService.hashPassword`). A senha nunca é
> devolvida — daí o `RETURNING` sem a coluna `password`.
> A violação da UNIQUE de `email` (erro `23505` no Postgres) é o que o Prisma
> reporta como `P2002` e vira `ConflictException('E-mail já cadastrado')`.

### 2.2 `findOneWithPassword` — Buscar usuário com senha (usado no login)

**Prisma**
```ts
this.prisma.user.findUnique({ where: uniqueInput });
```

**SQL**
```sql
SELECT "id", "name", "email", "password"
FROM "User"
WHERE "email" = $1
LIMIT 1;
```
Variante por id:
```sql
SELECT "id", "name", "email", "password"
FROM "User"
WHERE "id" = $1
LIMIT 1;
```

### 2.3 `findOne` — Buscar usuário (perfil público)

**Prisma**
```ts
this.prisma.user.findUnique({
  where: uniqueInput,
  select: { id: true, name: true, email: true },
});
```

**SQL**
```sql
SELECT "id", "name", "email"
FROM "User"
WHERE "id" = $1
LIMIT 1;
```

### 2.4 `update` — Atualizar nome do usuário

**Prisma**
```ts
this.prisma.user.update({
  where: { id },
  data: { name: dto.name },
  select: { id: true, name: true, email: true },
});
```

**SQL**
```sql
UPDATE "User"
SET "name" = $2
WHERE "id" = $1
RETURNING "id", "name", "email";
```
> A checagem `id !== userId` é feita na aplicação (JWT), antes do SQL.
> Equivalente feito em SQL puro, em uma só instrução:
> ```sql
> UPDATE "User"
> SET "name" = $2
> WHERE "id" = $1 AND "id" = $3   -- $3 = id extraído do token
> RETURNING "id", "name", "email";
> ```

### 2.5 `remove` — Deletar usuário

**Prisma**
```ts
this.prisma.user.delete({
  where: { id },
  select: { id: true, name: true, email: true },
});
```

**SQL**
```sql
DELETE FROM "User"
WHERE "id" = $1
RETURNING "id", "name", "email";
```
> Por causa do `ON DELETE CASCADE`, esta única instrução também remove todos os
> `Post`, `Complaint` e `Article` do usuário.

---

## 3. Módulo Auth (`src/modules/auth/auth.service.ts`)

O login não emite SQL próprio — ele reutiliza `findOneWithPassword` (item 2.2).
Sequência:

```sql
-- 1. Busca o usuário pelo e-mail
SELECT "id", "name", "email", "password"
FROM "User"
WHERE "email" = $1
LIMIT 1;
```
2. `bcrypt.compare(senhaDigitada, user.password)` — feito na aplicação, não no banco.
3. Emissão do JWT com payload `{ sub: user.id, name: user.name }`.

---

## 4. Módulo Post (`src/modules/post/post.service.ts`)

### 4.1 `create` — Criar post

**Prisma**
```ts
this.prisma.post.create({
  data: { content: dto.content, userId, imgUrl: dto.imgUrl },
});
```

**SQL**
```sql
INSERT INTO "Post" ("id", "content", "userId", "imgUrl", "createdAt")
VALUES (uuid_generate_v4()::TEXT, $1, $2, $3, CURRENT_TIMESTAMP)
RETURNING "id", "content", "userId", "imgUrl", "createdAt";
```

### 4.2 `findAll` — Listagem paginada (paginação por cursor)

**Prisma**
```ts
this.prisma.post.findMany({
  take: take + 1,
  cursor: dto.cursor ? { id: dto.cursor } : undefined,
  skip: dto.cursor ? 1 : 0,
  orderBy: { createdAt: 'desc' },
  include: {
    _count: { select: { likes: true, comments: true } },
    likes: { where: likedBy(userId), select: { id: true }, take: 1 },
  },
});
```

**SQL — primeira página (sem cursor)**
```sql
SELECT p."id", p."content", p."userId", p."imgUrl", p."createdAt",
       (SELECT COUNT(*) FROM "Like"    l WHERE l."postId" = p."id") AS "likes",
       (SELECT COUNT(*) FROM "Comment" c WHERE c."postId" = p."id") AS "comments",
       EXISTS (
           SELECT 1 FROM "Like" l
           WHERE l."postId" = p."id" AND l."userId" = $2
       ) AS "liked"
FROM "Post" p
ORDER BY p."createdAt" DESC
LIMIT $1;          -- $1 = take + 1, $2 = usuário logado (NULL se anônimo)
```

> Três informações numa única query: as duas contagens vêm do `include: { _count: ... }`
> (subconsultas correlacionadas) e o `liked` vem da relação `likes` filtrada pelo usuário
> logado com `take: 1`. O Prisma materializa essa relação como uma lista de no máximo um
> item; o serviço a achata em booleano (`likes.length > 0`) e remove o array da resposta.
>
> **O filtro do usuário anônimo não pode ser `{ userId: undefined }`**: em Prisma,
> `undefined` significa *"sem filtro"*, então viria a curtida de qualquer pessoa e `liked`
> sairia `true` indevidamente. O helper `likedBy` devolve `{ id: { in: [] } }` nesse caso —
> um predicado que nunca casa, equivalente a `WHERE FALSE`:
> ```sql
> EXISTS (SELECT 1 FROM "Like" l WHERE l."postId" = p."id" AND l."id" IN ()) AS "liked"
> ```

> Equivalente das contagens com `LEFT JOIN` + agregação, útil quando se quer um único
> passe na tabela:
> ```sql
> SELECT p."id", p."content", p."userId", p."imgUrl", p."createdAt",
>        COUNT(DISTINCT l."id") AS "likes",
>        COUNT(DISTINCT c."id") AS "comments"
> FROM "Post" p
> LEFT JOIN "Like"    l ON l."postId" = p."id"
> LEFT JOIN "Comment" c ON c."postId" = p."id"
> GROUP BY p."id", p."content", p."userId", p."imgUrl", p."createdAt"
> ORDER BY p."createdAt" DESC
> LIMIT $1;
> ```
> O `COUNT(DISTINCT ...)` é obrigatório aqui: sem ele os dois `LEFT JOIN` multiplicam as
> linhas entre si (10 curtidas × 3 comentários = 30 linhas) e ambas as contagens saem erradas.

**SQL — páginas seguintes (com cursor)**

O Prisma implementa cursor + `skip: 1` como "posicione-se no registro do cursor e
pule-o". Em SQL puro, o equivalente é filtrar pelo `createdAt` do cursor:

```sql
SELECT p."id", p."content", p."userId", p."imgUrl", p."createdAt"
FROM "Post" p
WHERE p."createdAt" < (SELECT c."createdAt" FROM "Post" c WHERE c."id" = $2)
ORDER BY p."createdAt" DESC
LIMIT $1;          -- $1 = take + 1, $2 = cursor
```

Versão robusta contra empates de `createdAt` (comparação de tupla — *keyset pagination*):

```sql
SELECT p."id", p."content", p."userId", p."imgUrl", p."createdAt"
FROM "Post" p, (SELECT "createdAt", "id" FROM "Post" WHERE "id" = $2) AS cur
WHERE (p."createdAt", p."id") < (cur."createdAt", cur."id")
ORDER BY p."createdAt" DESC, p."id" DESC
LIMIT $1;
```

> Truque do `take + 1`: busca-se um registro a mais que o pedido. Se vierem
> `take + 1` linhas, existe próxima página (`hasNextPage = true`); a linha extra é
> descartada e o `id` da última linha mantida vira o `nextCursor`.
> O serviço também rejeita `limit >= 100` antes de chegar ao banco.

### 4.3 `findByUser` — Posts de um usuário, paginados

**Prisma**
```ts
this.prisma.post.findMany({
  take: take + 1,
  cursor: dto.cursor ? { id: dto.cursor } : undefined,
  skip: dto.cursor ? 1 : 0,
  orderBy: { createdAt: 'desc' },
  where: { userId: id },
  include: {
    _count: { select: { likes: true, comments: true } },
    likes: { where: likedBy(userId), select: { id: true }, take: 1 },
  },
});
```

**SQL — primeira página**
```sql
SELECT p."id", p."content", p."userId", p."imgUrl", p."createdAt",
       (SELECT COUNT(*) FROM "Like"    l WHERE l."postId" = p."id") AS "likes",
       (SELECT COUNT(*) FROM "Comment" c WHERE c."postId" = p."id") AS "comments",
       EXISTS (
           SELECT 1 FROM "Like" l
           WHERE l."postId" = p."id" AND l."userId" = $3
       ) AS "liked"
FROM "Post" p
WHERE p."userId" = $2
ORDER BY p."createdAt" DESC
LIMIT $1;
```
> Aqui `$2` e `$3` são usuários **diferentes**: `$2` é o dono do perfil visitado e `$3` é
> quem está visitando. Confundir os dois faria todo post aparecer como curtido ao visitar
> o próprio perfil.

**SQL — com cursor**
```sql
SELECT p."id", p."content", p."userId", p."imgUrl", p."createdAt"
FROM "Post" p
WHERE p."userId" = $2
  AND p."createdAt" < (SELECT c."createdAt" FROM "Post" c WHERE c."id" = $3)
ORDER BY p."createdAt" DESC
LIMIT $1;
```

### 4.4 `findOne` — Buscar post por id

**Prisma**
```ts
this.prisma.post.findUnique({
  where: { id },
  include: {
    _count: { select: { likes: true, comments: true } },
    likes: { where: likedBy(userId), select: { id: true }, take: 1 },
  },
});
```

**SQL**
```sql
SELECT p."id", p."content", p."userId", p."imgUrl", p."createdAt",
       (SELECT COUNT(*) FROM "Like"    l WHERE l."postId" = p."id") AS "likes",
       (SELECT COUNT(*) FROM "Comment" c WHERE c."postId" = p."id") AS "comments",
       EXISTS (
           SELECT 1 FROM "Like" l
           WHERE l."postId" = p."id" AND l."userId" = $2
       ) AS "liked"
FROM "Post" p
WHERE p."id" = $1
LIMIT 1;
```

> `update` e `remove` (itens 4.5 e 4.6) continuam usando `findUnique` sem `include`:
> a checagem de dono só precisa de `"userId"`, e contagens e `liked` seriam trabalho
> jogado fora.

### 4.5 `update` — Atualizar post (com verificação de dono)

**Prisma** — duas queries: um `findUnique` para checar o dono, depois o `update`.

**SQL — passo 1 (verificação de propriedade)**
```sql
SELECT "id", "userId"
FROM "Post"
WHERE "id" = $1
LIMIT 1;
```

**SQL — passo 2 (atualização)**
```sql
UPDATE "Post"
SET "content" = $2,
    "imgUrl"  = $3
WHERE "id" = $1
RETURNING "id", "content", "userId", "imgUrl", "createdAt";
```

**SQL — versão em instrução única (checagem de dono no próprio WHERE)**
```sql
UPDATE "Post"
SET "content" = $2,
    "imgUrl"  = $3
WHERE "id" = $1
  AND "userId" = $4      -- $4 = id do usuário autenticado
RETURNING "id", "content", "userId", "imgUrl", "createdAt";
```
> Nenhuma linha retornada = post inexistente **ou** de outro dono. A versão em dois
> passos permite distinguir 404 (`NotFoundException`) de 401 (`UnauthorizedException`),
> que é o que o serviço faz.

### 4.6 `remove` — Deletar post

**SQL — passo 1**
```sql
SELECT "id", "userId" FROM "Post" WHERE "id" = $1 LIMIT 1;
```

**SQL — passo 2**
```sql
DELETE FROM "Post"
WHERE "id" = $1
RETURNING "id", "content", "userId", "imgUrl", "createdAt";
```

**Versão única**
```sql
DELETE FROM "Post"
WHERE "id" = $1 AND "userId" = $2
RETURNING "id", "content", "userId", "imgUrl", "createdAt";
```

---

## 5. Módulo Complaint (`src/modules/complaint/complaint.service.ts`)

### 5.1 `create` — Registrar denúncia

**Prisma**
```ts
this.prisma.complaint.create({
  data: { title, content, danger, store, link, userId },
});
```

**SQL**
```sql
INSERT INTO "Complaint"
    ("id", "title", "content", "danger", "store", "link", "userId", "createdAt")
VALUES
    (uuid_generate_v4()::TEXT, $1, $2, COALESCE($3, 'aviso'), $4, $5, $6, CURRENT_TIMESTAMP)
RETURNING "id", "title", "content", "danger", "store", "link", "userId", "createdAt";
```
> `COALESCE($3, 'aviso')` reproduz o `@default("aviso")` do schema quando o campo
> `danger` não é enviado.

### 5.2 `findAll` — Listagem paginada

**SQL — primeira página**
```sql
SELECT "id", "title", "content", "danger", "store", "link", "userId", "createdAt"
FROM "Complaint"
ORDER BY "createdAt" DESC
LIMIT $1;
```

**SQL — com cursor**
```sql
SELECT c."id", c."title", c."content", c."danger", c."store", c."link",
       c."userId", c."createdAt"
FROM "Complaint" c
WHERE c."createdAt" < (SELECT x."createdAt" FROM "Complaint" x WHERE x."id" = $2)
ORDER BY c."createdAt" DESC
LIMIT $1;
```

### 5.3 `findByUser` — Denúncias de um usuário

```sql
SELECT "id", "title", "content", "danger", "store", "link", "userId", "createdAt"
FROM "Complaint"
WHERE "userId" = $2
ORDER BY "createdAt" DESC
LIMIT $1;
```

Com cursor:
```sql
SELECT c."id", c."title", c."content", c."danger", c."store", c."link",
       c."userId", c."createdAt"
FROM "Complaint" c
WHERE c."userId" = $2
  AND c."createdAt" < (SELECT x."createdAt" FROM "Complaint" x WHERE x."id" = $3)
ORDER BY c."createdAt" DESC
LIMIT $1;
```

### 5.4 `findOne` — Buscar denúncia por id

```sql
SELECT "id", "title", "content", "danger", "store", "link", "userId", "createdAt"
FROM "Complaint"
WHERE "id" = $1
LIMIT 1;
```

### 5.5 `update` — Atualizar denúncia

**Passo 1 — verificar dono**
```sql
SELECT "id", "userId" FROM "Complaint" WHERE "id" = $1 LIMIT 1;
```

**Passo 2 — atualizar**
```sql
UPDATE "Complaint"
SET "title"   = $2,
    "content" = $3,
    "danger"  = $4,
    "store"   = $5,
    "link"    = $6
WHERE "id" = $1
RETURNING "id", "title", "content", "danger", "store", "link", "userId", "createdAt";
```

**Versão única, com dono no WHERE**
```sql
UPDATE "Complaint"
SET "title"   = $2,
    "content" = $3,
    "danger"  = $4,
    "store"   = $5,
    "link"    = $6
WHERE "id" = $1 AND "userId" = $7
RETURNING "id", "title", "content", "danger", "store", "link", "userId", "createdAt";
```

### 5.6 `remove` — Deletar denúncia

```sql
SELECT "id", "userId" FROM "Complaint" WHERE "id" = $1 LIMIT 1;

DELETE FROM "Complaint"
WHERE "id" = $1
RETURNING "id", "title", "content", "danger", "store", "link", "userId", "createdAt";
```

Versão única:
```sql
DELETE FROM "Complaint"
WHERE "id" = $1 AND "userId" = $2
RETURNING "id", "title", "content", "danger", "store", "link", "userId", "createdAt";
```

---

## 6. Módulo Article (`src/modules/article/article.service.ts`)

### 6.1 `create` — Criar artigo

```sql
INSERT INTO "Article" ("id", "title", "content", "bgUrl", "userId", "createdAt")
VALUES (uuid_generate_v4()::TEXT, $1, $2, $3, $4, CURRENT_TIMESTAMP)
RETURNING "id", "bgUrl", "title", "content", "userId", "createdAt";
```

### 6.2 `findAll` — Listagem paginada

```sql
SELECT "id", "bgUrl", "title", "content", "userId", "createdAt"
FROM "Article"
ORDER BY "createdAt" DESC
LIMIT $1;
```

Com cursor:
```sql
SELECT a."id", a."bgUrl", a."title", a."content", a."userId", a."createdAt"
FROM "Article" a
WHERE a."createdAt" < (SELECT x."createdAt" FROM "Article" x WHERE x."id" = $2)
ORDER BY a."createdAt" DESC
LIMIT $1;
```

### 6.3 `findByUser` — Artigos de um usuário

```sql
SELECT "id", "bgUrl", "title", "content", "userId", "createdAt"
FROM "Article"
WHERE "userId" = $2
ORDER BY "createdAt" DESC
LIMIT $1;
```

Com cursor:
```sql
SELECT a."id", a."bgUrl", a."title", a."content", a."userId", a."createdAt"
FROM "Article" a
WHERE a."userId" = $2
  AND a."createdAt" < (SELECT x."createdAt" FROM "Article" x WHERE x."id" = $3)
ORDER BY a."createdAt" DESC
LIMIT $1;
```

### 6.4 `findOne` — Buscar artigo por id

```sql
SELECT "id", "bgUrl", "title", "content", "userId", "createdAt"
FROM "Article"
WHERE "id" = $1
LIMIT 1;
```

### 6.5 `update` — Atualizar artigo

```sql
SELECT "id", "userId" FROM "Article" WHERE "id" = $1 LIMIT 1;

UPDATE "Article"
SET "title"   = $2,
    "content" = $3,
    "bgUrl"   = $4
WHERE "id" = $1
RETURNING "id", "bgUrl", "title", "content", "userId", "createdAt";
```

Versão única:
```sql
UPDATE "Article"
SET "title"   = $2,
    "content" = $3,
    "bgUrl"   = $4
WHERE "id" = $1 AND "userId" = $5
RETURNING "id", "bgUrl", "title", "content", "userId", "createdAt";
```

### 6.6 `remove` — Deletar artigo

```sql
SELECT "id", "userId" FROM "Article" WHERE "id" = $1 LIMIT 1;

DELETE FROM "Article"
WHERE "id" = $1
RETURNING "id", "bgUrl", "title", "content", "userId", "createdAt";
```

Versão única:
```sql
DELETE FROM "Article"
WHERE "id" = $1 AND "userId" = $2
RETURNING "id", "bgUrl", "title", "content", "userId", "createdAt";
```

---

## 7. Módulo Like (`src/modules/like/like.service.ts`)

### 7.1 `create` — Curtir post

**Prisma** — `$transaction` com array: as duas operações rodam em ordem, numa única ida ao
banco e na mesma transação, então o `count` já enxerga o `INSERT`.
```ts
this.prisma.$transaction([
  this.prisma.like.create({ data: { postId: dto.postId, userId } }),
  this.prisma.like.count({ where: { postId: dto.postId } }),
]);
```

**SQL**
```sql
BEGIN;

INSERT INTO "Like" ("id", "userId", "postId", "createdAt")
VALUES (uuid_generate_v4()::TEXT, $1, $2, CURRENT_TIMESTAMP)
RETURNING "id", "userId", "postId", "createdAt";

SELECT COUNT(*) AS "total" FROM "Like" WHERE "postId" = $2;

COMMIT;
```
> A mutação devolve `{ postId, total, liked: true }` em vez da linha inserida: é o estado
> que o cliente precisa depois de curtir. Sem o `COUNT` na mesma transação, o total poderia
> vir de um instante diferente do `INSERT`.
>
> Em SQL puro dá para fazer numa instrução só, com CTE:
> ```sql
> WITH inserida AS (
>     INSERT INTO "Like" ("id", "userId", "postId", "createdAt")
>     VALUES (uuid_generate_v4()::TEXT, $1, $2, CURRENT_TIMESTAMP)
>     RETURNING "postId"
> )
> SELECT i."postId", COUNT(l."id") AS "total", TRUE AS "liked"
> FROM inserida i
> LEFT JOIN "Like" l ON l."postId" = i."postId"
> GROUP BY i."postId";
> ```
>
> Dois erros do Prisma são traduzidos aqui:
> `P2002` (violação de `UNIQUE ("userId","postId")`, SQLSTATE `23505`) vira
> `ConflictException('Você já curtiu este post')`, e `P2003` (violação da FK de `postId`,
> SQLSTATE `23503`) vira `NotFoundException('Post não encontrado')`.
>
> Versão idempotente em SQL puro, que não estoura na curtida repetida:
> ```sql
> INSERT INTO "Like" ("id", "userId", "postId", "createdAt")
> VALUES (uuid_generate_v4()::TEXT, $1, $2, CURRENT_TIMESTAMP)
> ON CONFLICT ("userId", "postId") DO NOTHING
> RETURNING "id", "userId", "postId", "createdAt";
> ```
> O serviço **não** usa essa versão de propósito: devolver `409` informa ao frontend que o
> estado dele estava desatualizado.

### 7.2 `findByPost` — Quem curtiu o post (paginado)

**Prisma**
```ts
this.prisma.like.findMany({
  take: take + 1,
  cursor: dto.cursor ? { id: dto.cursor } : undefined,
  skip: dto.cursor ? 1 : 0,
  orderBy: { createdAt: 'desc' },
  where: { postId },
  include: { user: { select: { id: true, name: true } } },
});
```

**SQL — primeira página**
```sql
SELECT l."id", l."userId", l."postId", l."createdAt",
       u."id" AS "user.id", u."name" AS "user.name"
FROM "Like" l
INNER JOIN "User" u ON u."id" = l."userId"
WHERE l."postId" = $2
ORDER BY l."createdAt" DESC
LIMIT $1;
```
> `include` de relação obrigatória (`userId` é `NOT NULL`) corresponde a `INNER JOIN`.
> O Prisma monta o objeto `user` aninhado a partir das colunas do JOIN.

**SQL — com cursor**
```sql
SELECT l."id", l."userId", l."postId", l."createdAt",
       u."id" AS "user.id", u."name" AS "user.name"
FROM "Like" l
INNER JOIN "User" u ON u."id" = l."userId"
WHERE l."postId" = $2
  AND l."createdAt" < (SELECT x."createdAt" FROM "Like" x WHERE x."id" = $3)
ORDER BY l."createdAt" DESC
LIMIT $1;
```

### 7.3 `findByUser` — Curtidas de um usuário (paginado)

**SQL**
```sql
SELECT "id", "userId", "postId", "createdAt"
FROM "Like"
WHERE "userId" = $2
ORDER BY "createdAt" DESC
LIMIT $1;
```

### 7.4 `remove` — Descurtir post

**Prisma** — `deleteMany` + `count` numa só transação. `deleteMany` casa no par
`("userId","postId")` sem precisar de um `findUnique` antes, e devolve a contagem de linhas
afetadas em vez de lançar `P2025` quando não encontra nada.
```ts
this.prisma.$transaction([
  this.prisma.like.deleteMany({ where: { userId, postId } }),
  this.prisma.like.count({ where: { postId } }),
]);
```

**SQL**
```sql
BEGIN;

DELETE FROM "Like"
WHERE "userId" = $2 AND "postId" = $1;      -- afeta 0 ou 1 linha (UNIQUE do par)

SELECT COUNT(*) AS "total" FROM "Like" WHERE "postId" = $1;

COMMIT;
```
> Zero linhas afetadas pelo `DELETE` = `404`. Não há `401` possível: a curtida localizada
> pelo par `("userId","postId")` já é, por definição, a do próprio usuário.
>
> O `DELETE` sem `RETURNING` é intencional — a linha apagada não interessa, só a contagem
> de afetadas (`deleted.count`) e o novo total. A mutação devolve
> `{ postId, total, liked: false }`.
>
> Versão em instrução única, com CTE:
> ```sql
> WITH removida AS (
>     DELETE FROM "Like"
>     WHERE "userId" = $2 AND "postId" = $1
>     RETURNING "postId"
> )
> SELECT $1 AS "postId",
>        (SELECT COUNT(*) FROM "Like" WHERE "postId" = $1) AS "total",
>        FALSE AS "liked",
>        EXISTS (SELECT 1 FROM removida) AS "existia";
> ```
> `existia = false` é o `404`.

---

## 8. Módulo Comment (`src/modules/comment/comment.service.ts`)

### 8.1 `create` — Comentar post

**Prisma**
```ts
this.prisma.comment.create({
  data: { content: dto.content, postId: dto.postId, userId },
});
```

**SQL**
```sql
INSERT INTO "Comment" ("id", "content", "userId", "postId", "createdAt")
VALUES (uuid_generate_v4()::TEXT, $1, $2, $3, CURRENT_TIMESTAMP)
RETURNING "id", "content", "userId", "postId", "createdAt";
```
> Sem UNIQUE: o mesmo usuário pode comentar o mesmo post quantas vezes quiser.
> Só `P2003` (FK de `postId`) é tratado, virando `404`.

### 8.2 `findByPost` — Comentários de um post (paginado)

**SQL — primeira página**
```sql
SELECT c."id", c."content", c."userId", c."postId", c."createdAt",
       u."id" AS "user.id", u."name" AS "user.name"
FROM "Comment" c
INNER JOIN "User" u ON u."id" = c."userId"
WHERE c."postId" = $2
ORDER BY c."createdAt" DESC
LIMIT $1;
```

**SQL — com cursor**
```sql
SELECT c."id", c."content", c."userId", c."postId", c."createdAt",
       u."id" AS "user.id", u."name" AS "user.name"
FROM "Comment" c
INNER JOIN "User" u ON u."id" = c."userId"
WHERE c."postId" = $2
  AND c."createdAt" < (SELECT x."createdAt" FROM "Comment" x WHERE x."id" = $3)
ORDER BY c."createdAt" DESC
LIMIT $1;
```

### 8.3 `findByUser` — Comentários de um usuário (paginado)

```sql
SELECT "id", "content", "userId", "postId", "createdAt"
FROM "Comment"
WHERE "userId" = $2
ORDER BY "createdAt" DESC
LIMIT $1;
```

### 8.4 `findOne` — Buscar comentário por id

```sql
SELECT "id", "content", "userId", "postId", "createdAt"
FROM "Comment"
WHERE "id" = $1
LIMIT 1;
```

### 8.5 `update` — Editar comentário (somente o autor)

**SQL — passo 1 (verificar dono)**
```sql
SELECT "id", "userId" FROM "Comment" WHERE "id" = $1 LIMIT 1;
```

**SQL — passo 2**
```sql
UPDATE "Comment"
SET "content" = $2
WHERE "id" = $1
RETURNING "id", "content", "userId", "postId", "createdAt";
```

**Versão única, com dono no WHERE**
```sql
UPDATE "Comment"
SET "content" = $2
WHERE "id" = $1 AND "userId" = $3
RETURNING "id", "content", "userId", "postId", "createdAt";
```

### 8.6 `remove` — Deletar comentário (autor do comentário ou autor do post)

**Prisma**
```ts
this.prisma.comment.findUnique({
  where: { id },
  include: { post: { select: { userId: true } } },
});
```

**SQL — passo 1 (traz o dono do comentário e o dono do post)**
```sql
SELECT c."id", c."userId", p."userId" AS "post.userId"
FROM "Comment" c
INNER JOIN "Post" p ON p."id" = c."postId"
WHERE c."id" = $1
LIMIT 1;
```

**SQL — passo 2**
```sql
DELETE FROM "Comment"
WHERE "id" = $1
RETURNING "id", "content", "userId", "postId", "createdAt";
```

**Versão única, com a regra de permissão no WHERE**
```sql
DELETE FROM "Comment" c
WHERE c."id" = $1
  AND (
      c."userId" = $2                                     -- autor do comentário
      OR EXISTS (                                         -- ou autor do post
          SELECT 1 FROM "Post" p
          WHERE p."id" = c."postId" AND p."userId" = $2
      )
  )
RETURNING c."id", c."content", c."userId", c."postId", c."createdAt";
```
> É a única regra de autorização do projeto com dois donos possíveis: o `OR EXISTS`
> permite que o autor do post modere comentários de terceiros no post dele.

---

## 9. Módulo Friendship (`src/modules/friendship/friendship.service.ts`)

A tabela `"Friendship"` é um **auto-relacionamento** de `"User"`: as duas FKs
(`requesterId` e `addresseeId`) apontam para a mesma tabela. Por isso quase toda query
aqui precisa olhar os dois sentidos da relação.

### 9.1 `create` — Enviar pedido de amizade

**Prisma** — três queries: destinatário existe, relação já existe (nos dois sentidos), insere.
```ts
this.prisma.user.findUnique({ where: { id: dto.addresseeId } });

this.prisma.friendship.findFirst({
  where: {
    OR: [
      { requesterId, addresseeId: dto.addresseeId },
      { requesterId: dto.addresseeId, addresseeId: requesterId },
    ],
  },
});

this.prisma.friendship.create({
  data: { requesterId, addresseeId: dto.addresseeId },
});
```

**SQL — passo 1 (destinatário existe?)**
```sql
SELECT "id" FROM "User" WHERE "id" = $2 LIMIT 1;
```

**SQL — passo 2 (já existe relação em qualquer sentido?)**
```sql
SELECT "id", "requesterId", "addresseeId", "status"
FROM "Friendship"
WHERE ("requesterId" = $1 AND "addresseeId" = $2)
   OR ("requesterId" = $2 AND "addresseeId" = $1)
LIMIT 1;
```
> O `OR` é o que impede A→B e B→A coexistirem. A constraint
> `UNIQUE ("requesterId","addresseeId")` só cobre o mesmo sentido, então essa checagem
> **tem** que acontecer na aplicação. O resultado define qual `409` é devolvido:
> `status = 'ACCEPTED'` → "Vocês já são amigos"; `requesterId = $1` → "Pedido já enviado";
> caso restante → "Este usuário já te enviou um pedido".

**SQL — passo 3 (insere)**
```sql
INSERT INTO "Friendship" ("id", "requesterId", "addresseeId", "status", "createdAt")
VALUES (uuid_generate_v4()::TEXT, $1, $2, 'PENDING', CURRENT_TIMESTAMP)
RETURNING "id", "requesterId", "addresseeId", "status", "createdAt";
```
> A checagem `addresseeId = requesterId` (pedido para si mesmo → `400`) é feita antes de
> qualquer SQL. Em SQL puro, seria um `CHECK ("requesterId" <> "addresseeId")` na tabela.

### 9.2 `findReceived` — Pedidos pendentes recebidos (paginado)

**Prisma**
```ts
this.prisma.friendship.findMany({
  take: take + 1,
  cursor: dto.cursor ? { id: dto.cursor } : undefined,
  skip: dto.cursor ? 1 : 0,
  orderBy: { createdAt: 'desc' },
  where: { addresseeId: userId, status: FriendshipStatus.PENDING },
  include: { requester: { select: { id: true, name: true } } },
});
```

**SQL**
```sql
SELECT f."id", f."requesterId", f."addresseeId", f."status", f."createdAt",
       u."id" AS "requester.id", u."name" AS "requester.name"
FROM "Friendship" f
INNER JOIN "User" u ON u."id" = f."requesterId"
WHERE f."addresseeId" = $2
  AND f."status" = 'PENDING'
ORDER BY f."createdAt" DESC
LIMIT $1;
```
> Atendido pelo índice `("addresseeId","status","createdAt")`.

### 9.3 `findSent` — Pedidos pendentes enviados (paginado)

```sql
SELECT f."id", f."requesterId", f."addresseeId", f."status", f."createdAt",
       u."id" AS "addressee.id", u."name" AS "addressee.name"
FROM "Friendship" f
INNER JOIN "User" u ON u."id" = f."addresseeId"
WHERE f."requesterId" = $2
  AND f."status" = 'PENDING'
ORDER BY f."createdAt" DESC
LIMIT $1;
```
> Mesma query do 9.2 com os papéis invertidos; atendida pelo índice
> `("requesterId","status","createdAt")`.

### 9.4 `findFriends` — Lista de amigos de um usuário (paginado)

**Prisma**
```ts
this.prisma.friendship.findMany({
  take: take + 1,
  cursor: dto.cursor ? { id: dto.cursor } : undefined,
  skip: dto.cursor ? 1 : 0,
  orderBy: { createdAt: 'desc' },
  where: {
    status: FriendshipStatus.ACCEPTED,
    OR: [{ requesterId: id }, { addresseeId: id }],
  },
  include: {
    requester: { select: { id: true, name: true } },
    addressee: { select: { id: true, name: true } },
  },
});
```

**SQL — como o Prisma faz** (traz os dois lados; o serviço escolhe em JS qual é o amigo)
```sql
SELECT f."id", f."requesterId", f."addresseeId", f."createdAt",
       r."id" AS "requester.id", r."name" AS "requester.name",
       a."id" AS "addressee.id", a."name" AS "addressee.name"
FROM "Friendship" f
INNER JOIN "User" r ON r."id" = f."requesterId"
INNER JOIN "User" a ON a."id" = f."addresseeId"
WHERE f."status" = 'ACCEPTED'
  AND ($2 IN (f."requesterId", f."addresseeId"))
ORDER BY f."createdAt" DESC
LIMIT $1;
```

**SQL — resolvendo o amigo no próprio banco** (`CASE`, sem precisar de JS)
```sql
SELECT f."id"        AS "friendshipId",
       f."createdAt" AS "friendsSince",
       u."id"        AS "userId",
       u."name"      AS "userName"
FROM "Friendship" f
INNER JOIN "User" u
        ON u."id" = CASE WHEN f."requesterId" = $2
                         THEN f."addresseeId"
                         ELSE f."requesterId"
                    END
WHERE f."status" = 'ACCEPTED'
  AND ($2 IN (f."requesterId", f."addresseeId"))
ORDER BY f."createdAt" DESC
LIMIT $1;
```
> É o `CASE` que o serviço reproduz em TypeScript:
> `friendship.requesterId === id ? friendship.addressee : friendship.requester`.
> O Prisma não expressa um JOIN condicional assim, por isso os dois lados vêm e a
> escolha acontece no `.map()`.

**Alternativa com `UNION ALL`** (duas buscas indexadas em vez de um `OR`):
```sql
SELECT f."id" AS "friendshipId", f."createdAt" AS "friendsSince",
       f."addresseeId" AS "friendId"
FROM "Friendship" f
WHERE f."requesterId" = $2 AND f."status" = 'ACCEPTED'
UNION ALL
SELECT f."id", f."createdAt", f."requesterId"
FROM "Friendship" f
WHERE f."addresseeId" = $2 AND f."status" = 'ACCEPTED'
ORDER BY "friendsSince" DESC
LIMIT $1;
```

### 9.5 `findStatus` — Relação entre dois usuários

**Prisma**
```ts
this.prisma.friendship.findFirst({
  where: {
    OR: [
      { requesterId: userId, addresseeId: id },
      { requesterId: id, addresseeId: userId },
    ],
  },
});
```

**SQL**
```sql
SELECT "id", "requesterId", "addresseeId", "status"
FROM "Friendship"
WHERE ("requesterId" = $1 AND "addresseeId" = $2)
   OR ("requesterId" = $2 AND "addresseeId" = $1)
LIMIT 1;
```

**Versão que já devolve o rótulo da relação**
```sql
SELECT f."id" AS "friendshipId",
       CASE
           WHEN f."status" = 'ACCEPTED'      THEN 'friends'
           WHEN f."requesterId" = $1         THEN 'pending_sent'
           ELSE                                   'pending_received'
       END AS "relation"
FROM "Friendship" f
WHERE ("requesterId" = $1 AND "addresseeId" = $2)
   OR ("requesterId" = $2 AND "addresseeId" = $1)
LIMIT 1;
```
> Nenhuma linha = `relation: 'none'`. O caso `relation: 'self'` ($1 = $2) é resolvido
> antes do SQL, sem ida ao banco.

### 9.6 `accept` — Aceitar pedido de amizade

**SQL — passo 1 (verificar destinatário e status)**
```sql
SELECT "id", "requesterId", "addresseeId", "status"
FROM "Friendship"
WHERE "id" = $1
LIMIT 1;
```

**SQL — passo 2**
```sql
UPDATE "Friendship"
SET "status" = 'ACCEPTED'
WHERE "id" = $1
RETURNING "id", "requesterId", "addresseeId", "status", "createdAt";
```

**Versão única, com a regra toda no WHERE**
```sql
UPDATE "Friendship"
SET "status" = 'ACCEPTED'
WHERE "id" = $1
  AND "addresseeId" = $2        -- só o destinatário aceita
  AND "status" = 'PENDING'      -- e só se ainda estiver pendente
RETURNING "id", "requesterId", "addresseeId", "status", "createdAt";
```
> Os dois passos existem para separar os três erros: `404` (não existe),
> `401` (não é o destinatário) e `409` (já estava aceito). A versão única devolve
> zero linhas nos três casos, sem dizer qual aconteceu.

### 9.7 `remove` — Cancelar, recusar ou desfazer amizade

**SQL — passo 1**
```sql
SELECT "id", "requesterId", "addresseeId" FROM "Friendship" WHERE "id" = $1 LIMIT 1;
```

**SQL — passo 2**
```sql
DELETE FROM "Friendship"
WHERE "id" = $1
RETURNING "id", "requesterId", "addresseeId", "status", "createdAt";
```

**Versão única**
```sql
DELETE FROM "Friendship"
WHERE "id" = $1
  AND $2 IN ("requesterId", "addresseeId")    -- qualquer um dos dois lados
RETURNING "id", "requesterId", "addresseeId", "status", "createdAt";
```
> Um único `DELETE` cobre as três operações do fluxo — cancelar pedido enviado, recusar
> pedido recebido e desfazer amizade — porque todas resultam na ausência da linha.
> É por isso que não existe status `REJECTED` no enum.

---

## 10. Queries derivadas (não estão no código, mas o modelo permite)

Consultas que o schema torna possíveis — úteis para demonstrar JOIN, agregação e
subconsulta em trabalho acadêmico.

### 10.1 Posts com dados do autor (INNER JOIN)
```sql
SELECT p."id", p."content", p."imgUrl", p."createdAt",
       u."id" AS "autorId", u."name" AS "autorNome"
FROM "Post" p
INNER JOIN "User" u ON u."id" = p."userId"
ORDER BY p."createdAt" DESC
LIMIT 10;
```

### 10.2 Denúncias com autor, filtrando por nível de perigo
```sql
SELECT c."title", c."danger", c."store", c."createdAt", u."name" AS "autor"
FROM "Complaint" c
JOIN "User" u ON u."id" = c."userId"
WHERE c."danger" = 'alto'
ORDER BY c."createdAt" DESC;
```

### 10.3 Contagem de conteúdo por usuário (agregação + LEFT JOIN)
```sql
SELECT u."id", u."name", u."email",
       COUNT(DISTINCT p."id") AS "totalPosts",
       COUNT(DISTINCT c."id") AS "totalDenuncias",
       COUNT(DISTINCT a."id") AS "totalArtigos"
FROM "User" u
LEFT JOIN "Post"      p ON p."userId" = u."id"
LEFT JOIN "Complaint" c ON c."userId" = u."id"
LEFT JOIN "Article"   a ON a."userId" = u."id"
GROUP BY u."id", u."name", u."email"
ORDER BY "totalPosts" DESC;
```

### 10.4 Denúncias agrupadas por nível de perigo
```sql
SELECT "danger", COUNT(*) AS "quantidade"
FROM "Complaint"
GROUP BY "danger"
ORDER BY "quantidade" DESC;
```

### 10.5 Lojas mais denunciadas (GROUP BY + HAVING)
```sql
SELECT "store", COUNT(*) AS "denuncias"
FROM "Complaint"
WHERE "store" IS NOT NULL
GROUP BY "store"
HAVING COUNT(*) > 1
ORDER BY "denuncias" DESC
LIMIT 10;
```

### 10.6 Usuários sem nenhum post (subconsulta com NOT EXISTS)
```sql
SELECT u."id", u."name", u."email"
FROM "User" u
WHERE NOT EXISTS (
    SELECT 1 FROM "Post" p WHERE p."userId" = u."id"
);
```

### 10.7 Feed unificado dos três tipos de conteúdo (UNION ALL)
```sql
SELECT "id", 'post' AS "tipo", "content" AS "texto", "createdAt", "userId"
FROM "Post"
UNION ALL
SELECT "id", 'denuncia' AS "tipo", "title" AS "texto", "createdAt", "userId"
FROM "Complaint"
UNION ALL
SELECT "id", 'artigo' AS "tipo", "title" AS "texto", "createdAt", "userId"
FROM "Article"
ORDER BY "createdAt" DESC
LIMIT 20;
```

### 10.8 Último post de cada usuário (window function)
```sql
SELECT "id", "content", "userId", "createdAt"
FROM (
    SELECT p.*,
           ROW_NUMBER() OVER (PARTITION BY p."userId" ORDER BY p."createdAt" DESC) AS rn
    FROM "Post" p
) t
WHERE rn = 1;
```

### 10.9 Denúncias dos últimos 7 dias
```sql
SELECT "id", "title", "danger", "createdAt"
FROM "Complaint"
WHERE "createdAt" >= CURRENT_TIMESTAMP - INTERVAL '7 days'
ORDER BY "createdAt" DESC;
```

### 10.10 Busca textual em artigos (ILIKE)
```sql
SELECT "id", "title", "createdAt"
FROM "Article"
WHERE "title"   ILIKE '%' || $1 || '%'
   OR "content" ILIKE '%' || $1 || '%'
ORDER BY "createdAt" DESC
LIMIT 20;
```

### 10.11 Posts mais curtidos (ranking com agregação)
```sql
SELECT p."id", p."content", u."name" AS "autor",
       COUNT(l."id") AS "curtidas"
FROM "Post" p
INNER JOIN "User" u ON u."id" = p."userId"
LEFT  JOIN "Like" l ON l."postId" = p."id"
GROUP BY p."id", p."content", u."name"
ORDER BY "curtidas" DESC
LIMIT 10;
```
> `LEFT JOIN` em vez de `INNER`: posts sem curtida ainda aparecem, com `curtidas = 0`.

### 10.12 Feed só com posts dos amigos (auto-relacionamento + IN)
```sql
SELECT p."id", p."content", p."createdAt", u."name" AS "autor"
FROM "Post" p
INNER JOIN "User" u ON u."id" = p."userId"
WHERE p."userId" IN (
    SELECT CASE WHEN f."requesterId" = $1
                THEN f."addresseeId"
                ELSE f."requesterId"
           END
    FROM "Friendship" f
    WHERE f."status" = 'ACCEPTED'
      AND $1 IN (f."requesterId", f."addresseeId")
)
ORDER BY p."createdAt" DESC
LIMIT 20;
```
> A subconsulta é a lista de amigos do item 9.4 reaproveitada como filtro.

### 10.13 Amigos em comum entre dois usuários (INTERSECT)
```sql
SELECT CASE WHEN f."requesterId" = $1 THEN f."addresseeId" ELSE f."requesterId" END
FROM "Friendship" f
WHERE f."status" = 'ACCEPTED' AND $1 IN (f."requesterId", f."addresseeId")
INTERSECT
SELECT CASE WHEN f."requesterId" = $2 THEN f."addresseeId" ELSE f."requesterId" END
FROM "Friendship" f
WHERE f."status" = 'ACCEPTED' AND $2 IN (f."requesterId", f."addresseeId");
```

### 10.14 Usuários com mais pedidos de amizade pendentes (GROUP BY + filtro por enum)
```sql
SELECT u."id", u."name", COUNT(f."id") AS "pendentes"
FROM "User" u
INNER JOIN "Friendship" f ON f."addresseeId" = u."id"
WHERE f."status" = 'PENDING'
GROUP BY u."id", u."name"
ORDER BY "pendentes" DESC
LIMIT 10;
```

### 10.15 Engajamento de um post (curtidas + comentários em uma linha)
```sql
SELECT p."id",
       (SELECT COUNT(*) FROM "Like"    l WHERE l."postId" = p."id") AS "curtidas",
       (SELECT COUNT(*) FROM "Comment" c WHERE c."postId" = p."id") AS "comentarios",
       (SELECT COUNT(DISTINCT x."userId")
        FROM (
            SELECT l."userId" FROM "Like"    l WHERE l."postId" = p."id"
            UNION
            SELECT c."userId" FROM "Comment" c WHERE c."postId" = p."id"
        ) x) AS "usuariosEngajados"
FROM "Post" p
WHERE p."id" = $1;
```
> `UNION` (sem `ALL`) já deduplica, mas o `COUNT(DISTINCT ...)` externo deixa a intenção
> explícita: quem curtiu **e** comentou conta uma vez só.

---

## 11. Resumo — mapa ORM → SQL

| Construção Prisma | SQL equivalente |
|---|---|
| `create({ data })` | `INSERT INTO ... VALUES ... RETURNING` |
| `findUnique({ where })` | `SELECT ... WHERE <coluna única> = $1 LIMIT 1` |
| `findFirst({ where })` | `SELECT ... WHERE ... LIMIT 1` |
| `findMany({ where })` | `SELECT ... WHERE ...` |
| `count({ where })` | `SELECT COUNT(*) ... WHERE ...` |
| `deleteMany({ where })` | `DELETE FROM ... WHERE ...` (devolve nº de afetadas, não lança `P2025`) |
| `$transaction([a, b])` | `BEGIN; a; b; COMMIT;` — uma ida ao banco, `b` já vê `a` |
| `select: { a: true }` | lista explícita de colunas no `SELECT` |
| `include: { relacao: true }` | `INNER JOIN` (relação obrigatória) ou `LEFT JOIN` (opcional) |
| `include: { _count: { select: { r: true } } }` | `(SELECT COUNT(*) FROM "R" WHERE ...)` correlacionado |
| `where: { OR: [ ... ] }` | `WHERE (...) OR (...)` |
| `orderBy: { campo: 'desc' }` | `ORDER BY "campo" DESC` |
| `take: n` | `LIMIT n` |
| `skip: n` | `OFFSET n` |
| `cursor` + `skip: 1` | `WHERE "campo" < (SELECT "campo" ... WHERE "id" = cursor)` |
| `update({ where, data })` | `UPDATE ... SET ... WHERE ... RETURNING` |
| `delete({ where })` | `DELETE FROM ... WHERE ... RETURNING` |
| `@unique` | `CONSTRAINT ... UNIQUE (coluna)` |
| `@relation(onDelete: Cascade)` | `FOREIGN KEY ... ON DELETE CASCADE` |
| `@default(now())` | `DEFAULT CURRENT_TIMESTAMP` |
| `@default(uuid())` | `DEFAULT uuid_generate_v4()::TEXT` |
| `@@unique([a, b])` | `CONSTRAINT ... UNIQUE ("a", "b")` |
| `@@index([a, b])` | `CREATE INDEX ... ON "T" ("a", "b")` |
| `enum X { A B }` | `CREATE TYPE "X" AS ENUM ('A', 'B')` |
| `@relation("Nome", ...)` duplicada | duas FKs para a mesma tabela (auto-relacionamento) |
| erro `P2002` | violação de UNIQUE (SQLSTATE `23505`) |
| erro `P2003` | violação de FOREIGN KEY (SQLSTATE `23503`) |
| erro `P2025` | `UPDATE`/`DELETE` que não atingiu nenhuma linha |
