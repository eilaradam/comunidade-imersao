-- ══════════════════════════════════════════════════════════════
-- KIWIFY → COMUNIDADE
-- Guarda tudo que a Kiwify manda, pra dar pra auditar e depurar depois.
-- ══════════════════════════════════════════════════════════════

create table if not exists kiwify_eventos (
  id          bigint generated always as identity primary key,
  recebido_em timestamptz not null default now(),
  evento      text,
  status      text,
  email       text,
  nome        text,
  produto     text,
  resultado   text,          -- 'liberada', 'acesso removido', 'ignorado: ...'
  payload     jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists idx_kiwify_eventos_email on kiwify_eventos(lower(email));
create index if not exists idx_kiwify_eventos_data on kiwify_eventos(recebido_em desc);

alter table kiwify_eventos enable row level security;

-- Ninguém lê isso a não ser a Lara. A função escreve com service_role, que passa por cima do RLS.
drop policy if exists "kiwify: so admin le" on kiwify_eventos;
create policy "kiwify: so admin le" on kiwify_eventos
  for select to authenticated using (is_admin());
