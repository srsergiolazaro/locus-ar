/* =============================================================================
   TapTapp AR — Landing Page JavaScript
   ============================================================================= */

document.addEventListener('DOMContentLoaded', () => {
    initScrollAnimations();
    initNavbar();
    initCopyButtons();
    initCodeTabs();
    initMetricCounters();

    // Delay particle background and heavy animations to prioritize LCP
    if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
            initParticles();
        });
    } else {
        setTimeout(initParticles, 1000);
    }
});

/* -----------------------------------------------------------------------------
   Particle Background
   ----------------------------------------------------------------------------- */
function initParticles() {
    const canvas = document.getElementById('particle-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let particles = [];
    let animationId;

    const config = {
        particleCount: 80,
        particleSize: 2,
        lineDistance: 150,
        speed: 0.3,
        colors: {
            particle: '#00d4aa',
            line: 'rgba(0, 212, 170, 0.1)'
        }
    };

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.vx = (Math.random() - 0.5) * config.speed;
            this.vy = (Math.random() - 0.5) * config.speed;
            this.size = Math.random() * config.particleSize + 1;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;

            if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
            if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = config.colors.particle;
            ctx.fill();
        }
    }

    function createParticles() {
        particles = [];
        for (let i = 0; i < config.particleCount; i++) {
            particles.push(new Particle());
        }
    }

    function drawLines() {
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < config.lineDistance) {
                    const opacity = 1 - (distance / config.lineDistance);
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(0, 212, 170, ${opacity * 0.15})`;
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            }
        }
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particles.forEach(particle => {
            particle.update();
            particle.draw();
        });

        drawLines();
        animationId = requestAnimationFrame(animate);
    }

    resize();
    createParticles();
    animate();

    window.addEventListener('resize', () => {
        resize();
        createParticles();
    });
}

/* -----------------------------------------------------------------------------
   Scroll Animations (AOS-like)
   ----------------------------------------------------------------------------- */
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const delay = entry.target.dataset.aosDelay || 0;
                setTimeout(() => {
                    entry.target.classList.add('aos-animate');
                }, delay);
            }
        });
    }, observerOptions);

    document.querySelectorAll('[data-aos]').forEach(el => {
        observer.observe(el);
    });
}

/* -----------------------------------------------------------------------------
   Navbar Scroll Effect
   ----------------------------------------------------------------------------- */
function initNavbar() {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;

    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;

        if (currentScroll > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        lastScroll = currentScroll;
    });

    // Mobile menu toggle
    const navToggle = document.getElementById('nav-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (navToggle && navLinks) {
        navToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            navToggle.classList.toggle('active');
        });
    }
}

/* -----------------------------------------------------------------------------
   Copy to Clipboard
   ----------------------------------------------------------------------------- */
function initCopyButtons() {
    // Hero install box
    const copyBtn = document.getElementById('copy-btn');
    const installBox = document.getElementById('install-box');

    if (copyBtn && installBox) {
        copyBtn.addEventListener('click', async () => {
            const text = 'npm install @srsergio/taptapp-ar';
            await copyToClipboard(text);
            copyBtn.classList.add('copied');
            setTimeout(() => copyBtn.classList.remove('copied'), 2000);
        });
    }

    // Code block copy buttons
    document.querySelectorAll('.code-copy').forEach(btn => {
        btn.addEventListener('click', async () => {
            const codeType = btn.dataset.code;
            const codeBlock = document.getElementById(`code-${codeType}`);
            if (codeBlock) {
                const code = codeBlock.querySelector('code').textContent;
                await copyToClipboard(code);
                btn.textContent = 'Copied!';
                setTimeout(() => btn.textContent = 'Copy', 2000);
            }
        });
    });
}

async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
    } catch (err) {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
    }
}

/* -----------------------------------------------------------------------------
   Code Tabs
   ----------------------------------------------------------------------------- */
function initCodeTabs() {
    const tabs = document.querySelectorAll('.code-tab');
    const blocks = document.querySelectorAll('.code-block');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;

            // Update tabs
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Update code blocks
            blocks.forEach(block => {
                block.classList.remove('active');
                if (block.id === `code-${target}`) {
                    block.classList.add('active');
                }
            });
        });
    });
}

/* -----------------------------------------------------------------------------
   Animated Metric Counters
   ----------------------------------------------------------------------------- */
function initMetricCounters() {
    const metrics = document.querySelectorAll('.metric-card');

    const observerOptions = {
        threshold: 0.5
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const card = entry.target;
                const valueEl = card.querySelector('.metric-value');
                const targetValue = parseInt(card.dataset.value, 10);

                if (!card.classList.contains('counted')) {
                    card.classList.add('counted');
                    animateCounter(valueEl, targetValue);
                }
            }
        });
    }, observerOptions);

    metrics.forEach(metric => observer.observe(metric));
}

function animateCounter(element, target) {
    const duration = 2000;
    const frameDuration = 1000 / 60;
    const totalFrames = Math.round(duration / frameDuration);
    let frame = 0;

    const easeOutQuart = t => 1 - Math.pow(1 - t, 4);

    const counter = setInterval(() => {
        frame++;
        const progress = easeOutQuart(frame / totalFrames);
        const currentValue = Math.round(target * progress);

        element.textContent = currentValue;

        if (frame === totalFrames) {
            clearInterval(counter);
            element.textContent = target;
        }
    }, frameDuration);
}

/* -----------------------------------------------------------------------------
   Smooth Scroll for Anchor Links
   ----------------------------------------------------------------------------- */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;

        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            e.preventDefault();
            targetElement.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});
