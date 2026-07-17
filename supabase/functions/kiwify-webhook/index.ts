// Recebe os avisos de compra da Kiwify e libera (ou tira) o acesso à comunidade.
//
// QUALQUER produto vendido na Kiwify libera a comunidade.
// Compra aprovada  -> entra em imersao_alunas com ativo = true  (ela já consegue criar a senha)
// Reembolso/estorno -> só corta o acesso se NÃO sobrar nenhum outro produto ativo
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
  // prompt, que confere o e-mail aqui). Isso é separado do acesso à
  // comunidade, que continua sendo só a Imersão, logo abaixo.
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

  // ── Acesso à comunidade: QUALQUER produto comprado na Kiwify libera.
  // Recalculamos a partir do kiwify_acessos (que já foi atualizado logo acima),
  // então compras e reembolsos de vários produtos se resolvem sozinhos: a aluna
  // só perde o acesso quando NÃO sobra NENHUM produto ativo (devolveu tudo).
  if (aprovou || removeu) {
    const { data: aindaAtivo } = await admin
      .from('kiwify_acessos')
      .select('email')
      .ilike('email', email)
      .eq('ativo', true)
      .limit(1);

    const temAlgumaCompraAtiva = !!(aindaAtivo && aindaAtivo.length);

    // Já existe na lista da comunidade?
    const { data: existe } = await admin
      .from('imersao_alunas')
      .select('id')
      .ilike('email', email)
      .maybeSingle();

    if (temAlgumaCompraAtiva) {
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
    } else {
      // Reembolsou/estornou tudo, sem nenhuma compra ativa sobrando: corta o acesso.
      if (existe) {
        await admin.from('imersao_alunas').update({ ativo: false }).eq('id', existe.id);
      }
      await registrar('acesso removido (nenhuma compra ativa)');
    }

    return new Response('ok', { status: 200 });
  }

  // Boleto gerado, pix aguardando, carrinho abandonado: nada a fazer, mas fica registrado.
  await registrar(`ignorado: evento "${evento || status}" nao libera acesso`);
  return new Response('ok', { status: 200 });
});
