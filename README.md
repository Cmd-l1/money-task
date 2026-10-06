# money task

PWA de tarefas, XP e educação financeira para famílias (crianças e adolescentes de 7 a 18 anos).
Projeto de conclusão de curso — Design, FURB.

- **App:** https://cmd-l1.github.io/money-task/
- **Pilha:** React 19 + TypeScript, esbuild, CSS próprio (tokens espelham o design system shadcn do Figma), PWA instalável.
- **Dados:** modo demonstração local (já funciona) e Supabase (contas reais, próxima etapa).

## Rodar localmente

```bash
npm install
npm run build        # gera dist/
npm run dev          # build + servidor em http://localhost:5173
```

Copie `.env.example` para `.env` para usar o Supabase.

## Estrutura

```
src/
  lib/        regras de XP, roteador, sessão e camada de dados (api.ts)
  data/       trilha de educação financeira (6 módulos, 2 lições e prova de 5 questões cada)
  ui/         ícones e componentes (botão, campo, alerta, folha, navegação…)
  screens/    auth/ kid/ parent/
public/       manifesto, service worker e ícones do app
supabase/     esquema SQL e funções de borda (contas de filhos)
```

## Publicação

Todo push na `main` compila e publica no GitHub Pages (`.github/workflows/deploy.yml`).
Em *Settings → Pages*, a fonte deve ser **GitHub Actions**.
