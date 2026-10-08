# Ativar as contas reais (Supabase)

O app só usa contas reais quando o site foi publicado com `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` (o GitHub Actions já injeta). Sem isso, ele abre só em modo demonstração.

Faça uma vez, no painel do Supabase (projeto `hvdsntlamtkrbuckhdvk`):

1. **SQL Editor** → rode `migrations/001_schema.sql` (só se ainda não rodou) e depois `migrations/002_edu_content.sql` (aulas e provas; pode rodar de novo sem problema).
2. **Edge Functions** → *Create a new function* chamada exatamente `admin` → cole o conteúdo de `functions/admin/index.ts` → em *Settings* da função, **desligue "Verify JWT"** (a própria função confere o login) → *Deploy*.
3. **Authentication → Providers → Email** → desligue **Confirm email** (o envio gratuito de e-mails é muito limitado).
4. **Authentication → URL Configuration** → *Site URL* `https://cmd-l1.github.io/money-task/` e adicione a mesma URL em *Redirect URLs* (usada no "Esqueci minha senha").
5. **Authentication → Policies/Password** → tamanho mínimo da senha: 8.
6. GitHub → *Settings → Pages* → *Source: GitHub Actions* (se ainda não estiver).

## Teste rápido
1. Crie uma conta de responsável pelo app → aceite o termo → adicione um filho.
2. Entre como filho (usuário e senha) → conclua tarefa → aprove como responsável → resgate.
3. Em *Perfil → Privacidade* → baixe os dados e teste excluir a conta.

## Limitações conhecidas
- Respostas do onboarding (objetivo, nº de filhos) ficam só nos metadados do usuário.
- Conquistas, sequência e avisos são calculados no app a partir do extrato.
- Tarefa "para todos" vira uma tarefa por filho; "diária" usa o dia em UTC.
