import type { EduModule } from '../lib/types';

// Trilha de educação financeira (16–18 anos): 6 módulos, 2 lições e prova de 5 questões cada.
// Conteúdo de apoio: Banco Central (Cidadania Financeira), ANBIMA Educação, ENEF, CVM, Tesouro Nacional.
// Os valores dos exemplos são ilustrativos, não são recomendações de investimento.
export const EDU: EduModule[] = [
  {
    slug: 'dinheiro-orcamento',
    order: 1,
    title: 'Dinheiro e orçamento',
    summary: 'Ganhar, gastar e planejar: o básico para o dinheiro render.',
    lessons: [
      {
        title: 'De onde vem e para onde vai o dinheiro',
        paragraphs: [
          'Renda é todo dinheiro que entra: mesada, salário, bolsa, um trabalho extra. Gastos são os que saem. A diferença entre os dois é o que sobra, ou o que falta.',
          'Uma boa pergunta antes de gastar é: isso é uma necessidade ou um desejo? Necessidade é o que você precisa para viver e estudar (comida, transporte, material escolar). Desejo é o que é bom ter, mas dá para esperar.',
        ],
        example: 'Se entram R$ 1.000 e saem R$ 900, sobram R$ 100. Se saem R$ 1.100, faltam R$ 100, e é aí que nascem as dívidas.',
      },
      {
        title: 'Orçamento e reserva de emergência',
        paragraphs: [
          'Orçamento é um plano simples: anotar quanto entra, quanto sai e quanto você quer guardar. Ele não serve para proibir gastos, e sim para você decidir antes, em vez de se surpreender depois.',
          'Reserva de emergência é um dinheiro guardado para imprevistos, como um conserto ou uma despesa médica. Uma referência comum é juntar de 3 a 6 meses de gastos essenciais, começando por valores pequenos.',
        ],
        example: 'Uma regra conhecida é a 50/30/20: 50% para necessidades, 30% para desejos e 20% para guardar ou pagar dívidas. É um ponto de partida, e cada pessoa ajusta ao seu caso.',
      },
    ],
    questions: [
      {
        prompt: 'Qual é um exemplo de necessidade?',
        options: ['Skin nova de um jogo', 'Material escolar', 'Ingresso para um show', 'Tênis de edição limitada'],
        answer: 1,
        explanation: 'Necessidades são o que você precisa para viver e estudar. O resto são desejos.',
      },
      {
        prompt: 'Para que serve um orçamento?',
        options: ['Para proibir qualquer gasto', 'Para planejar quanto entra, quanto sai e quanto guardar', 'Para aumentar o salário', 'Para evitar pagar impostos'],
        answer: 1,
        explanation: 'O orçamento ajuda a decidir antes de gastar e a enxergar para onde o dinheiro vai.',
      },
      {
        prompt: 'Entram R$ 1.000 por mês. Os gastos fixos são R$ 600 e os variáveis, R$ 300. Quanto sobra?',
        options: ['R$ 50', 'R$ 100', 'R$ 400', 'R$ 700'],
        answer: 1,
        explanation: '1.000 − 600 − 300 = 100. Esse valor pode ir para a reserva ou para um objetivo.',
      },
      {
        prompt: 'Para que serve a reserva de emergência?',
        options: ['Para comprar presentes', 'Para cobrir imprevistos', 'Para investir em ações de risco', 'Para pagar o cartão todo mês'],
        answer: 1,
        explanation: 'É um dinheiro guardado para situações inesperadas, evitando recorrer a dívidas caras.',
      },
      {
        prompt: 'Na regra 50/30/20, o que vai nos 20%?',
        options: ['Lazer', 'Moradia', 'Guardar ou pagar dívidas', 'Alimentação'],
        answer: 2,
        explanation: 'Os 20% são para o seu futuro: poupar, investir ou quitar dívidas.',
      },
    ],
  },
  {
    slug: 'cartoes',
    order: 2,
    title: 'Cartões',
    summary: 'Débito, crédito, fatura e parcelamento sem susto.',
    lessons: [
      {
        title: 'Débito e crédito',
        paragraphs: [
          'No cartão de débito, o valor sai da sua conta na hora, então você só gasta o que tem. No cartão de crédito, você compra agora e paga depois, na fatura.',
          'Crédito funciona como um empréstimo de curto prazo. Se a fatura é paga integralmente até o vencimento, não há juros. Se não, o custo pode ser muito alto.',
        ],
        example: 'Compra de R$ 200 no débito: seu saldo cai R$ 200 hoje. No crédito: seu saldo só cai quando você paga a fatura.',
      },
      {
        title: 'Fatura, mínimo e parcelamento',
        paragraphs: [
          'Pagar só o valor mínimo da fatura parece aliviar, mas o restante vira dívida com juros, chamada de crédito rotativo, uma das mais caras do mercado.',
          'Parcelar compras pode caber no bolso, mas compromete parte da renda dos próximos meses. Antes de parcelar, some todas as parcelas que você já tem.',
        ],
        example: 'Dez parcelas de R$ 80 parecem pouco, mas são R$ 800 já comprometidos nos próximos 10 meses.',
      },
    ],
    questions: [
      {
        prompt: 'O que acontece quando você paga com cartão de débito?',
        options: ['O valor é cobrado só no mês que vem', 'O valor sai da sua conta na hora', 'Você ganha um empréstimo', 'A compra gera juros'],
        answer: 1,
        explanation: 'No débito, o dinheiro é descontado do saldo imediatamente.',
      },
      {
        prompt: 'Cartão de crédito é, na prática:',
        options: ['Dinheiro grátis', 'Um empréstimo de curto prazo que se paga na fatura', 'Uma poupança', 'Um investimento'],
        answer: 1,
        explanation: 'Você usa o dinheiro do banco agora e devolve na fatura.',
      },
      {
        prompt: 'O que acontece se você paga só o mínimo da fatura?',
        options: ['A dívida some', 'O restante vira dívida com juros altos', 'Você ganha pontos em dobro', 'Nada muda'],
        answer: 1,
        explanation: 'O saldo restante entra no crédito rotativo, com juros muito altos.',
      },
      {
        prompt: 'Qual é o principal cuidado ao parcelar uma compra?',
        options: ['Escolher a loja mais bonita', 'Lembrar que as parcelas comprometem a renda dos meses seguintes', 'Parcelar sempre em 12 vezes', 'Nunca olhar o valor'],
        answer: 1,
        explanation: 'Parcelas se acumulam. Some tudo o que já está comprometido antes de assumir mais uma.',
      },
      {
        prompt: 'Qual é a melhor prática com a fatura do cartão?',
        options: ['Pagar o mínimo', 'Pagar o valor total até o vencimento', 'Esperar o banco cobrar', 'Pagar só metade'],
        answer: 1,
        explanation: 'Pagando o total até o vencimento, você usa o crédito sem pagar juros.',
      },
    ],
  },
  {
    slug: 'juros-dividas',
    order: 3,
    title: 'Juros e dívidas',
    summary: 'Como os juros crescem e como sair do vermelho.',
    lessons: [
      {
        title: 'O que são juros',
        paragraphs: [
          'Juros são o preço do dinheiro no tempo. Quem empresta cobra juros, e quem investe recebe juros. Eles podem estar a seu favor ou contra você.',
          'Nos juros compostos, os juros do mês entram na base de cálculo do mês seguinte, ou seja, há juros sobre juros. Por isso o tempo faz tanta diferença, tanto para investir quanto para dever.',
        ],
        example: 'R$ 100 a 10% ao mês, em juros compostos: após 1 mês são R$ 110; após 2 meses, R$ 121.',
      },
      {
        title: 'Como sair de uma dívida',
        paragraphs: [
          'Dívidas de cartão rotativo e cheque especial costumam ter os juros mais altos. Costumam ser as primeiras a quitar.',
          'O caminho é listar todas as dívidas (valor, juros, vencimento), cortar gastos que dá para cortar, conversar com o credor para negociar e evitar novas dívidas enquanto paga as antigas.',
        ],
        example: 'Dívida A: R$ 500 a 2% ao mês. Dívida B: R$ 500 a 14% ao mês. Priorize a B.',
      },
    ],
    questions: [
      {
        prompt: 'Juros são:',
        options: ['Um desconto', 'O preço do dinheiro no tempo', 'Um imposto', 'Uma multa só para quem atrasa'],
        answer: 1,
        explanation: 'Quem empresta cobra juros e quem investe recebe juros.',
      },
      {
        prompt: 'R$ 100 a 10% ao mês em juros compostos valem quanto após 2 meses?',
        options: ['R$ 110', 'R$ 120', 'R$ 121', 'R$ 200'],
        answer: 2,
        explanation: '100 × 1,10 = 110; depois 110 × 1,10 = 121.',
      },
      {
        prompt: 'O que são juros compostos?',
        options: ['Juros que não mudam nunca', 'Juros calculados sobre o valor inicial e também sobre juros anteriores', 'Juros só do primeiro mês', 'Uma taxa do banco'],
        answer: 1,
        explanation: 'É o famoso juros sobre juros.',
      },
      {
        prompt: 'Qual dívida costuma ter os juros mais altos?',
        options: ['Financiamento imobiliário', 'Crédito rotativo do cartão', 'Empréstimo com garantia de imóvel', 'Bolsa de estudos'],
        answer: 1,
        explanation: 'O rotativo do cartão e o cheque especial estão entre as dívidas mais caras.',
      },
      {
        prompt: 'Qual é uma boa primeira atitude para sair das dívidas?',
        options: ['Ignorar até vencer', 'Listar tudo o que deve e priorizar as de juros mais altos', 'Fazer uma dívida nova para pagar a velha sem avaliar', 'Parar de olhar o extrato'],
        answer: 1,
        explanation: 'Organizar e priorizar as dívidas mais caras reduz o custo total.',
      },
    ],
  },
  {
    slug: 'investimentos',
    order: 4,
    title: 'Investimentos',
    summary: 'Risco, retorno, liquidez e as primeiras opções.',
    lessons: [
      {
        title: 'Risco, retorno e liquidez',
        paragraphs: [
          'Todo investimento tem três características: retorno (quanto pode render), risco (a chance de perder ou render menos que o esperado) e liquidez (a rapidez para transformar em dinheiro).',
          'Em geral, quanto maior o retorno esperado, maior o risco. Promessa de ganho alto e sem risco é sinal de alerta.',
        ],
        example: 'Uma reserva de emergência precisa de liquidez e baixo risco. Já um objetivo de 10 anos pode aceitar mais risco.',
      },
      {
        title: 'Renda fixa, renda variável e diversificação',
        paragraphs: [
          'Na renda fixa, as regras de remuneração são definidas na contratação (por exemplo, Tesouro Direto e CDB). Na renda variável (como ações), o retorno não é conhecido de antemão e o preço oscila.',
          'Diversificar é não colocar todo o dinheiro em um único lugar. Assim, se um investimento vai mal, os outros ajudam a equilibrar.',
        ],
        example: 'O Tesouro Direto é um programa em que você empresta dinheiro ao governo federal e recebe uma remuneração por isso.',
      },
    ],
    questions: [
      {
        prompt: 'O que é liquidez?',
        options: ['O quanto o investimento rende', 'A rapidez para transformar o investimento em dinheiro', 'O risco de perda', 'O imposto cobrado'],
        answer: 1,
        explanation: 'Liquidez mede a facilidade de resgatar o dinheiro quando precisar.',
      },
      {
        prompt: 'Em geral, o que acontece com o risco quando o retorno esperado é maior?',
        options: ['Diminui', 'Aumenta', 'Desaparece', 'Não tem relação'],
        answer: 1,
        explanation: 'Maior retorno esperado costuma vir com maior risco.',
      },
      {
        prompt: 'Qual é uma característica da renda fixa?',
        options: ['Regras de remuneração definidas na contratação', 'Rendimento sempre igual para todos', 'Não tem risco nenhum', 'Só existe em banco'],
        answer: 0,
        explanation: 'Na renda fixa a forma de remuneração é combinada na contratação. Isso não significa ausência total de risco.',
      },
      {
        prompt: 'O Tesouro Direto é:',
        options: ['Um empréstimo que você faz ao governo federal', 'Um tipo de cartão', 'Uma conta corrente', 'Um imposto'],
        answer: 0,
        explanation: 'Ao comprar um título do Tesouro Direto você empresta dinheiro ao governo e recebe remuneração.',
      },
      {
        prompt: 'O que significa diversificar?',
        options: ['Colocar tudo em um único investimento', 'Dividir o dinheiro entre diferentes investimentos', 'Gastar mais', 'Comprar o que está na moda'],
        answer: 1,
        explanation: 'Diversificar reduz o impacto de um investimento que vai mal.',
      },
    ],
  },
  {
    slug: 'impostos',
    order: 5,
    title: 'Impostos',
    summary: 'Para onde vão os impostos e como eles aparecem na vida.',
    lessons: [
      {
        title: 'Para que servem os impostos',
        paragraphs: [
          'Impostos são valores pagos ao governo e usados para financiar serviços públicos, como saúde, educação, segurança e estradas.',
          'Eles aparecem de duas formas: os diretos, pagos por quem tem a renda ou o patrimônio (como o Imposto de Renda, o IPTU e o IPVA); e os indiretos, que já vêm embutidos no preço do que compramos.',
        ],
        example: 'Quando você compra um lanche, parte do preço já inclui impostos, mesmo sem aparecer em linha separada.',
      },
      {
        title: 'Imposto de Renda e nota fiscal',
        paragraphs: [
          'O Imposto de Renda incide sobre a renda e os ganhos. Quem tem rendimentos acima de determinados limites deve declarar anualmente. As regras mudam, e vale consultar a Receita Federal.',
          'Pedir nota fiscal ajuda a comprovar a compra, a usar a garantia e a combater a sonegação, que prejudica quem paga em dia.',
        ],
        example: 'Guardar a nota fiscal de um celular novo facilita a troca se ele der defeito.',
      },
    ],
    questions: [
      {
        prompt: 'Os impostos servem principalmente para:',
        options: ['Pagar apenas o governo', 'Financiar serviços públicos como saúde e educação', 'Aumentar o preço dos produtos sem motivo', 'Substituir o salário'],
        answer: 1,
        explanation: 'Impostos financiam serviços e obras que beneficiam a sociedade.',
      },
      {
        prompt: 'Qual é um exemplo de imposto indireto?',
        options: ['Imposto de Renda', 'IPVA', 'Imposto embutido no preço de um produto', 'IPTU'],
        answer: 2,
        explanation: 'O imposto indireto já vem embutido no preço do que compramos.',
      },
      {
        prompt: 'O Imposto de Renda incide sobre:',
        options: ['Renda e ganhos', 'Só imóveis', 'Só automóveis', 'Compras de supermercado'],
        answer: 0,
        explanation: 'É um imposto sobre a renda e os ganhos das pessoas.',
      },
      {
        prompt: 'Por que pedir a nota fiscal é importante?',
        options: ['Para pagar mais imposto', 'Para comprovar a compra e usar a garantia', 'Não tem importância', 'Para receber dinheiro do vendedor'],
        answer: 1,
        explanation: 'A nota comprova a compra e ajuda a combater a sonegação.',
      },
      {
        prompt: 'IPTU e IPVA são exemplos de impostos:',
        options: ['Indiretos', 'Diretos sobre patrimônio', 'Sobre alimentos', 'Que só empresas pagam'],
        answer: 1,
        explanation: 'Incidem sobre o patrimônio de quem tem um imóvel (IPTU) ou um veículo (IPVA).',
      },
    ],
  },
  {
    slug: 'golpes-cripto',
    order: 6,
    title: 'Golpes e criptomoedas',
    summary: 'Como não cair em golpes e o que saber sobre cripto.',
    lessons: [
      {
        title: 'Golpes mais comuns',
        paragraphs: [
          'Golpistas usam urgência e emoção: mensagens de um suposto parente com número novo pedindo Pix, links falsos de bancos, ofertas boas demais e prêmios que você não pediu.',
          'Regras de ouro: nunca compartilhe senhas ou códigos de verificação; confirme pedidos de dinheiro por ligação; acesse o banco apenas pelo app ou site oficial; e desconfie de ganho alto e garantido.',
        ],
        example: 'Promessa de render 10% ao mês garantido é típica de pirâmide financeira. Nenhum investimento sério garante isso.',
      },
      {
        title: 'Criptomoedas: o que saber',
        paragraphs: [
          'Criptomoedas são ativos digitais cujos preços podem variar muito em pouco tempo. São considerados investimentos de alto risco e não são garantidos pelo governo nem pelo FGC.',
          'Se alguém decidir investir, só deve usar um valor que possa perder, e estudar antes. Oportunidades que prometem lucro certo com cripto são frequentemente golpes.',
        ],
        example: 'Antes de investir em qualquer coisa, pergunte: quem é o responsável, onde está regulamentado e o que acontece se eu perder tudo?',
      },
    ],
    questions: [
      {
        prompt: 'Você recebe uma mensagem de um "parente com número novo" pedindo um Pix urgente. O que fazer?',
        options: ['Pagar logo para ajudar', 'Ligar para o parente no número que você já conhece para confirmar', 'Responder com sua senha', 'Mandar o dobro'],
        answer: 1,
        explanation: 'Confirmar por ligação, em um canal que você já conhece, desmonta esse golpe.',
      },
      {
        prompt: 'Qual destas informações você nunca deve compartilhar?',
        options: ['Seu apelido', 'Códigos de verificação e senhas', 'Seu time favorito', 'O nome da escola'],
        answer: 1,
        explanation: 'Senhas e códigos dão acesso às suas contas.',
      },
      {
        prompt: 'Uma proposta promete 10% de rendimento por mês, garantido. Isso é sinal de:',
        options: ['Um ótimo investimento', 'Possível golpe ou pirâmide', 'Poupança', 'Tesouro Direto'],
        answer: 1,
        explanation: 'Retorno alto e garantido não existe em investimentos sérios.',
      },
      {
        prompt: 'Sobre criptomoedas, é correto dizer que:',
        options: ['Têm preço sempre estável', 'São garantidas pelo FGC', 'São de alto risco e podem variar muito de preço', 'Nunca dão prejuízo'],
        answer: 2,
        explanation: 'Os preços oscilam muito, e não há garantia do FGC.',
      },
      {
        prompt: 'Você recebe um SMS do "banco" com um link. O mais seguro é:',
        options: ['Clicar no link', 'Abrir o app ou digitar o endereço oficial do banco por conta própria', 'Encaminhar para amigos', 'Responder com seus dados'],
        answer: 1,
        explanation: 'Evite links recebidos. Acesse o canal oficial por conta própria.',
      },
    ],
  },
];
