-- ============================================================
-- money task — conteúdo de educação financeira (gerado de src/data/edu.ts)
-- Cole no SQL Editor do Supabase e clique em Run. Pode rodar de novo sem erro.
-- Cria as lições, as perguntas e o gabarito que a função submit_quiz usa para corrigir as provas.
-- ============================================================
do $$
declare m uuid; qid uuid;
begin

  -- Módulo 1: Dinheiro e orçamento
  insert into public.edu_modules (slug, position, title, summary, min_age, xp_reward) values ('dinheiro-orcamento', 1, 'Dinheiro e orçamento', 'Ganhar, gastar e planejar: o básico para o dinheiro render.', 16, 100)
    on conflict (slug) do update set position = excluded.position, title = excluded.title, summary = excluded.summary;
  select id into m from public.edu_modules where slug = 'dinheiro-orcamento';
  delete from public.edu_lessons where module_id = m;
  delete from public.edu_questions where module_id = m;
  insert into public.edu_lessons (module_id, position, title, body) values (m, 1, 'De onde vem e para onde vai o dinheiro', 'Renda é todo dinheiro que entra: mesada, salário, bolsa, um trabalho extra. Gastos são os que saem. A diferença entre os dois é o que sobra, ou o que falta.

Uma boa pergunta antes de gastar é: isso é uma necessidade ou um desejo? Necessidade é o que você precisa para viver e estudar (comida, transporte, material escolar). Desejo é o que é bom ter, mas dá para esperar.

Exemplo: Se entram R$ 1.000 e saem R$ 900, sobram R$ 100. Se saem R$ 1.100, faltam R$ 100, e é aí que nascem as dívidas.');
  insert into public.edu_lessons (module_id, position, title, body) values (m, 2, 'Orçamento e reserva de emergência', 'Orçamento é um plano simples: anotar quanto entra, quanto sai e quanto você quer guardar. Ele não serve para proibir gastos, e sim para você decidir antes, em vez de se surpreender depois.

Reserva de emergência é um dinheiro guardado para imprevistos, como um conserto ou uma despesa médica. Uma referência comum é juntar de 3 a 6 meses de gastos essenciais, começando por valores pequenos.

Exemplo: Uma regra conhecida é a 50/30/20: 50% para necessidades, 30% para desejos e 20% para guardar ou pagar dívidas. É um ponto de partida, e cada pessoa ajusta ao seu caso.');
  insert into public.edu_questions (module_id, position, prompt, options, explanation) values (m, 1, 'Qual é um exemplo de necessidade?', '["Skin nova de um jogo","Material escolar","Ingresso para um show","Tênis de edição limitada"]'::jsonb, 'Necessidades são o que você precisa para viver e estudar. O resto são desejos.') returning id into qid;
  insert into public.edu_answers (question_id, correct_index) values (qid, 1);
  insert into public.edu_questions (module_id, position, prompt, options, explanation) values (m, 2, 'Para que serve um orçamento?', '["Para proibir qualquer gasto","Para planejar quanto entra, quanto sai e quanto guardar","Para aumentar o salário","Para evitar pagar impostos"]'::jsonb, 'O orçamento ajuda a decidir antes de gastar e a enxergar para onde o dinheiro vai.') returning id into qid;
  insert into public.edu_answers (question_id, correct_index) values (qid, 1);
  insert into public.edu_questions (module_id, position, prompt, options, explanation) values (m, 3, 'Entram R$ 1.000 por mês. Os gastos fixos são R$ 600 e os variáveis, R$ 300. Quanto sobra?', '["R$ 50","R$ 100","R$ 400","R$ 700"]'::jsonb, '1.000 − 600 − 300 = 100. Esse valor pode ir para a reserva ou para um objetivo.') returning id into qid;
  insert into public.edu_answers (question_id, correct_index) values (qid, 1);
  insert into public.edu_questions (module_id, position, prompt, options, explanation) values (m, 4, 'Para que serve a reserva de emergência?', '["Para comprar presentes","Para cobrir imprevistos","Para investir em ações de risco","Para pagar o cartão todo mês"]'::jsonb, 'É um dinheiro guardado para situações inesperadas, evitando recorrer a dívidas caras.') returning id into qid;
  insert into public.edu_answers (question_id, correct_index) values (qid, 1);
  insert into public.edu_questions (module_id, position, prompt, options, explanation) values (m, 5, 'Na regra 50/30/20, o que vai nos 20%?', '["Lazer","Moradia","Guardar ou pagar dívidas","Alimentação"]'::jsonb, 'Os 20% são para o seu futuro: poupar, investir ou quitar dívidas.') returning id into qid;
  insert into public.edu_answers (question_id, correct_index) values (qid, 2);

  -- Módulo 2: Cartões
  insert into public.edu_modules (slug, position, title, summary, min_age, xp_reward) values ('cartoes', 2, 'Cartões', 'Débito, crédito, fatura e parcelamento sem susto.', 16, 100)
    on conflict (slug) do update set position = excluded.position, title = excluded.title, summary = excluded.summary;
  select id into m from public.edu_modules where slug = 'cartoes';
  delete from public.edu_lessons where module_id = m;
  delete from public.edu_questions where module_id = m;
  insert into public.edu_lessons (module_id, position, title, body) values (m, 1, 'Débito e crédito', 'No cartão de débito, o valor sai da sua conta na hora, então você só gasta o que tem. No cartão de crédito, você compra agora e paga depois, na fatura.

Crédito funciona como um empréstimo de curto prazo. Se a fatura é paga integralmente até o vencimento, não há juros. Se não, o custo pode ser muito alto.

Exemplo: Compra de R$ 200 no débito: seu saldo cai R$ 200 hoje. No crédito: seu saldo só cai quando você paga a fatura.');
  insert into public.edu_lessons (module_id, position, title, body) values (m, 2, 'Fatura, mínimo e parcelamento', 'Pagar só o valor mínimo da fatura parece aliviar, mas o restante vira dívida com juros, chamada de crédito rotativo, uma das mais caras do mercado.

Parcelar compras pode caber no bolso, mas compromete parte da renda dos próximos meses. Antes de parcelar, some todas as parcelas que você já tem.

Exemplo: Dez parcelas de R$ 80 parecem pouco, mas são R$ 800 já comprometidos nos próximos 10 meses.');
  insert into public.edu_questions (module_id, position, prompt, options, explanation) values (m, 1, 'O que acontece quando você paga com cartão de débito?', '["O valor é cobrado só no mês que vem","O valor sai da sua conta na hora","Você ganha um empréstimo","A compra gera juros"]'::jsonb, 'No débito, o dinheiro é descontado do saldo imediatamente.') returning id into qid;
  insert into public.edu_answers (question_id, correct_index) values (qid, 1);
  insert into public.edu_questions (module_id, position, prompt, options, explanation) values (m, 2, 'Cartão de crédito é, na prática:', '["Dinheiro grátis","Um empréstimo de curto prazo que se paga na fatura","Uma poupança","Um investimento"]'::jsonb, 'Você usa o dinheiro do banco agora e devolve na fatura.') returning id into qid;
  insert into public.edu_answers (question_id, correct_index) values (qid, 1);
  insert into public.edu_questions (module_id, position, prompt, options, explanation) values (m, 3, 'O que acontece se você paga só o mínimo da fatura?', '["A dívida some","O restante vira dívida com juros altos","Você ganha pontos em dobro","Nada muda"]'::jsonb, 'O saldo restante entra no crédito rotativo, com juros muito altos.') returning id into qid;
  insert into public.edu_answers (question_id, correct_index) values (qid, 1);
  insert into public.edu_questions (module_id, position, prompt, options, explanation) values (m, 4, 'Qual é o principal cuidado ao parcelar uma compra?', '["Escolher a loja mais bonita","Lembrar que as parcelas comprometem a renda dos meses seguintes","Parcelar sempre em 12 vezes","Nunca olhar o valor"]'::jsonb, 'Parcelas se acumulam. Some tudo o que já está comprometido antes de assumir mais uma.') returning id into qid;
  insert into public.edu_answers (question_id, correct_index) values (qid, 1);
  insert into public.edu_questions (module_id, position, prompt, options, explanation) values (m, 5, 'Qual é a melhor prática com a fatura do cartão?', '["Pagar o mínimo","Pagar o valor total até o vencimento","Esperar o banco cobrar","Pagar só metade"]'::jsonb, 'Pagando o total até o vencimento, você usa o crédito sem pagar juros.') returning id into qid;
  insert into public.edu_answers (question_id, correct_index) values (qid, 1);

  -- Módulo 3: Juros e dívidas
  insert into public.edu_modules (slug, position, title, summary, min_age, xp_reward) values ('juros-dividas', 3, 'Juros e dívidas', 'Como os juros crescem e como sair do vermelho.', 16, 100)
    on conflict (slug) do update set position = excluded.position, title = excluded.title, summary = excluded.summary;
  select id into m from public.edu_modules where slug = 'juros-dividas';
  delete from public.edu_lessons where module_id = m;
  delete from public.edu_questions where module_id = m;
  insert into public.edu_lessons (module_id, position, title, body) values (m, 1, 'O que são juros', 'Juros são o preço do dinheiro no tempo. Quem empresta cobra juros, e quem investe recebe juros. Eles podem estar a seu favor ou contra você.

Nos juros compostos, os juros do mês entram na base de cálculo do mês seguinte, ou seja, há juros sobre juros. Por isso o tempo faz tanta diferença, tanto para investir quanto para dever.

Exemplo: R$ 100 a 10% ao mês, em juros compostos: após 1 mês são R$ 110; após 2 meses, R$ 121.');
  insert into public.edu_lessons (module_id, position, title, body) values (m, 2, 'Como sair de uma dívida', 'Dívidas de cartão rotativo e cheque especial costumam ter os juros mais altos. Costumam ser as primeiras a quitar.

O caminho é listar todas as dívidas (valor, juros, vencimento), cortar gastos que dá para cortar, conversar com o credor para negociar e evitar novas dívidas enquanto paga as antigas.

Exemplo: Dívida A: R$ 500 a 2% ao mês. Dívida B: R$ 500 a 14% ao mês. Priorize a B.');
  insert into public.edu_questions (module_id, position, prompt, options, explanation) values (m, 1, 'Juros são:', '["Um desconto","O preço do dinheiro no tempo","Um imposto","Uma multa só para quem atrasa"]'::jsonb, 'Quem empresta cobra juros e quem investe recebe juros.') returning id into qid;
  insert into public.edu_answers (question_id, correct_index) values (qid, 1);
  insert into public.edu_questions (module_id, position, prompt, options, explanation) values (m, 2, 'R$ 100 a 10% ao mês em juros compostos valem quanto após 2 meses?', '["R$ 110","R$ 120","R$ 121","R$ 200"]'::jsonb, '100 × 1,10 = 110; depois 110 × 1,10 = 121.') returning id into qid;
  insert into public.edu_answers (question_id, correct_index) values (qid, 2);
  insert into public.edu_questions (module_id, position, prompt, options, explanation) values (m, 3, 'O que são juros compostos?', '["Juros que não mudam nunca","Juros calculados sobre o valor inicial e também sobre juros anteriores","Juros só do primeiro mês","Uma taxa do banco"]'::jsonb, 'É o famoso juros sobre juros.') returning id into qid;
  insert into public.edu_answers (question_id, correct_index) values (qid, 1);
  insert into public.edu_questions (module_id, position, prompt, options, explanation) values (m, 4, 'Qual dívida costuma ter os juros mais altos?', '["Financiamento imobiliário","Crédito rotativo do cartão","Empréstimo com garantia de imóvel","Bolsa de estudos"]'::jsonb, 'O rotativo do cartão e o cheque especial estão entre as dívidas mais caras.') returning id into qid;
  insert into public.edu_answers (question_id, correct_index) values (qid, 1);
  insert into public.edu_questions (module_id, position, prompt, options, explanation) values (m, 5, 'Qual é uma boa primeira atitude para sair das dívidas?', '["Ignorar até vencer","Listar tudo o que deve e priorizar as de juros mais altos","Fazer uma dívida nova para pagar a velha sem avaliar","Parar de olhar o extrato"]'::jsonb, 'Organizar e priorizar as dívidas mais caras reduz o custo total.') returning id into qid;
  insert into public.edu_answers (question_id, correct_index) values (qid, 1);

  -- Módulo 4: Investimentos
  insert into public.edu_modules (slug, position, title, summary, min_age, xp_reward) values ('investimentos', 4, 'Investimentos', 'Risco, retorno, liquidez e as primeiras opções.', 16, 100)
    on conflict (slug) do update set position = excluded.position, title = excluded.title, summary = excluded.summary;
  select id into m from public.edu_modules where slug = 'investimentos';
  delete from public.edu_lessons where module_id = m;
  delete from public.edu_questions where module_id = m;
  insert into public.edu_lessons (module_id, position, title, body) values (m, 1, 'Risco, retorno e liquidez', 'Todo investimento tem três características: retorno (quanto pode render), risco (a chance de perder ou render menos que o esperado) e liquidez (a rapidez para transformar em dinheiro).

Em geral, quanto maior o retorno esperado, maior o risco. Promessa de ganho alto e sem risco é sinal de alerta.

Exemplo: Uma reserva de emergência precisa de liquidez e baixo risco. Já um objetivo de 10 anos pode aceitar mais risco.');
  insert into public.edu_lessons (module_id, position, title, body) values (m, 2, 'Renda fixa, renda variável e diversificação', 'Na renda fixa, as regras de remuneração são definidas na contratação (por exemplo, Tesouro Direto e CDB). Na renda variável (como ações), o retorno não é conhecido de antemão e o preço oscila.

Diversificar é não colocar todo o dinheiro em um único lugar. Assim, se um investimento vai mal, os outros ajudam a equilibrar.

Exemplo: O Tesouro Direto é um programa em que você empresta dinheiro ao governo federal e recebe uma remuneração por isso.');
  insert into public.edu_questions (module_id, position, prompt, options, explanation) values (m, 1, 'O que é liquidez?', '["O quanto o investimento rende","A rapidez para transformar o investimento em dinheiro","O risco de perda","O imposto cobrado"]'::jsonb, 'Liquidez mede a facilidade de resgatar o dinheiro quando precisar.') returning id into qid;
  insert into public.edu_answers (question_id, correct_index) values (qid, 1);
  insert into public.edu_questions (module_id, position, prompt, options, explanation) values (m, 2, 'Em geral, o que acontece com o risco quando o retorno esperado é maior?', '["Diminui","Aumenta","Desaparece","Não tem relação"]'::jsonb, 'Maior retorno esperado costuma vir com maior risco.') returning id into qid;
  insert into public.edu_answers (question_id, correct_index) values (qid, 1);
  insert into public.edu_questions (module_id, position, prompt, options, explanation) values (m, 3, 'Qual é uma característica da renda fixa?', '["Regras de remuneração definidas na contratação","Rendimento sempre igual para todos","Não tem risco nenhum","Só existe em banco"]'::jsonb, 'Na renda fixa a forma de remuneração é combinada na contratação. Isso não significa ausência total de risco.') returning id into qid;
  insert into public.edu_answers (question_id, correct_index) values (qid, 0);
  insert into public.edu_questions (module_id, position, prompt, options, explanation) values (m, 4, 'O Tesouro Direto é:', '["Um empréstimo que você faz ao governo federal","Um tipo de cartão","Uma conta corrente","Um imposto"]'::jsonb, 'Ao comprar um título do Tesouro Direto você empresta dinheiro ao governo e recebe remuneração.') returning id into qid;
  insert into public.edu_answers (question_id, correct_index) values (qid, 0);
  insert into public.edu_questions (module_id, position, prompt, options, explanation) values (m, 5, 'O que significa diversificar?', '["Colocar tudo em um único investimento","Dividir o dinheiro entre diferentes investimentos","Gastar mais","Comprar o que está na moda"]'::jsonb, 'Diversificar reduz o impacto de um investimento que vai mal.') returning id into qid;
  insert into public.edu_answers (question_id, correct_index) values (qid, 1);

  -- Módulo 5: Impostos
  insert into public.edu_modules (slug, position, title, summary, min_age, xp_reward) values ('impostos', 5, 'Impostos', 'Para onde vão os impostos e como eles aparecem na vida.', 16, 100)
    on conflict (slug) do update set position = excluded.position, title = excluded.title, summary = excluded.summary;
  select id into m from public.edu_modules where slug = 'impostos';
  delete from public.edu_lessons where module_id = m;
  delete from public.edu_questions where module_id = m;
  insert into public.edu_lessons (module_id, position, title, body) values (m, 1, 'Para que servem os impostos', 'Impostos são valores pagos ao governo e usados para financiar serviços públicos, como saúde, educação, segurança e estradas.

Eles aparecem de duas formas: os diretos, pagos por quem tem a renda ou o patrimônio (como o Imposto de Renda, o IPTU e o IPVA); e os indiretos, que já vêm embutidos no preço do que compramos.

Exemplo: Quando você compra um lanche, parte do preço já inclui impostos, mesmo sem aparecer em linha separada.');
  insert into public.edu_lessons (module_id, position, title, body) values (m, 2, 'Imposto de Renda e nota fiscal', 'O Imposto de Renda incide sobre a renda e os ganhos. Quem tem rendimentos acima de determinados limites deve declarar anualmente. As regras mudam, e vale consultar a Receita Federal.

Pedir nota fiscal ajuda a comprovar a compra, a usar a garantia e a combater a sonegação, que prejudica quem paga em dia.

Exemplo: Guardar a nota fiscal de um celular novo facilita a troca se ele der defeito.');
  insert into public.edu_questions (module_id, position, prompt, options, explanation) values (m, 1, 'Os impostos servem principalmente para:', '["Pagar apenas o governo","Financiar serviços públicos como saúde e educação","Aumentar o preço dos produtos sem motivo","Substituir o salário"]'::jsonb, 'Impostos financiam serviços e obras que beneficiam a sociedade.') returning id into qid;
  insert into public.edu_answers (question_id, correct_index) values (qid, 1);
  insert into public.edu_questions (module_id, position, prompt, options, explanation) values (m, 2, 'Qual é um exemplo de imposto indireto?', '["Imposto de Renda","IPVA","Imposto embutido no preço de um produto","IPTU"]'::jsonb, 'O imposto indireto já vem embutido no preço do que compramos.') returning id into qid;
  insert into public.edu_answers (question_id, correct_index) values (qid, 2);
  insert into public.edu_questions (module_id, position, prompt, options, explanation) values (m, 3, 'O Imposto de Renda incide sobre:', '["Renda e ganhos","Só imóveis","Só automóveis","Compras de supermercado"]'::jsonb, 'É um imposto sobre a renda e os ganhos das pessoas.') returning id into qid;
  insert into public.edu_answers (question_id, correct_index) values (qid, 0);
  insert into public.edu_questions (module_id, position, prompt, options, explanation) values (m, 4, 'Por que pedir a nota fiscal é importante?', '["Para pagar mais imposto","Para comprovar a compra e usar a garantia","Não tem importância","Para receber dinheiro do vendedor"]'::jsonb, 'A nota comprova a compra e ajuda a combater a sonegação.') returning id into qid;
  insert into public.edu_answers (question_id, correct_index) values (qid, 1);
  insert into public.edu_questions (module_id, position, prompt, options, explanation) values (m, 5, 'IPTU e IPVA são exemplos de impostos:', '["Indiretos","Diretos sobre patrimônio","Sobre alimentos","Que só empresas pagam"]'::jsonb, 'Incidem sobre o patrimônio de quem tem um imóvel (IPTU) ou um veículo (IPVA).') returning id into qid;
  insert into public.edu_answers (question_id, correct_index) values (qid, 1);

  -- Módulo 6: Golpes e criptomoedas
  insert into public.edu_modules (slug, position, title, summary, min_age, xp_reward) values ('golpes-cripto', 6, 'Golpes e criptomoedas', 'Como não cair em golpes e o que saber sobre cripto.', 16, 100)
    on conflict (slug) do update set position = excluded.position, title = excluded.title, summary = excluded.summary;
  select id into m from public.edu_modules where slug = 'golpes-cripto';
  delete from public.edu_lessons where module_id = m;
  delete from public.edu_questions where module_id = m;
  insert into public.edu_lessons (module_id, position, title, body) values (m, 1, 'Golpes mais comuns', 'Golpistas usam urgência e emoção: mensagens de um suposto parente com número novo pedindo Pix, links falsos de bancos, ofertas boas demais e prêmios que você não pediu.

Regras de ouro: nunca compartilhe senhas ou códigos de verificação; confirme pedidos de dinheiro por ligação; acesse o banco apenas pelo app ou site oficial; e desconfie de ganho alto e garantido.

Exemplo: Promessa de render 10% ao mês garantido é típica de pirâmide financeira. Nenhum investimento sério garante isso.');
  insert into public.edu_lessons (module_id, position, title, body) values (m, 2, 'Criptomoedas: o que saber', 'Criptomoedas são ativos digitais cujos preços podem variar muito em pouco tempo. São considerados investimentos de alto risco e não são garantidos pelo governo nem pelo FGC.

Se alguém decidir investir, só deve usar um valor que possa perder, e estudar antes. Oportunidades que prometem lucro certo com cripto são frequentemente golpes.

Exemplo: Antes de investir em qualquer coisa, pergunte: quem é o responsável, onde está regulamentado e o que acontece se eu perder tudo?');
  insert into public.edu_questions (module_id, position, prompt, options, explanation) values (m, 1, 'Você recebe uma mensagem de um "parente com número novo" pedindo um Pix urgente. O que fazer?', '["Pagar logo para ajudar","Ligar para o parente no número que você já conhece para confirmar","Responder com sua senha","Mandar o dobro"]'::jsonb, 'Confirmar por ligação, em um canal que você já conhece, desmonta esse golpe.') returning id into qid;
  insert into public.edu_answers (question_id, correct_index) values (qid, 1);
  insert into public.edu_questions (module_id, position, prompt, options, explanation) values (m, 2, 'Qual destas informações você nunca deve compartilhar?', '["Seu apelido","Códigos de verificação e senhas","Seu time favorito","O nome da escola"]'::jsonb, 'Senhas e códigos dão acesso às suas contas.') returning id into qid;
  insert into public.edu_answers (question_id, correct_index) values (qid, 1);
  insert into public.edu_questions (module_id, position, prompt, options, explanation) values (m, 3, 'Uma proposta promete 10% de rendimento por mês, garantido. Isso é sinal de:', '["Um ótimo investimento","Possível golpe ou pirâmide","Poupança","Tesouro Direto"]'::jsonb, 'Retorno alto e garantido não existe em investimentos sérios.') returning id into qid;
  insert into public.edu_answers (question_id, correct_index) values (qid, 1);
  insert into public.edu_questions (module_id, position, prompt, options, explanation) values (m, 4, 'Sobre criptomoedas, é correto dizer que:', '["Têm preço sempre estável","São garantidas pelo FGC","São de alto risco e podem variar muito de preço","Nunca dão prejuízo"]'::jsonb, 'Os preços oscilam muito, e não há garantia do FGC.') returning id into qid;
  insert into public.edu_answers (question_id, correct_index) values (qid, 2);
  insert into public.edu_questions (module_id, position, prompt, options, explanation) values (m, 5, 'Você recebe um SMS do "banco" com um link. O mais seguro é:', '["Clicar no link","Abrir o app ou digitar o endereço oficial do banco por conta própria","Encaminhar para amigos","Responder com seus dados"]'::jsonb, 'Evite links recebidos. Acesse o canal oficial por conta própria.') returning id into qid;
  insert into public.edu_answers (question_id, correct_index) values (qid, 1);
end $$;
