/**
 * dna-background.js
 * Injects and runs the Three.js DNA double helix background animation.
 */

(function () {
    const CFG = {
        numBasePairs: 36,
        helixRadius: 2.0,
        bpSpacing: 0.34,
        turns: 3.6,
        opacity: 0.30,
        autoRotateY: 0.004,
        strandColor1: 0x1a8fa0,
        strandColor2: 0x1a9960,
        particleColor: 0x2ab4c8,
        darkFog: 0x050d1a,
        lightFog: 0xf0f4f8,
    };

    function initDNA() {
        let canvas = document.getElementById('dna-canvas');
        let overlay = document.getElementById('dna-overlay');

        // Inject elements if they don't exist
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.id = 'dna-canvas';
            document.body.prepend(canvas);
        }
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'dna-overlay';
            canvas.after(overlay);
        }

        const N = CFG.numBasePairs;
        const totalH = N * CFG.bpSpacing;

        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setClearColor(0x000000, 0);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
        camera.position.set(0, 0, 14);

        let baseInt1 = 2.5;
        let baseInt2 = 2.0;

        function syncFog() {
            const dark = document.body.dataset.theme === 'dark' || document.body.classList.contains('dark-theme');
            scene.fog = new THREE.FogExp2(dark ? CFG.darkFog : CFG.lightFog, 0.045);
            
            // Adjust light intensity based on theme
            if (dark) {
                baseInt1 = 2.5;
                baseInt2 = 2.0;
                particles.material.opacity = 0.18;
            } else {
                baseInt1 = 1.2;
                baseInt2 = 1.0;
                particles.material.opacity = 0.08;
            }
        }
        syncFog();

        scene.add(new THREE.AmbientLight(0xffffff, 0.4));
        const pl1 = new THREE.PointLight(0x2ab4c8, baseInt1, 35);
        pl1.position.set(6, 6, 8); scene.add(pl1);
        const pl2 = new THREE.PointLight(0x2eb87e, baseInt2, 35);
        pl2.position.set(-6, -6, 6); scene.add(pl2);

        const helixGroup = new THREE.Group();
        scene.add(helixGroup);

        const BP_COLORS = [
            { a: 0xe05252, b: 0x2ab4c8 },
            { a: 0x2ab4c8, b: 0xe05252 },
            { a: 0x27c93f, b: 0xffbe2e },
            { a: 0xffbe2e, b: 0x27c93f },
        ];

        function helixPt(t, strand) {
            const angle = t * 2 * Math.PI * CFG.turns + (strand ? Math.PI : 0);
            return new THREE.Vector3(
                Math.cos(angle) * CFG.helixRadius,
                (t - 0.5) * totalH,
                Math.sin(angle) * CFG.helixRadius
            );
        }

        function addStrand(strand, color) {
            const pts = [];
            for (let i = 0; i <= 320; i++) pts.push(helixPt(i / 320, strand));
            const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 280, 0.10, 7, false);
            const mat = new THREE.MeshPhysicalMaterial({
                color, metalness: 0.55, roughness: 0.25,
                transparent: true, opacity: CFG.opacity * 1.0,
                emissive: color, emissiveIntensity: 0.15,
            });
            helixGroup.add(new THREE.Mesh(geo, mat));
        }
        addStrand(0, CFG.strandColor1);
        addStrand(1, CFG.strandColor2);

        for (let i = 0; i < N; i++) {
            const t = i / N;
            const p1 = helixPt(t, 0), p2 = helixPt(t, 1);
            const bp = BP_COLORS[i % 4];

            const sGeo = new THREE.SphereGeometry(0.18, 10, 8);
            const mkSph = (pos, col) => {
                const m = new THREE.Mesh(sGeo, new THREE.MeshPhysicalMaterial({
                    color: col, emissive: col, emissiveIntensity: 0.45,
                    metalness: 0.3, roughness: 0.3,
                    transparent: true, opacity: CFG.opacity * 1.1,
                }));
                m.position.copy(pos); helixGroup.add(m);
            };
            mkSph(p1, bp.a); mkSph(p2, bp.b);

            const mid = p1.clone().add(p2).multiplyScalar(0.5);
            const dist = p1.distanceTo(p2);
            const rung = new THREE.Mesh(
                new THREE.CylinderGeometry(0.04, 0.04, dist * 0.72, 5),
                new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: CFG.opacity * 0.55, roughness: 0.7 })
            );
            rung.position.copy(mid);
            rung.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p2.clone().sub(p1).normalize());
            helixGroup.add(rung);
        }

        for (let i = 0; i < N * 3; i++) {
            const t = i / (N * 3);
            for (let s = 0; s < 2; s++) {
                const pm = new THREE.Mesh(
                    new THREE.SphereGeometry(0.055, 5, 4),
                    new THREE.MeshPhysicalMaterial({
                        color: s ? 0x3de8a0 : 0x3dd5e8,
                        emissive: s ? 0x1a9960 : 0x1a8fa0,
                        emissiveIntensity: 0.55, metalness: 0.8, roughness: 0.1,
                        transparent: true, opacity: CFG.opacity * 0.85,
                    })
                );
                pm.position.copy(helixPt(t, s));
                helixGroup.add(pm);
            }
        }

        const pGeo = new THREE.BufferGeometry();
        const pPos = new Float32Array(200 * 3);
        for (let i = 0; i < 200; i++) {
            pPos[i * 3] = (Math.random() - 0.5) * 50;
            pPos[i * 3 + 1] = (Math.random() - 0.5) * 50;
            pPos[i * 3 + 2] = (Math.random() - 0.5) * 30 - 8;
        }
        pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
        const particles = new THREE.Points(pGeo,
            new THREE.PointsMaterial({ color: CFG.particleColor, size: 0.06, transparent: true, opacity: 0.18 })
        );
        scene.add(particles);

        let tick = 0;
        function animate() {
            requestAnimationFrame(animate);
            tick += 0.008;
            helixGroup.rotation.y += CFG.autoRotateY;
            helixGroup.rotation.x = Math.sin(tick * 0.12) * 0.04;
            pl1.intensity = baseInt1 + Math.sin(tick * 1.1) * 0.4;
            pl2.intensity = baseInt2 + Math.cos(tick * 0.75) * 0.35;
            particles.rotation.y += 0.0004;
            renderer.render(scene, camera);
        }
        animate();

        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });

        window.__dnaSyncTheme = syncFog;
        
        // Listen for theme changes if theme.js is used
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'data-theme') {
                    syncFog();
                }
            });
        });
        observer.observe(document.body, { attributes: true });
    }

    // Load Three.js if not already loaded
    if (typeof THREE === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
        script.onload = initDNA;
        document.head.appendChild(script);
    } else {
        initDNA();
    }
})();
