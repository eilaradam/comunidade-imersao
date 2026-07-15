-- ══════════════════════════════════════════════════════════════════
-- Migration: suporte a posts de vídeo no mural
-- Projeto: ykypgdzihgxibeplvrjj  (o que o site claudeimersao.com usa)
-- Tabela REAL: public.imersao_posts  (confirmada por introspecção da API)
-- Rodar UMA vez no SQL Editor do Supabase DESTE projeto.
--
-- OBS: se você já rodou algo antes num projeto/tabela "posts", foi em OUTRO
-- banco — não teve efeito aqui. É esta migration que faz o vídeo publicar.
-- ══════════════════════════════════════════════════════════════════

-- 1) Incluir 'video' no check da coluna tipo
alter table imersao_posts drop constraint if exists imersao_posts_tipo_check;
alter table imersao_posts add constraint imersao_posts_tipo_check
  check (tipo in ('resultado', 'prompt', 'duvida', 'video'));

-- 2) Permitir legenda vazia (vídeo sem texto).
--    texto continua NOT NULL, mas agora aceita length 0.
alter table imersao_posts drop constraint if exists imersao_posts_texto_check;
alter table imersao_posts add constraint imersao_posts_texto_check
  check (length(texto) between 0 and 5000);

-- ── Conferência (opcional): listar os checks da tabela depois de rodar.
--    Se os nomes acima não existirem, esta query mostra os nomes reais.
-- select conname, pg_get_constraintdef(oid)
-- from pg_constraint
-- where conrelid = 'imersao_posts'::regclass and contype = 'c';