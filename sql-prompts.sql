-- ══════════════════════════════════════════════════════════════
-- BIBLIOTECA DE PROMPTS
-- Os prompts bons, separados do mural e organizados por tema.
-- Quem publica aqui é só a Lara (ela fixa os que aparecem no mural).
-- ══════════════════════════════════════════════════════════════

create table if not exists imersao_prompts (
  id          bigint generated always as identity primary key,
  titulo      text not null,
  tema        text not null default 'Geral',
  prompt      text not null,
  descricao   text,
  autor_nome  text,               -- crédito de quem compartilhou no mural
  post_id     bigint references imersao_posts(id) on delete set null,
  destaque    boolean not null default false,
  publicado   boolean not null default true,
  created_at  timestamptz not null default now()
);

create index if not exists idx_imersao_prompts_tema on imersao_prompts(tema);
create index if not exists idx_imersao_prompts_data on imersao_prompts(created_at desc);

alter table imersao_prompts enable row level security;

drop policy if exists "prompts: alunas leem" on imersao_prompts;
create policy "prompts: alunas leem" on imersao_prompts
  for select to authenticated using (is_aluna_imersao() and publicado);

drop policy if exists "prompts: admin gerencia" on imersao_prompts;
create policy "prompts: admin gerencia" on imersao_prompts
  for all to authenticated using (is_admin()) with check (is_admin());
