// Porteira da Comunidade Imersão.
// - action "status": diz se o e-mail está na lista das alunas e se já tem conta.
// - action "criar":  cria a conta JÁ CONFIRMADA (sem e-mail de confirmação) para quem está na lista.
// Roda com service_role, então o gate acontece no servidor: o cliente nunca decide quem entra.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    );

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || '');
    const email = String(body.email || '').trim().toLowerCase();

    if (!email || !email.includes('@')) return json({ error: 'E-mail inválido.' }, 400);

    // Está na lista das pagantes?
    const { data: aluna, error: erroLista } = await admin
      .from('imersao_alunas')
      .select('nome, email, ativo')
      .ilike('email', email)
      .eq('ativo', true)
      .maybeSingle();

    if (erroLista) return json({ error: 'Erro ao consultar a lista.' }, 500);

    // A Lara não está na lista de alunas, mas obviamente entra.
    const { data: adm } = await admin
      .from('imersao_admins')
      .select('email')
      .ilike('email', email)
      .maybeSingle();

    if (!aluna && !adm) {
      return json({
        na_lista: false,
        mensagem: 'Esse e-mail não está na lista da turma. Use o mesmo e-mail da compra ou fale com a Lara.',
      });
    }

    const nomeDela = aluna?.nome || (adm ? 'Lara' : '');

    // Já existe conta para esse e-mail?
    const { data: lista } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const usuario = lista?.users?.find((u) => (u.email || '').toLowerCase() === email);
    const jaTemConta = !!usuario;

    if (action === 'status') {
      // Conta antiga: existe no Supabase (painel do Manager Club, por exemplo) mas nunca
      // entrou na comunidade. A senha dela é a do painel antigo, que ninguém lembra.
      // Nesse caso a tela precisa oferecer "criar senha nova" de cara.
      let contaAntiga = false;
      if (usuario) {
        const { data: perfil } = await admin
          .from('imersao_perfis')
          .select('usuario_id')
          .eq('usuario_id', usuario.id)
          .maybeSingle();
        contaAntiga = !perfil;
      }

      return json({ na_lista: true, tem_conta: jaTemConta, conta_antiga: contaAntiga, nome: nomeDela });
    }

    if (action === 'criar') {
      const senha = String(body.senha || '');
      if (senha.length < 6) return json({ error: 'A senha precisa ter pelo menos 6 caracteres.' }, 400);
      if (jaTemConta) return json({ error: 'Você já tem conta. É só entrar com a sua senha.' }, 409);

      const { data: criado, error: erroCriar } = await admin.auth.admin.createUser({
        email,
        password: senha,
        email_confirm: true,
        user_metadata: { nome: nomeDela, origem: 'comunidade_imersao' },
      });

      if (erroCriar || !criado?.user) {
        return json({ error: erroCriar?.message || 'Não consegui criar a conta.' }, 500);
      }

      // Perfil já nasce com o nome da lista, para o mural não mostrar "Aluna".
      await admin.from('imersao_perfis').insert({
        usuario_id: criado.user.id,
        nome: nomeDela || email.split('@')[0],
      });

      return json({ ok: true });
    }

    return json({ error: 'Ação desconhecida.' }, 400);
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
