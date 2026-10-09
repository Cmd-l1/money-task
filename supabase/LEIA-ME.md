# Ativar as contas reais (Supabase)

O app só usa contas reais quando o site foi publicado com `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` (o GitHub Actions já injeta). Sem isso, ele abre só em modo demonstração.

Faça uma vez, no painel do Supabase (projeto `hvdsntlamtkrbuckhdvk`):

1. **SQL Editor** → rode, nesta ordem, `migrations/001_schema.sql` (só se ainda não rodou), `migrations/002_edu_content.sql` (aulas e provas) e `migrations/003_prazos_conjuntas.sql` (prazos, perda de XP, tarefas conjuntas e tarefa de boas-vindas). Todas podem ser rodadas de novo sem problema.
2. **Edge Functions** → *Create a new function* chamada exatamente `admin` → cole o conteúdo de `functions/admin/index.ts` → em *Settings* da função, **desligue "Verify JWT"** (a própria função confere o login) → *Deploy*. (Se você já criou a função antes, cole o arquivo de novo e faça *Deploy* só para atualizar as mensagens em "membro"; o funcionamento é o mesmo.)
3. **Authentication → Providers → Email** → desligue **Confirm email** (o envio gratuito de e-mails é muito limitado).
4. **Authentication → URL Configuration** → *Site URL* `https://cmd-l1.github.io/money-task/` e adicione a mesma URL em *Redirect URLs* (usada no "Esqueci minha senha").
5. **Authentication → Policies/Password** → tamanho mínimo da senha: 8.
6. GitHub → *Settings → Pages* → *Source: GitHub Actions* (se ainda não estiver).

## Teste rápido
1. Crie uma conta de responsável pelo app → aceite o termo → adicione um filho.
2. Entre como filho (usuário e senha) → conclua tarefa → aprove como responsável → resgate.
3. Em *Perfil → Privacidade* → baixe os dados e teste excluir a conta.

## Novidades (migração 003)
- **Prazo e perda de XP**: em tarefas "Uma vez" o responsável define data/hora e quanto XP se perde. Passado o prazo, o membro não consegue mais enviar e o desconto é aplicado automaticamente (uma vez, sem deixar o saldo negativo) quando alguém abre o app.
- **Prazo da recompensa**: depois da data ela some da loja e o resgate é recusado.
- **Tarefa conjunta**: escolha 2+ membros e ligue "Tarefa conjunta"; cada um ganha o XP ao concluir a sua parte e todos veem quem já fez.
- **Boas-vindas**: todo membro novo (e os que já existem) recebe a tarefa "Conheça o money task" (50 XP).

## Limitações conhecidas
- O desconto por prazo é aplicado quando alguém abre o app (não há relógio rodando no servidor).
- Prazo vale para tarefas "Uma vez"; tarefas diárias/semanais não têm prazo.
- Respostas do onboarding (objetivo, nº de filhos) ficam só nos metadados do usuário.
- Conquistas, sequência e avisos são calculados no app a partir do extrato.
- Tarefa "para todos" vira uma tarefa por filho; "diária" usa o dia em UTC.
