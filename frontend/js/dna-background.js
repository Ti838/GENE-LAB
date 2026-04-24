/**
 * dna-background.js
 * Premium Three.js DNA double helix background animation.
 * Copyright (c) 2026. All rights reserved. Do not copy or distribute without permission.
 * Visible on ALL pages, beautiful in both light and dark modes.
 */

(function () {
    const CFG = {
        numBasePairs: 48,
        helixRadius: 2.2,
        bpSpacing: 0.38,
        turns: 3.8,
        autoRotateY: 0.003,
        strandColor1: 0x00b4d8,
        strandColor2: 0x06d6a0,
        particleColor: 0x48cae4,
        darkFog: 0x050d1a,
        lightFog: 0xdce8f4,
    };

    function initDNA() {
        let canvas = document.getElementById('dna-canvas');
        let overlay = document.getElementById('dna-overlay');

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
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 300);
        camera.position.set(0, 0, 16);

        let darkMode = false;
        let baseInt1 = 3.5, baseInt2 = 2.8;
        let particles = null; // Declare early to avoid TDZ errors

        function isDark() {
            return document.body.dataset.theme === 'dark' ||
                   document.body.classList.contains('dark-theme') ||
                   !document.body.dataset.theme; // default to dark
        }

        function syncTheme() {
            darkMode = isDark();
            if (!scene.fog) {
                scene.fog = new THREE.FogExp2(darkMode ? CFG.darkFog : CFG.lightFog, 0.032);
            } else {
                scene.fog.color.setHex(darkMode ? CFG.darkFog : CFG.lightFog);
            }

            if (darkMode) {
                baseInt1 = 3.5; baseInt2 = 2.8;
                canvas.style.opacity = '0.72';
            } else {
                baseInt1 = 2.5; baseInt2 = 2.0; // Boosted intensity for light mode contrast
                canvas.style.opacity = '0.85'; // Higher opacity for visibility
            }
            if (particles) {
                particles.material.opacity = darkMode ? 0.55 : 0.40; // Increased particle opacity in light mode
                particles.material.size = darkMode ? 0.09 : 0.075;
                particles.material.needsUpdate = true;
            }
            updateStrandOpacity();
        }

        // ── Lighting ──────────────────────────────────────────────────
        scene.add(new THREE.AmbientLight(0xffffff, 0.5));
        const pl1 = new THREE.PointLight(0x00d4ff, 4.0, 50);
        pl1.position.set(8, 8, 10); scene.add(pl1);
        const pl2 = new THREE.PointLight(0x06ffa0, 3.2, 50);
        pl2.position.set(-8, -8, 8); scene.add(pl2);
        const pl3 = new THREE.PointLight(0x7b2fff, 2.0, 40);
        pl3.position.set(0, 0, 12); scene.add(pl3);

        // ── Helix group ───────────────────────────────────────────────
        const helixGroup = new THREE.Group();
        
        // Dynamically position helix based on page layout for the whole website
        // If the page has a sidebar (aside tag), shift the DNA right to balance it. Otherwise, center it perfectly.
        const hasSidebar = document.querySelector('aside') !== null;
        const targetX = hasSidebar ? 3.0 : 0; // Shift right by 3.0 if sidebar exists, else perfectly center (0)
        helixGroup.position.set(targetX, 0, 0);
        
        scene.add(helixGroup);

        const BP_COLORS = [
            { a: 0xff6b6b, b: 0x00d4ff },
            { a: 0x00d4ff, b: 0xff6b6b },
            { a: 0x06ffa0, b: 0xffd166 },
            { a: 0xffd166, b: 0x06ffa0 },
        ];

        function helixPt(t, strand) {
            const angle = t * 2 * Math.PI * CFG.turns + (strand ? Math.PI : 0);
            return new THREE.Vector3(
                Math.cos(angle) * CFG.helixRadius,
                (t - 0.5) * totalH,
                Math.sin(angle) * CFG.helixRadius
            );
        }

        const strandMeshes = [];

        function addStrand(strand, color) {
            const pts = [];
            for (let i = 0; i <= 360; i++) pts.push(helixPt(i / 360, strand));
            const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 320, 0.12, 8, false);
            const mat = new THREE.MeshPhysicalMaterial({
                color,
                metalness: 0.6,
                roughness: 0.15,
                transparent: true,
                opacity: 0.82,
                emissive: color,
                emissiveIntensity: 0.35,
                clearcoat: 1.0,
                clearcoatRoughness: 0.1,
            });
            const mesh = new THREE.Mesh(geo, mat);
            helixGroup.add(mesh);
            strandMeshes.push(mat);
            return mesh;
        }

        addStrand(0, CFG.strandColor1);
        addStrand(1, CFG.strandColor2);

        function updateStrandOpacity() {
            const op = darkMode ? 0.82 : 0.85; // Keep opacity high in light mode
            strandMeshes.forEach(m => { m.opacity = op; m.needsUpdate = true; });
        }

        // ── Base pairs ────────────────────────────────────────────────
        const sGeo = new THREE.SphereGeometry(0.22, 12, 10);
        for (let i = 0; i < N; i++) {
            const t = i / N;
            const p1 = helixPt(t, 0), p2 = helixPt(t, 1);
            const bp = BP_COLORS[i % 4];

            const mkSph = (pos, col) => {
                const mat = new THREE.MeshPhysicalMaterial({
                    color: col, emissive: col, emissiveIntensity: 0.6,
                    metalness: 0.4, roughness: 0.2,
                    transparent: true, opacity: 0.92, // High opacity always
                    clearcoat: 0.8,
                });
                const m = new THREE.Mesh(sGeo, mat);
                m.position.copy(pos);
                helixGroup.add(m);
            };
            mkSph(p1, bp.a); mkSph(p2, bp.b);

            // Rung (base pair bond)
            const mid = p1.clone().add(p2).multiplyScalar(0.5);
            const dist = p1.distanceTo(p2);
            const rung = new THREE.Mesh(
                new THREE.CylinderGeometry(0.045, 0.045, dist * 0.78, 6),
                new THREE.MeshPhysicalMaterial({
                    color: 0xffffff, transparent: true,
                    opacity: 0.45, // Ensure visibility in light mode
                    roughness: 0.6, metalness: 0.2,
                })
            );
            rung.position.copy(mid);
            rung.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p2.clone().sub(p1).normalize());
            helixGroup.add(rung);
        }

        // ── Phosphate detail particles on strands ─────────────────────
        for (let i = 0; i < N * 4; i++) {
            const t = i / (N * 4);
            for (let s = 0; s < 2; s++) {
                const pm = new THREE.Mesh(
                    new THREE.SphereGeometry(0.065, 6, 5),
                    new THREE.MeshPhysicalMaterial({
                        color: s ? 0x06ffa0 : 0x48cae4,
                        emissive: s ? 0x06d6a0 : 0x0096c7,
                        emissiveIntensity: 0.8, metalness: 0.9, roughness: 0.05,
                        transparent: true, opacity: darkMode ? 0.75 : 0.45,
                        clearcoat: 1.0,
                    })
                );
                pm.position.copy(helixPt(t, s));
                helixGroup.add(pm);
            }
        }

        // ── Floating particles ────────────────────────────────────────
        const pCount = 350;
        const pGeo = new THREE.BufferGeometry();
        const pPos = new Float32Array(pCount * 3);
        for (let i = 0; i < pCount; i++) {
            pPos[i * 3]     = (Math.random() - 0.5) * 60;
            pPos[i * 3 + 1] = (Math.random() - 0.5) * 60;
            pPos[i * 3 + 2] = (Math.random() - 0.5) * 35 - 8;
        }
        pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
        particles = new THREE.Points(pGeo,
            new THREE.PointsMaterial({
                color: CFG.particleColor,
                size: 0.09, transparent: true, opacity: 0.55,
                sizeAttenuation: true,
            })
        );
        scene.add(particles);

        // ── Small orbiting glow rings ──────────────────────────────────
        const ringGroup = new THREE.Group();
        ringGroup.position.set(-6, 0, -5);
        scene.add(ringGroup);

        for (let r = 0; r < 3; r++) {
            const ringGeo = new THREE.TorusGeometry(2.5 + r * 1.2, 0.015, 8, 80);
            const ringMat = new THREE.MeshBasicMaterial({
                color: r === 0 ? 0x00d4ff : r === 1 ? 0x06ffa0 : 0x7b2fff,
                transparent: true, opacity: 0.18,
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = Math.PI / 2 + r * 0.4;
            ring.rotation.y = r * 0.6;
            ringGroup.add(ring);
        }

        // ── Apply initial theme & watch for changes ───────────────────
        syncTheme();
        
        // ── Animation loop ────────────────────────────────────────────
        let tick = 0;
        function animate() {
            requestAnimationFrame(animate);
            tick += 0.007;

            helixGroup.rotation.y += CFG.autoRotateY;
            helixGroup.rotation.x = Math.sin(tick * 0.08) * 0.035;
            helixGroup.position.y = Math.sin(tick * 0.15) * 0.4;

            pl1.intensity = baseInt1 + Math.sin(tick * 1.1) * 0.6;
            pl2.intensity = baseInt2 + Math.cos(tick * 0.78) * 0.5;
            pl3.intensity = 2.0 + Math.sin(tick * 0.55) * 0.4;

            particles.rotation.y += 0.0003;
            particles.rotation.x += 0.0001;

            ringGroup.rotation.y += 0.002;
            ringGroup.rotation.x += 0.001;
            ringGroup.children.forEach((ring, i) => {
                ring.rotation.z += 0.003 * (i % 2 === 0 ? 1 : -1);
            });

            renderer.render(scene, camera);
        }
        animate();

        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });

        window.__dnaSyncTheme = syncTheme;

        const observer = new MutationObserver(() => syncTheme());
        observer.observe(document.body, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    }

    if (typeof THREE === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js';
        script.onload = initDNA;
        document.head.appendChild(script);
    } else {
        initDNA();
    }
})();
