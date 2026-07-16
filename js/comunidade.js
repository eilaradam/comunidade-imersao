    (function () {
        'use strict';

        const { sb, esc, urlSegura, iniciais, quando } = window.C || {};
        let usuario = null, perfil = null;
        const PAGINA = document.body.getAttribute('data-pagina') || 'home';
        const ehLoja = PAGINA === 'loja';
        const ehHome = PAGINA !== 'mural' && !ehLoja;

        /* ── Tons dos blobs (placeholders de thumbnail) ── */
        const tom = {
            lavanda:      'linear-gradient(135deg, #C8B8E0, #B8C6E8)',
            lavandaClara: 'linear-gradient(135deg, #D8CEEE, #CBD5F2)',
            menta:        'linear-gradient(135deg, #B8E0D0, #CBEBDE)',
            pessego:      'linear-gradient(135deg, #E8C4B8, #F1D8C6)'
        };

        /* ─────────────── CARROSSEL 3D (destaque) ─────────────── */
        const destaques = [
            { titulo: 'Landing pages com Claude Code', autor: 'Lara Dam', cat: 'GRAVADA', off: '20%',
              desc: 'Monte landing pages que convertem do zero, com o Claude Code passo a passo. Ideal pra quem vende serviço, mentoria ou infoproduto.',
              aulas: '8 aulas', duracao: '2h10', nota: '4.9', antes: 'R$ 247', preco: 'R$ 197', tom: tom.pessego },
            { titulo: 'Boas-vindas da Comunidade', autor: 'Lara Dam', cat: 'GRATUITA', off: null,
              desc: 'Comece por aqui: um tour pela comunidade, como aproveitar cada aba e o que fazer na sua primeira semana dentro da Imersão.',
              aulas: '3 aulas', duracao: '22 min', nota: '5.0', antes: null, preco: 'Gratuita', tom: tom.lavanda },
            { titulo: 'Prompts que convertem: UGC', autor: 'Lara Dam', cat: 'GRAVADA', off: '25%',
              desc: 'Os prompts que eu uso pra criar roteiros de UGC que vendem. Copie, adapte pro seu nicho e grave conteúdo que gera resultado.',
              aulas: '6 aulas', duracao: '1h30', nota: '4.8', antes: 'R$ 197', preco: 'R$ 147', tom: tom.menta },
            { titulo: 'Encontro ao vivo desta semana', autor: 'Ao vivo · Quinta 20h', cat: 'AO VIVO', off: null,
              desc: 'Nosso encontro semanal com feedback ao vivo dos seus projetos. Traga sua landing ou portfólio e saia com os próximos passos.',
              aulas: '1 encontro', duracao: '90 min', nota: 'Novo', antes: null, preco: 'Gratuita', tom: tom.lavandaClara },
            { titulo: 'Imersão Portfólio Claude v2', autor: 'Turma de agosto', cat: 'IMERSÃO', off: '33%',
              desc: 'A imersão completa pra montar um portfólio profissional com Claude do início ao fim, com acompanhamento e desafios semanais.',
              aulas: '12 aulas', duracao: '6h', nota: '4.9', antes: 'R$ 597', preco: 'R$ 397', tom: tom.pessego }
        ];

        const palco = document.getElementById('palco');
        let ativoC = 0, cardsC = [];

        function posicionar() {
            cardsC.forEach((card, i) => {
                const off = i - ativoC;
                const abs = Math.abs(off);
                const escala = off === 0 ? 1.15 : abs === 1 ? 0.9 : 0.75;
                const tx = off * 250;
                const ry = off === 0 ? 0 : -off * 12;
                const op = off === 0 ? 1 : abs === 1 ? 0.85 : 0.5;
                card.style.transform = `translateX(${tx}px) scale(${escala}) rotateY(${ry}deg)`;
                card.style.opacity = op;
                card.style.zIndex = 50 - abs;
                card.style.pointerEvents = abs > 2 ? 'none' : 'auto';
            });
        }
        function mover(dir) { ativoC = Math.max(0, Math.min(cardsC.length - 1, ativoC + dir)); posicionar(); }

        function abrirLink(u) {
            if (!u) return;
            let l = String(u).trim();
            if (!l) return;
            if (!/^https?:\/\//i.test(l)) l = 'https://' + l;
            window.open(l, '_blank', 'noopener,noreferrer');
        }

        function montarCarrossel(itens) {
            if (!palco) return;
            palco.innerHTML = '';
            itens.forEach((d, i) => {
                const card = document.createElement('div');
                card.className = 'c-card';
                const gratis = /gratu/i.test(d.preco || '');
                card.innerHTML = `
                <div class="c-thumb${d.imagem ? ' has-img' : ''}" style="background:${d.tom}">
                    ${d.imagem ? `<img class="c-img" src="${esc(d.imagem)}" alt="" onerror="this.style.display='none'">` : ''}
                    ${d.off ? `<span class="off">${esc(d.off)} OFF</span>` : ''}
                    <span class="badge">${esc(d.cat || '')}</span>
                </div>
                <div class="c-corpo">
                    <h3>${esc(d.titulo || '')}</h3>
                    ${d.autor ? `<div class="local"><i data-lucide="user"></i> ${esc(d.autor)}</div>` : ''}
                    <div class="desc-label">Descrição</div>
                    <p class="desc-text">${esc(d.desc || '')}</p>
                    ${(d.preco || d.link) ? `<div class="c-rodape">
                        ${d.preco ? `<div class="preco-bloco">
                            <span class="preco-label">Valor</span>
                            <span class="preco-linha">
                                ${d.antes ? `<s class="antes">${esc(d.antes)}</s>` : ''}
                                <span class="preco${gratis ? ' gratis' : ''}">${esc(d.preco)}</span>
                            </span>
                        </div>` : '<div class="preco-bloco"></div>'}
                        ${d.link ? `<button class="acao tem-link" aria-label="Acessar"><i data-lucide="${gratis ? 'play' : 'arrow-right'}"></i></button>` : ''}
                    </div>` : ''}
                </div>`;
                if (d.link) card.classList.add('clicavel');
                // Tem link → clicar em qualquer lugar do card abre, na hora.
                // Não tem link → clicar só traz o card pra frente (navegação).
                card.addEventListener('click', () => {
                    if (d.link) { abrirLink(d.link); return; }
                    if (i !== ativoC) { ativoC = i; posicionar(); }
                });
                card.addEventListener('mouseenter', () => { if (i !== ativoC) { ativoC = i; posicionar(); } });
                palco.appendChild(card);
            });
            cardsC = Array.from(palco.children);
            ativoC = Math.floor(cardsC.length / 2);
            posicionar();
            if (window.lucide) lucide.createIcons();
        }

        async function carregarDestaques() {
            if (!palco) return;
            let itens = destaques.map(d => ({ tom: d.tom, imagem: null, off: d.off, cat: d.cat, titulo: d.titulo, autor: d.autor, desc: d.desc, antes: d.antes, preco: d.preco, link: d.link || null }));
            if (sb) {
                const lista = [];
                // 1) Cards da aba Destaques (imersao_destaques)
                try {
                    const { data } = await sb.from('imersao_destaques').select('*').eq('publicado', true).order('ordem', { ascending: true }).order('created_at', { ascending: false });
                    if (data) data.forEach(r => lista.push({
                        tom: tom[r.tom] || tom.lavanda, imagem: r.imagem_url, off: r.off, cat: r.categoria,
                        titulo: r.titulo, autor: r.subtitulo, desc: r.descricao, antes: r.preco_antigo,
                        preco: r.preco, link: r.link, ordem: r.ordem == null ? 999 : r.ordem
                    }));
                } catch (e) {}
                // 2) Produtos da Store marcados com o coração (destaque)
                try {
                    const { data, error } = await sb.from('produtos').select('*').eq('ativo', true).eq('destaque', true).order('ordem', { ascending: true });
                    if (!error && data) data.forEach(p => {
                        const preco = p.preco == null ? 0 : Number(p.preco);
                        const de = p.preco_de == null ? null : Number(p.preco_de);
                        const off = (de && de > preco && preco > 0) ? Math.round((de - preco) / de * 100) + '%' : null;
                        lista.push({
                            tom: corStore(p.cor), imagem: p.imagem_url, off, cat: p.tag,
                            titulo: p.nome, autor: p.subtitulo || '', desc: p.descricao,
                            antes: (de && de > preco) ? fmtReal(de) : null,
                            preco: preco ? fmtReal(preco) : 'Gratuito',
                            link: p.checkout_url, ordem: p.ordem == null ? 999 : p.ordem
                        });
                    });
                } catch (e) {}
                // 3) Prompts marcados com o coração (destaque)
                try {
                    const { data, error } = await sb.from('imersao_prompts').select('*').eq('publicado', true).eq('destaque', true).order('created_at', { ascending: false });
                    if (!error && data) data.forEach(r => lista.push({
                        tom: tom.menta, imagem: null, off: null, cat: r.tema || 'PROMPT',
                        titulo: r.titulo, autor: '', desc: r.descricao || r.prompt || '',
                        antes: null, preco: null, link: null, ordem: 900
                    }));
                } catch (e) {}
                // 4) Avisos marcados com o coração (destaque)
                try {
                    const { data, error } = await sb.from('imersao_avisos').select('*').eq('publicado', true).eq('destaque', true).order('created_at', { ascending: false });
                    if (!error && data) data.forEach(r => lista.push({
                        tom: tom.lavandaClara, imagem: null, off: null, cat: 'AVISO',
                        titulo: r.titulo, autor: '', desc: r.corpo || '',
                        antes: null, preco: null, link: null, ordem: 950
                    }));
                } catch (e) {}
                if (lista.length) { lista.sort((a, b) => a.ordem - b.ordem); itens = lista; }
            }
            montarCarrossel(itens);
        }

        if (palco) {
            const se = document.getElementById('setaEsq'); if (se) se.addEventListener('click', () => mover(-1));
            const sd = document.getElementById('setaDir'); if (sd) sd.addEventListener('click', () => mover(1));
            let x0 = null;
            palco.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
            palco.addEventListener('touchend', e => {
                if (x0 === null) return;
                const dx = e.changedTouches[0].clientX - x0;
                if (Math.abs(dx) > 40) mover(dx < 0 ? 1 : -1);
                x0 = null;
            }, { passive: true });
        }

        /* ─────────────── MURAL — feed social (Supabase) ─────────────── */
        const rotulo = { resultado: 'Resultado', prompt: 'Prompt', duvida: 'Dúvida' };
        let tipoPost = 'resultado';
        let arquivoPost = null;
        let videoInfoAtual = null;
        let editandoPostId = null;
        let postsMural = [];
        let filtroMural = 'todos';

        /* Posts de exemplo — usados só pelo stub buscarPosts() até o backend
           de status/falhas existir. O feed em produção vem do Supabase. */
        const MOCK_POSTS = [
            { id:'m1', tipo:'resultado', autor:{id:'a1',nome:'Ana Silva',avatar:null}, texto:'Terminei meu portfólio UGC de beauty! Feito 100% com Claude Code 💜', imagem_url:null, n_curtidas:12, comentarios:[], criadoEm:'2026-07-10' },
            { id:'m2', tipo:'video', plataforma:'tiktok', url:'https://www.tiktok.com/@lara/video/7300000000000000000', videoId:'7300000000000000000', autor:{id:'a2',nome:'João Santos',avatar:null}, legenda:'Meu primeiro reels editado com IA', texto:'Meu primeiro reels editado com IA', link:'https://www.tiktok.com/@lara/video/7300000000000000000', status:'ativo', falhas:0, n_curtidas:8, comentarios:[], criadoEm:'2026-07-11' },
            { id:'m3', tipo:'prompt', autor:{id:'a3',nome:'Marina Costa',avatar:null}, texto:'Prompt que uso pra gerar copy de stories:', prompt:'Escreva 5 stories de venda para [OFERTA]...', imagem_url:null, n_curtidas:20, comentarios:[], criadoEm:'2026-07-11' },
            { id:'m4', tipo:'video', plataforma:'youtube', url:'https://youtu.be/dQw4w9WgXcQ', videoId:'dQw4w9WgXcQ', autor:{id:'a4',nome:'Rafael Oliveira',avatar:null}, legenda:'Tutorial: landing em 1h', texto:'Tutorial: landing em 1h', link:'https://youtu.be/dQw4w9WgXcQ', status:'ativo', falhas:0, n_curtidas:31, comentarios:[], criadoEm:'2026-07-12' },
            { id:'m5', tipo:'duvida', autor:{id:'a5',nome:'Beatriz Lima',avatar:null}, texto:'Alguém sabe integrar o Supabase com o formulário? Tô travada 😅', imagem_url:null, n_curtidas:3, comentarios:[], criadoEm:'2026-07-12' },
            { id:'m6', tipo:'video', plataforma:'instagram', url:'https://www.instagram.com/reel/CxAbCdEfGhI/', videoId:'CxAbCdEfGhI', autor:{id:'a6',nome:'Pedro Almeida',avatar:null}, legenda:'Reels do meu projeto novo', texto:'Reels do meu projeto novo', link:'https://www.instagram.com/reel/CxAbCdEfGhI/', status:'ativo', falhas:0, n_curtidas:15, comentarios:[], criadoEm:'2026-07-13' },
            { id:'m7', tipo:'resultado', autor:{id:'a7',nome:'Camila Rocha',avatar:null}, texto:'Primeira venda pela landing que montei aqui na comunidade! 🎉', imagem_url:null, n_curtidas:44, comentarios:[], criadoEm:'2026-07-13' },
            { id:'m8', tipo:'video', plataforma:'tiktok', url:'https://www.tiktok.com/@quebrado/video/0000000000000000000', videoId:'0000000000000000000', autor:{id:'a8',nome:'Lucas Dias',avatar:null}, legenda:'(vídeo de teste com link quebrado)', texto:'(vídeo de teste com link quebrado)', link:'https://www.tiktok.com/@quebrado/video/0000000000000000000', status:'suspeito', falhas:1, n_curtidas:1, comentarios:[], criadoEm:'2026-07-14' },
            { id:'m9', tipo:'prompt', autor:{id:'a9',nome:'Fernanda Melo',avatar:null}, texto:'Análise de concorrente em 1 prompt:', prompt:'Analise o perfil [LINK] e liste formatos, tom e lacunas.', imagem_url:null, n_curtidas:18, comentarios:[], criadoEm:'2026-07-14' },
            { id:'m10', tipo:'video', plataforma:'youtube', url:'https://www.youtube.com/shorts/abc123XYZ', videoId:'abc123XYZ', autor:{id:'a10',nome:'Gabriel Nunes',avatar:null}, legenda:'Short do processo', texto:'Short do processo', link:'https://www.youtube.com/shorts/abc123XYZ', status:'ativo', falhas:0, n_curtidas:9, comentarios:[], criadoEm:'2026-07-15' },
            { id:'m11', tipo:'resultado', autor:{id:'a11',nome:'Isabela Prado',avatar:null}, texto:'Refiz meu mídia kit e ficou lindo, obrigada Lara! 💜', imagem_url:null, n_curtidas:27, comentarios:[], criadoEm:'2026-07-15' },
            { id:'m12', tipo:'duvida', autor:{id:'a12',nome:'Thiago Reis',avatar:null}, texto:'Qual o melhor jeito de hospedar de graça? GitHub Pages ou Vercel?', imagem_url:null, n_curtidas:6, comentarios:[], criadoEm:'2026-07-15' }
        ];

        const composer = document.getElementById('composer');
        const txtPost = document.getElementById('txtPost');
        const feedEl = document.getElementById('feed');

        function avatarHTML(nome, url) {
            return url ? `<img src="${esc(url)}" alt="">` : esc(iniciais(nome || 'Aluna'));
        }

        /* ── Vídeos externos (TikTok / Instagram / YouTube) ── */
        function detectarVideo(url) {
            if (!url) return null;
            url = url.trim();
            let m;
            if ((m = url.match(/tiktok\.com\/@[\w.-]+\/video\/(\d+)/))) return { plat: 'tiktok', id: m[1], url, ratio: '9/16' };
            if ((m = url.match(/vm\.tiktok\.com\/(\w+)/)))               return { plat: 'tiktok', id: null, url, ratio: '9/16' };
            if ((m = url.match(/instagram\.com\/(reel|p|tv)\/([\w-]+)/))) return { plat: 'instagram', id: m[2], url: `https://www.instagram.com/${m[1]}/${m[2]}/`, ratio: '9/16' };
            if ((m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]+)/))) return { plat: 'youtube', id: m[1], url, ratio: /shorts\//.test(url) ? '9/16' : '16/9' };
            return null;
        }

        function construirEmbed(info) {
            if (info.plat === 'youtube') {
                return `<iframe src="https://www.youtube.com/embed/${esc(info.id)}" style="width:100%;height:100%;border:0;display:block" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy"></iframe>`;
            }
            if (info.plat === 'tiktok') {
                return `<blockquote class="tiktok-embed" cite="${esc(info.url)}"${info.id ? ` data-video-id="${esc(info.id)}"` : ''} style="max-width:100%;min-width:100%;margin:0"><section></section></blockquote>`;
            }
            if (info.plat === 'instagram') {
                return `<blockquote class="instagram-media" data-instgrm-permalink="${esc(info.url)}" data-instgrm-version="14" style="margin:0;width:100%;min-width:100%;border:0"></blockquote>`;
            }
            return '';
        }

        function carregarScriptTikTok() {
            const old = document.getElementById('tiktok-embed-script');
            if (old) old.remove();
            const s = document.createElement('script');
            s.id = 'tiktok-embed-script'; s.async = true;
            s.src = 'https://www.tiktok.com/embed.js';
            document.body.appendChild(s);
        }
        function processarInstagram() {
            if (window.instgrm && window.instgrm.Embeds) { window.instgrm.Embeds.process(); return; }
            if (!document.getElementById('ig-embed-script')) {
                const s = document.createElement('script');
                s.id = 'ig-embed-script'; s.async = true;
                s.src = 'https://www.instagram.com/embed.js';
                document.body.appendChild(s);
            }
        }

        /* Lazy load: só monta o embed quando o card entra em vista */
        const videoIO = new IntersectionObserver((entries) => {
            entries.forEach(en => {
                if (!en.isIntersecting) return;
                montarEmbed(en.target);
                videoIO.unobserve(en.target);
            });
        }, { rootMargin: '200px' });

        function montarEmbed(el) {
            if (el.classList.contains('loaded')) return;
            const info = detectarVideo(el.getAttribute('data-src'));
            if (!info) return;
            const art = el.closest('.post');
            const postId = art ? art.getAttribute('data-post') : null;
            el.classList.add('loaded');
            el.innerHTML = construirEmbed(info);
            if (info.plat === 'youtube') { vigiarYouTube(el, info, postId); }
            else if (info.plat === 'tiktok') { carregarScriptTikTok(); vigiarBlockquote(el, postId); }
            else if (info.plat === 'instagram') { processarInstagram(); vigiarBlockquote(el, postId); }
        }

        /* YouTube: erro no iframe + sonda na thumbnail (120x90 = "indisponível") */
        function vigiarYouTube(el, info, postId) {
            const iframe = el.querySelector('iframe');
            if (iframe) iframe.addEventListener('error', () => falhouVideo(el, postId));
            const img = new Image();
            img.onload = function () {
                if (this.naturalWidth === 120 && this.naturalHeight === 90) falhouVideo(el, postId);
                else sucessoVideo(postId);
            };
            img.onerror = () => falhouVideo(el, postId);
            img.src = `https://img.youtube.com/vi/${info.id}/hqdefault.jpg`;
        }

        /* TikTok / Instagram: após 4s, se o blockquote não virou iframe → falha */
        function vigiarBlockquote(el, postId) {
            setTimeout(() => {
                const temIframe = el.querySelector('iframe');
                const bq = el.querySelector('blockquote');
                if (temIframe) sucessoVideo(postId);
                else if (bq) falhouVideo(el, postId);
            }, 4000);
        }

        function falhouVideo(el, postId) {
            if (el.dataset.falhou === '1') return;
            el.dataset.falhou = '1';
            if (postId) reportarFalhaPost(postId);
            el.classList.add('indisponivel');
            el.style.aspectRatio = '';
            el.innerHTML = '<div class="video-off"><i data-lucide="video-off"></i><span>Vídeo indisponível no momento</span></div>';
            if (window.lucide) lucide.createIcons();
        }

        function sucessoVideo(postId) {
            if (!postId) return;
            const st = statusDoPost(postId);
            if (st.status === 'suspeito' || st.falhas > 0) resetarFalhasPost(postId);
        }

        const rotuloPlat = { tiktok: 'TIKTOK', instagram: 'INSTAGRAM', youtube: 'YOUTUBE' };
        const tomPlat = { tiktok: tom.lavanda, instagram: tom.pessego, youtube: tom.menta };

        function desenharVideo(p) {
            const info = detectarVideo(p.link);
            if (!info) return '';
            if (p.video_removido) return '';   /* soft hide — completar na seção 3 */
            const coments = p.comentarios || [];
            const nc = coments.length;
            const legenda = p.texto ? `<p class="video-legenda">${esc(p.texto)}</p>` : '';
            const orient = info.ratio === '16/9' ? 'wide' : 'vertical';
            return `
            <article class="post post-video" data-post="${p.id}">
                <div class="video-embed ${orient}" data-src="${esc(p.link)}" style="aspect-ratio:${info.ratio}">
                    <div class="video-ph" style="background:${tomPlat[info.plat]}">
                        <div class="skeleton"></div>
                        <div class="play-ico"><i data-lucide="play"></i></div>
                    </div>
                </div>
                <div class="video-rodape">
                    <div class="video-topo">
                        <div class="avatar-sm">${avatarHTML(p.autor_nome, p.autor_avatar)}</div>
                        <b>${esc(p.autor_nome)}</b>
                        <span class="badge-plat">${rotuloPlat[info.plat]}</span>
                    </div>
                    ${legenda}
                    <footer class="acoes">
                        <button class="acao${p.eu_curti ? ' curtido' : ''}" data-curtir="${p.id}">
                            <i data-lucide="heart"></i><span data-contagem="${p.id}">${p.n_curtidas || 0}</span>
                        </button>
                        <button class="acao" data-comentar="${p.id}"><i data-lucide="message-circle"></i><span data-ncoment="${p.id}">${nc || 'Comentar'}</span></button>
                        ${p.sou_autor ? `<button class="acao apagar" data-apagar="${p.id}" aria-label="Apagar"><i data-lucide="trash-2"></i></button>` : ''}
                    </footer>
                    <div class="comentarios" id="coments-${p.id}">
                        ${coments.map(desenharComentario).join('')}
                        <form class="escrever" data-form-coment="${p.id}">
                            <div class="avatar-sm">${avatarHTML(perfil && perfil.nome, perfil && perfil.avatar_url)}</div>
                            <input type="text" placeholder="Escreva um comentário" maxlength="2000" required>
                            <button type="submit" class="btn-preto btn-pequeno">Enviar</button>
                        </form>
                    </div>
                </div>
            </article>`;
        }

        // ===== BACKEND: implementar quando o Supabase/backend estiver pronto =====
        // Enquanto as colunas status/falhas não existem no banco, o contador de
        // falhas fica só no cliente (localStorage). O feed real continua no Supabase.
        const STATUS_KEY = 'imersao_video_status';
        function lerStatusLocal() { try { return JSON.parse(localStorage.getItem(STATUS_KEY) || '{}'); } catch (_) { return {}; } }
        function salvarStatusLocal(m) { try { localStorage.setItem(STATUS_KEY, JSON.stringify(m)); } catch (_) {} }
        function statusDoPost(id) { const m = lerStatusLocal(); return m[id] || { falhas: 0, status: 'ativo' }; }

        // TODO: incrementa contador de falhas do post e atualiza status
        async function reportarFalhaPost(postId) {
            console.log('[stub] reportar falha:', postId);
            const m = lerStatusLocal();
            const cur = m[postId] || { falhas: 0, status: 'ativo' };
            cur.falhas += 1;
            cur.status = cur.falhas >= 3 ? 'indisponivel' : 'suspeito';
            cur.ultimaChecagem = Date.now();
            m[postId] = cur; salvarStatusLocal(m);
            // Implementação futura (Supabase):
            // - incrementa coluna 'falhas'
            // - se falhas >= 3, set status = 'indisponivel'
            // - se falhas entre 1 e 2, set status = 'suspeito'
            // - atualiza ultimaChecagem
            // - se virou 'indisponivel', criar notificação para o autor
        }

        // TODO: zera contador quando o vídeo volta a funcionar
        async function resetarFalhasPost(postId) {
            console.log('[stub] resetar falhas:', postId);
            const m = lerStatusLocal();
            if (m[postId]) { m[postId] = { falhas: 0, status: 'ativo', ultimaChecagem: Date.now() }; salvarStatusLocal(m); }
            // - set falhas = 0, status = 'ativo'
        }

        // TODO: cria post no banco
        async function criarPost(dados) {
            console.log('[stub] criar post:', dados);
        }

        // TODO: busca posts com paginação
        async function buscarPosts({ filtro, pagina, porPagina = 12 }) {
            console.log('[stub] buscar posts:', filtro, pagina);
            // Deve filtrar status != 'indisponivel'
            return MOCK_POSTS;
        }
        // ===== FIM DOS STUBS =====

        function recadoMural(txt, tipo) {
            const el = document.getElementById('recadoMural');
            el.textContent = txt || '';
            el.className = 'recado' + (txt ? ' show ' + (tipo || 'erro') : '');
            if (txt && tipo === 'ok') setTimeout(() => { el.className = 'recado'; }, 3000);
        }

        const mapaFiltro = { todos: null, resultados: 'resultado', prompts: 'prompt', duvidas: 'duvida', videos: 'video' };
        const POR_PAGINA = 10;
        let paginaAtual = 0;

        function listaFiltrada() {
            const alvo = mapaFiltro[filtroMural];
            return postsMural.filter(p => {
                if (statusDoPost(p.id).falhas >= 3) return false;   /* 3+ falhas: some do feed */
                if (alvo && p.tipo !== alvo) return false;
                return true;
            });
        }

        async function carregarMural() {
            if (!sb || !feedEl) return;
            const { data, error } = await sb.rpc('imersao_feed', { p_limit: ehHome ? 5 : 300, p_offset: 0 });
            if (error) { feedEl.innerHTML = '<p class="vazio">Não consegui carregar o mural agora.</p>'; return; }
            postsMural = data || [];
            if (ehHome) renderHome(); else renderMural(true);
        }

        /* Home: prévia — 5 posts mais recentes, sem filtro nem paginação */
        function renderHome() {
            const lista = postsMural.filter(p => statusDoPost(p.id).falhas < 3).slice(0, 5);
            if (!lista.length) {
                feedEl.innerHTML = '<p class="vazio"><strong>O mural está esperando por você</strong>Seja a primeira a publicar algo na comunidade.</p>';
                return;
            }
            feedEl.innerHTML = lista.map(desenharPost).join('');
            if (window.lucide) lucide.createIcons();
            feedEl.querySelectorAll('.video-embed:not(.loaded)').forEach(el => videoIO.observe(el));
        }

        const vazioPorFiltro = {
            todos: 'O mural está esperando por você. Seja a primeira a publicar algo.',
            resultados: 'Nenhum resultado por aqui ainda. Mostra o que você construiu.',
            prompts: 'Nenhum prompt compartilhado ainda. Solta o seu.',
            duvidas: 'Nenhuma dúvida por aqui ainda. Manda a sua.',
            videos: 'Nenhum vídeo por aqui ainda. Publica o primeiro.'
        };

        /* Página /mural: paginação por botão com append */
        function renderMural(reset) {
            const btn = document.getElementById('carregarMais');
            const fim = document.getElementById('fimFeed');
            const lista = listaFiltrada();
            if (reset) { paginaAtual = 0; feedEl.innerHTML = ''; }
            if (!lista.length) {
                feedEl.innerHTML = `<div class="vazio">${vazioPorFiltro[filtroMural] || 'Nada por aqui ainda.'}</div>`;
                if (btn) btn.style.display = 'none';
                if (fim) fim.style.display = 'none';
                return;
            }
            const ini = paginaAtual * POR_PAGINA;
            const fatia = lista.slice(ini, ini + POR_PAGINA);
            feedEl.insertAdjacentHTML('beforeend', fatia.map(desenharPost).join(''));
            if (window.lucide) lucide.createIcons();
            feedEl.querySelectorAll('.video-embed:not(.loaded)').forEach(el => videoIO.observe(el));
            const temMais = lista.length > (paginaAtual + 1) * POR_PAGINA;
            if (btn) { btn.style.display = temMais ? '' : 'none'; btn.disabled = false; btn.textContent = 'Carregar mais posts'; }
            if (fim) fim.style.display = temMais ? 'none' : 'block';
        }

        const btnMais = document.getElementById('carregarMais');
        if (btnMais) btnMais.addEventListener('click', () => {
            btnMais.disabled = true; btnMais.textContent = 'Carregando...';
            paginaAtual += 1;
            renderMural(false);
        });

        /* Contador "N posts esta semana" (só na home) */
        async function carregarContador() {
            const el = document.getElementById('muralConta');
            if (!el || !sb) return;
            const seteDias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
            const { count } = await sb.from('imersao_posts').select('*', { count: 'exact', head: true }).gte('created_at', seteDias);
            if (count && count > 0) { el.textContent = `${count} ${count === 1 ? 'post' : 'posts'} esta semana`; el.style.display = ''; }
            else el.style.display = 'none';
        }

        function desenharPost(p) {
            if (p.tipo === 'video') { const v = desenharVideo(p); if (v) return v; }
            const link = urlSegura(p.link);
            const coments = p.comentarios || [];
            const nc = coments.length;
            return `
            <article class="post" data-post="${p.id}">
                <header class="topo-post">
                    <div class="avatar-sm">${avatarHTML(p.autor_nome, p.autor_avatar)}</div>
                    <div class="quem">
                        <b>${esc(p.autor_nome)}</b>
                        <span>${esc(quando(p.created_at))}${p.autor_instagram ? ' · ' + esc(p.autor_instagram) : ''}</span>
                    </div>
                    <span class="selo">${esc(rotulo[p.tipo] || p.tipo || '')}</span>
                </header>
                ${p.texto ? `<div class="corpo-post">${esc(p.texto)}</div>` : ''}
                ${link ? `<p style="margin-top:10px"><a href="${esc(link)}" target="_blank" rel="noopener noreferrer">${esc(link)}</a></p>` : ''}
                ${p.imagem_url ? `<img class="foto-post" src="${esc(p.imagem_url)}" alt="" loading="lazy">` : ''}
                ${p.prompt ? `<div class="caixa-prompt"><div class="ferramentas-prompt"><button class="mini" data-copiar="${p.id}">Copiar</button></div><pre id="prompt-${p.id}">${esc(p.prompt)}</pre></div>` : ''}
                <footer class="acoes">
                    <button class="acao${p.eu_curti ? ' curtido' : ''}" data-curtir="${p.id}">
                        <i data-lucide="heart"></i><span data-contagem="${p.id}">${p.n_curtidas || 0}</span>
                    </button>
                    <button class="acao" data-comentar="${p.id}"><i data-lucide="message-circle"></i><span data-ncoment="${p.id}">${nc || 'Comentar'}</span></button>
                    ${p.sou_autor ? `<button class="acao apagar" data-apagar="${p.id}" aria-label="Apagar"><i data-lucide="trash-2"></i></button>` : ''}
                </footer>
                <div class="comentarios" id="coments-${p.id}">
                    ${coments.map(desenharComentario).join('')}
                    <form class="escrever" data-form-coment="${p.id}">
                        <div class="avatar-sm">${avatarHTML(perfil && perfil.nome, perfil && perfil.avatar_url)}</div>
                        <input type="text" placeholder="Escreva um comentário" maxlength="2000" required>
                        <button type="submit" class="btn-preto btn-pequeno">Enviar</button>
                    </form>
                </div>
            </article>`;
        }

        function desenharComentario(c) {
            return `
            <div class="coment">
                <div class="avatar-sm">${avatarHTML(c.autor_nome, c.autor_avatar)}</div>
                <div class="balao">
                    <b>${esc(c.autor_nome)}</b><time>${esc(quando(c.created_at))}</time>
                    <p>${esc(c.texto)}</p>
                </div>
            </div>`;
        }

        /* Composer: crescer, tipo, imagem */
        if (txtPost) txtPost.addEventListener('input', () => {
            txtPost.style.height = 'auto';
            txtPost.style.height = txtPost.scrollHeight + 'px';
        });
        const elTipos = document.getElementById('tipos');
        const videoCampo = document.getElementById('videoCampo');
        const videoInput = document.getElementById('video-url-input');
        const videoErro = document.getElementById('videoErro');
        const videoPreview = document.getElementById('videoPreview');

        function atualizarPublicar() {
            const btn = document.getElementById('btnPublicar');
            btn.disabled = (tipoPost === 'video') && !videoInfoAtual;
        }
        function validarVideo() {
            const url = (videoInput.value || '').trim();
            if (!url) {
                videoInfoAtual = null;
                videoErro.classList.remove('show');
                videoPreview.classList.remove('show'); videoPreview.innerHTML = '';
                atualizarPublicar(); return;
            }
            const info = detectarVideo(url);
            if (!info) {
                videoInfoAtual = null;
                videoErro.textContent = 'Cole um link do TikTok, Instagram ou YouTube';
                videoErro.classList.add('show');
                videoPreview.classList.remove('show'); videoPreview.innerHTML = '';
            } else {
                videoInfoAtual = info;
                videoErro.classList.remove('show');
                videoPreview.innerHTML = construirEmbed(info);
                videoPreview.classList.add('show');
                if (info.plat === 'tiktok') carregarScriptTikTok();
                else if (info.plat === 'instagram') processarInstagram();
            }
            atualizarPublicar();
        }
        if (videoInput) {
            videoInput.addEventListener('paste', () => setTimeout(validarVideo, 60));
            videoInput.addEventListener('blur', validarVideo);
            videoInput.addEventListener('input', () => { if (!videoInput.value.trim()) validarVideo(); });
        }

        if (elTipos) elTipos.addEventListener('click', (e) => {
            const chip = e.target.closest('.chip'); if (!chip) return;
            elTipos.querySelectorAll('.chip').forEach(c => c.classList.remove('on'));
            chip.classList.add('on'); tipoPost = chip.dataset.tipo;
            if (tipoPost === 'video') { videoCampo.classList.add('show'); validarVideo(); }
            else { videoCampo.classList.remove('show'); }
            atualizarPublicar();
        });

        /* Filtros do mural */
        const elFiltros = document.getElementById('filtrosMural');
        if (elFiltros) elFiltros.addEventListener('click', (e) => {
            const b = e.target.closest('.filtro'); if (!b) return;
            elFiltros.querySelectorAll('.filtro').forEach(f => f.classList.remove('on'));
            b.classList.add('on'); filtroMural = b.dataset.filtro;
            renderMural(true);
        });

        /* ── "Seus posts" (perfil) ── */
        async function carregarSeusPosts() {
            if (!sb || !usuario) return;
            const cont = document.getElementById('seusPosts');
            if (!cont) return;
            const { data, error } = await sb.from('imersao_posts')
                .select('*').eq('autor_id', usuario.id).order('created_at', { ascending: false });
            if (error || !data || !data.length) {
                cont.innerHTML = '<p class="vazio-mini">Você ainda não publicou nada.</p>';
                return;
            }
            cont.innerHTML = data.map(desenharMeuPost).join('');
        }

        function desenharMeuPost(p) {
            const st = statusDoPost(p.id);
            const indisp = st.status === 'indisponivel' || st.falhas >= 3;
            const resumo = p.texto ? esc(p.texto.slice(0, 90))
                : (p.tipo === 'video' ? esc(p.link || 'Vídeo') : '(sem texto)');
            return `
            <div class="meu-post">
                <div class="meu-post-topo">
                    <span class="meu-post-tipo">${esc(rotulo[p.tipo] || p.tipo)}</span>
                    ${indisp ? '<span class="badge-indisp">Indisponível</span>' : ''}
                </div>
                <div class="meu-post-txt">${resumo}</div>
                ${indisp ? `
                    <div class="meu-post-aviso">O vídeo original foi removido ou a conta está privada. Republique com um novo link.</div>
                    <button class="btn-editar-link" data-editar="${p.id}" data-link="${esc(p.link || '')}">Editar link</button>` : ''}
            </div>`;
        }

        const elSeusPosts = document.getElementById('seusPosts');
        if (elSeusPosts) elSeusPosts.addEventListener('click', (e) => {
            const b = e.target.closest('[data-editar]'); if (!b) return;
            editandoPostId = b.getAttribute('data-editar');
            const link = b.getAttribute('data-link') || '';
            document.getElementById('mural').scrollIntoView({ behavior: 'smooth', block: 'start' });
            elTipos.querySelectorAll('.chip').forEach(c => c.classList.remove('on'));
            elTipos.querySelector('.chip[data-tipo="video"]').classList.add('on');
            tipoPost = 'video';
            videoCampo.classList.add('show');
            videoInput.value = link;
            document.getElementById('btnPublicar').textContent = 'Salvar novo link';
            validarVideo();
            videoInput.focus();
        });
        const inputArquivo = document.getElementById('arquivo');
        if (inputArquivo) inputArquivo.addEventListener('change', (e) => {
            const f = e.target.files[0]; if (!f) return;
            if (!/^image\//.test(f.type)) { recadoMural('Selecione um arquivo de imagem.'); e.target.value = ''; return; }
            arquivoPost = f;
            document.getElementById('imgPrevia').src = URL.createObjectURL(f);
            document.getElementById('previa').classList.add('show');
        });
        const tiraPrevia = document.getElementById('tiraPrevia');
        if (tiraPrevia) tiraPrevia.addEventListener('click', () => {
            arquivoPost = null; inputArquivo.value = '';
            document.getElementById('previa').classList.remove('show');
        });

        /* Redimensiona/comprime a imagem no navegador antes de subir.
           Aceita qualquer imagem; devolve um arquivo leve (webp/jpeg). */
        function comprimirImagem(file) {
            return new Promise((resolve) => {
                if (!/^image\//.test(file.type) || file.type === 'image/gif') return resolve(file);
                const MAXLADO = 1600, QUAL = 0.85;
                const precisaPorTamanho = file.size > 1.5 * 1024 * 1024;
                const url = URL.createObjectURL(file);
                const img = new Image();
                img.onload = () => {
                    URL.revokeObjectURL(url);
                    const grande = img.width > MAXLADO || img.height > MAXLADO;
                    if (!precisaPorTamanho && !grande) return resolve(file);
                    let w = img.width, h = img.height;
                    if (grande) { const e = MAXLADO / Math.max(w, h); w = Math.round(w * e); h = Math.round(h * e); }
                    const cv = document.createElement('canvas');
                    cv.width = w; cv.height = h;
                    cv.getContext('2d').drawImage(img, 0, 0, w, h);
                    const usar = (blob) => resolve(blob && blob.size < file.size ? blob : file);
                    cv.toBlob((blob) => {
                        if (blob) usar(blob);
                        else cv.toBlob((b2) => usar(b2), 'image/jpeg', QUAL);   /* fallback p/ navegadores sem webp */
                    }, 'image/webp', QUAL);
                };
                img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
                img.src = url;
            });
        }

        async function subirImagem(arquivo) {
            const enviar = await comprimirImagem(arquivo);
            const tipo = enviar.type || arquivo.type || 'image/jpeg';
            const ext = tipo === 'image/webp' ? 'webp'
                      : tipo === 'image/jpeg' ? 'jpg'
                      : tipo === 'image/png' ? 'png'
                      : (arquivo.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
            const caminho = `${usuario.id}/${Date.now()}.${ext}`;
            const { error } = await sb.storage.from('imersao').upload(caminho, enviar, { upsert: false, contentType: tipo });
            if (error) throw error;
            return sb.storage.from('imersao').getPublicUrl(caminho).data.publicUrl;
        }

        if (composer) composer.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!usuario) return recadoMural('Faça login para publicar.');
            const texto = txtPost.value.trim();
            const ehVideo = tipoPost === 'video';
            if (ehVideo) {
                if (!videoInfoAtual) return recadoMural('Cole um link de vídeo válido (TikTok, Instagram ou YouTube).');
            } else if (!texto && !arquivoPost) {
                return recadoMural('Escreva algo ou adicione uma imagem antes de publicar.');
            }
            const btn = document.getElementById('btnPublicar');
            btn.disabled = true; btn.textContent = 'Publicando...';
            recadoMural('');
            try {
                let imagem_url = null;
                if (editandoPostId) {
                    /* Editar link de um post existente (republicar vídeo) */
                    const { error } = await sb.from('imersao_posts')
                        .update({ link: videoInput.value.trim() }).eq('id', editandoPostId);
                    if (error) throw error;
                    await resetarFalhasPost(editandoPostId);
                    editandoPostId = null;
                } else {
                    if (!ehVideo && arquivoPost) imagem_url = await subirImagem(arquivoPost);
                    const { error } = await sb.from('imersao_posts').insert({
                        autor_id: usuario.id, tipo: tipoPost, texto,
                        prompt: null,
                        link: ehVideo ? videoInput.value.trim() : null,
                        imagem_url
                    });
                    if (error) throw error;
                }
                composer.reset(); txtPost.style.height = 'auto';
                arquivoPost = null; document.getElementById('previa').classList.remove('show');
                videoInfoAtual = null; videoCampo.classList.remove('show');
                videoPreview.classList.remove('show'); videoPreview.innerHTML = '';
                videoErro.classList.remove('show');
                elTipos.querySelectorAll('.chip').forEach(c => c.classList.remove('on'));
                elTipos.querySelector('.chip[data-tipo="resultado"]').classList.add('on');
                tipoPost = 'resultado';
                atualizarPublicar();
                await carregarMural();
                await carregarSeusPosts();
                if (ehHome) carregarContador();
            } catch (err) {
                console.error('[imersao_posts insert] erro completo:', err);
                console.error('  message:', err && err.message);
                console.error('  details:', err && err.details);
                console.error('  hint:', err && err.hint);
                console.error('  code:', err && err.code);
                recadoMural('Não consegui publicar agora. Tente de novo.');
            } finally {
                btn.disabled = false; btn.textContent = 'Publicar';
            }
        });

        /* Cliques no feed (delegação) */
        if (feedEl) feedEl.addEventListener('click', async (e) => {
            const curtir = e.target.closest('[data-curtir]');
            const comentar = e.target.closest('[data-comentar]');
            const copiar = e.target.closest('[data-copiar]');
            const apagar = e.target.closest('[data-apagar]');

            if (curtir) {
                if (!usuario) return;
                const id = Number(curtir.dataset.curtir);
                const estava = curtir.classList.contains('curtido');
                const cont = curtir.querySelector(`[data-contagem="${id}"]`);
                curtir.classList.toggle('curtido');
                cont.textContent = Math.max(0, Number(cont.textContent) + (estava ? -1 : 1));
                const { error } = estava
                    ? await sb.from('imersao_curtidas').delete().eq('post_id', id).eq('usuario_id', usuario.id)
                    : await sb.from('imersao_curtidas').insert({ post_id: id, usuario_id: usuario.id });
                if (error) { curtir.classList.toggle('curtido'); cont.textContent = Number(cont.textContent) + (estava ? 1 : -1); }
                return;
            }
            if (comentar) {
                const cx = document.getElementById('coments-' + comentar.dataset.comentar);
                cx.classList.toggle('show');
                if (cx.classList.contains('show')) cx.querySelector('input').focus();
                return;
            }
            if (copiar) {
                const pre = document.getElementById('prompt-' + copiar.dataset.copiar);
                try { await navigator.clipboard.writeText(pre.textContent); copiar.textContent = 'Copiado'; setTimeout(() => { copiar.textContent = 'Copiar'; }, 1500); } catch (_) {}
                return;
            }
            if (apagar) {
                if (!confirm('Apagar essa publicação?')) return;
                const id = Number(apagar.dataset.apagar);
                const { error } = await sb.from('imersao_posts').delete().eq('id', id);
                if (error) return recadoMural('Não consegui apagar agora.');
                const art = document.querySelector(`[data-post="${id}"]`);
                if (art) art.remove();
            }
        });

        if (feedEl) feedEl.addEventListener('submit', async (e) => {
            const form = e.target.closest('[data-form-coment]');
            if (!form) return;
            e.preventDefault();
            if (!usuario) return;
            const id = Number(form.dataset.formComent);
            const campo = form.querySelector('input');
            const texto = campo.value.trim();
            if (!texto) return;
            const btn = form.querySelector('button');
            btn.disabled = true;
            const { error } = await sb.from('imersao_comentarios').insert({ post_id: id, autor_id: usuario.id, texto });
            btn.disabled = false;
            if (error) return recadoMural('Não consegui comentar agora.');
            campo.value = '';
            const novo = document.createElement('div');
            novo.innerHTML = desenharComentario({ texto, created_at: new Date().toISOString(), autor_nome: (perfil && perfil.nome) || 'Você', autor_avatar: perfil && perfil.avatar_url });
            form.parentNode.insertBefore(novo.firstElementChild, form);
            const nEl = document.querySelector(`[data-ncoment="${id}"]`);
            if (nEl) nEl.textContent = document.querySelectorAll('#coments-' + id + ' .coment').length;
        });

        /* ─────────────── PROMPTS ─────────────── */
        const prompts = [
            { cat: 'ROTEIRO UGC', titulo: 'Roteiro UGC em 5 cenas', texto: 'Você é uma criadora de conteúdo UGC. Crie um roteiro de vídeo em 5 cenas para o produto [PRODUTO], com gancho nos primeiros 3 segundos, demonstração de uso e chamada para ação natural.' },
            { cat: 'ANÁLISE',     titulo: 'Análise de concorrente', texto: 'Analise o perfil do concorrente [LINK]. Liste seus 3 principais formatos de conteúdo, tom de voz, frequência de postagem e as lacunas que eu poderia explorar no meu nicho.' },
            { cat: 'COPY',        titulo: 'Copy para stories de venda', texto: 'Escreva uma sequência de 5 stories para vender [OFERTA]. Cada story com uma ideia só: dor, prova, oferta, urgência e CTA. Tom próximo e direto, sem parecer anúncio.' },
            { cat: 'LANDING PAGE', titulo: 'Landing page em 30 min', texto: 'Gere a estrutura completa de uma landing page para [PRODUTO]: headline, subheadline, 3 blocos de benefício, prova social, FAQ e CTA. Me devolva pronto para colar no Claude Code.' },
            { cat: 'COPY',        titulo: 'Legenda que gera comentário', texto: 'Crie 3 opções de legenda para um post sobre [TEMA] que terminem com uma pergunta que estimule comentários genuínos, sem clickbait.' },
            { cat: 'ROTEIRO UGC', titulo: 'Depoimento em vídeo autêntico', texto: 'Transforme esse depoimento cru [TEXTO] em um roteiro falado de 30 segundos, mantendo naturalidade, com pausas marcadas e ênfase nas palavras-chave.' }
        ];
        const promptsGrid = document.getElementById('prompts-grid');
        async function carregarPromptsSecao() {
            if (!promptsGrid) return;
            let itens = prompts.map(p => ({ cat: p.cat, titulo: p.titulo, texto: p.texto, copia: p.texto }));
            if (sb) {
                try {
                    const { data } = await sb.from('imersao_prompts').select('*').eq('publicado', true)
                        .order('destaque', { ascending: false }).order('created_at', { ascending: false });
                    if (data && data.length) itens = data.map(r => ({ cat: r.tema, titulo: r.titulo, texto: r.descricao || r.prompt, copia: r.prompt }));
                } catch (e) {}
            }
            promptsGrid.innerHTML = itens.map((p, i) => `
                <div class="p-card">
                    <div><span class="pill-cat">${esc(p.cat || '')}</span></div>
                    <h3>${esc(p.titulo || '')}</h3>
                    <div class="preview">${esc(p.texto || '')}</div>
                    <div class="p-rodape"><button class="btn-preto" data-copiar="${i}">Copiar prompt</button></div>
                </div>`).join('');
            promptsGrid.querySelectorAll('[data-copiar]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const p = itens[+btn.getAttribute('data-copiar')];
                    navigator.clipboard.writeText(p.copia || p.texto || '').then(() => {
                        const orig = btn.textContent;
                        btn.textContent = 'Copiado!';
                        setTimeout(() => { btn.textContent = orig; }, 1500);
                    });
                });
            });
        }

        /* ─────────────── MATERIAIS ─────────────── */
        const materiais = [
            { titulo: 'Checklist de portfólio',         tipo: 'PDF · 2.3 MB',  ico: 'check-square', tom: tom.lavanda },
            { titulo: 'Planilha de precificação UGC',   tipo: 'XLSX · 480 KB', ico: 'table',        tom: tom.menta },
            { titulo: 'Template de proposta comercial', tipo: 'PDF · 1.1 MB',  ico: 'file-text',    tom: tom.pessego },
            { titulo: 'Guia de prompts para Claude',    tipo: 'PDF · 3.7 MB',  ico: 'sparkles',     tom: tom.lavandaClara },
            { titulo: 'Kit de posts para lançamento',   tipo: 'ZIP · 8.2 MB',  ico: 'image',        tom: tom.pessego }
        ];
        const tomLista = [tom.pessego, tom.lavanda, tom.menta, tom.lavandaClara];
        async function carregarMateriaisSecao() {
            const matEl = document.getElementById('materiais-lista');
            if (!matEl) return;
            let itens = materiais.map(m => ({ titulo: m.titulo, sub: m.tipo, url: '#', ico: m.ico, tom: m.tom }));
            if (sb) {
                try {
                    const { data } = await sb.from('imersao_materiais').select('*').eq('publicado', true)
                        .order('ordem', { ascending: true }).order('created_at', { ascending: false });
                    if (data && data.length) itens = data.map((r, i) => ({ titulo: r.titulo, sub: r.descricao, url: r.url || '#', ico: 'file-text', tom: tomLista[i % 4] }));
                } catch (e) {}
            }
            matEl.innerHTML = itens.map(m => `
                <div class="mat-item">
                    <div class="mat-ico" style="background:${m.tom}"><i data-lucide="${m.ico || 'file-text'}"></i></div>
                    <div class="mat-meio">
                        <h3>${esc(m.titulo || '')}</h3>
                        <div class="tipo">${esc(m.sub || '')}</div>
                    </div>
                    <a class="btn-glass" href="${esc(m.url || '#')}" target="_blank" rel="noopener"><i data-lucide="download"></i> Baixar</a>
                </div>`).join('');
            if (window.lucide) lucide.createIcons();
        }

        /* ─────────────── AVISOS ─────────────── */
        const avisos = [
            { data: '12 JUL 2026', tipo: 'EVENTO',     titulo: 'Encontro ao vivo nesta quinta, 20h', corpo: 'Nosso encontro semanal vai ser sobre landing pages que convertem. Traga seu projeto para receber feedback ao vivo. O link entra aqui no mural 10 minutos antes.' },
            { data: '09 JUL 2026', tipo: 'NOVIDADE',   titulo: 'Nova biblioteca de prompts liberada', corpo: 'Adicionamos 6 prompts novos de copy e roteiro UGC na aba Prompts. É só copiar e adaptar para o seu nicho. Me conta nos comentários qual funcionou melhor.' },
            { data: '05 JUL 2026', tipo: 'IMPORTANTE', titulo: 'Atualize seu portfólio no Mural',      corpo: 'Quem terminou o projeto da semana pode subir no Mural dos Alunos. Os melhores vão ser destacados na home da comunidade e nas redes da Lara.' },
            { data: '01 JUL 2026', tipo: 'NOVIDADE',   titulo: 'Abrimos a Store da comunidade',        corpo: 'Agora você encontra aulas avulsas, mentorias 1:1 e packs de prompts direto aqui dentro, com preço de comunidade. Confere a aba Store.' }
        ];
        async function carregarAvisosSecao() {
            const avEl = document.getElementById('avisos-lista');
            if (!avEl) return;
            let itens = avisos.map(a => ({ data: a.data, tipo: a.tipo, titulo: a.titulo, corpo: a.corpo }));
            if (sb) {
                try {
                    const { data } = await sb.from('imersao_avisos').select('*').eq('publicado', true).order('created_at', { ascending: false });
                    if (data && data.length) itens = data.map(r => ({ data: quando ? quando(r.created_at) : '', tipo: null, titulo: r.titulo, corpo: r.corpo }));
                } catch (e) {}
            }
            avEl.innerHTML = itens.map(a => `
                <div class="aviso">
                    ${a.tipo ? `<span class="pill-cat">${esc(a.tipo)}</span>` : ''}
                    <div class="data">${esc(a.data || '')}</div>
                    <h3>${esc(a.titulo || '')}</h3>
                    <div class="corpo">${esc(a.corpo || '')}</div>
                </div>`).join('');
        }

        /* ─────────────── STORE ─────────────── */
        const store = [
            { titulo: 'Aula: Landing em 1 hora',       desc: 'Aula gravada',        preco: 'R$ 97',  cat: 'GRAVADA',  tom: tom.pessego },
            { titulo: 'Mentoria 1:1 com a Lara',       desc: '60 min ao vivo',      preco: 'R$ 997', cat: 'MENTORIA', tom: tom.lavanda },
            { titulo: 'Pack 50 prompts de UGC',        desc: 'Download imediato',   preco: 'R$ 47',  cat: 'PACK',     tom: tom.menta },
            { titulo: 'Aula: Prompts que vendem',      desc: 'Aula gravada',        preco: 'R$ 147', cat: 'GRAVADA',  tom: tom.lavandaClara },
            { titulo: 'Imersão Portfólio v2',          desc: 'Turma de agosto',     preco: 'R$ 397', cat: 'IMERSÃO',  tom: tom.pessego },
            { titulo: 'Pack templates de proposta',    desc: 'Editáveis no Canva',  preco: 'R$ 67',  cat: 'PACK',     tom: tom.menta }
        ];
        /* Store — vitrine que abre o checkout da Kiwify (tabela produtos) */
        const corStore = (k) => ({
            lavanda: 'linear-gradient(135deg, #C8B8E0, #B8C6E8)',
            menta:   'linear-gradient(135deg, #B8E0D0, #B8C6E8)',
            pessego: 'linear-gradient(135deg, #E8C4B8, #C8B8E0)'
        }[k] || 'linear-gradient(135deg, #C8B8E0, #B8C6E8)');

        function fmtReal(v) {
            const n = Number(v);
            return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });
        }
        // Converte preço em texto do Destaque ("R$ 197", "Gratuita", "1.997") pra número
        function precoTexto2Num(s) {
            if (s == null) return null;
            let t = String(s).replace(/[R$\s]/gi, '').trim();
            if (!t) return null;
            if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
            else if (/\.\d{3}(\.|$)/.test(t)) t = t.replace(/\./g, '');
            const n = parseFloat(t);
            return isNaN(n) ? null : n;
        }
        function precoProdutoHTML(p) {
            const preco = p.preco == null ? 0 : Number(p.preco);
            if (!preco) return '<span class="gratis">Gratuito</span>';
            const de = p.preco_de == null ? null : Number(p.preco_de);
            if (de && de > preco) return `<s class="antes">${fmtReal(de)}</s><span class="agora">${fmtReal(preco)}</span>`;
            return `<span class="agora">${fmtReal(preco)}</span>`;
        }
        function cardProduto(p) {
            return `<div class="s-card">
                <div class="s-thumb${p.imagem_url ? ' has-img' : ''}" style="background:${corStore(p.cor)}">
                    ${p.imagem_url ? `<img class="s-img" src="${esc(p.imagem_url)}" alt="" onerror="this.style.display='none'">` : ''}
                    ${p.tag ? `<span class="badge">${esc(p.tag)}</span>` : ''}
                </div>
                <div class="s-corpo">
                    <h3>${esc(p.nome || '')}</h3>
                    <div class="desc">${esc(p.descricao || '')}</div>
                    <div class="s-rodape">
                        <div class="s-preco">${precoProdutoHTML(p)}</div>
                        <button class="s-comprar" data-checkout="${esc(p.checkout_url || '')}">${Number(p.preco) ? 'Comprar' : 'Acessar'} <span aria-hidden="true">→</span></button>
                    </div>
                </div>
            </div>`;
        }

        async function carregarStoreSecao() {
            const stEl = document.getElementById('store-grid');
            const secStore = document.getElementById('store');
            if (!stEl || !secStore) return;
            let itens = [];
            if (sb) {
                // 1) Produtos próprios da Store
                try {
                    const { data, error } = await sb.from('produtos').select('*').eq('ativo', true).order('ordem', { ascending: true });
                    if (!error && data) data.forEach(p => itens.push({ ...p, _ordem: p.ordem == null ? 999 : p.ordem }));
                } catch (e) {}
                // 2) Destaques marcados com "Mostrar também na Store" (lê do mesmo registro, sem duplicar)
                try {
                    const { data, error } = await sb.from('imersao_destaques').select('*').eq('publicado', true).eq('na_store', true).order('ordem', { ascending: true });
                    if (!error && data) data.forEach(r => itens.push({
                        nome: r.titulo, descricao: r.descricao,
                        preco: precoTexto2Num(r.preco), preco_de: precoTexto2Num(r.preco_antigo),
                        checkout_url: r.link, tag: r.categoria, imagem_url: r.imagem_url,
                        cor: ['lavanda', 'menta', 'pessego'].includes(r.tom) ? r.tom : 'lavanda',
                        _ordem: r.ordem == null ? 999 : r.ordem
                    }));
                } catch (e) {}
                itens.sort((a, b) => a._ordem - b._ordem);
            }
            if (!itens.length) {
                if (ehLoja) { secStore.style.display = ''; stEl.innerHTML = '<div class="loja-vazia">Nenhum produto disponível ainda. Volte em breve! 💜</div>'; return; }
                secStore.style.display = 'none'; return;
            }
            secStore.style.display = '';
            stEl.innerHTML = itens.map(cardProduto).join('');
            if (!stEl.dataset.bound) {
                stEl.addEventListener('click', (e) => {
                    const b = e.target.closest('[data-checkout]');
                    if (b && b.dataset.checkout) window.open(b.dataset.checkout, '_blank', 'noopener,noreferrer');
                });
                stEl.dataset.bound = '1';
            }
        }

        /* ─────────────── ÍCONES ─────────────── */
        if (window.lucide) lucide.createIcons();

        /* ─────────────── NAVEGAÇÃO / SCROLL / FAB ─────────────── */
        const menu = document.getElementById('mainMenu');
        const fab = document.getElementById('fab');
        const fabMenu = document.getElementById('fabMenu');
        const todosLinks = Array.from(document.querySelectorAll('[data-target]'));

        function irPara(id) {
            const alvo = document.getElementById(id);
            if (alvo) alvo.scrollIntoView({ behavior: 'smooth', block: 'start' });
            fab.classList.remove('open');
            fabMenu.classList.remove('open');
        }
        todosLinks.forEach(a => a.addEventListener('click', (e) => {
            e.preventDefault();
            irPara(a.getAttribute('data-target'));
        }));

        /* FAB abre/fecha o popup */
        fab.addEventListener('click', (e) => {
            e.stopPropagation();
            const abrir = !fabMenu.classList.contains('open');
            fabMenu.classList.toggle('open', abrir);
            fab.classList.toggle('open', abrir);
        });
        /* Clicar fora fecha o popup */
        document.addEventListener('click', (e) => {
            if (!fabMenu.contains(e.target) && !fab.contains(e.target)) {
                fabMenu.classList.remove('open');
                fab.classList.remove('open');
            }
        });

        /* Esconde o menu / mostra o FAB conforme o scroll */
        let ticking = false;
        function applyState() {
            const scrolled = window.scrollY > 120;
            if (scrolled) {
                menu.classList.add('hidden');
                fab.classList.add('visible');
            } else {
                menu.classList.remove('hidden');
                fab.classList.remove('visible');
                fab.classList.remove('open');
                fabMenu.classList.remove('open');
            }
            ticking = false;
        }
        window.addEventListener('scroll', () => {
            if (ticking) return;
            ticking = true;
            window.requestAnimationFrame(applyState);
        });
        applyState();

        /* IntersectionObserver marca ativo no menu lateral E no popup */
        const secoes = ['inicio','prompts','materiais','avisos','store','perfil'];
        function marcarAtivo(id) {
            todosLinks.forEach(a => a.classList.toggle('ativo', a.getAttribute('data-target') === id));
        }
        const io = new IntersectionObserver((entries) => {
            entries.forEach(en => { if (en.isIntersecting) marcarAtivo(en.target.id); });
        }, { threshold: 0.4 });
        secoes.forEach(id => { const el = document.getElementById(id); if (el) io.observe(el); });

        /* Ao chegar de /mural via app.html#ancora, rola até a seção */
        if (ehHome && location.hash.length > 1) {
            const alvoHash = document.getElementById(location.hash.slice(1));
            if (alvoHash) setTimeout(() => alvoHash.scrollIntoView({ block: 'start' }), 80);
        }

        /* ─────────────── GUARD DE SESSÃO + PERFIL ─────────────── */
        (async function () {
            if (!sb) return;
            try {
                const { data: { session } } = await sb.auth.getSession();
                if (!session) { window.location.replace('index.html'); return; }
                usuario = session.user;
                const email = usuario.email || '';

                /* Perfil (cria se ainda não existir) */
                let pf = null;
                try {
                    const r = await sb.from('imersao_perfis').select('*').eq('usuario_id', usuario.id).maybeSingle();
                    pf = r.data;
                    if (!pf) {
                        const nomeBase = (usuario.user_metadata && usuario.user_metadata.nome) || (email.split('@')[0] || 'Aluna');
                        const novo = await sb.from('imersao_perfis').insert({ usuario_id: usuario.id, nome: nomeBase }).select().maybeSingle();
                        pf = novo.data || { usuario_id: usuario.id, nome: nomeBase };
                    }
                } catch (e) { pf = { nome: email.split('@')[0] || 'Aluna' }; }
                perfil = pf;

                const nome = perfil.nome || (email.split('@')[0] || 'Aluna');
                const primeiro = nome.split(' ')[0];
                const setTxt = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
                setTxt('nomeUsuaria', primeiro);
                setTxt('perfilNome', nome);
                setTxt('perfilEmail', email);
                const ini = (iniciais ? iniciais(nome) : (primeiro[0] || 'L')).toUpperCase();
                const elAvatar = document.getElementById('avatar');
                if (elAvatar) elAvatar.textContent = ini;
                const elMeu = document.getElementById('meuAvatar');
                if (elMeu) elMeu.innerHTML = avatarHTML(nome, perfil.avatar_url);
                if (perfil.avatar_url && elAvatar) {
                    elAvatar.innerHTML =
                        `<img src="${esc(perfil.avatar_url)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
                }

                const elSair = document.getElementById('btnSair');
                if (elSair) elSair.addEventListener('click', async () => {
                    await sb.auth.signOut();
                    window.location.replace('index.html');
                });

                /* Link de Admin no perfil (só para admins) */
                try {
                    const { data: adm } = await sb.rpc('is_admin');
                    const la = document.getElementById('linkAdmin');
                    if (adm && la) la.style.display = 'flex';
                } catch (e) {}

                if (!ehLoja) {
                    await carregarMural();
                    await carregarSeusPosts();
                }
                if (ehHome) {
                    carregarContador();
                    carregarDestaques();
                    carregarPromptsSecao();
                    carregarMateriaisSecao();
                    carregarAvisosSecao();
                    carregarStoreSecao();
                }
                if (ehLoja) carregarStoreSecao();
            } catch (e) {
                /* Sem backend disponível: mantém os placeholders visuais. */
            }
        })();
    })();
