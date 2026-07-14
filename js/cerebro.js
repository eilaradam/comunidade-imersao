/* ── A logo do Claude feita de pontos interligados ──
   A silhueta é desenhada num canvas escondido, virada em nuvem de pontos,
   ligada como uma rede e girada em 3D. O cursor empurra os pontos por perto. */
(function () {
    'use strict';

    const tela = document.getElementById('cerebro');
    const palco = document.getElementById('palcoCerebro');
    if (!tela || !palco) return;

    const ctx = tela.getContext('2d');
    const paradinha = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let L = 0, A = 0, dpr = 1;
    let pontos = [];
    let ligacoes = [];

    /* Onde o mouse está (em pixels do canvas). Fora da área = null. */
    let mouse = null;
    let giroY = 0, giroX = 0;
    let alvoY = 0, alvoX = 0;

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

        /* Os raios do símbolo: alternam comprido e curto, como na logo. */
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

        /* Miolo, pra rede não ficar oca no centro. */
        g.beginPath();
        g.arc(0, 0, R * 0.14, 0, Math.PI * 2);
        g.fill();

        return g.getImageData(0, 0, tamanho, tamanho);
    }

    /* ── 2. Vira a silhueta em nuvem de pontos com profundidade ── */
    function montarPontos(largura) {
        const tamanho = 340;
        const img = silhuetaDoClaude(tamanho).data;
        const escala = (Math.min(largura, A) * 0.86) / tamanho;
        const passo = largura < 520 ? 6 : 4;
        const meio = tamanho / 2;
        const brutos = [];

        for (let y = 0; y < tamanho; y += passo) {
            for (let x = 0; x < tamanho; x += passo) {
                if (img[(y * tamanho + x) * 4 + 3] < 130) continue;

                const jx = x + (Math.random() - 0.5) * passo * 0.9;
                const jy = y + (Math.random() - 0.5) * passo * 0.9;
                const px = (jx - meio) * escala;
                const py = (jy - meio) * escala;

                /* Volume: mais "gordo" no miolo, fino nas pontas. */
                const dist = Math.hypot(px, py) / (tamanho * escala * 0.5);
                const grossura = Math.max(0.14, 1 - dist) * 46;
                const pz = (Math.random() * 2 - 1) * grossura;

                brutos.push({ x: px, y: py, z: pz, brilho: 0.55 + Math.random() * 0.45 });
            }
        }
        return brutos;
    }

    /* ── 3. Liga cada ponto aos vizinhos (a rede fica fixa, então calculamos uma vez só) ── */
    function montarLigacoes(pts, alcance) {
        const pares = [];
        const celula = alcance;
        const grade = new Map();
        const chave = (i, j) => i + ',' + j;

        pts.forEach((p, idx) => {
            const k = chave(Math.floor(p.x / celula), Math.floor(p.y / celula));
            if (!grade.has(k)) grade.set(k, []);
            grade.get(k).push(idx);
        });

        pts.forEach((p, idx) => {
            const ci = Math.floor(p.x / celula);
            const cj = Math.floor(p.y / celula);
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

        pontos = montarPontos(L);
        ligacoes = montarLigacoes(pontos, L < 520 ? 26 : 22);
    }

    /* ── 4. Desenha ── */
    const F = 520; /* distância da "câmera": quanto menor, mais perspectiva */

    function quadro() {
        giroY += (alvoY - giroY) * 0.06;
        giroX += (alvoX - giroX) * 0.06;
        if (!paradinha && !mouse) giroY += 0.0022;

        const cy = Math.cos(giroY), sy = Math.sin(giroY);
        const cx = Math.cos(giroX), sx = Math.sin(giroX);
        const meioL = L / 2, meioA = A / 2;

        ctx.clearRect(0, 0, L, A);
        ctx.globalCompositeOperation = 'lighter';

        /* Projeta todo mundo antes de desenhar as linhas. */
        for (const p of pontos) {
            let x = p.x * cy + p.z * sy;
            let z = -p.x * sy + p.z * cy;
            let y = p.y * cx - z * sx;
            z = p.y * sx + z * cx;

            const perto = F / (F + z);
            let px = meioL + x * perto;
            let py = meioA + y * perto;

            /* O cursor empurra o que está por perto. */
            if (mouse) {
                const dx = px - mouse.x;
                const dy = py - mouse.y;
                const d = Math.hypot(dx, dy);
                const raio = 110;
                if (d < raio && d > 0.001) {
                    const forca = (1 - d / raio) ** 2 * 34;
                    px += (dx / d) * forca;
                    py += (dy / d) * forca;
                }
            }

            p.px = px;
            p.py = py;
            p.perto = perto;
        }

        /* Linhas da rede. */
        for (const [a, b, folga] of ligacoes) {
            const p = pontos[a], q = pontos[b];
            const profundidade = (p.perto + q.perto) / 2;
            const frente = Math.max(0.12, Math.min(1, (profundidade - 0.92) * 6));
            const esticou = Math.hypot(p.px - q.px, p.py - q.py);
            /* Se o cursor esticou demais a linha, ela se apaga. */
            const tensao = Math.max(0, 1 - esticou / 70);
            const alfa = (0.62 - folga * 0.30) * (0.25 + 0.75 * frente) * tensao;
            if (alfa <= 0.01) continue;

            ctx.strokeStyle = `rgba(231, 126, 70, ${alfa})`;
            ctx.lineWidth = 0.55 + 0.55 * frente;
            ctx.beginPath();
            ctx.moveTo(p.px, p.py);
            ctx.lineTo(q.px, q.py);
            ctx.stroke();
        }

        /* Pontos: um halo largo e fraco, e um miolo pequeno e forte. */
        for (const p of pontos) {
            const f = (p.perto - 0.92) * 6;   /* frente = 1, fundo = 0 */
            const claro = Math.max(0.1, Math.min(1, f)) * p.brilho;

            ctx.fillStyle = `rgba(214, 96, 48, ${0.13 * claro})`;
            ctx.beginPath();
            ctx.arc(p.px, p.py, 6 * p.perto * (0.5 + claro * 0.6), 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = `rgba(255, ${Math.round(186 + 58 * claro)}, ${Math.round(140 + 78 * claro)}, ${0.42 + 0.58 * claro})`;
            ctx.beginPath();
            ctx.arc(p.px, p.py, (0.9 + 0.8 * claro) * p.perto, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalCompositeOperation = 'source-over';
        requestAnimationFrame(quadro);
    }

    /* ── 5. Cursor ── */
    palco.addEventListener('pointermove', (ev) => {
        const caixa = palco.getBoundingClientRect();
        mouse = { x: ev.clientX - caixa.left, y: ev.clientY - caixa.top };
        alvoY = (mouse.x / L - 0.5) * 1.5;
        alvoX = -(mouse.y / A - 0.5) * 0.9;
        palco.classList.add('mexeu');
    });

    palco.addEventListener('pointerleave', () => {
        mouse = null;
        alvoY = 0;
        alvoX = 0;
    });

    let esperando;
    window.addEventListener('resize', () => {
        clearTimeout(esperando);
        esperando = setTimeout(medir, 180);
    });

    medir();
    requestAnimationFrame(quadro);
})();
