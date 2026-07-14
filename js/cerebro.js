/* ── A logo do Claude feita de pontos interligados, atravessada por luz prismática ──
   A silhueta vira nuvem de pontos, os pontos são ligados como uma rede e girados em 3D.
   O cursor gira a estrutura e empurra os pontos por perto. */
(function () {
    'use strict';

    const tela = document.getElementById('cerebro');
    const palco = document.getElementById('palcoCerebro');
    if (!tela || !palco) return;

    const ctx = tela.getContext('2d');
    const paradinha = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let L = 0, A = 0, dpr = 1;
    let centroX = 0, centroY = 0;
    let pontos = [];
    let ligacoes = [];

    let mouse = null;
    let giroY = 0, giroX = 0;
    let alvoY = 0, alvoX = 0;
    let tempo = 0;

    /* Vidro: branco quase puro, com um respiro frio (azulado) e outro quente,
       do jeito que o vidro devolve a luz do ambiente. */
    function corDoVidro(t) {
        const onda = Math.sin(t * Math.PI * 2);
        return [
            250,
            Math.round(251 + onda * 3),
            Math.round(255 - onda * 8)
        ];
    }

    let raioLogo = 0;
    let puxando = false;

    /* Elástico: o ponto sai do lugar quando você puxa e a mola traz de volta. */
    const MOLA = 0.055;
    const AMORTECE = 0.88;
    const LIMITE = 150;   /* até onde um ponto aceita ser esticado */

    /* ── 1. Desenha a logo do Claude e lê os pixels dela ── */
    function silhuetaDoClaude(tamanho) {
        const c = document.createElement('canvas');
        c.width = c.height = tamanho;
        const g = c.getContext('2d');
        const meio = tamanho / 2;
        const R = tamanho * 0.46;

        g.fillStyle = '#fff';
        g.translate(meio, meio);
        g.rotate(-Math.PI / 12);

        const RAIOS = 8;
        for (let i = 0; i < RAIOS; i++) {
            const comprimento = R * (i % 2 === 0 ? 1 : 0.76);
            const largura = R * (i % 2 === 0 ? 0.23 : 0.20);

            g.save();
            g.rotate((Math.PI * 2 / RAIOS) * i);
            g.beginPath();
            g.moveTo(0, -largura / 2);
            g.quadraticCurveTo(comprimento * 0.62, -largura * 0.26, comprimento, 0);
            g.quadraticCurveTo(comprimento * 0.62, largura * 0.26, 0, largura / 2);
            g.quadraticCurveTo(-largura * 0.35, 0, 0, -largura / 2);
            g.fill();
            g.restore();
        }

        g.beginPath();
        g.arc(0, 0, R * 0.14, 0, Math.PI * 2);
        g.fill();

        return g.getImageData(0, 0, tamanho, tamanho);
    }

    /* ── 2. Vira a silhueta em nuvem de pontos com profundidade ── */
    function montarPontos(lado) {
        const tamanho = 340;
        const img = silhuetaDoClaude(tamanho).data;
        const escala = lado / tamanho;
        const passo = lado < 380 ? 6 : 4;
        const meio = tamanho / 2;
        const lista = [];

        for (let y = 0; y < tamanho; y += passo) {
            for (let x = 0; x < tamanho; x += passo) {
                if (img[(y * tamanho + x) * 4 + 3] < 130) continue;

                const jx = x + (Math.random() - 0.5) * passo * 0.9;
                const jy = y + (Math.random() - 0.5) * passo * 0.9;
                const px = (jx - meio) * escala;
                const py = (jy - meio) * escala;

                const dist = Math.hypot(px, py) / (lado * 0.5);
                const grossura = Math.max(0.14, 1 - dist) * (lado * 0.11);
                const pz = (Math.random() * 2 - 1) * grossura;

                /* A cor do ponto vem da diagonal: é a luz do prisma atravessando. */
                const matiz = (px + py) / (lado * 1.4) + 0.5;

                lista.push({
                    x: px, y: py, z: pz, matiz,
                    brilho: 0.55 + Math.random() * 0.45,
                    /* o quanto esse ponto está puxado pra fora do lugar, e a que velocidade */
                    ox: 0, oy: 0, vx: 0, vy: 0
                });
            }
        }
        return lista;
    }

    /* ── 3. Liga cada ponto aos vizinhos (rede fixa: calculamos uma vez só) ── */
    function montarLigacoes(pts, alcance) {
        const pares = [];
        const grade = new Map();
        const chave = (i, j) => i + ',' + j;

        pts.forEach((p, idx) => {
            const k = chave(Math.floor(p.x / alcance), Math.floor(p.y / alcance));
            if (!grade.has(k)) grade.set(k, []);
            grade.get(k).push(idx);
        });

        pts.forEach((p, idx) => {
            const ci = Math.floor(p.x / alcance);
            const cj = Math.floor(p.y / alcance);
            let grau = 0;
            const TETO = 4;

            for (let i = ci - 1; i <= ci + 1 && grau < TETO; i++) {
                for (let j = cj - 1; j <= cj + 1 && grau < TETO; j++) {
                    const vizinhos = grade.get(chave(i, j));
                    if (!vizinhos) continue;

                    for (const outro of vizinhos) {
                        if (outro <= idx || grau >= TETO) continue;
                        const q = pts[outro];
                        const d = Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z);
                        if (d < alcance) {
                            pares.push([idx, outro, d / alcance]);
                            grau++;
                        }
                    }
                }
            }
        });
        return pares;
    }

    function medir() {
        const caixa = palco.getBoundingClientRect();
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        L = caixa.width;
        A = caixa.height;
        tela.width = L * dpr;
        tela.height = A * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const estreito = L < 900;
        centroX = estreito ? L * 0.5 : L * 0.68;
        centroY = estreito ? A * 0.28 : A * 0.47;

        const lado = estreito
            ? Math.min(L * 0.78, A * 0.42)
            : Math.min(L * 0.42, A * 0.78);

        raioLogo = lado * 0.52;
        pontos = montarPontos(lado);
        ligacoes = montarLigacoes(pontos, lado * 0.075);
    }

    /* ── 4. A luz que atravessa a logo: um brilho leitoso, de vidro ── */
    function feixe() {
        const raio = Math.max(L, A);
        const g = ctx.createLinearGradient(
            centroX - raio * 0.55, centroY + raio * 0.30,
            centroX + raio * 0.55, centroY - raio * 0.30
        );
        g.addColorStop(0.00, 'rgba(255, 255, 255, 0)');
        g.addColorStop(0.30, 'rgba(226, 238, 255, .10)');
        g.addColorStop(0.50, 'rgba(255, 255, 255, .16)');
        g.addColorStop(0.70, 'rgba(226, 238, 255, .10)');
        g.addColorStop(1.00, 'rgba(255, 255, 255, 0)');

        ctx.save();
        ctx.filter = 'blur(46px)';
        ctx.fillStyle = g;
        ctx.translate(centroX, centroY);
        ctx.rotate(-0.24 + Math.sin(tempo * 0.0004) * 0.05);
        ctx.fillRect(-raio, -A * 0.16, raio * 2, A * 0.32);
        ctx.restore();

        /* Brilho no miolo, de onde a luz sai. */
        const halo = ctx.createRadialGradient(centroX, centroY, 0, centroX, centroY, Math.min(L, A) * 0.42);
        halo.addColorStop(0, 'rgba(232, 242, 255, .10)');
        halo.addColorStop(0.5, 'rgba(190, 210, 240, .04)');
        halo.addColorStop(1, 'rgba(10, 12, 20, 0)');
        ctx.fillStyle = halo;
        ctx.fillRect(0, 0, L, A);
    }

    /* ── 5. Desenha ── */
    const F = 520;

    function quadro() {
        tempo += 16;
        giroY += (alvoY - giroY) * 0.06;
        giroX += (alvoX - giroX) * 0.06;
        if (!paradinha && !mouse) giroY += 0.0022;

        const cy = Math.cos(giroY), sy = Math.sin(giroY);
        const cx = Math.cos(giroX), sx = Math.sin(giroX);

        ctx.clearRect(0, 0, L, A);
        ctx.globalCompositeOperation = 'lighter';
        feixe();

        /* Perto do cursor a malha é puxada; segurando o botão, o puxão é bem mais forte
           e alcança mais longe (é aí que você agarra a logo e leva pra onde quiser). */
        const alcance = puxando ? 300 : 150;
        const puxao = puxando ? 0.34 : 0.11;

        for (const p of pontos) {
            let x = p.x * cy + p.z * sy;
            let z = -p.x * sy + p.z * cy;
            let y = p.y * cx - z * sx;
            z = p.y * sx + z * cx;

            const perto = F / (F + z);
            /* Onde o ponto ficaria se ninguém mexesse nele. */
            const bx = centroX + x * perto;
            const by = centroY + y * perto;

            if (mouse) {
                const dx = mouse.x - (bx + p.ox);
                const dy = mouse.y - (by + p.oy);
                const d = Math.hypot(dx, dy);
                if (d < alcance && d > 0.001) {
                    const quanto = (1 - d / alcance) ** 1.6 * puxao;
                    p.vx += dx * quanto;
                    p.vy += dy * quanto;
                }
            }

            /* A mola sempre tenta trazer o ponto de volta pro lugar dele. */
            p.vx -= p.ox * MOLA;
            p.vy -= p.oy * MOLA;
            p.vx *= AMORTECE;
            p.vy *= AMORTECE;
            p.ox += p.vx;
            p.oy += p.vy;

            /* Nenhum ponto estica além do limite: a logo se deforma, não se desfaz. */
            const estica = Math.hypot(p.ox, p.oy);
            if (estica > LIMITE) {
                p.ox *= LIMITE / estica;
                p.oy *= LIMITE / estica;
            }

            p.px = bx + p.ox;
            p.py = by + p.oy;
            p.perto = perto;
        }

        /* Linhas da rede. */
        for (const [a, b, folga] of ligacoes) {
            const p = pontos[a], q = pontos[b];
            const profundidade = (p.perto + q.perto) / 2;
            const frente = Math.max(0.12, Math.min(1, (profundidade - 0.92) * 6));
            const esticou = Math.hypot(p.px - q.px, p.py - q.py);
            const tensao = Math.max(0, 1 - esticou / 74);
            const alfa = (0.50 - folga * 0.24) * (0.22 + 0.78 * frente) * tensao;
            if (alfa <= 0.01) continue;

            const [r, v, az] = corDoVidro((p.matiz + q.matiz) / 2 + tempo * 0.00004);
            ctx.strokeStyle = `rgba(${r}, ${v}, ${az}, ${alfa * 0.62})`;
            ctx.lineWidth = 0.5 + 0.5 * frente;
            ctx.beginPath();
            ctx.moveTo(p.px, p.py);
            ctx.lineTo(q.px, q.py);
            ctx.stroke();
        }

        /* Pontos: um halo leitoso e um miolo branco. Quem está atrás fica esfumaçado,
           como se o vidro estivesse embaçando o que passa por dentro dele. */
        for (const p of pontos) {
            const f = (p.perto - 0.92) * 6;
            const claro = Math.max(0.1, Math.min(1, f)) * p.brilho;
            const [r, v, az] = corDoVidro(p.matiz + tempo * 0.00004);

            ctx.fillStyle = `rgba(${r}, ${v}, ${az}, ${0.11 * claro})`;
            ctx.beginPath();
            ctx.arc(p.px, p.py, 7 * p.perto * (0.5 + claro * 0.6), 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = `rgba(255, 255, 255, ${0.26 + 0.66 * claro})`;
            ctx.beginPath();
            ctx.arc(p.px, p.py, (0.85 + 0.85 * claro) * p.perto, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalCompositeOperation = 'source-over';
        requestAnimationFrame(quadro);
    }

    /* ── 6. Cursor (a cena é o fundo inteiro, então escutamos a janela) ── */
    function soltar() {
        puxando = false;
        document.body.classList.remove('puxando');
    }

    window.addEventListener('pointermove', (ev) => {
        const caixa = palco.getBoundingClientRect();
        const x = ev.clientX - caixa.left;
        const y = ev.clientY - caixa.top;
        if (x < 0 || y < 0 || x > L || y > A) {
            mouse = null;
            alvoY = 0;
            alvoX = 0;
            document.body.classList.remove('na-logo');
            return;
        }

        mouse = { x, y };
        alvoY = ((x - centroX) / L) * 0.9;
        alvoX = -((y - centroY) / A) * 0.5;

        /* Sobre a logo, o cursor vira a mãozinha: é o convite pra pegar e puxar. */
        const dentro = Math.hypot(x - centroX, y - centroY) < raioLogo * 1.25;
        document.body.classList.toggle('na-logo', dentro);
    });

    window.addEventListener('pointerdown', (ev) => {
        const caixa = palco.getBoundingClientRect();
        const x = ev.clientX - caixa.left;
        const y = ev.clientY - caixa.top;
        if (x < 0 || y < 0 || x > L || y > A) return;
        /* Só agarra pelo fundo. Em cima do formulário, o clique é do formulário. */
        if (ev.target.closest('.forma, .barra')) return;

        puxando = true;
        document.body.classList.add('puxando');
    });

    window.addEventListener('pointerup', soltar);
    window.addEventListener('pointercancel', soltar);

    window.addEventListener('pointerleave', () => {
        mouse = null;
        alvoY = 0;
        alvoX = 0;
        document.body.classList.remove('na-logo');
        soltar();
    });

    let esperando;
    window.addEventListener('resize', () => {
        clearTimeout(esperando);
        esperando = setTimeout(medir, 180);
    });

    medir();
    requestAnimationFrame(quadro);
})();
