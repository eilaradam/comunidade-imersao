/* ── Bolhas de sabão ──
   Metaballs de verdade: um campo é somado ponto a ponto e a superfície nasce onde
   ele cruza 1. Do gradiente do campo tiramos a "normal" da casca, e com ela
   acendemos duas luzes (âmbar de cima, azul de baixo). O miolo, que fica de frente
   pra nós, quase não recebe luz, então ele é escuro e as bordas brilham.

   O cursor é uma bolha como as outras: ele funde de verdade com as que estão perto. */
(function () {
    'use strict';

    const tela = document.getElementById('bolhas');
    const palco = document.getElementById('palcoBolhas');
    if (!tela || !palco) return;

    const ctx = tela.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    const paradinha = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* O campo é caro: calculamos pequeno e esticamos. Fica suave, como um render. */
    const molde = document.createElement('canvas');
    const mctx = molde.getContext('2d', { willReadFrequently: true });
    let imagem = null;

    let L = 0, A = 0, l = 0, a = 0, escala = 0.3;
    let bolhas = [];
    let tempo = 0;

    let cursor = null;
    const gota = { x: 0, y: 0, r: 0, forca: 0 };

    /* Duas luzes rasantes: elas pegam a casca de raspão, então o miolo fica escuro. */
    const LUZ_AMBAR = normalizar(-0.58, -0.78, 0.16);
    const LUZ_AZUL  = normalizar(0.66, 0.62, 0.20);

    function normalizar(x, y, z) {
        const n = Math.hypot(x, y, z);
        return { x: x / n, y: y / n, z: z / n };
    }

    function nova() {
        const menor = Math.min(L, A);
        const estreito = L < 700;
        return {
            /* No desktop elas moram do meio pra direita, longe do texto.
               No celular o texto fica embaixo, então elas ocupam a parte de cima. */
            baseX: estreito ? L * (0.12 + Math.random() * 0.80) : L * (0.36 + Math.random() * 0.56),
            baseY: estreito ? A * (0.06 + Math.random() * 0.36) : A * (0.16 + Math.random() * 0.66),
            /* r = raio de influência. O corpo visível dela fica com uns 45% disso. */
            r: menor * (estreito ? 0.30 + Math.random() * 0.20 : 0.22 + Math.random() * 0.16),
            fase: Math.random() * Math.PI * 2,
            passoX: 0.00012 + Math.random() * 0.00016,
            passoY: 0.00010 + Math.random() * 0.00014,
            amplitudeX: L * (0.04 + Math.random() * 0.08),
            amplitudeY: A * (0.05 + Math.random() * 0.09),
            x: 0, y: 0, desviaX: 0, desviaY: 0
        };
    }

    function medir() {
        const caixa = palco.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        L = caixa.width;
        A = caixa.height;

        tela.width = L * dpr;
        tela.height = A * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.imageSmoothingEnabled = true;

        /* Telas maiores calculam numa fração menor: o custo fica parecido em qualquer uma. */
        escala = L > 1200 ? 0.26 : (L > 700 ? 0.30 : 0.34);
        l = Math.max(1, Math.round(L * escala));
        a = Math.max(1, Math.round(A * escala));
        molde.width = l;
        molde.height = a;
        imagem = mctx.createImageData(l, a);

        bolhas = Array.from({ length: L < 700 ? 3 : 5 }, nova);
        bolhas.forEach(b => { b.x = b.baseX; b.y = b.baseY; });
        gota.r = Math.min(L, A) * 0.17;
    }

    /* ── Movimento ── */
    function mover() {
        tempo += 16;

        if (cursor) {
            if (gota.forca === 0) { gota.x = cursor.x; gota.y = cursor.y; }
            gota.x += (cursor.x - gota.x) * 0.14;   /* atraso: dá peso de líquido */
            gota.y += (cursor.y - gota.y) * 0.14;
            gota.forca = Math.min(1, gota.forca + 0.06);
        } else {
            gota.forca = Math.max(0, gota.forca - 0.05);
        }

        for (const b of bolhas) {
            if (!paradinha) {
                b.x = b.baseX + Math.sin(tempo * b.passoX + b.fase) * b.amplitudeX;
                b.y = b.baseY + Math.cos(tempo * b.passoY + b.fase * 1.3) * b.amplitudeY;
            }

            if (cursor) {
                const dx = b.x + b.desviaX - gota.x;
                const dy = b.y + b.desviaY - gota.y;
                const d = Math.hypot(dx, dy) || 0.001;
                const alcance = b.r * 1.5;

                if (d < alcance) {
                    const perto = 1 - d / alcance;
                    /* Longe ela é atraída (vai grudar). Muito perto, abre caminho. */
                    const puxa = d > b.r * 0.42 ? -0.7 : 1.6;
                    b.desviaX += (dx / d) * perto * puxa * 1.5;
                    b.desviaY += (dy / d) * perto * puxa * 1.5;
                }
            }

            b.desviaX *= 0.92;
            b.desviaY *= 0.92;
        }
    }

    /* ── O campo e a luz ── */
    const LIMIAR = 0.5;   /* a casca nasce onde o campo cruza isto */

    function pintar() {
        const dados = imagem.data;
        const ativas = [];
        let somaR = 0;

        for (const b of bolhas) {
            const r = b.r * escala;
            ativas.push({ x: (b.x + b.desviaX) * escala, y: (b.y + b.desviaY) * escala, r2: r * r, peso: 1 });
            somaR += r;
        }
        if (gota.forca > 0.01) {
            const r = gota.r * escala;
            ativas.push({ x: gota.x * escala, y: gota.y * escala, r2: r * r, peso: gota.forca });
            somaR += r;
        }

        const n = ativas.length;
        const RELEVO = (somaR / n) * 0.85;   /* deixa a inclinação da casca adimensional */
        const DUREZA = 0.9;

        for (let y = 0; y < a; y++) {
            for (let x = 0; x < l; x++) {
                let campo = 0, gx = 0, gy = 0;

                for (let i = 0; i < n; i++) {
                    const b = ativas[i];
                    const dx = x - b.x;
                    const dy = y - b.y;
                    const q = (dx * dx + dy * dy) / b.r2;
                    if (q >= 1) continue;

                    /* Queda macia: vale 1 no centro e morre na borda, sem estourar em lugar nenhum.
                       No centro a inclinação é zero (miolo escuro), e é máxima na casca. */
                    const um = 1 - q;
                    campo += um * um * um * b.peso;

                    const k = -6 * um * um * b.peso / b.r2;
                    gx += k * dx;
                    gy += k * dy;
                }

                const p = (y * l + x) * 4;

                const alfa = (campo - LIMIAR) / 0.045;
                if (alfa <= 0) { dados[p + 3] = 0; continue; }

                const a255 = alfa >= 1 ? 255 : (alfa * 255) | 0;

                /* Normal da casca: contra o gradiente, virada pra fora da tela. */
                const nx = -gx * RELEVO, ny = -gy * RELEVO;
                const inv = 1 / Math.hypot(nx, ny, DUREZA);
                const Nx = nx * inv, Ny = ny * inv, Nz = DUREZA * inv;

                let i1 = Nx * LUZ_AMBAR.x + Ny * LUZ_AMBAR.y + Nz * LUZ_AMBAR.z;
                let i2 = Nx * LUZ_AZUL.x + Ny * LUZ_AZUL.y + Nz * LUZ_AZUL.z;
                /* Ao cubo: a luz cai rápido e só a casca virada pra ela acende. */
                i1 = i1 > 0 ? i1 * i1 * i1 : 0;
                i2 = i2 > 0 ? i2 * i2 * i2 : 0;

                /* Fio de luz na quina, onde a casca vira de lado. */
                const quina1 = i1 * i1;
                const quina2 = i2 * i2;

                const r = 7 + 255 * i1 + 34 * i2 + 130 * quina1;
                const v = 8 + 126 * i1 + 112 * i2 + 95 * (quina1 + quina2) * 0.5;
                const az = 14 + 38 * i1 + 252 * i2 + 130 * quina2;

                dados[p]     = r > 255 ? 255 : r;
                dados[p + 1] = v > 255 ? 255 : v;
                dados[p + 2] = az > 255 ? 255 : az;
                dados[p + 3] = a255;
            }
        }

        mctx.putImageData(imagem, 0, 0);
    }

    function quadro() {
        mover();
        pintar();

        ctx.clearRect(0, 0, L, A);
        ctx.drawImage(molde, 0, 0, L, A);

        requestAnimationFrame(quadro);
    }

    /* ── Cursor ── */
    window.addEventListener('pointermove', (ev) => {
        const caixa = palco.getBoundingClientRect();
        const x = ev.clientX - caixa.left;
        const y = ev.clientY - caixa.top;
        cursor = (x < 0 || y < 0 || x > L || y > A) ? null : { x, y };
    });

    window.addEventListener('pointerleave', () => { cursor = null; });

    let esperando;
    window.addEventListener('resize', () => {
        clearTimeout(esperando);
        esperando = setTimeout(medir, 180);
    });

    medir();
    requestAnimationFrame(quadro);
})();
