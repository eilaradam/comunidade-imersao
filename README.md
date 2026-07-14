# Comunidade Imersão

Área de membros das alunas da Imersão Portfolio. Só entra quem está na lista das pagantes.

## Como funciona

- **Login** (`index.html`): a aluna digita o e-mail. A função `imersao-conta` (no servidor) confere se ele está em `imersao_alunas` com `ativo = true`. Se estiver e ela ainda não tiver conta, cria a senha na hora e entra. Se não estiver, não passa.
- **Comunidade** (`app.html`): mural (posts, comentários, curtidas), materiais, avisos, galeria de portfólios e perfil. A aba **Admin** aparece só pra Lara e serve pra publicar avisos e adicionar materiais sem mexer em código.
- **Nova senha** (`nova-senha.html`): destino do link de "esqueci minha senha".

## Infra

- **Stack:** HTML, CSS e JS puro. Sem framework, sem build.
- **Deploy:** GitHub Pages (push na `main` já publica).
- **Supabase:** projeto `Cadastro de Creators` (`mfrmnquvwwuxraqgemyh`), o mesmo do creators.laradam.com.

## Banco (`sql-comunidade.sql`)

| Tabela | Pra que serve |
|---|---|
| `imersao_alunas` | Lista das pagantes. **Já existia**, é a porteira. |
| `imersao_perfis` | Perfil da aluna (nome, foto, @, link do portfólio). Alimenta a galeria. |
| `imersao_posts` | Publicações do mural (resultado, prompt ou dúvida). |
| `imersao_comentarios` | Comentários dos posts. |
| `imersao_curtidas` | Curtidas. |
| `imersao_avisos` | Recados da Lara. |
| `imersao_materiais` | Apostilas e links. |

Toda a proteção está no banco (RLS), não na tela: a função `is_aluna_imersao()` exige que o e-mail do usuário logado esteja na lista. Mesmo que alguém crie uma conta por fora, não lê nem publica nada.

## Pra liberar uma aluna nova

Adicione a linha em `imersao_alunas` (nome + email + `ativo = true`). Ela entra pelo site e cria a senha sozinha. Pra tirar o acesso sem perder o cadastro: `ativo = false`.
