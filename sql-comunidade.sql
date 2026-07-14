-- ══════════════════════════════════════════════════════════════
-- COMUNIDADE IMERSÃO  ·  projeto Supabase "Cadastro de Creators"
-- Mural (posts/comentários/curtidas) + Avisos + Materiais + Perfis
-- Quem entra: só quem está em imersao_alunas com ativo = true
-- ══════════════════════════════════════════════════════════════

-- ── 0. Porteira: o e-mail do usuário logado está na lista das pagantes?
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


-- ── 1. Perfil da aluna dentro da comunidade (também alimenta a galeria)
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


-- ── 2. Mural: posts
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

create index if not exists idx_imersao_posts_created on imersao_posts(created_at desc);

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


-- ── 3. Mural: comentários
create table if not exists imersao_comentarios (
  id         bigint generated always as identity primary key,
  post_id    bigint not null references imersao_posts(id) on delete cascade,
  autor_id   uuid not null references auth.users(id) on delete cascade,
  texto      text not null check (length(texto) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists idx_imersao_coment_post on imersao_comentarios(post_id, created_at);

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


-- ── 4. Mural: curtidas
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


-- ── 5. Avisos (só a Lara publica)
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


-- ── 6. Materiais (apostilas, links, downloads)
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


-- ── 7. Feed do mural: posts + autor + curtidas + comentários numa tacada só
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
      p.id,
      p.tipo,
      p.texto,
      p.prompt,
      p.link,
      p.imagem_url,
      p.created_at,
      p.autor_id,
      coalesce(pe.nome, 'Aluna') as autor_nome,
      pe.avatar_url               as autor_avatar,
      pe.instagram                as autor_instagram,
      (p.autor_id = auth.uid())   as sou_autor,
      (select count(*) from imersao_curtidas c where c.post_id = p.id)                          as n_curtidas,
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


-- ── 8. Galeria: perfis que já publicaram o portfólio
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


-- ── 9. Storage: bucket das imagens do mural (prints, avatares)
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


-- ── 10. Materiais iniciais (a apostila que já existe)
insert into imersao_materiais (titulo, descricao, url, emoji, ordem)
select 'Apostila do Dia 2', 'Portfólio e Mídia Kit com Claude Code: passo a passo, prompts prontos e checklists.', 'https://creators.laradam.com/aula', '📘', 1
where not exists (select 1 from imersao_materiais where url = 'https://creators.laradam.com/aula');
