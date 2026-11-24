import { PrismaClient, FriendshipStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL ?? process.env.DIRECT_URL,
  }),
});

// Mesma senha para todos os mocks: facilita o login manual durante o desenvolvimento.
const DEFAULT_PASSWORD = 'senha12345';

const USERS = [
  { name: 'Ana Souza', email: 'ana@securityon.dev' },
  { name: 'Bruno Lima', email: 'bruno@securityon.dev' },
  { name: 'Carla Mendes', email: 'carla@securityon.dev' },
  { name: 'Diego Ramos', email: 'diego@securityon.dev' },
  { name: 'Elisa Prado', email: 'elisa@securityon.dev' },
];

const POSTS = [
  {
    author: 'ana@securityon.dev',
    content:
      'Recebi um SMS dizendo que minha encomenda estava retida na alfândega e pedindo R$ 4,90 de taxa. O link não era dos Correios. Fiquei de olho e denunciei.',
    imgUrl: 'https://picsum.photos/seed/securityon-post-1/800/500',
  },
  {
    author: 'bruno@securityon.dev',
    content:
      'Dica: ative verificação em duas etapas no WhatsApp. Clonaram o número de um colega e usaram o perfil dele para pedir Pix para a lista de contatos.',
    imgUrl: null,
  },
  {
    author: 'carla@securityon.dev',
    content:
      'Loja com preço 70% abaixo do mercado, CNPJ criado há 3 semanas e só aceitava Pix. Clássico golpe de e-commerce fantasma. Não caiam.',
    imgUrl: 'https://picsum.photos/seed/securityon-post-2/800/500',
  },
  {
    author: 'diego@securityon.dev',
    content:
      'Tentaram o golpe da falsa central do banco comigo. Ligaram, pediram para eu instalar um app de "segurança" e depois o token. Desliguei e liguei no número do cartão.',
    imgUrl: null,
  },
  {
    author: 'elisa@securityon.dev',
    content:
      'Maquininha clonada em feira livre: o visor mostrava um valor e o comprovante vinha com outro. Confira sempre o valor no app do banco antes de sair.',
    imgUrl: 'https://picsum.photos/seed/securityon-post-3/800/500',
  },
  {
    author: 'ana@securityon.dev',
    content:
      'Perfil falso no Instagram copiando uma loja real, inclusive os comentários. A diferença estava no @ com uma letra trocada. Sempre confira o handle.',
    imgUrl: null,
  },
  {
    author: 'bruno@securityon.dev',
    content:
      'Resumo da semana: 3 tentativas de phishing por e-mail, todas se passando por nota fiscal em anexo .zip. Nunca abram anexo de remetente desconhecido.',
    imgUrl: 'https://picsum.photos/seed/securityon-post-4/800/500',
  },
  {
    author: 'carla@securityon.dev',
    content:
      'Consegui recuperar meu Pix pelo MED (Mecanismo Especial de Devolução). Abri contestação no app do banco em menos de 24h. Vale tentar.',
    imgUrl: null,
  },
];

const COMMENTS = [
  'Passei exatamente por isso no mês passado.',
  'Obrigada pelo alerta, vou avisar minha família.',
  'Denuncia no site do consumidor.gov também, costuma dar resultado.',
  'O domínio do link é sempre a pista principal.',
  'Nunca instalem app enviado por link de terceiros.',
  'Salvando esse post para mostrar no trabalho.',
];

const COMPLAINTS = [
  {
    author: 'ana@securityon.dev',
    title: 'Site falso clonando loja de eletrônicos',
    content:
      'Página idêntica à oficial, mas com domínio .shop e checkout só via Pix. Após o pagamento o pedido nunca saiu do status "em separação" e o suporte sumiu.',
    danger: 'perigo',
    store: 'TechMega Outlet',
    link: 'https://techmega-outlet.shop',
  },
  {
    author: 'bruno@securityon.dev',
    title: 'Falsa central de atendimento do banco',
    content:
      'Ligação de número com DDD da capital informando compra suspeita e pedindo a instalação de um app de acesso remoto para "bloquear" o cartão.',
    danger: 'critico',
    store: null,
    link: null,
  },
  {
    author: 'carla@securityon.dev',
    title: 'Cobrança de taxa de entrega inexistente',
    content:
      'SMS com link curto pedindo R$ 4,90 para liberar encomenda. O formulário pedia dados completos do cartão, inclusive CVV.',
    danger: 'perigo',
    store: 'Correios (falso)',
    link: 'https://rastreio-liberacao.info',
  },
  {
    author: 'diego@securityon.dev',
    title: 'Vendedor sem CNPJ em marketplace',
    content:
      'Anúncio com preço muito abaixo da média e pedido para fechar a compra por fora da plataforma, no WhatsApp. Perde-se toda a garantia do marketplace.',
    danger: 'aviso',
    store: 'Marketplace Zed',
    link: null,
  },
  {
    author: 'elisa@securityon.dev',
    title: 'QR Code de Pix adulterado em estacionamento',
    content:
      'Adesivo colado sobre o QR Code original da placa de pagamento. O nome do recebedor era de pessoa física, não da empresa.',
    danger: 'perigo',
    store: 'Estacionamento Centro',
    link: null,
  },
];

// Dez denúncias contra o MESMO site, escritas como quem denuncia escreve: com e sem
// protocolo, com www, com subdomínio, com caminho, query e caixa alta. Serve para testar
// a busca por link (/check-site): qualquer variação de "promo-shopfacil.com" deve
// devolver as dez. O último caso é de outro domínio parecido e NÃO pode aparecer.
const SAME_SITE_COMPLAINTS = [
  {
    author: 'ana@securityon.dev',
    title: 'Loja fantasma com desconto de 80% em eletrônicos',
    content:
      'Anúncio patrocinado no Instagram levando para a loja. Paguei por Pix, recebi código de rastreio falso e o chat foi desativado no dia seguinte.',
    danger: 'critico',
    store: 'Promo ShopFácil',
    link: 'https://promo-shopfacil.com',
  },
  {
    author: 'bruno@securityon.dev',
    title: 'Checkout do site só aceita Pix para pessoa física',
    content:
      'O recebedor do Pix é um CPF, não a empresa anunciada. Site não tem CNPJ, endereço nem telefone em lugar nenhum das páginas.',
    danger: 'critico',
    store: 'Promo ShopFácil',
    link: 'https://www.promo-shopfacil.com/checkout',
  },
  {
    author: 'carla@securityon.dev',
    title: 'Domínio registrado há 12 dias se passando por loja conhecida',
    content:
      'Consultei o WHOIS: domínio criado há menos de duas semanas. O layout é cópia pixel a pixel de uma varejista real, inclusive os selos de segurança (que são imagem, não link).',
    danger: 'perigo',
    store: 'Promo ShopFácil',
    link: 'promo-shopfacil.com',
  },
  {
    author: 'diego@securityon.dev',
    title: 'Página de pagamento em subdomínio pedindo dados do cartão',
    content:
      'O formulário pede número, validade, CVV e ainda a senha do internet banking "para validar a compra". Nenhuma loja legítima pede senha de banco.',
    danger: 'critico',
    store: 'Promo ShopFácil',
    link: 'https://pagamento.promo-shopfacil.com/finalizar',
  },
  {
    author: 'elisa@securityon.dev',
    title: 'Site sem HTTPS coletando CPF e endereço',
    content:
      'O cadastro roda em http puro. Qualquer pessoa na mesma rede consegue ler os dados enviados. Além disso o "Fale conosco" só devolve erro.',
    danger: 'perigo',
    store: 'Promo ShopFácil',
    link: 'http://promo-shopfacil.com/cadastro',
  },
  {
    author: 'ana@securityon.dev',
    title: 'Falso rastreio com cobrança de taxa de liberação',
    content:
      'Depois da compra chegou um SMS com link do próprio site pedindo R$ 9,90 de "taxa alfandegária" para liberar o pedido. Pedido que nunca existiu.',
    danger: 'perigo',
    store: 'Promo ShopFácil',
    link: 'https://promo-shopfacil.com/rastreio?pedido=99213',
  },
  {
    author: 'bruno@securityon.dev',
    title: 'Avaliações falsas copiadas de outra loja',
    content:
      'Os comentários da página de produto são os mesmos, na mesma ordem, de um marketplace real. Copiaram a seção inteira, inclusive as datas.',
    danger: 'aviso',
    store: 'Promo ShopFácil',
    link: 'WWW.PROMO-SHOPFACIL.COM/produto/152',
  },
  {
    author: 'carla@securityon.dev',
    title: 'Suporte por WhatsApp insistindo em pagamento fora do site',
    content:
      'O atendimento pede para finalizar por Pix direto no WhatsApp, "para liberar o desconto". Fora da loja não há como contestar nada.',
    danger: 'perigo',
    store: 'Promo ShopFácil',
    link: 'https://promo-shopfacil.com/suporte',
  },
  {
    author: 'diego@securityon.dev',
    title: 'Pedido nunca enviado e reembolso negado',
    content:
      'Trinta dias após a compra o status seguia "em separação". Pedi reembolso e a resposta foi que compras com desconto não são reembolsáveis, cláusula que não existe no site.',
    danger: 'critico',
    store: 'Promo ShopFácil',
    link: 'https://promo-shopfacil.com/pedido/8831',
  },
  {
    author: 'elisa@securityon.dev',
    title: 'Mesma quadrilha operando em outro subdomínio',
    content:
      'Depois que a loja principal começou a receber denúncias, passaram a divulgar um subdomínio novo com o mesmo checkout e o mesmo CPF recebedor.',
    danger: 'critico',
    store: 'Promo ShopFácil',
    link: 'https://loja2.promo-shopfacil.com/',
  },
];

// Controle negativo: domínio parecido, site diferente. Uma busca por
// "promo-shopfacil.com" não pode trazer esta denúncia.
const LOOKALIKE_COMPLAINT = {
  author: 'ana@securityon.dev',
  title: 'Clone com nome parecido circulando por e-mail',
  content:
    'Outro domínio, quase igual ao da loja já denunciada, usado em disparo de e-mail. Vale registrar separado: é outro site.',
  danger: 'perigo',
  store: 'Promo ShopFacil Oficial',
  link: 'https://promo-shopfacil.net/ofertas',
};

const ARTICLES = [
  {
    author: 'ana@securityon.dev',
    title: 'Como identificar um site de compras falso em 5 passos',
    content:
      'Antes de pagar, confira: 1) o domínio exato e o certificado HTTPS; 2) o CNPJ no site da Receita e a data de abertura; 3) reclamações no Reclame Aqui e no consumidor.gov; 4) as formas de pagamento, porque loja séria não aceita só Pix; 5) a existência de CEP, telefone e política de troca. Preço muito abaixo do mercado é o sinal mais barato de ser falso.',
    bgUrl: 'https://picsum.photos/seed/securityon-article-1/1200/600',
  },
  {
    author: 'bruno@securityon.dev',
    title: 'Engenharia social: por que a pressa é a arma do golpista',
    content:
      'Todo golpe por telefone ou mensagem funciona com urgência artificial: conta bloqueada, encomenda retida, multa vencendo hoje. A pressa impede a verificação. A defesa é sempre a mesma: encerre o contato e procure o canal oficial você mesmo, pelo número do cartão ou pelo app. Nenhuma instituição legítima pede senha, token ou instalação de app por ligação.',
    bgUrl: 'https://picsum.photos/seed/securityon-article-2/1200/600',
  },
  {
    author: 'carla@securityon.dev',
    title: 'Pix caiu em golpe: o que fazer nas primeiras 24 horas',
    content:
      'Abra imediatamente uma contestação pelo MED no app do banco, porque o prazo é curto e o dinheiro pode ainda estar na conta de destino. Registre boletim de ocorrência online, guarde prints da conversa, do comprovante e do anúncio. Depois, denuncie o perfil ou site usado. O MED não garante devolução, mas sem a contestação rápida a chance cai muito.',
    bgUrl: null,
  },
  {
    author: 'diego@securityon.dev',
    title: 'Dois fatores em tudo: o básico que evita a maioria dos sequestros de conta',
    content:
      'Clonagem de WhatsApp, invasão de e-mail e roubo de perfil em rede social quase sempre passam por um código de SMS entregue a quem pediu. Ative a verificação em duas etapas em WhatsApp, e-mail e redes, prefira app autenticador ao SMS e nunca repasse código recebido, mesmo para quem se diz suporte.',
    bgUrl: 'https://picsum.photos/seed/securityon-article-3/1200/600',
  },
];

async function main() {
  console.log('Limpando dados existentes...');
  // Ordem importa por causa das FKs, ainda que haja cascade.
  await prisma.comment.deleteMany();
  await prisma.like.deleteMany();
  await prisma.friendship.deleteMany();
  await prisma.post.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.article.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash(
    DEFAULT_PASSWORD,
    parseInt(process.env.SALT_ROUNDS || '10') || 10,
  );

  console.log('Criando usuários...');
  const users = await Promise.all(
    USERS.map((user) =>
      prisma.user.create({
        data: { name: user.name, email: user.email, password: passwordHash },
      }),
    ),
  );
  const userByEmail = new Map(users.map((user) => [user.email, user]));
  const userId = (email: string) => {
    const user = userByEmail.get(email);
    if (!user) throw new Error(`Mock inconsistente: usuário ${email} não existe`);
    return user.id;
  };

  console.log('Criando posts...');
  const posts = await Promise.all(
    POSTS.map((post, index) =>
      prisma.post.create({
        data: {
          content: post.content,
          imgUrl: post.imgUrl,
          userId: userId(post.author),
          // Espalha os posts no tempo para o feed ordenado por data ter variação.
          createdAt: new Date(Date.now() - index * 6 * 60 * 60 * 1000),
        },
      }),
    ),
  );

  console.log('Criando likes...');
  // Cada post recebe likes de um subconjunto rotativo de usuários, nunca do autor,
  // e sem repetir par (userId, postId), que é unique.
  const likeData = posts.flatMap((post, postIndex) =>
    users
      .filter((user) => user.id !== post.userId)
      .filter((_, userIndex) => (userIndex + postIndex) % 2 === 0)
      .map((user) => ({ userId: user.id, postId: post.id })),
  );
  await prisma.like.createMany({ data: likeData });

  console.log('Criando comentários...');
  const commentData = posts.flatMap((post, postIndex) => {
    const commenters = users.filter((user) => user.id !== post.userId);
    return commenters
      .slice(0, (postIndex % 3) + 1)
      .map((user, commentIndex) => ({
        content: COMMENTS[(postIndex + commentIndex) % COMMENTS.length],
        userId: user.id,
        postId: post.id,
        createdAt: new Date(
          Date.now() - postIndex * 6 * 60 * 60 * 1000 + (commentIndex + 1) * 60 * 1000,
        ),
      }));
  });
  await prisma.comment.createMany({ data: commentData });

  console.log('Criando denúncias...');
  const allComplaints = [...COMPLAINTS, ...SAME_SITE_COMPLAINTS, LOOKALIKE_COMPLAINT];
  await Promise.all(
    allComplaints.map((complaint, index) =>
      prisma.complaint.create({
        data: {
          title: complaint.title,
          content: complaint.content,
          danger: complaint.danger,
          store: complaint.store,
          link: complaint.link,
          userId: userId(complaint.author),
          createdAt: new Date(Date.now() - index * 12 * 60 * 60 * 1000),
        },
      }),
    ),
  );

  console.log('Criando artigos...');
  await Promise.all(
    ARTICLES.map((article, index) =>
      prisma.article.create({
        data: {
          title: article.title,
          content: article.content,
          bgUrl: article.bgUrl,
          userId: userId(article.author),
          createdAt: new Date(Date.now() - index * 24 * 60 * 60 * 1000),
        },
      }),
    ),
  );

  console.log('Criando amizades...');
  // Ana é o usuário de demonstração: já tem amizades aceitas e um convite pendente
  // recebido, para exercitar as duas telas.
  await prisma.friendship.createMany({
    data: [
      {
        requesterId: userId('ana@securityon.dev'),
        addresseeId: userId('bruno@securityon.dev'),
        status: FriendshipStatus.ACCEPTED,
      },
      {
        requesterId: userId('carla@securityon.dev'),
        addresseeId: userId('ana@securityon.dev'),
        status: FriendshipStatus.ACCEPTED,
      },
      {
        requesterId: userId('diego@securityon.dev'),
        addresseeId: userId('ana@securityon.dev'),
        status: FriendshipStatus.PENDING,
      },
      {
        requesterId: userId('bruno@securityon.dev'),
        addresseeId: userId('elisa@securityon.dev'),
        status: FriendshipStatus.ACCEPTED,
      },
      {
        requesterId: userId('elisa@securityon.dev'),
        addresseeId: userId('carla@securityon.dev'),
        status: FriendshipStatus.PENDING,
      },
    ],
  });

  const counts = {
    users: users.length,
    posts: posts.length,
    likes: likeData.length,
    comments: commentData.length,
    complaints: allComplaints.length,
    articles: ARTICLES.length,
    friendships: 5,
  };
  console.log('Seed concluído:', counts);
  console.log(`Login de teste: ana@securityon.dev / ${DEFAULT_PASSWORD}`);
  console.log('Link para testar a verificação de site: promo-shopfacil.com (10 denúncias)');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
