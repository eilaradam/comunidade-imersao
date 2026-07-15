-- ══════════════════════════════════════════════════════════════════
-- Admin da comunidade: tabelas que faltavam + acesso admin + seeds
-- Projeto: ykypgdzihgxibeplvrjj  (claudeimersao.com)
-- Rode UMA vez no SQL Editor do Supabase.
-- ══════════════════════════════════════════════════════════════════

-- ── 0. Te dar acesso de admin (troque pelo seu e-mail de login) ──
insert into imersao_admins (email) values ('laradam.ugc@gmail.com')
on conflict do nothing;

-- ── 1. STORE (produtos/aulas à venda) ──
create table if not exists imersao_store (
  id         bigint generated always as identity primary key,
  titulo     text not null,
  descricao  text,
  categoria  text,          -- badge: GRAVADA / MENTORIA / PACK / IMERSÃO ...
  preco      text,          -- "R$ 97"
  link       text,          -- link de checkout (opcional)
  tom        text,          -- cor do gradiente: lavanda / menta / pessego / lavandaClara
  ordem      int not null default 0,
  publicado  boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_store_ordem on imersao_store(ordem, created_at desc);
alter table imersao_store enable row level security;
drop policy if exists "store: alunas leem" on imersao_store;
create policy "store: alunas leem" on imersao_store
  for select to authenticated using (is_aluna_imersao() and publicado);
drop policy if exists "store: admin gerencia" on imersao_store;
create policy "store: admin gerencia" on imersao_store
  for all to authenticated using (is_admin()) with check (is_admin());

-- ── 2. DESTAQUES (carrossel "Em destaque" da home) ──
create table if not exists imersao_destaques (
  id           bigint generated always as identity primary key,
  titulo       text not null,
  subtitulo    text,        -- linha do autor/turma
  categoria    text,        -- badge: GRAVADA / GRATUITA / AO VIVO / IMERSÃO
  descricao    text,
  aulas        text,        -- "8 aulas"
  duracao      text,        -- "2h10"
  nota         text,        -- "4.9"
  preco        text,        -- "R$ 197" ou "Gratuita"
  preco_antigo text,        -- "R$ 247" (opcional)
  off          text,        -- "20%" (opcional)
  link         text,        -- para onde "Acessar" leva (opcional)
  tom          text,        -- cor do gradiente
  ordem        int not null default 0,
  publicado    boolean not null default true,
  created_at   timestamptz not null default now()
);
create index if not exists idx_destaques_ordem on imersao_destaques(ordem, created_at desc);
alter table imersao_destaques enable row level security;
drop policy if exists "destaques: alunas leem" on imersao_destaques;
create policy "destaques: alunas leem" on imersao_destaques
  for select to authenticated using (is_aluna_imersao() and publicado);
drop policy if exists "destaques: admin gerencia" on imersao_destaques;
create policy "destaques: admin gerencia" on imersao_destaques
  for all to authenticated using (is_admin()) with check (is_admin());

-- ══════════════════════════════════════════════════════════════════
-- SEEDS — conteúdo atual (mockado) já entra editável.
-- Se alguma tabela abaixo JÁ tiver conteúdo seu, pule o INSERT dela
-- pra não duplicar.
-- ══════════════════════════════════════════════════════════════════

-- Destaques
insert into imersao_destaques (titulo, subtitulo, categoria, descricao, aulas, duracao, nota, preco, preco_antigo, off, tom, ordem) values
('Landing pages com Claude Code', 'Lara Dam', 'GRAVADA', 'Monte landing pages que convertem do zero, com o Claude Code passo a passo. Ideal pra quem vende serviço, mentoria ou infoproduto.', '8 aulas', '2h10', '4.9', 'R$ 197', 'R$ 247', '20%', 'pessego', 1),
('Boas-vindas da Comunidade', 'Lara Dam', 'GRATUITA', 'Comece por aqui: um tour pela comunidade, como aproveitar cada aba e o que fazer na sua primeira semana dentro da Imersão.', '3 aulas', '22 min', '5.0', 'Gratuita', null, null, 'lavanda', 2),
('Prompts que convertem: UGC', 'Lara Dam', 'GRAVADA', 'Os prompts que eu uso pra criar roteiros de UGC que vendem. Copie, adapte pro seu nicho e grave conteúdo que gera resultado.', '6 aulas', '1h30', '4.8', 'R$ 147', 'R$ 197', '25%', 'menta', 3),
('Encontro ao vivo desta semana', 'Ao vivo · Quinta 20h', 'AO VIVO', 'Nosso encontro semanal com feedback ao vivo dos seus projetos. Traga sua landing ou portfólio e saia com os próximos passos.', '1 encontro', '90 min', 'Novo', 'Gratuita', null, null, 'lavandaClara', 4),
('Imersão Portfólio Claude v2', 'Turma de agosto', 'IMERSÃO', 'A imersão completa pra montar um portfólio profissional com Claude do início ao fim, com acompanhamento e desafios semanais.', '12 aulas', '6h', '4.9', 'R$ 397', 'R$ 597', '33%', 'pessego', 5);

-- Store
insert into imersao_store (titulo, descricao, categoria, preco, tom, ordem) values
('Aula: Landing em 1 hora', 'Aula gravada', 'GRAVADA', 'R$ 97', 'pessego', 1),
('Mentoria 1:1 com a Lara', '60 min ao vivo', 'MENTORIA', 'R$ 997', 'lavanda', 2),
('Pack 50 prompts de UGC', 'Download imediato', 'PACK', 'R$ 47', 'menta', 3),
('Aula: Prompts que vendem', 'Aula gravada', 'GRAVADA', 'R$ 147', 'lavandaClara', 4),
('Imersão Portfólio v2', 'Turma de agosto', 'IMERSÃO', 'R$ 397', 'pessego', 5),
('Pack templates de proposta', 'Editáveis no Canva', 'PACK', 'R$ 67', 'menta', 6);

-- Prompts
insert into imersao_prompts (tema, titulo, prompt, publicado) values
('ROTEIRO UGC', 'Roteiro UGC em 5 cenas', 'Você é uma criadora de conteúdo UGC. Crie um roteiro de vídeo em 5 cenas para o produto [PRODUTO], com gancho nos primeiros 3 segundos, demonstração de uso e chamada para ação natural.', true),
('ANÁLISE', 'Análise de concorrente', 'Analise o perfil do concorrente [LINK]. Liste seus 3 principais formatos de conteúdo, tom de voz, frequência de postagem e as lacunas que eu poderia explorar no meu nicho.', true),
('COPY', 'Copy para stories de venda', 'Escreva uma sequência de 5 stories para vender [OFERTA]. Cada story com uma ideia só: dor, prova, oferta, urgência e CTA. Tom próximo e direto, sem parecer anúncio.', true),
('LANDING PAGE', 'Landing page em 30 min', 'Gere a estrutura completa de uma landing page para [PRODUTO]: headline, subheadline, 3 blocos de benefício, prova social, FAQ e CTA. Me devolva pronto para colar no Claude Code.', true),
('COPY', 'Legenda que gera comentário', 'Crie 3 opções de legenda para um post sobre [TEMA] que terminem com uma pergunta que estimule comentários genuínos, sem clickbait.', true),
('ROTEIRO UGC', 'Depoimento em vídeo autêntico', 'Transforme esse depoimento cru [TEXTO] em um roteiro falado de 30 segundos, mantendo naturalidade, com pausas marcadas e ênfase nas palavras-chave.', true);

-- Materiais
insert into imersao_materiais (titulo, descricao, url, ordem, publicado) values
('Checklist de portfólio', 'PDF · 2.3 MB', '#', 1, true),
('Planilha de precificação UGC', 'XLSX · 480 KB', '#', 2, true),
('Template de proposta comercial', 'PDF · 1.1 MB', '#', 3, true),
('Guia de prompts para Claude', 'PDF · 3.7 MB', '#', 4, true),
('Kit de posts para lançamento', 'ZIP · 8.2 MB', '#', 5, true);

-- Avisos
insert into imersao_avisos (titulo, corpo, publicado) values
('Encontro ao vivo nesta quinta, 20h', 'Nosso encontro semanal vai ser sobre landing pages que convertem. Traga seu projeto para receber feedback ao vivo. O link entra aqui no mural 10 minutos antes.', true),
('Nova biblioteca de prompts liberada', 'Adicionamos 6 prompts novos de copy e roteiro UGC na aba Prompts. É só copiar e adaptar para o seu nicho. Me conta nos comentários qual funcionou melhor.', true),
('Atualize seu portfólio no Mural', 'Quem terminou o projeto da semana pode subir no Mural dos Alunos. Os melhores vão ser destacados na home da comunidade e nas redes da Lara.', true),
('Abrimos a Store da comunidade', 'Agora você encontra aulas avulsas, mentorias 1:1 e packs de prompts direto aqui dentro, com preço de comunidade. Confere a aba Store.', true);