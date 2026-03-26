import { useRef, useEffect, useCallback } from 'react';

interface Star {
  x: number;
  y: number;
  riftId: string;
  topic: string;
  userCount: number;
  maxUsers: number;
  intensity: number;
  temperature: number;
  isChaos: boolean;
  isQuantum: boolean;
  vibeColor: string;
  pulsePhase: number;
  trail: { x: number; y: number }[];
  baseSize: number;
}

interface RiftData {
  id: string;
  topic: string;
  userCount: number;
  maxUsers: number;
  vibeColor: string;
  temperature: number;
  isChaosMode: boolean;
  isQuantum: boolean;
}

interface ConstellationLobbyProps {
  rifts: RiftData[];
  onRiftClick: (riftId: string, topic: string) => void;
  hoveredRift: string | null;
  onRiftHover: (riftId: string | null) => void;
}

export function ConstellationLobby({ rifts, onRiftClick, hoveredRift, onRiftHover }: ConstellationLobbyProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const bgParticlesRef = useRef<{ x: number; y: number; vx: number; vy: number; size: number }[]>([]);
  const frameRef = useRef(0);
  const timeRef = useRef(0);
  const riftsRef = useRef(rifts);
  const hoveredRef = useRef(hoveredRift);

  useEffect(() => { riftsRef.current = rifts; }, [rifts]);
  useEffect(() => { hoveredRef.current = hoveredRift; }, [hoveredRift]);

  const updateStars = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.width;
    const h = canvas.height;
    const currentRifts = riftsRef.current;
    const existingMap = new Map(starsRef.current.map(s => [s.riftId, s]));

    starsRef.current = currentRifts.map(r => {
      const existing = existingMap.get(r.id);
      const intensity = (r.userCount / r.maxUsers) * 0.5 + (r.temperature / 100) * 0.5;
      if (existing) {
        return { ...existing, userCount: r.userCount, intensity, temperature: r.temperature, isChaos: r.isChaosMode, vibeColor: r.vibeColor };
      }
      return {
        x: 0.15 * w + Math.random() * 0.7 * w,
        y: 0.15 * h + Math.random() * 0.7 * h,
        riftId: r.id, topic: r.topic,
        userCount: r.userCount, maxUsers: r.maxUsers,
        intensity, temperature: r.temperature,
        isChaos: r.isChaosMode, isQuantum: r.isQuantum,
        vibeColor: r.vibeColor, pulsePhase: Math.random() * Math.PI * 2,
        trail: [], baseSize: 8 + intensity * 12,
      };
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; updateStars(); };
    resize();
    window.addEventListener('resize', resize);

    const COUNT = 60;
    bgParticlesRef.current = Array.from({ length: COUNT }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.2,
      size: Math.random() * 1.5 + 0.3,
    }));

    function hexToRgb(hex: string): [number, number, number] {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [0, 255, 255];
    }

    function draw() {
      if (!ctx || !canvas) return;
      const w = canvas.width, h = canvas.height;
      timeRef.current += 0.016;
      const t = timeRef.current;

      ctx.fillStyle = 'rgba(5, 2, 15, 0.15)';
      ctx.fillRect(0, 0, w, h);

      // bg particles
      for (const p of bgParticlesRef.current) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(100, 80, 200, ${0.15 + Math.sin(t * 0.5 + p.x) * 0.05})`;
        ctx.fill();
      }

      // draw connections between stars
      const stars = starsRef.current;
      for (let i = 0; i < stars.length; i++) {
        for (let j = i + 1; j < stars.length; j++) {
          const dx = stars[i].x - stars[j].x;
          const dy = stars[i].y - stars[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 250) {
            const [r, g, b] = hexToRgb(stars[i].vibeColor);
            const alpha = (1 - dist / 250) * 0.15;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(stars[i].x, stars[i].y);
            ctx.lineTo(stars[j].x, stars[j].y);
            ctx.stroke();
          }
        }
      }

      // draw stars
      for (const star of stars) {
        const isHovered = hoveredRef.current === star.riftId;
        const pulse = Math.sin(t * (star.isChaos ? 6 : 2) + star.pulsePhase);
        const size = star.baseSize + pulse * (star.isChaos ? 5 : 2) + (isHovered ? 8 : 0);
        const [r, g, b] = hexToRgb(star.vibeColor);

        // outer glow
        const glowGrad = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, size * 4);
        glowGrad.addColorStop(0, `rgba(${r},${g},${b},${0.15 + star.intensity * 0.2})`);
        glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.beginPath();
        ctx.arc(star.x, star.y, size * 4, 0, Math.PI * 2);
        ctx.fillStyle = glowGrad;
        ctx.fill();

        // particle trail for hot rifts
        if (star.intensity > 0.5 || star.isChaos) {
          star.trail.push({ x: star.x + (Math.random() - 0.5) * 20, y: star.y + (Math.random() - 0.5) * 20 });
          if (star.trail.length > 8) star.trail.shift();
          star.trail.forEach((pt, i) => {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 1.5 * (i / star.trail.length), 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${r},${g},${b},${0.3 * (i / star.trail.length)})`;
            ctx.fill();
          });
        }

        // core star
        const grad = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, size);
        grad.addColorStop(0, `rgba(255,255,255,${0.9 + pulse * 0.1})`);
        grad.addColorStop(0.3, `rgba(${r},${g},${b},0.9)`);
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.beginPath();
        ctx.arc(star.x, star.y, size, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // chaos ring
        if (star.isChaos) {
          ctx.beginPath();
          ctx.arc(star.x, star.y, size * (1.8 + Math.sin(t * 8) * 0.3), 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255, 100, 0, ${0.4 + pulse * 0.2})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // user count dots
        const dotCount = star.userCount;
        for (let i = 0; i < dotCount; i++) {
          const angle = (i / Math.max(dotCount, 1)) * Math.PI * 2 + t * 0.5;
          const orbitR = size * 2.5;
          ctx.beginPath();
          ctx.arc(star.x + Math.cos(angle) * orbitR, star.y + Math.sin(angle) * orbitR, 2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,0.7)`;
          ctx.fill();
        }

        // quantum marker
        if (star.isQuantum) {
          ctx.font = `${size}px monospace`;
          ctx.fillStyle = `rgba(200,150,255,0.8)`;
          ctx.textAlign = 'center';
          ctx.fillText('?', star.x, star.y + size / 3);
        }

        // hovered label
        if (isHovered) {
          ctx.font = 'bold 12px "JetBrains Mono", monospace';
          ctx.fillStyle = `rgba(255,255,255,0.95)`;
          ctx.textAlign = 'center';
          ctx.fillText(star.isQuantum ? '??? Quantum' : star.topic, star.x, star.y - size - 18);
          ctx.font = '10px monospace';
          ctx.fillStyle = `rgba(${r},${g},${b},0.9)`;
          ctx.fillText(`${star.userCount}/${star.maxUsers} nodes`, star.x, star.y - size - 4);
        }
      }

      frameRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => { cancelAnimationFrame(frameRef.current); window.removeEventListener('resize', resize); };
  }, [updateStars]);

  useEffect(() => { updateStars(); }, [rifts, updateStars]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    let found: string | null = null;
    for (const star of starsRef.current) {
      const dx = mx - star.x, dy = my - star.y;
      if (Math.sqrt(dx * dx + dy * dy) < star.baseSize * 3) { found = star.riftId; break; }
    }
    onRiftHover(found);
  }, [onRiftHover]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    for (const star of starsRef.current) {
      const dx = mx - star.x, dy = my - star.y;
      if (Math.sqrt(dx * dx + dy * dy) < star.baseSize * 3) {
        onRiftClick(star.riftId, star.topic);
        return;
      }
    }
  }, [onRiftClick]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full cursor-crosshair"
      onMouseMove={handleMouseMove}
      onClick={handleClick}
    />
  );
}
