// Entrega o prompt pra quem comprou, conferindo o e-mail da compra.
//
// Quem chama é a página do prompt (que fica fora, no GitHub Pages).
// A aluna digita o e-mail que usou na Kiwify, isto aqui confere na
// tabela kiwify_acessos e só então devolve o texto do prompt.
//
// O prompt NUNCA fica na página: sem e-mail de compradora, ele não sai
// daqui. Quais produtos liberam é a Lara quem decide, no campo
// produtos_liberados da tabela prompts_publicos.
//
// Precisa ser deployada com --no-verify-jwt: quem chama é uma página
// pública, não um usuário logado.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Quantas tentativas um mesmo lugar pode fazer antes de tomar um tempo.
// Segura quem tenta adivinhar e-mail no chute, em massa.
const LIMITE_TENTATIVAS = 12;
const JANELA_MINUTOS = 10;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const responde = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });

/** Tira espaço e maiúscula, pra "Maria@Gmail.com " achar "maria@gmail.com". */
const arruma = (s: string) => String(s ?? '').trim().toLowerCase();

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return responde({ erro: 'metodo nao suportado' }, 405);

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  let corpo: { email?: string; chave?: string } = {};
  try {
    corpo = await req.json();
  } catch {
    return responde({ ok: false, motivo: 'pedido invalido' }, 400);
  }

  const email = arruma(corpo.email ?? '');
  const chave = (corpo.chave ?? 'manychat').trim();

  // De onde veio o pedido (pra contar as tentativas).
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'desconhecido';

  const anotar = (ok: boolean) =>
    admin.from('prompt_tentativas').insert({ ip, chave, ok }).then(() => {}, () => {});

  // E-mail que nem parece e-mail: nem gasta consulta.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    await anotar(false);
    return responde({ ok: false, motivo: 'email' });
  }

  // ── O freio: muita tentativa do mesmo lugar em pouco tempo?
  const desde = new Date(Date.now() - JANELA_MINUTOS * 60 * 1000).toISOString();
  const { count } = await admin
    .from('prompt_tentativas')
    .select('id', { count: 'exact', head: true })
    .eq('ip', ip)
    .eq('ok', false)
    .gte('quando', desde);

  if ((count ?? 0) >= LIMITE_TENTATIVAS) {
    return responde({ ok: false, motivo: 'muitas_tentativas' }, 429);
  }

  // ── O prompt e a lista de produtos que abrem ele
  const { data: prompt } = await admin
    .from('prompts_publicos')
    .select('texto, produtos_liberados')
    .eq('chave', chave)
    .maybeSingle();

  if (!prompt?.texto) {
    await anotar(false);
    return responde({ ok: false, motivo: 'sem_prompt' });
  }

  // ── Caminho 1: é a Lara (ou a equipe dela). Sempre abre.
  const { data: souAdmin } = await admin
    .from('imersao_admins')
    .select('email')
    .ilike('email', email)
    .maybeSingle();

  if (souAdmin) {
    await anotar(true);
    return responde({ ok: true, texto: prompt.texto });
  }

  // ── Caminho 2: comprou algum dos produtos liberados?
  const liberados: string[] = (prompt.produtos_liberados ?? []).map(arruma).filter(Boolean);

  if (liberados.length === 0) {
    // A Lara ainda não escolheu o produto. Ninguém abre (menos os admins).
    await anotar(false);
    return responde({ ok: false, motivo: 'nao_encontrei' });
  }

  const { data: compras } = await admin
    .from('kiwify_acessos')
    .select('produto_id, produto_nome')
    .ilike('email', email)
    .eq('ativo', true);

  // Aceita tanto o id do produto quanto o nome exato, porque é mais
  // fácil a Lara saber o nome do que caçar o id na Kiwify.
  const comprou = (compras ?? []).some((c: any) =>
    liberados.includes(arruma(c.produto_id)) || liberados.includes(arruma(c.produto_nome))
  );

  await anotar(comprou);

  if (!comprou) return responde({ ok: false, motivo: 'nao_encontrei' });

  return responde({ ok: true, texto: prompt.texto });
});
