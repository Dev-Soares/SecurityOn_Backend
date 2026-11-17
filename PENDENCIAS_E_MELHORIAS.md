# PENDENCIAS E MELHORIAS - Backend (SecurityOn API)

> Revisado por: Engenheiro Staff+ | Data: 2026-03-25

---

## 🔴 CRITICO

### 1. Duplicacao massiva de codigo nos Services

**Descricao:** Os tres services (`PostService`, `ComplaintService`, `ArticleService`) possuem metodos `findAll()`, `findByUser()`, `update()`, `remove()` praticamente identicos. A logica de paginacao (cursor-based) esta copiada e colada 6 vezes.

**Por que e um problema:**
- Viola o principio DRY (Don't Repeat Yourself) de forma grave
- Viola o SRP do SOLID — cada service carrega responsabilidade de paginacao que nao lhe pertence
- Viola o Open/Closed — para mudar a logica de paginacao, voce precisa alterar 3 arquivos em 6 metodos
- Qualquer bug na paginacao precisa ser corrigido em 6 lugares
- Estimativa: ~30% do codigo de negocio e duplicado

**Como corrigir:**
- Criar um `PaginationService` generico que receba o modelo Prisma e execute a logica de cursor-based pagination uma unica vez
- Alternativa: criar um `BaseCrudService<T>` abstrato com os metodos comuns e cada service herda dele, sobrescrevendo apenas o que for especifico
- O mesmo vale para o padrao de autorizacao (verificar se `entity.userId === userId`) — extrair para um metodo utilitario ou guard

---

### 2. PaginationDto aceita `limit` como string sem validacao numerica

**Descricao:** No `pagination.dto.ts`, o campo `limit` e do tipo `string` e nao possui validacao de valor minimo/maximo. A unica protecao e um `if (take >= 100)` dentro de cada service.

**Por que e um problema:**
- Valores negativos passam pela validacao e podem causar comportamento inesperado no Prisma
- O `Number(dto.limit) || 10` falha silenciosamente para strings invalidas — `Number("abc")` retorna `NaN`, que vira `10` pelo fallback, mas `Number("-5")` retorna `-5` que e aceito
- A validacao deveria estar no DTO (camada de entrada), nao espalhada em 6 metodos de service
- Usar `InternalServerErrorException` (500) para input invalido esta semanticamente errado — deveria ser `BadRequestException` (400)

**Como corrigir:**
- Mudar o tipo para `number` com `@Type(() => Number)` do `class-transformer`
- Adicionar `@IsInt()`, `@Min(1)`, `@Max(100)` do `class-validator`
- Remover as verificacoes manuais dos services

---

### 3. Error handling engole o erro original

**Descricao:** Todos os catch blocks nos services descartam o erro real e lancam uma mensagem generica.

**Por que e um problema:**
- Em producao, voce nunca vai saber o que causou o erro — so vera "Erro ao criar post"
- Sem log do erro original, debugging se torna impossivel
- Erros de constraint do banco, timeout, conexao — tudo vira a mesma mensagem generica
- O `AllExceptionsFilter` captura a exception final, mas a causa raiz ja foi perdida

**Como corrigir:**
- Adicionar um Logger do NestJS em cada service (`private readonly logger = new Logger(PostService.name)`)
- Logar o erro original antes de lancar a exception: `this.logger.error('Falha ao criar post', error.stack)`
- Considerar criar exceptions customizadas com contexto adicional

---

### 4. Padrao de re-throw de exceptions e fragil e repetitivo

**Descricao:** Em todos os metodos `update()` e `remove()`, o catch block faz:
```
if (error instanceof NotFoundException) throw error;
if (error instanceof UnauthorizedException) throw error;
throw new InternalServerErrorException('...');
```
Isso esta repetido em 6+ metodos.

**Por que e um problema:**
- Se voce adicionar um novo tipo de exception (ex: `ForbiddenException`), precisa lembrar de adicionar em todos os catches
- E codigo boilerplate que polui a logica de negocio
- Viola DRY novamente

**Como corrigir:**
- Criar um metodo utilitario ou um filtro que trate isso automaticamente
- Alternativa mais simples: verificar se o erro ja e uma `HttpException` antes de encapsular: `if (error instanceof HttpException) throw error;`
- Isso cobre todos os tipos de exception HTTP de uma vez

---

### 5. Ausencia total de testes

**Descricao:** Nao existe nenhum arquivo de teste no projeto. O `prisma.mock.ts` existe mas esta incompleto e nao e usado.

**Por que e um problema:**
- Zero confianca em refatoracoes — qualquer mudanca pode quebrar algo silenciosamente
- Impossivel validar regressoes
- Para um projeto em producao, isso e inaceitavel
- O mock de Prisma existente nao inclui o modelo `article`

**Como corrigir:**
- Comecar com testes unitarios dos services (mockando o Prisma)
- Adicionar testes de integracao dos controllers
- Priorizar: autenticacao > CRUD operations > edge cases de paginacao
- Usar o mock do Prisma que ja existe como base, completando os modelos faltantes

---

## 🟡 MEDIO

### 6. Rotas da API com nomenclatura inconsistente

**Descricao:** As rotas `GET /article/all/:id` e `GET /post/all/:id` sao confusas — parecem buscar "todos os articles com id X", mas na verdade buscam "articles do usuario X".

**Por que e um problema:**
- A API nao segue convencoes RESTful
- "all/:id" e semanticamente contraditorio (buscar "todos" por "um id"?)
- Dificulta a compreensao da API por outros devs

**Como corrigir:**
- Renomear para `GET /posts/user/:userId` ou `GET /users/:userId/posts`
- Usar plural nos nomes de recurso (posts, articles, complaints)
- Seguir o padrao REST: recurso/identificador

---

### 7. Tipagem frouxa no TypeScript

**Descricao:** O `tsconfig.json` esta com `noImplicitAny: false`, `strictBindCallApply: false` e `noFallthroughCasesInSwitch: false`.

**Por que e um problema:**
- Perde-se grande parte da seguranca que o TypeScript oferece
- Erros de tipo que seriam capturados em compilacao passam despercebidos
- Em catch blocks, o `error` e implicitamente `any`, permitindo acesso a propriedades inexistentes sem erro

**Como corrigir:**
- Habilitar `strict: true` no tsconfig (ou pelo menos `noImplicitAny: true`)
- Tipar os erros nos catch blocks explicitamente
- Corrigir os erros de compilacao que surgirem

---

### 8. JWT com fallback inconsistente

**Descricao:** No `auth.module.ts`, a configuracao de expiracao faz `parseInt(process.env.JWT_EXPIRES_IN || '86400') || '24h'` — mistura numero (segundos) com string ('24h').

**Por que e um problema:**
- Se `JWT_EXPIRES_IN` nao estiver definido, `parseInt('86400')` retorna `86400` (numero)
- Se `JWT_EXPIRES_IN` for "abc", `parseInt('abc')` retorna `NaN`, e o fallback `|| '24h'` entra — mudando de numero para string
- Comportamento inconsistente dependendo do valor da env var
- Falta validacao das env vars no startup da aplicacao

**Como corrigir:**
- Usar `ConfigModule` com validacao via Joi ou class-validator
- Definir um tipo consistente (ou sempre string como '24h', ou sempre numero)
- Validar todas as env vars obrigatorias no bootstrap

---

### 9. Rate limiting muito frouxo e sem granularidade

**Descricao:** `ThrottlerModule` configurado com 100 requests/60s globalmente, sem diferenciacao por endpoint.

**Por que e um problema:**
- Login e signup deveriam ter limites muito mais baixos (prevenir brute-force)
- 100 req/min e generoso demais para endpoints de autenticacao
- Health check nao precisa de rate limiting
- Nao ha rate limiting por IP + usuario

**Como corrigir:**
- Aplicar `@Throttle()` com valores especificos nos controllers de auth (ex: 5 tentativas/minuto para login)
- Exemir o health check do throttling
- Considerar rate limiting por IP no nivel de infraestrutura tambem

---

### 10. CORS configurado para origem unica

**Descricao:** `app.enableCors({ origin: process.env.CORS_ORIGIN })` aceita apenas uma string.

**Por que e um problema:**
- Nao suporta multiplas origens (staging + producao, por exemplo)
- Se a env var nao estiver setada, `origin: undefined` pode ter comportamento inesperado
- Nao ha validacao do formato da URL de origem

**Como corrigir:**
- Aceitar uma lista separada por virgula e fazer split
- Validar as URLs no startup
- Para desenvolvimento, ter uma lista separada

---

### 11. Falta de logging de auditoria

**Descricao:** Operacoes sensiveis (login, alteracao de senha, delecao de conta/posts) nao possuem logging de auditoria.

**Por que e um problema:**
- Impossivel rastrear quem fez o que em caso de incidente
- Sem metricas de uso da aplicacao
- Compliance e investigacao de seguranca ficam comprometidos

**Como corrigir:**
- Criar um interceptor de logging que registre operacoes de escrita
- Incluir: userId, acao, recurso, timestamp, IP
- Usar o Logger do NestJS com niveis adequados

---

### 12. Prisma Service sem graceful shutdown

**Descricao:** O `PrismaService` implementa `OnModuleInit` para conectar, mas nao implementa `OnModuleDestroy` para desconectar.

**Por que e um problema:**
- Conexoes com o banco podem ficar abertas apos o shutdown
- Em ambientes com restarts frequentes (containers), isso causa connection pool exhaustion

**Como corrigir:**
- Implementar `OnModuleDestroy` com `await this.$disconnect()`
- Adicionar `enableShutdownHooks()` na aplicacao

---

## 🟢 MELHORIAS FUTURAS

### 13. Imports nao utilizados em controllers

**Descricao:** Alguns controllers importam `Request` do `@nestjs/common` mas usam `@Req()` em vez de `@Request()`, deixando o import sem uso.

**Como corrigir:**
- Remover imports nao utilizados
- Padronizar o uso de `@Req()` ou `@Request()` em todos os controllers

---

### 14. Sem documentacao Swagger nos DTOs de paginacao

**Descricao:** O `PaginationDto` nao tem `@ApiProperty()`, dificultando o uso da documentacao Swagger.

**Como corrigir:**
- Adicionar `@ApiProperty({ required: false, description: '...' })` nos campos do DTO

---

### 15. Schema Prisma sem indices nos campos frequentemente consultados

**Descricao:** Nao ha indices no `userId` das tabelas Post, Complaint e Article, que sao usados em todas as queries `findByUser`.

**Como corrigir:**
- Adicionar `@@index([userId])` nas models do Prisma
- Rodar `prisma migrate` para aplicar

---

### 16. Falta de soft delete

**Descricao:** A delecao de registros e fisica (hard delete). Dados apagados sao irrecuperaveis.

**Como corrigir:**
- Adicionar campo `deletedAt DateTime?` nas models
- Usar middleware do Prisma para filtrar registros deletados automaticamente
- Alterar o `remove()` para fazer update do `deletedAt` em vez de delete

---

### 17. Inconsistencia na nomeacao de parametros dos DTOs nos services

**Descricao:** `PostService.create()` usa `dto` como parametro, mas `ComplaintService.create()` usa `createComplaintDto`. Mesma coisa nos updates.

**Como corrigir:**
- Padronizar: usar sempre `dto` ou sempre o nome completo em todos os services
- Escolher uma convencao e aplicar consistentemente

---

### 18. POST retornando status 200 em vez de 201

**Descricao:** Endpoints de criacao retornam 200 OK em vez de 201 Created (o padrao do NestJS e 201 para POST, mas vale verificar se esta sendo respeitado em todos os controllers).

**Como corrigir:**
- Garantir que todos os endpoints POST retornam `HttpStatus.CREATED`
- Usar `@HttpCode(HttpStatus.CREATED)` explicitamente se necessario
