/* ── Vidro líquido: uma forma orgânica que ondula como água e reage ao cursor ──
   Um blob translúcido azul com reflexos iridescentes (rosa/cobre) que passeiam
   pela superfície. A silhueta ondula sozinha, somando harmônicos senoidais.
   Quando o cursor chega perto, a "energia" sobe: a ondulação cresce e a forma
   incha na direção do cursor, como água reagindo ao toque. */
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
    let energia = 0;   /* 0..1 — sobe quando o cursor está perto */

    /* Harmônicos que deformam a silhueta. Cada um gira numa velocidade própria. */
    const ondas = [
        { k: 2, a: 0.11, v: 0.00042 },
        { k: 3, a: 0.075, v: -0.00058 },
        { k: 5, a: 0.05, v: 0.00074 },
        { k: 7, a: 0.032, v: -0.00048 },
    ];
    ondas.forEach(o => (o.f = Math.random() * TAU));

    function medir() {
        const c = palco.getBoundingClientRect();
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        L = c.width; A = c.height;
        tela.width = L * dpr; tela.height = A * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const estreito = L < 900;
        cx = estreito ? L * 0.5 : L * 0.62;
        cy = estreito ? A * 0.34 : A * 0.5;
        R = Math.min(L, A) * 0.3;
    }

    function difAng(a, b) {
        let d = a - b;
        while (d > Math.PI) d -= TAU;
        while (d < -Math.PI) d += TAU;
        return d;
    }

    /* Raio da silhueta num ângulo, no instante t. */
    function raio(ang, t, bump) {
        let rr = 1;
        for (const o of ondas) {
            rr += o.a * (1 + energia * 0.9) * Math.sin(o.k * ang + t * o.v + o.f);
        }
        if (bump) {
            const dd = difAng(ang, bump.ang) / 0.85;
            rr += bump.amp * Math.exp(-dd * dd);
        }
        return R * rr;
    }

    function caminho(t, bump) {
        const N = 140;
        ctx.beginPath();
        for (let i = 0; i <= N; i++) {
            const ang = (i / N) * TAU;
            const r = raio(ang, t, bump);
            const x = cx + Math.cos(ang) * r;
            const y = cy + Math.sin(ang) * r;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
    }

    /* Faixas de luz que atravessam o vidro — o reflexo iridescente. */
    function faixa(t, off, cor, amp, esp) {
        ctx.beginPath();
        const base = cy - R * 0.9 + off;
        const x0 = cx - R * 1.3, x1 = cx + R * 1.3;
        for (let x = x0; x <= x1; x += 5) {
            const onda = Math.sin(x * 0.019 + t * 0.0016 + off) * amp
                       + Math.sin(x * 0.052 - t * 0.0023) * amp * 0.4;
            const y = base + onda + (t * 0.02 % (R * 2));
            if (x === x0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = cor;
        ctx.lineWidth = esp;
        ctx.shadowColor = cor;
        ctx.shadowBlur = 18;
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    function quadro(t) {
        if (paradinha) t = 6000;   /* pose estática, sem animar */

        /* Energia persegue o alvo (perto do cursor = 1). */
        let alvo = 0;
        let bump = null;
        if (mouse && !passivo) {
            const d = Math.hypot(mouse.x - cx, mouse.y - cy);
            alvo = Math.max(0, Math.min(1, 1 - (d - R) / (R * 1.4)));
            if (alvo > 0.02) {
                bump = { ang: Math.atan2(mouse.y - cy, mouse.x - cx), amp: 0.16 * alvo };
            }
        }
        energia += (alvo - energia) * 0.06;

        ctx.clearRect(0, 0, L, A);

        /* Halo suave por trás, pra forma "respirar" sobre o fundo. */
        const halo = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.7);
        halo.addColorStop(0, 'rgba(190, 214, 245, 0.28)');
        halo.addColorStop(1, 'rgba(190, 214, 245, 0)');
        ctx.fillStyle = halo;
        ctx.fillRect(0, 0, L, A);

        caminho(t, bump);

        /* ── Dentro do vidro ── */
        ctx.save();
        ctx.clip();

        /* Corpo: azul de vidro, claro em cima à esquerda, fundo mais profundo. */
        const corpo = ctx.createRadialGradient(
            cx - R * 0.4, cy - R * 0.55, R * 0.1,
            cx, cy, R * 1.25
        );
        corpo.addColorStop(0.00, 'rgba(228, 240, 253, 0.94)');
        corpo.addColorStop(0.45, 'rgba(158, 192, 230, 0.86)');
        corpo.addColorStop(0.80, 'rgba(96, 136, 190, 0.90)');
        corpo.addColorStop(1.00, 'rgba(58, 96, 152, 0.94)');
        ctx.fillStyle = corpo;
        ctx.fillRect(cx - R * 1.6, cy - R * 1.6, R * 3.2, R * 3.2);

        /* Reflexos iridescentes (aditivos, brilham). */
        ctx.globalCompositeOperation = 'lighter';
        const g = 1 + energia * 0.6;   /* cursor perto: reflexos mais vivos */
        faixa(t, -R * 0.35, 'rgba(255, 176, 198, 0.55)', R * 0.10 * g, 2.4);
        faixa(t, R * 0.05, 'rgba(255, 206, 168, 0.50)', R * 0.13 * g, 2.0);
        faixa(t, R * 0.5, 'rgba(200, 224, 255, 0.45)', R * 0.11 * g, 1.8);
        faixa(t, R * 0.95, 'rgba(255, 190, 210, 0.42)', R * 0.09 * g, 1.6);
        ctx.globalCompositeOperation = 'source-over';

        /* Brilho especular no topo. */
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-0.5);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.beginPath();
        ctx.ellipse(-R * 0.34, -R * 0.5, R * 0.26, R * 0.1, 0, 0, TAU);
        ctx.fill();
        ctx.restore();

        ctx.restore();

        /* Borda de vidro: um fio de luz claro no contorno. */
        caminho(t, bump);
        const rim = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
        rim.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
        rim.addColorStop(0.5, 'rgba(210, 228, 250, 0.25)');
        rim.addColorStop(1, 'rgba(150, 185, 225, 0.55)');
        ctx.strokeStyle = rim;
        ctx.lineWidth = 1.6;
        ctx.stroke();

        requestAnimationFrame(quadro);
    }

    window.addEventListener('pointermove', (ev) => {
        const c = palco.getBoundingClientRect();
        const x = ev.clientX - c.left;
        const y = ev.clientY - c.top;
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