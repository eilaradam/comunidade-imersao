/* ── Bola de gel azul com ondas rolando pela superfície (tipo geleia) ──
   Uma esfera azul com relevos horizontais que viajam de baixo pra cima, como
   ondas dando a volta num globo. A silhueta morpha de leve (jelly). Sombreado
   radial dá o 3D; um brilho especular e um véu magenta nas depressões completam.
   O cursor engrossa as ondas e empurra a forma de leve. */
(function () {
    'use strict';

    const tela = document.getElementById('cerebro');
    const palco = document.getElementById('palcoCerebro');
    if (!tela || !palco) return;

    const ctx = tela.getContext('2d');
    const paradinha = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const passivo = palco.hasAttribute('data-passivo');

    const TAU = Math.PI * 2;
    let L = 0, A = 0, dpr = 1;
    let cx = 0, cy = 0, R = 0;
    let mouse = null;
    let energia = 0;
    let ox = 0, oy = 0;

    /* Harmônicos que deformam a silhueta (jelly bem sutil). */
    const ondas = [
        { k: 2, a: 0.05, v: 0.00040 },
        { k: 3, a: 0.035, v: -0.00052 },
        { k: 5, a: 0.022, v: 0.00068 },
    ];
    ondas.forEach(o => (o.f = Math.random() * TAU));

    function medir() {
        const c = palco.getBoundingClientRect();
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        L = c.width; A = c.height;
        tela.width = L * dpr; tela.height = A * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const retrato = L / A < 0.95;
        cx = retrato ? L * 0.5 : L * 0.62;
        cy = retrato ? A * 0.34 : A * 0.5;
        R = Math.min(L, A) * (retrato ? 0.32 : 0.3);
    }

    function raio(ang, t, bump) {
        let rr = 1;
        for (const o of ondas) rr += o.a * (1 + energia * 0.8) * Math.sin(o.k * ang + t * o.v + o.f);
        if (bump) {
            let d = ang - bump.ang;
            while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU;
            rr += bump.amp * Math.exp(-(d / 0.9) * (d / 0.9));
        }
        return R * rr;
    }

    function caminho(x, y, t, bump) {
        const N = 120;
        ctx.beginPath();
        for (let i = 0; i <= N; i++) {
            const ang = (i / N) * TAU;
            const r = raio(ang, t, bump);
            const px = x + Math.cos(ang) * r;
            const py = y + Math.sin(ang) * r;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
    }

    function mix(a, b, k) { return a + (b - a) * k; }
    function cor(l) {
        /* l: 0 (vale) .. 1 (crista). Azul profundo -> azul claro, com toque magenta nos vales. */
        let r = mix(52, 170, l), g = mix(68, 194, l), b = mix(206, 252, l);
        const roxo = (1 - l) * 0.28;
        r = mix(r, 150, roxo); g = mix(g, 96, roxo); b = mix(b, 224, roxo);
        return `rgb(${r | 0}, ${g | 0}, ${b | 0})`;
    }

    function quadro(ms) {
        if (paradinha) ms = 4000;
        const t = ms;

        let alvo = 0, bump = null;
        if (mouse && !passivo) {
            const d = Math.hypot(mouse.x - cx, mouse.y - cy);
            alvo = Math.max(0, Math.min(1, 1 - (d - R) / (R * 1.4)));
            if (alvo > 0.02) bump = { ang: Math.atan2(mouse.y - cy, mouse.x - cx), amp: 0.1 * alvo };
        }
        energia += (alvo - energia) * 0.05;
        const mx = mouse ? mouse.x : cx, my = mouse ? mouse.y : cy;
        ox += ((mx - cx) * 0.04 * energia - ox) * 0.06;
        oy += ((my - cy) * 0.04 * energia - oy) * 0.06;

        const x = cx + ox, y = cy + oy;
        const r = R * (1 + Math.sin(t * 0.0006) * 0.012);

        ctx.clearRect(0, 0, L, A);

        /* Halo suave. */
        const halo = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 1.7);
        halo.addColorStop(0, 'rgba(120, 150, 240, 0.20)');
        halo.addColorStop(1, 'rgba(120, 150, 240, 0)');
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(x, y, r * 1.7, 0, TAU); ctx.fill();

        ctx.save();
        caminho(x, y, t, bump);
        ctx.clip();

        /* 1. Ondas rolando: gradiente vertical cujas bandas se apertam nos polos
              (mapeamento por latitude) e viajam de baixo pra cima com o tempo. */
        const banda = ctx.createLinearGradient(0, y - r, 0, y + r);
        const STOPS = 46;
        const fase = t * 0.0013;
        const K = 5.2;
        const amp = 1 + energia * 0.5;
        for (let i = 0; i <= STOPS; i++) {
            const f = i / STOPS;
            const lat = Math.asin(Math.max(-1, Math.min(1, f * 2 - 1)));   /* -PI/2..PI/2 */
            const wv = Math.sin(lat * K - fase) * amp;
            const l = Math.max(0, Math.min(1, 0.5 + 0.5 * wv));
            banda.addColorStop(f, cor(l));
        }
        ctx.fillStyle = banda;
        ctx.fillRect(x - r * 1.2, y - r * 1.2, r * 2.4, r * 2.4);

        /* 2. Sombreado esférico (multiply): claro no topo-esquerda, escuro na borda. */
        ctx.globalCompositeOperation = 'multiply';
        const esf = ctx.createRadialGradient(x - r * 0.32, y - r * 0.36, r * 0.1, x, y, r * 1.12);
        esf.addColorStop(0, 'rgba(255, 255, 255, 1)');
        esf.addColorStop(0.55, 'rgba(224, 230, 255, 1)');
        esf.addColorStop(0.85, 'rgba(150, 165, 235, 1)');
        esf.addColorStop(1, 'rgba(64, 74, 150, 1)');
        ctx.fillStyle = esf;
        ctx.fillRect(x - r * 1.2, y - r * 1.2, r * 2.4, r * 2.4);

        /* 3. Brilho especular (screen) no topo-esquerda. */
        ctx.globalCompositeOperation = 'screen';
        const bri = ctx.createRadialGradient(x - r * 0.34, y - r * 0.42, 0, x - r * 0.34, y - r * 0.42, r * 0.6);
        bri.addColorStop(0, 'rgba(255, 255, 255, 0.75)');
        bri.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = bri;
        ctx.fillRect(x - r * 1.2, y - r * 1.2, r * 2.4, r * 2.4);

        /* 4. Rim de luz fria embaixo (subsurface), como nos prints. */
        const rim = ctx.createRadialGradient(x + r * 0.15, y + r * 0.7, 0, x + r * 0.15, y + r * 0.7, r * 0.8);
        rim.addColorStop(0, 'rgba(150, 190, 255, 0.5)');
        rim.addColorStop(1, 'rgba(150, 190, 255, 0)');
        ctx.fillStyle = rim;
        ctx.fillRect(x - r * 1.2, y - r * 1.2, r * 2.4, r * 2.4);

        ctx.restore();

        requestAnimationFrame(quadro);
    }

    window.addEventListener('pointermove', (ev) => {
        const c = palco.getBoundingClientRect();
        const px = ev.clientX - c.left;
        const py = ev.clientY - c.top;
        mouse = (px < 0 || py < 0 || px > L || py > A) ? null : { x: px, y: py };
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