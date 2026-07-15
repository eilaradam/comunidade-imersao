/* ── Vidro líquido em WebGL: uma forma de vidro que ondula e refrata como água ──
   Um shader desenha um blob de vidro com superfície ondulante (ruído fbm),
   refração falsa, brilho fresnel na borda, reflexos iridescentes (rosa/cobre)
   e faíscas de cáustica. O cursor injeta "energia": a superfície agita mais e
   a forma faz uma ondulação extra em volta do ponteiro. */
(function () {
    'use strict';

    const tela = document.getElementById('cerebro');
    const palco = document.getElementById('palcoCerebro');
    if (!tela || !palco) return;

    const gl = tela.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: true })
            || tela.getContext('experimental-webgl', { alpha: true, premultipliedAlpha: false });
    if (!gl) return;   /* sem WebGL: fundo fica só o creme, sem quebrar nada */

    const paradinha = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const passivo = palco.hasAttribute('data-passivo');

    const vsrc = `
        attribute vec2 aPos;
        void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
    `;

    const fsrc = `
        precision mediump float;
        uniform vec2 uRes;
        uniform float uTime;
        uniform vec2 uMouse;
        uniform float uEnergy;
        uniform vec2 uCenter;

        float hash(vec2 p){
            p = fract(p * vec2(123.34, 456.21));
            p += dot(p, p + 45.32);
            return fract(p.x * p.y);
        }
        float noise(vec2 p){
            vec2 i = floor(p), f = fract(p);
            float a = hash(i), b = hash(i+vec2(1.0,0.0));
            float c = hash(i+vec2(0.0,1.0)), d = hash(i+vec2(1.0,1.0));
            vec2 u = f*f*(3.0-2.0*f);
            return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
        }
        float fbm(vec2 p){
            float v = 0.0, a = 0.5;
            for(int i=0;i<5;i++){ v += a*noise(p); p = p*2.03 + 1.7; a *= 0.5; }
            return v;
        }

        void main(){
            vec2 uv  = (gl_FragCoord.xy - 0.5*uRes) / uRes.y;
            vec2 muv = (uMouse        - 0.5*uRes) / uRes.y;
            vec2 p  = uv  - uCenter;
            vec2 pm = muv - uCenter;

            float t = uTime * 0.0001;
            float radius = 0.34;

            /* Ondulação orgânica da silhueta (domain warp). */
            vec2 w = vec2(fbm(p*2.0 + t), fbm(p*2.0 + vec2(5.2,1.3) - t));
            float warpAmt = 0.22 + uEnergy*0.12;

            /* Onda extra em volta do cursor. */
            float dm = length(p - pm);
            float ripple = exp(-dm*dm*7.0) * uEnergy;

            float shape = length(p + (w-0.5)*warpAmt) - radius - ripple*0.05;
            float aa = 1.6 / uRes.y;
            float mask = smoothstep(aa, -aa, shape);

            /* Espessura (domo) e normal da superfície com micro-ondas. */
            float rr = length(p);
            float h  = sqrt(max(0.0, radius*radius - rr*rr));
            float freq = 6.0 + uEnergy*3.5;
            float e = 0.0035;
            float n0 = fbm(p*freq + t*9.0 + ripple*3.0);
            float nx = fbm((p+vec2(e,0.0))*freq + t*9.0 + ripple*3.0) - n0;
            float ny = fbm((p+vec2(0.0,e))*freq + t*9.0 + ripple*3.0) - n0;
            vec3 N = normalize(vec3(-(p.x*1.4) - nx*5.0, -(p.y*1.4) - ny*5.0, h*3.2 + 0.35));

            vec3 V = vec3(0.0, 0.0, 1.0);
            float fres = pow(1.0 - max(dot(N,V), 0.0), 3.0);

            /* Refração falsa: um fundo procedural deslocado pela normal. */
            vec2 refr = uv + N.xy*0.28;
            vec3 bgIn  = mix(vec3(0.82,0.88,0.97), vec3(0.96,0.90,0.93), clamp(refr.y*0.6+0.5, 0.0, 1.0));
            vec3 glass = mix(vec3(0.33,0.49,0.72), vec3(0.74,0.85,0.97), clamp(N.z, 0.0, 1.0));
            vec3 col = mix(glass, bgIn, 0.4);

            /* Iridescência (fina película) puxada pro rosa. */
            float ang = atan(N.y, N.x);
            vec3 irid = 0.5 + 0.5*cos(vec3(0.0,2.1,4.2) + ang*2.0 + n0*6.2);
            irid = mix(vec3(1.0,0.72,0.80), irid, 0.55);
            col += fres * irid * 0.7;

            /* Faíscas de cáustica: linhas finas e brilhantes. */
            float spark = pow(max(0.0, 1.0 - abs(n0-0.5)*5.5), 7.0);
            col += spark * vec3(1.0,0.74,0.62) * (1.1 + uEnergy*0.7);

            /* Brilho especular. */
            vec3 Ld = normalize(vec3(-0.45, 0.6, 0.75));
            float spec = pow(max(dot(reflect(-Ld, N), V), 0.0), 42.0);
            col += spec * vec3(1.0);

            /* Halo suave em volta. */
            float dcontorno = length(p + (w-0.5)*warpAmt);
            float halo = smoothstep(radius+0.24, radius-0.02, dcontorno) * 0.16;
            float alpha = max(mask, halo*(1.0-mask));

            gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
        }
    `;

    function compilar(tipo, src) {
        const s = gl.createShader(tipo);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
            console.warn('shader:', gl.getShaderInfoLog(s));
            return null;
        }
        return s;
    }

    const vs = compilar(gl.VERTEX_SHADER, vsrc);
    const fs = compilar(gl.FRAGMENT_SHADER, fsrc);
    if (!vs || !fs) return;

    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.warn('link:', gl.getProgramInfoLog(prog));
        return;
    }
    gl.useProgram(prog);

    /* Triângulo que cobre a tela toda. */
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, 'uRes');
    const uTime = gl.getUniformLocation(prog, 'uTime');
    const uMouse = gl.getUniformLocation(prog, 'uMouse');
    const uEnergy = gl.getUniformLocation(prog, 'uEnergy');
    const uCenter = gl.getUniformLocation(prog, 'uCenter');

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    let L = 0, A = 0, dpr = 1;
    let cxUv = 0.14, cyUv = 0.0;
    let mouse = null;
    let energia = 0;

    function medir() {
        const c = palco.getBoundingClientRect();
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        L = c.width; A = c.height;
        tela.width = L * dpr;
        tela.height = A * dpr;
        gl.viewport(0, 0, tela.width, tela.height);
        const retrato = L / A < 0.95;
        cxUv = retrato ? 0.0 : 0.14;
        cyUv = retrato ? -0.14 : 0.0;
    }

    function quadro(ms) {
        if (paradinha) ms = 6000;

        /* Energia sobe perto do cursor. */
        let alvo = 0;
        if (mouse && !passivo) {
            const mxUv = (mouse.x - L * 0.5) / A;
            const myUv = (mouse.y - A * 0.5) / A;
            const d = Math.hypot(mxUv - cxUv, myUv - cyUv);
            alvo = Math.max(0, Math.min(1, 1 - (d - 0.34) / 0.5));
        }
        energia += (alvo - energia) * 0.06;

        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform2f(uRes, tela.width, tela.height);
        gl.uniform1f(uTime, ms);
        gl.uniform1f(uEnergy, energia);
        gl.uniform2f(uCenter, cxUv, cyUv);
        /* mouse em pixels de framebuffer, y pra cima (igual gl_FragCoord). */
        if (mouse) gl.uniform2f(uMouse, mouse.x * dpr, (A - mouse.y) * dpr);
        else gl.uniform2f(uMouse, -9999, -9999);

        gl.drawArrays(gl.TRIANGLES, 0, 3);
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