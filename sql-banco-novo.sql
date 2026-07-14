-- ══════════════════════════════════════════════════════════════
-- BANCO PRÓPRIO DA COMUNIDADE IMERSÃO
-- Projeto Supabase separado: aqui NÃO existe Manager Club nem Meu Manager.
-- As contas de login (auth.users) daqui são só das alunas da Imersão.
-- ══════════════════════════════════════════════════════════════

-- ── 0. Quem é admin (a Lara). Não depende de nenhuma tabela dos outros produtos.
create table if not exists imersao_admins (
  email      text primary key,
  created_at timestamptz not null default now()
);

insert into imersao_admins (email) values ('laradam.ugc@gmail.com')
on conflict (email) do nothing;

alter table imersao_admins enable row level security;
-- Ninguém lê essa tabela pelo cliente. As funções abaixo leem por dentro (security definer).

create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from imersao_admins
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

revoke execute on function is_admin() from public;
grant execute on function is_admin() to authenticated;


-- ── 1. A lista de quem comprou (a porteira). Alimentada pela Kiwify.
create table if not exists imersao_alunas (
  id         bigint generated always as identity primary key,
  nome       text,
  email      text not null unique,
  whatsapp   text,
  obs        text,
  ativo      boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_alunas_email on imersao_alunas(lower(email));

alter table imersao_alunas enable row level security;

drop policy if exists "alunas: so admin le" on imersao_alunas;
create policy "alunas: so admin le" on imersao_alunas
  for all to authenticated using (is_admin()) with check (is_admin());


-- ── 2. Porteira: o e-mail logado está na lista?
create or replace function is_aluna_imersao()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from imersao_alunas
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and ativo
  ) or is_admin();
$$;

revoke execute on function is_aluna_imersao() from public;
grant execute on function is_aluna_imersao() to authenticated;


-- ── 3. Perfil da aluna (também alimenta a galeria)
create table if not exists imersao_perfis (
  usuario_id    uuid primary key references auth.users(id) on delete cascade,
  nome          text not null,
  instagram     text,
  portfolio_url text,
  avatar_url    text,
  bio           text,
  created_at    timestamptz not null default now()
);

alter table imersao_perfis enable row level security;

drop policy if exists "perfis: alunas leem" on imersao_perfis;
create policy "perfis: alunas leem" on imersao_perfis
  for select to authenticated using (is_aluna_imersao());

drop policy if exists "perfis: cria o proprio" on imersao_perfis;
create policy "perfis: cria o proprio" on imersao_perfis
  for insert to authenticated with check (usuario_id = auth.uid() and is_aluna_imersao());

drop policy if exists "perfis: edita o proprio" on imersao_perfis;
create policy "perfis: edita o proprio" on imersao_perfis
  for update to authenticated using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());


-- ── 4. Mural
create table if not exists imersao_posts (
  id         bigint generated always as identity primary key,
  autor_id   uuid not null references auth.users(id) on delete cascade,
  tipo       text not null default 'resultado' check (tipo in ('resultado', 'prompt', 'duvida')),
  texto      text not null check (length(texto) between 1 and 5000),
  prompt     text check (prompt is null or length(prompt) <= 8000),
  link       text,
  imagem_url text,
  created_at timestamptz not null default now()
);

create index if not exists idx_posts_created on imersao_posts(created_at desc);
alter table imersao_posts enable row level security;

drop policy if exists "posts: alunas leem" on imersao_posts;
create policy "posts: alunas leem" on imersao_posts
  for select to authenticated using (is_aluna_imersao());

drop policy if exists "posts: aluna publica" on imersao_posts;
create policy "posts: aluna publica" on imersao_posts
  for insert to authenticated with check (autor_id = auth.uid() and is_aluna_imersao());

drop policy if exists "posts: autor edita" on imersao_posts;
create policy "posts: autor edita" on imersao_posts
  for update to authenticated using (autor_id = auth.uid()) with check (autor_id = auth.uid());

drop policy if exists "posts: autor ou admin apaga" on imersao_posts;
create policy "posts: autor ou admin apaga" on imersao_posts
  for delete to authenticated using (autor_id = auth.uid() or is_admin());


create table if not exists imersao_comentarios (
  id         bigint generated always as identity primary key,
  post_id    bigint not null references imersao_posts(id) on delete cascade,
  autor_id   uuid not null references auth.users(id) on delete cascade,
  texto      text not null check (length(texto) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists idx_coment_post on imersao_comentarios(post_id, created_at);
alter table imersao_comentarios enable row level security;

drop policy if exists "coment: alunas leem" on imersao_comentarios;
create policy "coment: alunas leem" on imersao_comentarios
  for select to authenticated using (is_aluna_imersao());

drop policy if exists "coment: aluna comenta" on imersao_comentarios;
create policy "coment: aluna comenta" on imersao_comentarios
  for insert to authenticated with check (autor_id = auth.uid() and is_aluna_imersao());

drop policy if exists "coment: autor ou admin apaga" on imersao_comentarios;
create policy "coment: autor ou admin apaga" on imersao_comentarios
  for delete to authenticated using (autor_id = auth.uid() or is_admin());


create table if not exists imersao_curtidas (
  post_id    bigint not null references imersao_posts(id) on delete cascade,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, usuario_id)
);

alter table imersao_curtidas enable row level security;

drop policy if exists "curtidas: alunas leem" on imersao_curtidas;
create policy "curtidas: alunas leem" on imersao_curtidas
  for select to authenticated using (is_aluna_imersao());

drop policy if exists "curtidas: curte" on imersao_curtidas;
create policy "curtidas: curte" on imersao_curtidas
  for insert to authenticated with check (usuario_id = auth.uid() and is_aluna_imersao());

drop policy if exists "curtidas: descurte" on imersao_curtidas;
create policy "curtidas: descurte" on imersao_curtidas
  for delete to authenticated using (usuario_id = auth.uid());


-- ── 5. Avisos, materiais e biblioteca de prompts
create table if not exists imersao_avisos (
  id         bigint generated always as identity primary key,
  titulo     text not null,
  corpo      text not null,
  fixado     boolean not null default false,
  publicado  boolean not null default true,
  created_at timestamptz not null default now()
);

alter table imersao_avisos enable row level security;

drop policy if exists "avisos: alunas leem" on imersao_avisos;
create policy "avisos: alunas leem" on imersao_avisos
  for select to authenticated using (is_aluna_imersao() and publicado);

drop policy if exists "avisos: admin gerencia" on imersao_avisos;
create policy "avisos: admin gerencia" on imersao_avisos
  for all to authenticated using (is_admin()) with check (is_admin());


create table if not exists imersao_materiais (
  id         bigint generated always as identity primary key,
  titulo     text not null,
  descricao  text,
  url        text not null,
  emoji      text not null default '📄',
  ordem      int not null default 0,
  publicado  boolean not null default true,
  created_at timestamptz not null default now()
);

alter table imersao_materiais enable row level security;

drop policy if exists "materiais: alunas leem" on imersao_materiais;
create policy "materiais: alunas leem" on imersao_materiais
  for select to authenticated using (is_aluna_imersao() and publicado);

drop policy if exists "materiais: admin gerencia" on imersao_materiais;
create policy "materiais: admin gerencia" on imersao_materiais
  for all to authenticated using (is_admin()) with check (is_admin());


create table if not exists imersao_prompts (
  id          bigint generated always as identity primary key,
  titulo      text not null,
  tema        text not null default 'Geral',
  prompt      text not null,
  descricao   text,
  autor_nome  text,
  post_id     bigint references imersao_posts(id) on delete set null,
  destaque    boolean not null default false,
  publicado   boolean not null default true,
  created_at  timestamptz not null default now()
);

create index if not exists idx_prompts_tema on imersao_prompts(tema);
alter table imersao_prompts enable row level security;

drop policy if exists "prompts: alunas leem" on imersao_prompts;
create policy "prompts: alunas leem" on imersao_prompts
  for select to authenticated using (is_aluna_imersao() and publicado);

drop policy if exists "prompts: admin gerencia" on imersao_prompts;
create policy "prompts: admin gerencia" on imersao_prompts
  for all to authenticated using (is_admin()) with check (is_admin());


-- ── 6. Registro do que a Kiwify manda
create table if not exists kiwify_eventos (
  id          bigint generated always as identity primary key,
  recebido_em timestamptz not null default now(),
  evento      text,
  status      text,
  email       text,
  nome        text,
  produto     text,
  resultado   text,
  payload     jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists idx_kiwify_data on kiwify_eventos(recebido_em desc);
alter table kiwify_eventos enable row level security;

drop policy if exists "kiwify: so admin le" on kiwify_eventos;
create policy "kiwify: so admin le" on kiwify_eventos
  for select to authenticated using (is_admin());


-- ── 7. Feed do mural (posts + autor + curtidas + comentários numa tacada)
create or replace function imersao_feed(p_limit int default 30, p_offset int default 0)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not is_aluna_imersao() then
    raise exception 'Acesso restrito';
  end if;

  select coalesce(jsonb_agg(x order by x.created_at desc), '[]'::jsonb) into v_result
  from (
    select
      p.id, p.tipo, p.texto, p.prompt, p.link, p.imagem_url, p.created_at, p.autor_id,
      coalesce(pe.nome, 'Aluna') as autor_nome,
      pe.avatar_url               as autor_avatar,
      pe.instagram                as autor_instagram,
      (p.autor_id = auth.uid())   as sou_autor,
      (select count(*) from imersao_curtidas c where c.post_id = p.id) as n_curtidas,
      exists (select 1 from imersao_curtidas c where c.post_id = p.id and c.usuario_id = auth.uid()) as eu_curti,
      (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', cm.id,
          'texto', cm.texto,
          'created_at', cm.created_at,
          'autor_id', cm.autor_id,
          'autor_nome', coalesce(pc.nome, 'Aluna'),
          'autor_avatar', pc.avatar_url,
          'sou_autor', (cm.autor_id = auth.uid())
        ) order by cm.created_at), '[]'::jsonb)
        from imersao_comentarios cm
        left join imersao_perfis pc on pc.usuario_id = cm.autor_id
        where cm.post_id = p.id
      ) as comentarios
    from imersao_posts p
    left join imersao_perfis pe on pe.usuario_id = p.autor_id
    order by p.created_at desc
    limit greatest(1, least(p_limit, 100))
    offset greatest(0, p_offset)
  ) x;

  return v_result;
end;
$$;

revoke execute on function imersao_feed(int, int) from public;
grant execute on function imersao_feed(int, int) to authenticated;


-- ── 8. Galeria de portfólios
create or replace function imersao_galeria()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not is_aluna_imersao() then
    raise exception 'Acesso restrito';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'nome', nome,
    'instagram', instagram,
    'portfolio_url', portfolio_url,
    'avatar_url', avatar_url,
    'bio', bio
  ) order by created_at desc), '[]'::jsonb) into v_result
  from imersao_perfis
  where portfolio_url is not null and length(trim(portfolio_url)) > 0;

  return v_result;
end;
$$;

revoke execute on function imersao_galeria() from public;
grant execute on function imersao_galeria() to authenticated;


-- ── 9. Storage das imagens do mural
insert into storage.buckets (id, name, public)
values ('imersao', 'imersao', true)
on conflict (id) do nothing;

drop policy if exists "imersao: leitura publica" on storage.objects;
create policy "imersao: leitura publica" on storage.objects
  for select to public using (bucket_id = 'imersao');

drop policy if exists "imersao: aluna sobe" on storage.objects;
create policy "imersao: aluna sobe" on storage.objects
  for insert to authenticated with check (bucket_id = 'imersao' and is_aluna_imersao());

drop policy if exists "imersao: dona apaga" on storage.objects;
create policy "imersao: dona apaga" on storage.objects
  for delete to authenticated using (bucket_id = 'imersao' and owner = auth.uid());


-- ── 10. Material que já existe
insert into imersao_materiais (titulo, descricao, url, emoji, ordem)
select 'Apostila do Dia 2', 'Portfólio e Mídia Kit com Claude Code: passo a passo, prompts prontos e checklists.', 'https://creators.laradam.com/aula', '📘', 1
where not exists (select 1 from imersao_materiais where url = 'https://creators.laradam.com/aula');
