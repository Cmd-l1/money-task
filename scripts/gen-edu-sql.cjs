// Gera supabase/migrations/002_edu_content.sql a partir de src/data/edu.ts
// (assim a prova corrigida no servidor é idêntica ao conteúdo mostrado no app).
// Uso: node scripts/gen-edu-sql.cjs
const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const out = esbuild.buildSync({ entryPoints: [path.join(root, 'src/data/edu.ts')], bundle: true, format: 'cjs', write: false, platform: 'node' });
const m = { exports: {} };
new Function('module', 'exports', out.outputFiles[0].text)(m, m.exports);
const EDU = m.exports.EDU;
const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
let sql = `-- ============================================================
-- money task — conteúdo de educação financeira (gerado de src/data/edu.ts)
-- Cole no SQL Editor do Supabase e clique em Run. Pode rodar de novo sem erro.
-- Cria as lições, as perguntas e o gabarito que a função submit_quiz usa para corrigir as provas.
-- ============================================================
do $$
declare m uuid; qid uuid;
begin
`;
for (const mod of EDU) {
  sql += `\n  -- Módulo ${mod.order}: ${mod.title}\n`;
  sql += `  insert into public.edu_modules (slug, position, title, summary, min_age, xp_reward) values (${q(mod.slug)}, ${mod.order}, ${q(mod.title)}, ${q(mod.summary)}, 16, 100)\n    on conflict (slug) do update set position = excluded.position, title = excluded.title, summary = excluded.summary;\n`;
  sql += `  select id into m from public.edu_modules where slug = ${q(mod.slug)};\n`;
  sql += `  delete from public.edu_lessons where module_id = m;\n  delete from public.edu_questions where module_id = m;\n`;
  mod.lessons.forEach((l, i) => {
    const body = l.paragraphs.join('\n\n') + (l.example ? '\n\nExemplo: ' + l.example : '');
    sql += `  insert into public.edu_lessons (module_id, position, title, body) values (m, ${i + 1}, ${q(l.title)}, ${q(body)});\n`;
  });
  mod.questions.forEach((qq, i) => {
    if (qq.options.length !== 4) throw new Error(`${mod.slug} pergunta ${i + 1}: precisa de 4 alternativas`);
    sql += `  insert into public.edu_questions (module_id, position, prompt, options, explanation) values (m, ${i + 1}, ${q(qq.prompt)}, ${q(JSON.stringify(qq.options))}::jsonb, ${q(qq.explanation)}) returning id into qid;\n`;
    sql += `  insert into public.edu_answers (question_id, correct_index) values (qid, ${qq.answer});\n`;
  });
}
sql += `end $$;\n`;
const dest = path.join(root, 'supabase/migrations/002_edu_content.sql');
fs.writeFileSync(dest, sql);
console.log('gerado', dest, EDU.length, 'módulos,', EDU.reduce((a, x) => a + x.questions.length, 0), 'perguntas');
