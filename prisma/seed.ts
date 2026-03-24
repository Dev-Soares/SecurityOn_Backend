import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Limpa complaints existentes
  await prisma.complaint.deleteMany();

  // Busca ou cria um usuário para associar às complaints
  let user = await prisma.user.findFirst();
  if (!user) {
    const hashedPassword = await bcrypt.hash('seed123456', 10);
    user = await prisma.user.create({
      data: {
        name: 'Usuário Seed',
        email: 'seed@securityon.com',
        password: hashedPassword,
      },
    });
  }

  const complaints = [
    {
      title: 'Site falso de banco roubando dados',
      content: 'Recebi um e-mail pedindo para atualizar meus dados bancários. O link redirecionava para um site idêntico ao do banco, mas com URL diferente. Quase coloquei minha senha. Cuidado com e-mails assim!',
      danger: 'critico',
      store: 'Banco Falso Online',
      link: 'https://exemplo-falso-banco.com',
      userId: user.id,
      createdAt: new Date('2026-03-20T10:30:00'),
    },
    {
      title: 'Golpe do Pix no WhatsApp',
      content: 'Uma pessoa se passando por meu filho pediu dinheiro urgente via Pix pelo WhatsApp. O número era diferente mas a foto era dele. Quase transferi R$2.000.',
      danger: 'perigo',
      store: 'WhatsApp',
      userId: user.id,
      createdAt: new Date('2026-03-19T14:15:00'),
    },
    {
      title: 'Loja virtual que não entrega produtos',
      content: 'Comprei um celular com preço muito abaixo do mercado. Paguei via Pix e nunca recebi o produto. O site sumiu depois de uma semana. Não caiam nessa!',
      danger: 'perigo',
      store: 'MegaOfertas Shop',
      link: 'https://megaofertas-shop.fake',
      userId: user.id,
      createdAt: new Date('2026-03-18T09:00:00'),
    },
    {
      title: 'E-mail falso de entrega dos Correios',
      content: 'Recebi um e-mail dizendo que minha encomenda estava retida e precisava pagar uma taxa. O link levava a um formulário pedindo dados do cartão de crédito.',
      danger: 'cuidado',
      store: 'Correios (falso)',
      userId: user.id,
      createdAt: new Date('2026-03-17T16:45:00'),
    },
    {
      title: 'Promoção suspeita no Instagram',
      content: 'Um perfil oferecendo iPhone 15 por R$500. Pediram para pagar via link externo. O perfil tinha poucos seguidores e fotos genéricas. Claramente um golpe.',
      danger: 'cuidado',
      store: 'Instagram',
      link: 'https://promo-fake-insta.com',
      userId: user.id,
      createdAt: new Date('2026-03-16T11:20:00'),
    },
    {
      title: 'Aplicativo falso de investimento',
      content: 'Um app prometia rendimentos de 10% ao dia. Depositei R$100 para testar e até consegui sacar R$110. Quando depositei R$1.000, o app sumiu.',
      danger: 'critico',
      store: 'CryptoRendaFácil App',
      userId: user.id,
      createdAt: new Date('2026-03-15T08:30:00'),
    },
    {
      title: 'Vaga de emprego falsa pedindo dados',
      content: 'Recebi uma mensagem no LinkedIn sobre uma vaga home office com salário alto. Pediram CPF, RG e comprovante de residência antes de qualquer entrevista. Desconfiei e não enviei.',
      danger: 'aviso',
      store: 'LinkedIn',
      userId: user.id,
      createdAt: new Date('2026-03-14T13:00:00'),
    },
    {
      title: 'Boleto falso de internet',
      content: 'Chegou um boleto por e-mail com visual idêntico ao da minha operadora, mas o código de barras era diferente. Quase paguei sem perceber.',
      danger: 'cuidado',
      store: 'Operadora de Internet (falso)',
      userId: user.id,
      createdAt: new Date('2026-03-13T17:30:00'),
    },
    {
      title: 'Perfil falso em app de namoro',
      content: 'Conheci alguém em um app de namoro que depois de semanas pediu dinheiro emprestado por uma emergência médica. Típico golpe do romance.',
      danger: 'aviso',
      userId: user.id,
      createdAt: new Date('2026-03-12T20:00:00'),
    },
    {
      title: 'Sorteio falso por SMS',
      content: 'Recebi SMS dizendo que ganhei um carro em sorteio de uma loja. Para retirar o prêmio, pediram um depósito de R$500 como "taxa de liberação". Golpe clássico.',
      danger: 'aviso',
      store: 'SMS Desconhecido',
      userId: user.id,
      createdAt: new Date('2026-03-11T10:00:00'),
    },
    {
      title: 'Clone de site de compras famoso',
      content: 'Acessei o que achei ser um grande marketplace mas a URL tinha um caractere diferente. As ofertas eram absurdamente baratas. É um clone para roubar dados de cartão.',
      danger: 'critico',
      store: 'Marketplace Clone',
      link: 'https://marketplac3-clone.fake',
      userId: user.id,
      createdAt: new Date('2026-03-10T15:45:00'),
    },
    {
      title: 'Suporte técnico falso ligando em casa',
      content: 'Recebi uma ligação de alguém se passando por suporte da Microsoft dizendo que meu computador estava infectado. Pediram acesso remoto. Não autorizei.',
      danger: 'perigo',
      userId: user.id,
      createdAt: new Date('2026-03-09T12:30:00'),
    },
  ];

  for (const complaint of complaints) {
    await prisma.complaint.create({ data: complaint });
  }

  console.log(`Seed concluído: ${complaints.length} denúncias criadas.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
