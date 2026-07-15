/* ── Bolhas de sabão que sobem, flutuam saindo da tela e estouram no cursor ──
   Cada bolha é translúcida com uma borda iridescente (rosa/azul/champanhe) e
   brilhos especulares. Sobem devagar crescendo um tantinho (efeito 3D de vir
   pra frente) e, quando o cursor encosta, estouram numa chuva de gotinhas. */
(function () {
    'use strict';

    const tela = document.getElementById('cerebro');
    const palco = document.getElementById('palcoCerebro');
    if (!tela || !palco) return;

    const ctx = tela.getContext('2d');
    const paradinha = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    /* No fundo do app as bolhas são só atmosfera: não estouram no cursor. */
    const passivo = palco.hasAttribute('data-passivo');
    const temConica = typeof ctx.createConicGradient === 'function';

    let L = 0, A = 0, dpr = 1;
    let bolhas = [];
    let respingos = [];
    let mouse = null;
    let alvo = 0;   /* quantas bolhas manter na tela */

    const TAU = Math.PI * 2;
    function rnd(a, b) { return a + Math.random() * (b - a); }

    function novaBolha(inicial) {
        const r = rnd(24, 96);
        return {
            x: rnd(-0.05 * L, 1.05 * L),
            /* Novas nascem embaixo da tela e sobem; na 1ª carga já entram espalhadas. */
            y: inicial ? rnd(0, A) : A + r + rnd(0, A * 0.6),
            r,
            vsobe: rnd(0.18, 0.55) * (1.15 - (r - 24) / 72 * 0.35),
            deriva: rnd(-0.3, 0.3),
            fase: rnd(0, TAU),
            balanco: rnd(0.006, 0.014),
            matiz: rnd(0, TAU),
            giro: rnd(0.002, 0.006) * (Math.random() < 0.5 ? -1 : 1),
            cresce: rnd(1.0002, 1.001)
        };
    }

    function medir() {
        const caixa = palco.getBoundingClientRect();
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        L = caixa.width;
        A = caixa.height;
        tela.width = L * dpr;
        tela.height = A * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        alvo = Math.max(7, Math.min(22, Math.round((L * A) / 95000)));
        bolhas = [];
        for (let i = 0; i < alvo; i++) bolhas.push(novaBolha(true));
    }

    /* ── Desenha uma bolha translúcida com borda iridescente e brilhos ── */
    function desenhaBolha(b) {
        const { x, y, r } = b;

        /* Corpo: quase transparente, um pouco mais denso na borda (menisco). */
        const corpo = ctx.createRadialGradient(x - r * 0.28, y - r * 0.30, r * 0.08, x, y, r);
        corpo.addColorStop(0.00, 'rgba(255, 255, 255, 0.10)');
        corpo.addColorStop(0.62, 'rgba(255, 255, 255, 0.03)');
        corpo.addColorStop(0.90, 'rgba(255, 255, 255, 0.12)');
        corpo.addColorStop(1.00, 'rgba(214, 226, 245, 0.05)');
        ctx.fillStyle = corpo;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.fill();

        /* Borda iridescente: um anel que passeia pelo rosa, azul, menta e champanhe. */
        const lw = Math.max(1.1, r * 0.032);
        if (temConica) {
            const anel = ctx.createConicGradient(b.matiz, x, y);
            anel.addColorStop(0.00, 'rgba(255, 190, 214, 0.55)');
            anel.addColorStop(0.25, 'rgba(188, 214, 255, 0.50)');
            anel.addColorStop(0.50, 'rgba(205, 244, 226, 0.42)');
            anel.addColorStop(0.75, 'rgba(239, 220, 192, 0.52)');
            anel.addColorStop(1.00, 'rgba(255, 190, 214, 0.55)');
            ctx.strokeStyle = anel;
        } else {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        }
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.arc(x, y, r - lw, 0, TAU);
        ctx.stroke();

        /* Brilho especular principal (canto superior esquerdo). */
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(-0.6);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.beginPath();
        ctx.ellipse(-r * 0.36, -r * 0.40, r * 0.18, r * 0.10, 0, 0, TAU);
        ctx.fill();
        ctx.restore();

        /* Segundo brilho, menor e mais fraco. */
        ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
        ctx.beginPath();
        ctx.arc(x + r * 0.34, y + r * 0.40, r * 0.07, 0, TAU);
        ctx.fill();
    }

    /* ── Estouro: um anel que se abre + gotinhas voando ── */
    function estourar(b) {
        respingos.push({ anel: true, x: b.x, y: b.y, r: b.r, t: 0, vida: 20 });
        const n = 7 + Math.floor(b.r / 11);
        for (let i = 0; i < n; i++) {
            const ang = Math.random() * TAU;
            const sp = rnd(1.6, 4.2) * (b.r / 60 + 0.6);
            respingos.push({
                x: b.x, y: b.y,
                vx: Math.cos(ang) * sp,
                vy: Math.sin(ang) * sp - 0.5,
                r: rnd(1.4, 3.8),
                t: 0, vida: rnd(26, 46)
            });
        }
    }

    function desenhaRespingos() {
        for (let i = respingos.length - 1; i >= 0; i--) {
            const p = respingos[i];
            p.t++;
            if (p.anel) {
                const k = p.t / p.vida;
                if (k >= 1) { respingos.splice(i, 1); continue; }
                ctx.strokeStyle = `rgba(255, 235, 245, ${0.5 * (1 - k)})`;
                ctx.lineWidth = 2 * (1 - k);
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r * (1 + k * 0.5), 0, TAU);
                ctx.stroke();
                continue;
            }
            if (p.t >= p.vida) { respingos.splice(i, 1); continue; }
            p.vx *= 0.97;
            p.vy = p.vy * 0.97 + 0.16;   /* gravidade */
            p.x += p.vx;
            p.y += p.vy;
            const a = 0.6 * (1 - p.t / p.vida);
            ctx.fillStyle = `rgba(214, 226, 245, ${a})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, TAU);
            ctx.fill();
            ctx.fillStyle = `rgba(255, 255, 255, ${a * 0.8})`;
            ctx.beginPath();
            ctx.arc(p.x - p.r * 0.3, p.y - p.r * 0.3, p.r * 0.4, 0, TAU);
            ctx.fill();
        }
    }

    function quadro() {
        ctx.clearRect(0, 0, L, A);

        for (let i = bolhas.length - 1; i >= 0; i--) {
            const b = bolhas[i];

            if (!paradinha) {
                b.fase += b.balanco;
                b.matiz += b.giro;
                b.y -= b.vsobe;
                b.x += b.deriva + Math.sin(b.fase) * 0.4;
                b.r *= b.cresce;   /* cresce de leve: vem vindo pra frente */
            }

            /* Saiu por cima (ou cresceu demais): renasce embaixo. */
            if (b.y < -b.r * 1.6 || b.r > 130) {
                bolhas[i] = novaBolha(false);
                continue;
            }

            /* Cursor encostou? estoura e nasce outra no lugar. */
            if (mouse && !passivo) {
                const d = Math.hypot(mouse.x - b.x, mouse.y - b.y);
                if (d < b.r * 0.92) {
                    estourar(b);
                    bolhas[i] = novaBolha(false);
                    continue;
                }
            }

            desenhaBolha(b);
        }

        desenhaRespingos();
        requestAnimationFrame(quadro);
    }

    /* ── Cursor (a cena é o fundo inteiro, então escutamos a janela) ── */
    window.addEventListener('pointermove', (ev) => {
        const caixa = palco.getBoundingClientRect();
        const x = ev.clientX - caixa.left;
        const y = ev.clientY - caixa.top;
        mouse = (x < 0 || y < 0 || x > L || y > A) ? null : { x, y };
    });
    window.addEventListener('pointerleave', () => { mouse = null; });

    let esperando;
    window.addEventListener('resize', () => {
        clearTimeout(esperando);
        esperando = setTimeout(medir, 180);
    });

    medir();
    requestAnimationFrame(quadro);
})();