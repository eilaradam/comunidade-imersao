// Recebe os avisos de compra da Kiwify e libera (ou tira) o acesso à comunidade.
//
// Só os produtos marcados no admin (aba "Acesso" -> imersao_produtos_acesso)
// liberam a comunidade. Assim a Lara separa os nichos.
// Compra aprovada de produto liberado -> entra em imersao_alunas (ativo = true).
// Compra de produto que não libera -> só registra, NÃO altera o acesso.
// Reembolso -> tira o acesso só se não sobrar produto liberado (nunca mexe no manual).
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

  // Duas trancas possíveis. Basta uma delas passar.
  //  1. A chave secreta que vai na própria URL do webhook (?k=...).
  //  2. A assinatura HMAC da Kiwify, se um dia o token dela for configurado.
  const chaveUrl = (Deno.env.get('KIWIFY_CHAVE_URL') || '').trim();
  const token = (Deno.env.get('KIWIFY_TOKEN') || '').trim();

  const assinatura = url.searchParams.get('signature') || req.headers.get('x-kiwify-signature');
  const chaveRecebida = (url.searchParams.get('k') || '').trim();

  if (chaveUrl || token) {
    const passouPelaChave = !!chaveUrl && chaveRecebida === chaveUrl;
    const passouPelaAssinatura = !!token && await assinaturaConfere(corpo, assinatura, token);

    if (!passouPelaChave && !passouPelaAssinatura) {
      await admin.from('kiwify_eventos').insert({
        resultado: 'RECUSADO: chave ou assinatura invalida',
        payload: { corpo: corpo.slice(0, 2000) },
      });
      return new Response('nao autorizado', { status: 401 });
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

  const aprovou = APROVA.has(evento) || APROVA.has(status);
  const removeu = REMOVE.has(evento) || REMOVE.has(status);

  // ── Registro de compra, de QUALQUER produto dela.
  // Serve pros materiais que ficam fora da comunidade (ex: a página do
  // prompt, que confere o e-mail aqui) e também alimenta a decisão de
  // acesso à comunidade, logo abaixo.
  if (aprovou || removeu) {
    // O e-mail já vem em minúsculas do garimpar(), e a tabela conta com isso.
    const { error: erroAcesso } = await admin.from('kiwify_acessos').upsert({
      email,
      produto_id: produtoId || '',
      produto_nome: produtoNome || null,
      nome: nome || null,
      ativo: aprovou,
      origem: 'kiwify',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'email,produto_id' });

    if (erroAcesso) console.error('nao consegui gravar em kiwify_acessos:', erroAcesso.message);
  }

  // ── Acesso à comunidade: só os produtos marcados no admin liberam.
  // A Lara liga/desliga cada produto na aba "Acesso" (imersao_produtos_acesso).
  // Regra segura: COMPRA só ADICIONA acesso; só REEMBOLSO pode tirar.
  if (aprovou || removeu) {
    // Registra o produto pra ele aparecer no admin (nasce desligado).
    if (produtoId) {
      const linha: Record<string, any> = { produto_id: produtoId };
      if (produtoNome) linha.produto_nome = produtoNome;
      await admin.from('imersao_produtos_acesso').upsert(linha, { onConflict: 'produto_id' });
    }

    // Quais produtos liberam a comunidade hoje?
    const { data: liberadores } = await admin
      .from('imersao_produtos_acesso')
      .select('produto_id')
      .eq('libera_comunidade', true);
    const idsQueLiberam = new Set((liberadores || []).map((p) => p.produto_id));

    if (aprovou) {
      // Compra aprovada: se o produto libera, dá acesso. Se não libera, apenas
      // registra a compra — NUNCA tira o acesso de ninguém por causa de uma compra.
      if (produtoId && idsQueLiberam.has(produtoId)) {
        const { data: existe } = await admin
          .from('imersao_alunas').select('id').ilike('email', email).maybeSingle();
        if (existe) {
          await admin.from('imersao_alunas').update({ ativo: true }).eq('id', existe.id);
          await registrar('liberada (produto libera a comunidade)');
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
      } else {
        await registrar('compra registrada, produto nao libera a comunidade');
      }
    } else {
      // Reembolso/estorno: só tira o acesso se NÃO sobrar nenhuma compra ativa
      // de produto que libera. E nunca mexe em quem foi liberado na mão.
      const { data: comprasAtivas } = await admin
        .from('kiwify_acessos')
        .select('produto_id')
        .ilike('email', email)
        .eq('ativo', true);
      const aindaTemAcesso = (comprasAtivas || []).some((c) => idsQueLiberam.has(c.produto_id));

      if (!aindaTemAcesso) {
        const { data: existe } = await admin
          .from('imersao_alunas').select('id, obs').ilike('email', email).maybeSingle();
        const veioDaKiwify = existe && typeof existe.obs === 'string' && existe.obs.startsWith('Kiwify');
        if (existe && veioDaKiwify) {
          await admin.from('imersao_alunas').update({ ativo: false }).eq('id', existe.id);
          await registrar('sem acesso (reembolso, nada mais libera)');
        } else {
          await registrar('reembolso, mas acesso manual/nao encontrado: nao mexo');
        }
      } else {
        await registrar('reembolso de um produto, ainda tem outro que libera');
      }
    }

    return new Response('ok', { status: 200 });
  }

  // Boleto gerado, pix aguardando, carrinho abandonado: nada a fazer, mas fica registrado.
  await registrar(`ignorado: evento "${evento || status}" nao libera acesso`);
  return new Response('ok', { status: 200 });
});
