/* ── Fundo 3D: starburst da Claude feito de partículas (Three.js) ──
   Raios irregulares de partículas grafite, tombando pra frente (eixo X) com
   respiração sutil. Repulsão do cursor + parallax. Roda em #cena. */
(function () {
    'use strict';
    if (!window.THREE) { console.warn('Three.js não carregou'); return; }

    /* Perlin noise 3D (ImprovedNoise) — reservado pra futuras variações. */
    const Perlin = (function () {
        const perm = [151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180];
        const p = new Uint8Array(512);
        for (let i = 0; i < 256; i++) p[i] = p[i + 256] = perm[i];
        const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
        const lerp = (t, a, b) => a + t * (b - a);
        function grad(h, x, y, z) {
            h &= 15;
            const u = h < 8 ? x : y;
            const v = h < 4 ? y : (h === 12 || h === 14 ? x : z);
            return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
        }
        return function (x, y, z) {
            const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
            x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
            const u = fade(x), v = fade(y), w = fade(z);
            const A = p[X] + Y, AA = p[A] + Z, AB = p[A + 1] + Z;
            const B = p[X + 1] + Y, BA = p[B] + Z, BB = p[B + 1] + Z;
            return lerp(w,
                lerp(v, lerp(u, grad(p[AA], x, y, z), grad(p[BA], x - 1, y, z)),
                        lerp(u, grad(p[AB], x, y - 1, z), grad(p[BB], x - 1, y - 1, z))),
                lerp(v, lerp(u, grad(p[AA + 1], x, y, z - 1), grad(p[BA + 1], x - 1, y, z - 1)),
                        lerp(u, grad(p[AB + 1], x, y - 1, z - 1), grad(p[BB + 1], x - 1, y - 1, z - 1))));
        };
    })();

    const cena = document.getElementById('cena');
    if (!cena) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    cena.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 6.5;

    const grupo = new THREE.Group();
    scene.add(grupo);

    const ehMobile = window.matchMedia('(max-width: 700px)').matches
        || ('ontouchstart' in window && window.innerWidth < 900);

    const alvo = ehMobile ? 9000 : 18000;
    const NR = 13;
    const R_MAX = 3.6;
    const per = Math.floor(alvo * 0.92 / NR);
    const nucleo = Math.floor(alvo * 0.08);
    const COUNT = per * NR + nucleo;

    const base = new Float32Array(COUNT * 3);
    const disp = new Float32Array(COUNT * 3);
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);

    const LZ = 0.965;
    function pinta(i3) {
        const op = 0.25 + Math.random() * 0.30;   /* opacidade 0.25–0.55 */
        colors[i3]     = LZ + (0.1137 - LZ) * op;
        colors[i3 + 1] = LZ + (0.1137 - LZ) * op;
        colors[i3 + 2] = LZ + (0.1216 - LZ) * op;
    }

    let idx = 0;
    for (let k = 0; k < NR; k++) {
        const a = k * (Math.PI * 2 / NR) + (Math.random() - 0.5) * 0.10;
        const alt = (k % 2 === 0) ? 1.0 : 0.62;
        const Lk = R_MAX * alt * (0.9 + Math.random() * 0.18);
        const wk = R_MAX * (0.12 + Math.random() * 0.05);
        const dx = Math.cos(a), dy = Math.sin(a);
        const px = -dy, py = dx;
        for (let j = 0; j < per; j++) {
            const t = Math.pow(Math.random(), 1.7);
            const larg = wk * (1 - t * 0.68);
            const off = (Math.random() + Math.random() - 1) * larg;
            const r = t * Lk;
            const i3 = idx * 3;
            base[i3]     = dx * r + px * off;
            base[i3 + 1] = dy * r + py * off;
            base[i3 + 2] = (Math.random() - 0.5) * 0.12;
            pinta(i3);
            idx++;
        }
    }
    for (let j = 0; j < nucleo; j++) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * R_MAX * 0.15;
        const i3 = idx * 3;
        base[i3]     = Math.cos(a) * r;
        base[i3 + 1] = Math.sin(a) * r;
        base[i3 + 2] = (Math.random() - 0.5) * 0.12;
        pinta(i3);
        idx++;
    }
    for (let i = 0; i < COUNT * 3; i++) positions[i] = base[i];

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const disc = (function () {
        const c = document.createElement('canvas'); c.width = c.height = 64;
        const g = c.getContext('2d');
        const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
        gr.addColorStop(0, 'rgba(255,255,255,1)');
        gr.addColorStop(0.45, 'rgba(255,255,255,1)');
        gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(32, 32, 32, 0, Math.PI * 2); g.fill();
        const t = new THREE.Texture(c); t.needsUpdate = true; return t;
    })();

    const mat = new THREE.PointsMaterial({
        size: ehMobile ? 3.2 : 2.6,
        map: disc,
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        sizeAttenuation: false,
        blending: THREE.NormalBlending
    });

    const pontos = new THREE.Points(geo, mat);
    grupo.add(pontos);

    const mouse = { x: 0, y: 0, nx: 0, ny: 0, ativo: false };
    function moveu(cx, cy) {
        mouse.x = cx; mouse.y = cy;
        mouse.nx = cx / window.innerWidth - 0.5;
        mouse.ny = cy / window.innerHeight - 0.5;
        mouse.ativo = true;
    }
    window.addEventListener('pointermove', e => moveu(e.clientX, e.clientY));
    window.addEventListener('pointerleave', () => mouse.ativo = false);
    window.addEventListener('touchmove', e => { if (e.touches[0]) moveu(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
    window.addEventListener('touchend', () => mouse.ativo = false);

    const RAIO = 100, MAXD = 0.8, MAXTILT = 10 * Math.PI / 180;
    let tiltX = 0, tiltY = 0;
    const tmp = new THREE.Vector3(), vpush = new THREE.Vector3();
    const wq = new THREE.Quaternion(), invq = new THREE.Quaternion();
    const clock = new THREE.Clock();

    function animar() {
        requestAnimationFrame(animar);
        const t = clock.getElapsedTime();
        const W = window.innerWidth, H = window.innerHeight;

        pontos.rotation.x = t * (Math.PI * 2 / 90);
        pontos.rotation.y = Math.sin(t * 0.5) * (6 * Math.PI / 180);
        pontos.rotation.z = Math.sin(t * 0.37 + 1.0) * (6 * Math.PI / 180);
        pontos.scale.setScalar(1 + Math.sin(t * 0.7) * 0.02);

        const alvoX = mouse.ativo ? -mouse.ny * MAXTILT : 0;
        const alvoY = mouse.ativo ? mouse.nx * MAXTILT : 0;
        tiltX += (alvoX - tiltX) * 0.05;
        tiltY += (alvoY - tiltY) * 0.05;
        grupo.rotation.x = tiltX;
        grupo.rotation.y = tiltY;

        pontos.updateWorldMatrix(true, false);
        pontos.getWorldQuaternion(wq);
        invq.copy(wq).invert();

        const arr = geo.attributes.position.array;
        for (let i = 0; i < COUNT; i++) {
            const i3 = i * 3;
            const bx = base[i3] + disp[i3], by = base[i3 + 1] + disp[i3 + 1], bz = base[i3 + 2] + disp[i3 + 2];

            let tx = 0, ty = 0, tz = 0;
            if (mouse.ativo) {
                tmp.set(bx, by, bz).applyMatrix4(pontos.matrixWorld).project(camera);
                const sx = (tmp.x * 0.5 + 0.5) * W;
                const sy = (-tmp.y * 0.5 + 0.5) * H;
                const ddx = sx - mouse.x, ddy = sy - mouse.y;
                const d = Math.hypot(ddx, ddy);
                if (d < RAIO && d > 0.001 && tmp.z < 1) {
                    const amt = (1 - d / RAIO) * MAXD;
                    vpush.set((ddx / d) * amt, -(ddy / d) * amt, 0).applyQuaternion(invq);
                    tx = vpush.x; ty = vpush.y; tz = vpush.z;
                }
            }
            disp[i3] += (tx - disp[i3]) * 0.12;
            disp[i3 + 1] += (ty - disp[i3 + 1]) * 0.12;
            disp[i3 + 2] += (tz - disp[i3 + 2]) * 0.12;

            arr[i3] = base[i3] + disp[i3];
            arr[i3 + 1] = base[i3 + 1] + disp[i3 + 1];
            arr[i3 + 2] = base[i3 + 2] + disp[i3 + 2];
        }
        geo.attributes.position.needsUpdate = true;
        renderer.render(scene, camera);
    }
    animar();

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
})();