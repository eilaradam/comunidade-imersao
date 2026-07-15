/* ── Esfera de sonho: um orbe pastel suave, iridescente, com um redemoinho macio ──
   Tudo feito com gradientes radiais bem suaves (sem bordas duras), cores leves
   de rosa/azul/lavanda, um anel/redemoinho girando devagar por dentro e um
   respiro lento. O cursor dá um leve empurrãozinho e acende um pouco mais. */
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
    let ox = 0, oy = 0;   /* deslocamento suave em direção ao cursor */

    function medir() {
        const c = palco.getBoundingClientRect();
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        L = c.width; A = c.height;
        tela.width = L * dpr; tela.height = A * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const retrato = L / A < 0.95;
        cx = retrato ? L * 0.5 : L * 0.62;
        cy = retrato ? A * 0.34 : A * 0.5;
        R = Math.min(L, A) * (retrato ? 0.3 : 0.28);
    }

    function radial(x, y, r0, r1, paradas) {
        const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
        for (const [p, cor] of paradas) g.addColorStop(p, cor);
        return g;
    }

    function quadro(ms) {
        if (paradinha) ms = 4000;
        const t = ms * 0.001;

        /* Energia + parallax suave em direção ao cursor. */
        let alvo = 0;
        if (mouse && !passivo) {
            const d = Math.hypot(mouse.x - cx, mouse.y - cy);
            alvo = Math.max(0, Math.min(1, 1 - (d - R) / (R * 1.6)));
        }
        energia += (alvo - energia) * 0.05;
        const mx = mouse ? mouse.x : cx;
        const my = mouse ? mouse.y : cy;
        ox += ((mx - cx) * 0.05 * energia - ox) * 0.06;
        oy += ((my - cy) * 0.05 * energia - oy) * 0.06;

        const x = cx + ox, y = cy + oy;
        const respiro = 1 + Math.sin(t * 0.6) * 0.015;   /* respiração lenta */
        const r = R * respiro;

        ctx.clearRect(0, 0, L, A);

        /* 1. Halo externo bem suave. */
        ctx.fillStyle = radial(x, y, r * 0.4, r * 1.9, [
            [0, 'rgba(238, 232, 249, 0.55)'],
            [0.55, 'rgba(228, 224, 245, 0.22)'],
            [1, 'rgba(228, 224, 245, 0)']
        ]);
        ctx.beginPath(); ctx.arc(x, y, r * 1.9, 0, TAU); ctx.fill();

        /* 2. Corpo da esfera: branco no miolo, derretendo pra lavanda e some na borda. */
        ctx.fillStyle = radial(x - r * 0.2, y - r * 0.24, r * 0.05, r * 1.04, [
            [0, 'rgba(255, 255, 255, 0.96)'],
            [0.34, 'rgba(236, 227, 247, 0.86)'],
            [0.72, 'rgba(214, 210, 238, 0.6)'],
            [1, 'rgba(214, 210, 238, 0)']
        ]);
        ctx.beginPath(); ctx.arc(x, y, r * 1.06, 0, TAU); ctx.fill();

        /* 3. Brilhos iridescentes (screen = luz somando, sempre suave). */
        ctx.save();
        ctx.beginPath(); ctx.arc(x, y, r * 1.12, 0, TAU); ctx.clip();
        ctx.globalCompositeOperation = 'screen';

        const giroP = t * 0.25;
        ctx.fillStyle = radial(x + Math.cos(giroP) * r * 0.4, y + r * 0.45, 0, r * 1.15, [
            [0, 'rgba(246, 182, 214, 0.6)'],
            [1, 'rgba(246, 182, 214, 0)']
        ]);
        ctx.fillRect(x - r * 1.2, y - r * 1.2, r * 2.4, r * 2.4);

        ctx.fillStyle = radial(x + Math.cos(giroP + 2.2) * r * 0.5, y + r * 0.5, 0, r * 1.15, [
            [0, 'rgba(168, 200, 246, 0.62)'],
            [1, 'rgba(168, 200, 246, 0)']
        ]);
        ctx.fillRect(x - r * 1.2, y - r * 1.2, r * 2.4, r * 2.4);

        ctx.fillStyle = radial(x - r * 0.35, y - r * 0.1, 0, r * 0.9, [
            [0, 'rgba(198, 224, 214, 0.32)'],
            [1, 'rgba(198, 224, 214, 0)']
        ]);
        ctx.fillRect(x - r * 1.2, y - r * 1.2, r * 2.4, r * 2.4);

        /* 4. Redemoinho/anel macio, inclinado, girando devagar. */
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(t * 0.12 + 0.3);
        ctx.scale(1, 0.6);
        const anel = radial(0, 0, r * 0.16, r * 0.72, [
            [0, 'rgba(255, 255, 255, 0)'],
            [0.42, 'rgba(255, 255, 255, 0)'],
            [0.56, 'rgba(232, 214, 250, 0.5)'],
            [0.72, 'rgba(250, 196, 222, 0.45)'],
            [0.9, 'rgba(186, 210, 248, 0.34)'],
            [1, 'rgba(186, 210, 248, 0)']
        ]);
        ctx.fillStyle = anel;
        ctx.beginPath(); ctx.arc(0, 0, r * 0.76, 0, TAU); ctx.fill();
        ctx.restore();

        ctx.restore();  /* fim do clip/screen */

        /* 5. Brilho especular suave no alto. */
        ctx.fillStyle = radial(x - r * 0.28, y - r * 0.36, 0, r * 0.5, [
            [0, 'rgba(255, 255, 255, 0.7)'],
            [1, 'rgba(255, 255, 255, 0)']
        ]);
        ctx.beginPath(); ctx.arc(x - r * 0.28, y - r * 0.36, r * 0.5, 0, TAU); ctx.fill();

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