/* ── Esfera de gel 3D em WebGL: relevos rolando com luz e volume de verdade ──
   Cada pixel resolve a superfície de uma esfera 3D. Ondas de latitude viajam
   pela superfície e inclinam a normal, então a luz cria relevos reais (não
   bandas chapadas). Iluminação difusa + especular + fresnel + subsurface no
   fundo. Geometria analítica (sem ruído), pra ficar liso e nunca "quadricular".
   O cursor engrossa as ondas e faz a forma inchar de leve na direção dele. */
(function () {
    'use strict';

    const tela = document.getElementById('cerebro');
    const palco = document.getElementById('palcoCerebro');
    if (!tela || !palco) return;

    const gl = tela.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: true })
            || tela.getContext('experimental-webgl', { alpha: true, premultipliedAlpha: false });
    if (!gl) return;

    const paradinha = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const passivo = palco.hasAttribute('data-passivo');

    const vsrc = `
        attribute vec2 aPos;
        void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
    `;

    const fsrc = `
        #ifdef GL_FRAGMENT_PRECISION_HIGH
        precision highp float;
        #else
        precision mediump float;
        #endif
        uniform vec2 uRes;
        uniform float uTime;
        uniform vec2 uCenter;   /* centro da esfera (px, y pra cima) */
        uniform float uR;       /* raio em px */
        uniform vec2 uMouse;    /* posição do cursor em espaço-d (-1..1), fora = (-9,-9) */
        uniform float uEnergy;

        void main() {
            vec2 d = (gl_FragCoord.xy - uCenter) / uR;

            /* Empurrão suave inchando a esfera perto do cursor. */
            float mb = 0.0;
            if (uMouse.x > -5.0) {
                vec2 dd = d - uMouse;
                mb = exp(-dot(dd, dd) * 5.0) * uEnergy;
            }
            float rBump = 1.0 + mb * 0.12;

            float r2 = dot(d, d) / (rBump * rBump);
            if (r2 > 1.7) discard;

            float z = sqrt(max(0.0, 1.0 - r2));
            vec3 N = normalize(vec3(d, z));

            float lat = asin(clamp(N.y, -1.0, 1.0));

            /* Ondas de latitude viajando + a onda do cursor. */
            float K = 5.0;
            float fase = uTime * 0.0013;
            float amp = 0.14 + uEnergy * 0.10 + mb * 0.25;
            float onda = sin(lat * K - fase);
            float donda = cos(lat * K - fase) * K;

            /* Inclina a normal na latitude -> relevo 3D que pega luz. */
            vec3 Np = normalize(vec3(N.x, N.y + donda * amp * 0.13, N.z));

            vec3 V = vec3(0.0, 0.0, 1.0);
            vec3 Ld = normalize(vec3(-0.42, 0.55, 0.80));

            float diff = max(dot(Np, Ld), 0.0);
            float spec = pow(max(dot(reflect(-Ld, Np), V), 0.0), 34.0);
            float fres = pow(1.0 - max(dot(Np, V), 0.0), 2.6);

            /* Albedo: azul profundo -> claro pela onda, magenta nos vales. */
            float wl = 0.5 + 0.5 * onda;
            vec3 deep = vec3(0.15, 0.21, 0.80);
            vec3 lite = vec3(0.64, 0.74, 0.99);
            vec3 mag  = vec3(0.55, 0.40, 0.88);
            vec3 alb = mix(deep, lite, wl);
            alb = mix(alb, mag, (1.0 - wl) * 0.24);

            vec3 col = alb * (0.34 + 0.78 * diff);
            col += spec * vec3(1.0) * 0.95;
            col += fres * vec3(0.6, 0.75, 1.0) * 0.55;

            /* Subsurface: um glow frio na base, como nos prints. */
            float base = smoothstep(0.15, -0.95, N.y);
            col += base * vec3(0.28, 0.48, 0.9) * 0.35;

            /* Borda anti-serrilhada + halo suave por fora. */
            float dentro = step(r2, 1.0);
            float aa = fwidth(r2) + 0.004;
            float edge = 1.0 - smoothstep(1.0 - aa, 1.0 + aa, r2);
            float halo = (1.0 - dentro) * smoothstep(1.6, 1.0, r2) * 0.14;

            col = mix(vec3(0.55, 0.64, 0.96), col, dentro);
            float alpha = max(edge, halo);

            gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
        }
    `;

    function compilar(tipo, src) {
        const s = gl.createShader(tipo);
        gl.shaderSource(s, src); gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
        return s;
    }

    /* fwidth precisa da extensão de derivadas no WebGL1. */
    gl.getExtension('OES_standard_derivatives');

    const vs = compilar(gl.VERTEX_SHADER, vsrc);
    let fs = compilar(gl.FRAGMENT_SHADER, '#extension GL_OES_standard_derivatives : enable\n' + fsrc);
    if (!fs) fs = compilar(gl.FRAGMENT_SHADER, fsrc.replace('fwidth(r2)', '0.006'));   /* fallback sem derivadas */
    if (!vs || !fs) return;

    const prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.warn(gl.getProgramInfoLog(prog)); return; }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const U = n => gl.getUniformLocation(prog, n);
    const uRes = U('uRes'), uTime = U('uTime'), uCenter = U('uCenter'),
          uR = U('uR'), uMouse = U('uMouse'), uEnergy = U('uEnergy');

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    let L = 0, A = 0, dpr = 1, cx = 0, cy = 0, R = 0;
    let mouse = null, energia = 0;

    function medir() {
        const c = palco.getBoundingClientRect();
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        L = c.width; A = c.height;
        tela.width = L * dpr; tela.height = A * dpr;
        gl.viewport(0, 0, tela.width, tela.height);
        const retrato = L / A < 0.95;
        cx = retrato ? L * 0.5 : L * 0.62;
        cy = retrato ? A * 0.34 : A * 0.5;
        R = Math.min(L, A) * (retrato ? 0.32 : 0.3);
    }

    function quadro(ms) {
        if (paradinha) ms = 4000;

        let alvo = 0;
        if (mouse && !passivo) {
            const d = Math.hypot(mouse.x - cx, mouse.y - cy);
            alvo = Math.max(0, Math.min(1, 1 - (d - R) / (R * 1.4)));
        }
        energia += (alvo - energia) * 0.06;

        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform2f(uRes, tela.width, tela.height);
        gl.uniform1f(uTime, ms);
        gl.uniform2f(uCenter, cx * dpr, (A - cy) * dpr);
        gl.uniform1f(uR, R * dpr);
        gl.uniform1f(uEnergy, energia);
        if (mouse) gl.uniform2f(uMouse, (mouse.x - cx) / R, (cy - mouse.y) / R);
        else gl.uniform2f(uMouse, -9, -9);

        gl.drawArrays(gl.TRIANGLES, 0, 3);
        requestAnimationFrame(quadro);
    }

    window.addEventListener('pointermove', (ev) => {
        const c = palco.getBoundingClientRect();
        const x = ev.clientX - c.left, y = ev.clientY - c.top;
        mouse = (x < 0 || y < 0 || x > L || y > A) ? null : { x, y };
    });
    window.addEventListener('pointerleave', () => { mouse = null; });

    let esperando;
    window.addEventListener('resize', () => { clearTimeout(esperando); esperando = setTimeout(medir, 180); });

    medir();
    requestAnimationFrame(quadro);
})();