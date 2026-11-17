# SecurityOn Backend — Queries Prisma traduzidas para SQL

Documento acadêmico. Cada query do ORM (Prisma) usada no projeto está traduzida para
o SQL equivalente em **PostgreSQL** (`provider = "postgresql"` em `prisma/schema.prisma`).

> Observação: o Prisma faz *quoting* de identificadores em PascalCase, então as tabelas
> são referenciadas como `"User"`, `"Post"`, `"Complaint"`, `"Article"` e `"Like"`.

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

-- Índices criados pela migration (declarados com @@index no schema)
CREATE INDEX "Like_postId_createdAt_idx"    ON "Like"    ("postId", "createdAt");

-- Índices recomendados para as consultas paginadas por usuário
CREATE INDEX "Post_userId_createdAt_idx"      ON "Post"      ("userId", "createdAt" DESC);
CREATE INDEX "Complaint_userId_createdAt_idx" ON "Complaint" ("userId", "createdAt" DESC);
CREATE INDEX "Article_userId_createdAt_idx"   ON "Article"   ("userId", "createdAt" DESC);
```

### Modelo relacional (resumo)

| Tabela | PK | FK | Cardinalidade |
|---|---|---|---|
| `User` | `id` | — | 1 : N com Post, Complaint, Article e Like |
| `Post` | `id` | `userId → User.id` | N : 1 |
| `Complaint` | `id` | `userId → User.id` | N : 1 |
| `Article` | `id` | `userId → User.id` | N : 1 |
| `Like` | `id` | `userId → User.id`, `postId → Post.id` | tabela associativa N : N entre User e Post |

Todas as FKs usam `ON DELETE CASCADE`: apagar um usuário apaga seus posts,
denúncias, artigos e curtidas; apagar um post apaga as curtidas daquele post.

Um detalhe de modelagem vale destaque:

- **`Like` é uma tabela associativa pura** (User ↔ Post) com `UNIQUE ("userId","postId")`.
  É a constraint UNIQUE que impede curtida duplicada — não há checagem na aplicação.

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
    _count: { select: { likes: true } },
    likes: { where: likedBy(userId), select: { id: true }, take: 1 },
  },
});
```

**SQL — primeira página (sem cursor)**
```sql
SELECT p."id", p."content", p."userId", p."imgUrl", p."createdAt",
       (SELECT COUNT(*) FROM "Like" l WHERE l."postId" = p."id") AS "likes",
       EXISTS (
           SELECT 1 FROM "Like" l
           WHERE l."postId" = p."id" AND l."userId" = $2
       ) AS "liked"
FROM "Post" p
ORDER BY p."createdAt" DESC
LIMIT $1;          -- $1 = take + 1, $2 = usuário logado (NULL se anônimo)
```

> Duas informações numa única query: a contagem vem do `include: { _count: ... }`
> (subconsulta correlacionada) e o `liked` vem da relação `likes` filtrada pelo usuário
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
    _count: { select: { likes: true } },
    likes: { where: likedBy(userId), select: { id: true }, take: 1 },
  },
});
```

**SQL — primeira página**
```sql
SELECT p."id", p."content", p."userId", p."imgUrl", p."createdAt",
       (SELECT COUNT(*) FROM "Like" l WHERE l."postId" = p."id") AS "likes",
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
    _count: { select: { likes: true } },
    likes: { where: likedBy(userId), select: { id: true }, take: 1 },
  },
});
```

**SQL**
```sql
SELECT p."id", p."content", p."userId", p."imgUrl", p."createdAt",
       (SELECT COUNT(*) FROM "Like" l WHERE l."postId" = p."id") AS "likes",
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

## 8. Queries derivadas (não estão no código, mas o modelo permite)

Consultas que o schema torna possíveis — úteis para demonstrar JOIN, agregação e
subconsulta em trabalho acadêmico.

### 8.1 Posts com dados do autor (INNER JOIN)
```sql
SELECT p."id", p."content", p."imgUrl", p."createdAt",
       u."id" AS "autorId", u."name" AS "autorNome"
FROM "Post" p
INNER JOIN "User" u ON u."id" = p."userId"
ORDER BY p."createdAt" DESC
LIMIT 10;
```

### 8.2 Denúncias com autor, filtrando por nível de perigo
```sql
SELECT c."title", c."danger", c."store", c."createdAt", u."name" AS "autor"
FROM "Complaint" c
JOIN "User" u ON u."id" = c."userId"
WHERE c."danger" = 'alto'
ORDER BY c."createdAt" DESC;
```

### 8.3 Contagem de conteúdo por usuário (agregação + LEFT JOIN)
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

### 8.4 Denúncias agrupadas por nível de perigo
```sql
SELECT "danger", COUNT(*) AS "quantidade"
FROM "Complaint"
GROUP BY "danger"
ORDER BY "quantidade" DESC;
```

### 8.5 Lojas mais denunciadas (GROUP BY + HAVING)
```sql
SELECT "store", COUNT(*) AS "denuncias"
FROM "Complaint"
WHERE "store" IS NOT NULL
GROUP BY "store"
HAVING COUNT(*) > 1
ORDER BY "denuncias" DESC
LIMIT 10;
```

### 8.6 Usuários sem nenhum post (subconsulta com NOT EXISTS)
```sql
SELECT u."id", u."name", u."email"
FROM "User" u
WHERE NOT EXISTS (
    SELECT 1 FROM "Post" p WHERE p."userId" = u."id"
);
```

### 8.7 Feed unificado dos três tipos de conteúdo (UNION ALL)
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

### 8.8 Último post de cada usuário (window function)
```sql
SELECT "id", "content", "userId", "createdAt"
FROM (
    SELECT p.*,
           ROW_NUMBER() OVER (PARTITION BY p."userId" ORDER BY p."createdAt" DESC) AS rn
    FROM "Post" p
) t
WHERE rn = 1;
```

### 8.9 Denúncias dos últimos 7 dias
```sql
SELECT "id", "title", "danger", "createdAt"
FROM "Complaint"
WHERE "createdAt" >= CURRENT_TIMESTAMP - INTERVAL '7 days'
ORDER BY "createdAt" DESC;
```

### 8.10 Busca textual em artigos (ILIKE)
```sql
SELECT "id", "title", "createdAt"
FROM "Article"
WHERE "title"   ILIKE '%' || $1 || '%'
   OR "content" ILIKE '%' || $1 || '%'
ORDER BY "createdAt" DESC
LIMIT 20;
```

### 8.11 Posts mais curtidos (ranking com agregação)
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

---

## 9. Resumo — mapa ORM → SQL

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
| erro `P2002` | violação de UNIQUE (SQLSTATE `23505`) |
| erro `P2003` | violação de FOREIGN KEY (SQLSTATE `23503`) |
| erro `P2025` | `UPDATE`/`DELETE` que não atingiu nenhuma linha |
