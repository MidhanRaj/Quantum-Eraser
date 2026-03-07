/**
 * Threads-JS-CSS (Vanilla JS Equivalent)
 * A premium wave-like background animation using HTML5 Canvas.
 */

class ThreadsBackground {
    constructor(canvasId, options = {}) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');

        this.color = options.color || [0.32, 0.15, 1]; // RGB normalized
        this.amplitude = options.amplitude || 2.3;
        this.distance = options.distance || 0.7;
        this.interactive = options.enableMouseInteraction !== false;

        this.threads = [];
        this.numThreads = 12;
        this.mouse = { x: 0, y: 0 };

        this.init();
        this.animate();

        window.addEventListener('resize', () => this.resize());
        if (this.interactive) {
            window.addEventListener('mousemove', (e) => {
                this.mouse.x = e.clientX;
                this.mouse.y = e.clientY;
            });
        }
    }

    init() {
        this.resize();
        for (let i = 0; i < this.numThreads; i++) {
            this.threads.push({
                y: Math.random() * this.canvas.height,
                speed: 0.01 + Math.random() * 0.02,
                offset: Math.random() * Math.PI * 2,
                amplitude: 30 + Math.random() * 50 * this.amplitude,
                wavelength: 200 + Math.random() * 400
            });
        }
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Background subtle gradient
        const bgGrad = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        bgGrad.addColorStop(0, '#020205');
        bgGrad.addColorStop(1, '#050510');
        this.ctx.fillStyle = bgGrad;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const r = Math.floor(this.color[0] * 255);
        const g = Math.floor(this.color[1] * 255);
        const b = Math.floor(this.color[2] * 255);

        this.threads.forEach((t, index) => {
            this.ctx.beginPath();
            this.ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.1 + (index / this.numThreads) * 0.2})`;
            this.ctx.lineWidth = 1.5;

            t.offset += t.speed;

            for (let x = 0; x <= this.canvas.width; x += 5) {
                let y = t.y + Math.sin(x / t.wavelength + t.offset) * t.amplitude;

                // Interaction
                if (this.interactive) {
                    const dx = x - this.mouse.x;
                    const dy = y - this.mouse.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 200) {
                        const force = (200 - dist) / 200;
                        y += dy * force * 0.5;
                    }
                }

                if (x === 0) this.ctx.moveTo(x, y);
                else this.ctx.lineTo(x, y);
            }
            this.ctx.stroke();
        });
    }

    animate() {
        this.draw();
        requestAnimationFrame(() => this.animate());
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    // Create canvas if it doesn't exist
    if (!document.getElementById('threads-canvas')) {
        const canvas = document.createElement('canvas');
        canvas.id = 'threads-canvas';
        canvas.style.position = 'fixed';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100vw';
        canvas.style.height = '100vh';
        canvas.style.zIndex = '-1';
        canvas.style.pointerEvents = 'none';
        document.body.prepend(canvas);
    }

    new ThreadsBackground('threads-canvas', {
        color: [0.32, 0.15, 1],
        amplitude: 2.3,
        distance: 0.7,
        enableMouseInteraction: true
    });
});
