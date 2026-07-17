-- ══════════════════════════════════════════════════════════════
-- QUAIS PRODUTOS DA KIWIFY LIBERAM A COMUNIDADE
--
-- Cada produto vendido na Kiwify vira uma linha aqui. Na aba "Acesso"
-- do admin, a Lara liga/desliga "libera_comunidade" por produto.
-- Produto novo nasce DESLIGADO (ela decide). O webhook (service_role)
-- registra os produtos e consulta esta tabela pra decidir quem entra.
-- ══════════════════════════════════════════════════════════════

create table if not exists imersao_produtos_acesso (
  id                bigint generated always as identity primary key,
  produto_id        text unique not null,
  produto_nome      text,
  libera_comunidade boolean not null default false,
  criado_em         timestamptz not null default now()
);

alter table imersao_produtos_acesso enable row level security;

drop policy if exists "produtos_acesso: so admin" on imersao_produtos_acesso;
create policy "produtos_acesso: so admin" on imersao_produtos_acesso
  for all to authenticated using (is_admin()) with check (is_admin());

-- ── Transição segura: todos os produtos JÁ vendidos entram LIGADOS,
-- pra nenhum aluno atual perder acesso. Você desliga os de nicho depois.
insert into imersao_produtos_acesso (produto_id, produto_nome, libera_comunidade)
select a.produto_id, max(a.produto_nome), true
from kiwify_acessos a
where coalesce(a.produto_id, '') <> ''
group by a.produto_id
on conflict (produto_id) do nothing;

-- ══════════════════════════════════════════════════════════════
-- ÚTEIS (rode solto quando precisar)
--
-- Ver os produtos e o que cada um libera:
--   select produto_nome, produto_id, libera_comunidade
--     from imersao_produtos_acesso order by produto_nome;
--
-- Ligar um produto na mão (troque pelo id da Kiwify):
--   update imersao_produtos_acesso set libera_comunidade = true  where produto_id = 'ID_AQUI';
--
-- Desligar um produto de nicho:
--   update imersao_produtos_acesso set libera_comunidade = false where produto_id = 'ID_AQUI';
-- ══════════════════════════════════════════════════════════════
