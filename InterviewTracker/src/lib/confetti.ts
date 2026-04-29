// Tiny dependency-free canvas confetti. Calls fire() to launch a burst.
interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  size: number;
  color: string;
  rot: number; vr: number;
  life: number;
}

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let particles: Particle[] = [];
let raf: number | null = null;

function ensureCanvas() {
  if (canvas) return;
  canvas = document.createElement("canvas");
  canvas.className = "confetti-canvas";
  document.body.appendChild(canvas);
  resize();
  window.addEventListener("resize", resize);
  ctx = canvas.getContext("2d");
}
function resize() {
  if (!canvas) return;
  canvas.width = window.innerWidth * window.devicePixelRatio;
  canvas.height = window.innerHeight * window.devicePixelRatio;
  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";
  ctx?.scale(window.devicePixelRatio, window.devicePixelRatio);
}

const COLORS = ["#ff7a90", "#ffd166", "#5ef0a3", "#6ea8ff", "#b388ff", "#4dffba", "#ff9a55"];

function tick() {
  if (!canvas || !ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles = particles.filter(p => p.life > 0);
  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.18;        // gravity
    p.vx *= 0.995;       // air resistance
    p.rot += p.vr;
    p.life -= 1;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    ctx.globalAlpha = Math.min(1, p.life / 30);
    ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    ctx.restore();
  }
  if (particles.length === 0) {
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }
  raf = requestAnimationFrame(tick);
}

export function fireConfetti(originX = window.innerWidth / 2, originY = window.innerHeight * 0.4) {
  ensureCanvas();
  for (let i = 0; i < 90; i++) {
    const angle = (-Math.PI / 2) + (Math.random() - 0.5) * 1.6;
    const speed = 6 + Math.random() * 8;
    particles.push({
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 4,
      vy: Math.sin(angle) * speed - 2,
      size: 6 + Math.random() * 6,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      life: 80 + Math.random() * 30,
    });
  }
  if (!raf) raf = requestAnimationFrame(tick);
}
