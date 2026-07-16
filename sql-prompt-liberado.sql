-- ══════════════════════════════════════════════════════════════
-- LIBERAR PROMPT PELO E-MAIL DE COMPRA
--
-- A aluna digita o e-mail que usou na Kiwify numa página de fora
-- (o site do prompt) e o servidor confere aqui se ela comprou.
-- O prompt nunca fica na página: ele mora nesta tabela e só sai
-- daqui quando o e-mail bate.
-- ══════════════════════════════════════════════════════════════

-- ── 1. Quem comprou o quê (alimentada pelo kiwify-webhook)
-- Uma linha por e-mail + produto. Serve pra qualquer produto seu,
-- não só a Imersão. A comunidade continua usando imersao_alunas,
-- esta tabela não mexe naquilo.
create table if not exists kiwify_acessos (
  id           bigint generated always as identity primary key,
  email        text not null,
  produto_id   text not null default '',
  produto_nome text,
  nome         text,
  ativo        boolean not null default true,   -- reembolso põe false
  origem       text default 'kiwify',           -- 'kiwify' ou 'na mão'
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Nunca duplica a mesma pessoa no mesmo produto.
-- O e-mail entra sempre em minúsculas (o webhook já cuida disso), então
-- ao inserir na mão, escreva o e-mail todo em minúsculas também.
create unique index if not exists idx_kiwify_acessos_chave
  on kiwify_acessos (email, produto_id);
create index if not exists idx_kiwify_acessos_produto
  on kiwify_acessos (produto_id) where ativo;

alter table kiwify_acessos enable row level security;

drop policy if exists "acessos: so admin" on kiwify_acessos;
create policy "acessos: so admin" on kiwify_acessos
  for all to authenticated using (is_admin()) with check (is_admin());


-- ── 2. O prompt em si, e quais produtos abrem ele
-- É AQUI que a Lara mexe: produtos_liberados é a lista de produtos da
-- Kiwify que dão acesso. Pode pôr o NOME exato do produto ou o id, os
-- dois funcionam. Vazio = só os admins abrem.
create table if not exists prompts_publicos (
  chave              text primary key,          -- ex: 'manychat'
  titulo             text,
  texto              text not null default '',  -- o prompt inteiro
  produtos_liberados text[] not null default '{}',
  atualizado_em      timestamptz not null default now()
);

alter table prompts_publicos enable row level security;

-- Ninguém lê pelo painel a não ser a Lara. Quem entrega o prompt é a
-- Edge Function, que usa service_role e passa por cima do RLS.
drop policy if exists "prompts publicos: so admin" on prompts_publicos;
create policy "prompts publicos: so admin" on prompts_publicos
  for all to authenticated using (is_admin()) with check (is_admin());

insert into prompts_publicos (chave, titulo)
values ('manychat', 'Prompt do ManyChat do zero')
on conflict (chave) do nothing;


-- ── 3. As tentativas, pra ninguém ficar chutando e-mail em massa
create table if not exists prompt_tentativas (
  id     bigint generated always as identity primary key,
  ip     text,
  chave  text,
  ok     boolean not null default false,
  quando timestamptz not null default now()
);
create index if not exists idx_prompt_tentativas_ip
  on prompt_tentativas (ip, quando desc);

alter table prompt_tentativas enable row level security;

drop policy if exists "tentativas: so admin" on prompt_tentativas;
create policy "tentativas: so admin" on prompt_tentativas
  for all to authenticated using (is_admin()) with check (is_admin());


-- ══════════════════════════════════════════════════════════════
-- ÚTEIS (rode solto quando precisar)
--
-- Ligar o prompt pro seu produto novo (troque pelo id da Kiwify):
--   update prompts_publicos
--      set produtos_liberados = array['ID_DO_PRODUTO_AQUI']
--    where chave = 'manychat';
--
-- Liberar pra Imersão também (os dois produtos abrem):
--   update prompts_publicos
--      set produtos_liberados = array['ID_DO_MANYCHAT', 'ID_DA_IMERSAO']
--    where chave = 'manychat';
--
-- Dar acesso na mão pra alguém que não comprou (convidada, parceira):
--   insert into kiwify_acessos (email, produto_id, nome, origem)
--   values ('amiga@exemplo.com', 'ID_DO_PRODUTO_AQUI', 'Amiga', 'na mão');
--
-- Ver quem já tem acesso:
--   select email, produto_nome, ativo, created_at from kiwify_acessos order by created_at desc;
--
-- Ver quem tentou e não conseguiu:
--   select ip, ok, quando from prompt_tentativas order by quando desc limit 30;
-- ══════════════════════════════════════════════════════════════
