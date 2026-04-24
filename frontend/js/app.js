document.addEventListener('DOMContentLoaded', () => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = typeof window.gsap !== 'undefined';

  if (!document.body.dataset.theme) {
    const savedTheme = localStorage.getItem('genelab-theme');
    document.body.dataset.theme = savedTheme || 'dark';
  }

  const fadeTargets = document.querySelectorAll("[data-animate='hero'], [data-animate='panel'], .glass-card");
  if (hasGsap && !reducedMotion) {
    gsap.set(fadeTargets, { opacity: 0, y: 15, scale: 0.98 });
    gsap.to(fadeTargets, {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.5,
      stagger: 0.04,
      ease: 'power2.out'
    });
  } else {
    fadeTargets.forEach((item) => {
      item.style.opacity = '1';
    });
  }

  const dnaCanvas = document.getElementById('dna-canvas');
  if (dnaCanvas && !dnaCanvas.dataset.ready) {
    buildHelix(dnaCanvas, hasGsap && !reducedMotion);
    dnaCanvas.dataset.ready = 'true';
  }

  const particleField = document.getElementById('particle-field');
  if (particleField && !particleField.dataset.ready) {
    buildParticles(particleField, hasGsap && !reducedMotion);
    particleField.dataset.ready = 'true';
  }

  setupPointerParallax(hasGsap && !reducedMotion);
});

function buildHelix(canvas, animate) {
  canvas.innerHTML = '';

  const helix = document.createElement('div');
  helix.className = 'dna-helix';

  const tones = ['tone-cyan', 'tone-violet', 'tone-teal', 'tone-lime', 'tone-coral'];

  for (let index = 0; index < 42; index += 1) {
    const rung = document.createElement('div');
    rung.className = 'dna-rung';
    rung.style.setProperty('--index', index.toString());

    const left = document.createElement('span');
    left.className = `dna-node ${tones[index % tones.length]}`;

    const bridge = document.createElement('span');
    bridge.className = 'dna-link';

    const right = document.createElement('span');
    right.className = `dna-node ${tones[(index + 2) % tones.length]}`;

    rung.append(left, bridge, right);
    helix.appendChild(rung);
  }

  canvas.appendChild(helix);

  if (animate) {
    gsap.to(helix, {
      rotationY: 360,
      duration: 28,
      repeat: -1,
      ease: 'none',
      transformOrigin: 'center center'
    });

    gsap.to(helix, {
      rotationX: 6,
      duration: 4.5,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    });
  }
}

function buildParticles(field, animate) {
  const count = window.innerWidth < 768 ? 18 : 34;

  for (let index = 0; index < count; index += 1) {
    const particle = document.createElement('div');
    particle.className = 'particle';

    const size = Math.random() * 4 + 2;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.top = `${Math.random() * 100}%`;
    particle.style.opacity = `${0.16 + Math.random() * 0.28}`;

    field.appendChild(particle);

    if (animate) {
      gsap.to(particle, {
        x: `+=${Math.random() * 120 - 60}`,
        y: `+=${Math.random() * 140 - 70}`,
        scale: 0.7 + Math.random() * 0.8,
        opacity: 0.08 + Math.random() * 0.32,
        duration: 12 + Math.random() * 10,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: Math.random() * 2
      });
    }
  }
}

function setupPointerParallax(animate) {
  if (!animate || typeof window.gsap === 'undefined') {
    return;
  }

  const glowLayers = document.querySelectorAll('.bg-glow');
  const cards = document.querySelectorAll('.glass-card');
  const dnaCanvas = document.getElementById('dna-canvas');

  document.addEventListener('pointermove', (event) => {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const moveX = (event.clientX - centerX) / 90;
    const moveY = (event.clientY - centerY) / 90;

    glowLayers.forEach((layer) => {
      gsap.to(layer, {
        x: moveX * 18,
        y: moveY * 12,
        duration: 1.4,
        ease: 'power2.out'
      });
    });

    if (dnaCanvas) {
      gsap.to(dnaCanvas, {
        rotateY: moveX * 0.5,
        rotateX: -moveY * 0.35,
        duration: 1.5,
        ease: 'power2.out'
      });
    }

    cards.forEach((card) => {
      gsap.to(card, {
        rotateY: moveX * 0.18,
        rotateX: -moveY * 0.12,
        duration: 0.8,
        ease: 'power2.out'
      });
    });
  }, { passive: true });
}
