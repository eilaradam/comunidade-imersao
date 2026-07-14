// Recebe os avisos de compra da Kiwify e libera (ou tira) o acesso à comunidade.
//
// Compra aprovada  -> entra em imersao_alunas com ativo = true  (ela já consegue criar a senha)
// Reembolso/estorno -> ativo = false (o cadastro fica, o acesso não)
//
// Precisa ser deployada com --no-verify-jwt: quem chama é a Kiwify, não um usuário logado.
// A segurança vem da assinatura: a Kiwify assina o corpo com o token do webhook.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const APROVA = new Set(['order_approved', 'order_paid', 'paid', 'approved']);
const REMOVE = new Set(['order_refunded', 'refunded', 'chargeback', 'chargedback', 'order_chargedback']);

/** A Kiwify assina o corpo cru com HMAC-SHA1 e manda no ?signature= */
async function assinaturaConfere(corpo: string, assinatura: string | null, token: string) {
  if (!assinatura) return false;

  const chave = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(token),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  const bytes = await crypto.subtle.sign('HMAC', chave, new TextEncoder().encode(corpo));
  const esperado = Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return esperado.toLowerCase() === assinatura.toLowerCase().trim();
}

/** O formato da Kiwify já mudou de nome de campo antes. Procuramos em vários lugares. */
function garimpar(p: Record<string, any>) {
  const cliente = p.Customer || p.customer || p.buyer || {};
  const produto = p.Product || p.product || {};

  const email = String(cliente.email || cliente.Email || p.email || '').trim().toLowerCase();
  const nome = String(cliente.full_name || cliente.name || cliente.Name || p.name || '').trim();
  const fone = String(cliente.mobile || cliente.phone || cliente.celular || '').trim();

  const evento = String(p.webhook_event_type || p.event || p.type || '').trim().toLowerCase();
  const status = String(p.order_status || p.status || '').trim().toLowerCase();

  const produtoId = String(produto.product_id || produto.id || p.product_id || '').trim();
  const produtoNome = String(produto.product_name || produto.name || p.product_name || '').trim();

  return { email, nome, fone, evento, status, produtoId, produtoNome };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('ok', { status: 200 });

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  const corpo = await req.text();
  const url = new URL(req.url);

  const token = Deno.env.get('KIWIFY_TOKEN') || '';
  const assinatura = url.searchParams.get('signature') || req.headers.get('x-kiwify-signature');

  // Sem token configurado a função ainda funciona (útil pra ligar e testar),
  // mas o certo é configurar: aí ninguém consegue forjar uma compra.
  if (token) {
    const ok = await assinaturaConfere(corpo, assinatura, token);
    if (!ok) {
      await admin.from('kiwify_eventos').insert({
        resultado: 'RECUSADO: assinatura invalida',
        payload: { corpo: corpo.slice(0, 2000) },
      });
      return new Response('assinatura invalida', { status: 401 });
    }
  }

  let dados: Record<string, any> = {};
  try {
    dados = JSON.parse(corpo);
  } catch {
    return new Response('json invalido', { status: 400 });
  }

  const { email, nome, fone, evento, status, produtoId, produtoNome } = garimpar(dados);

  const registrar = (resultado: string) =>
    admin.from('kiwify_eventos').insert({
      evento, status, email, nome, produto: produtoNome || produtoId, resultado, payload: dados,
    });

  if (!email) {
    await registrar('ignorado: veio sem e-mail');
    return new Response('ok', { status: 200 });
  }

  // Se a Lara vender mais de um produto na Kiwify, só o da Imersão libera a comunidade.
  const soEsteProduto = (Deno.env.get('KIWIFY_PRODUTO_ID') || '').trim();
  if (soEsteProduto && produtoId && produtoId !== soEsteProduto) {
    await registrar(`ignorado: outro produto (${produtoNome || produtoId})`);
    return new Response('ok', { status: 200 });
  }

  const aprovou = APROVA.has(evento) || APROVA.has(status);
  const removeu = REMOVE.has(evento) || REMOVE.has(status);

  if (aprovou) {
    // Já está na lista? Então só religa o acesso. Senão, entra agora.
    const { data: existe } = await admin
      .from('imersao_alunas')
      .select('id')
      .ilike('email', email)
      .maybeSingle();

    if (existe) {
      await admin.from('imersao_alunas').update({ ativo: true }).eq('id', existe.id);
      await registrar('liberada (ja estava na lista)');
    } else {
      const { error } = await admin.from('imersao_alunas').insert({
        nome: nome || email.split('@')[0],
        email,
        whatsapp: fone || null,
        ativo: true,
        obs: `Kiwify${produtoNome ? ' · ' + produtoNome : ''}`,
      });
      await registrar(error ? `ERRO ao inserir: ${error.message}` : 'liberada');
    }

    return new Response('ok', { status: 200 });
  }

  if (removeu) {
    await admin.from('imersao_alunas').update({ ativo: false }).ilike('email', email);
    await registrar('acesso removido (reembolso ou estorno)');
    return new Response('ok', { status: 200 });
  }

  // Boleto gerado, pix aguardando, carrinho abandonado: nada a fazer, mas fica registrado.
  await registrar(`ignorado: evento "${evento || status}" nao libera acesso`);
  return new Response('ok', { status: 200 });
});
