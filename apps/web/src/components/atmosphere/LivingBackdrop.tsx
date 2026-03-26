import { useEffect, useMemo, useRef } from 'react';

type LivingBackdropProps = {
  primary: string;
  secondary?: string;
  tertiary?: string;
  energy?: number;
  temperature?: number;
  activeTypers?: number;
  isChaos?: boolean;
  mode?: 'landing' | 'rift';
  className?: string;
};

type NodeSeed = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  depth: number;
  colorIndex: number;
};

type Ripple = {
  x: number;
  y: number;
  radius: number;
  speed: number;
  life: number;
  alpha: number;
  colorIndex: number;
};

export function LivingBackdrop({
  primary,
  secondary = '#ff00ff',
  tertiary = '#9d00ff',
  energy = 0.55,
  temperature = 0,
  activeTypers = 0,
  isChaos = false,
  mode = 'landing',
  className = '',
}: LivingBackdropProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const pointerRef = useRef({ x: 0.5, y: 0.5 });
  const ripplesRef = useRef<Ripple[]>([]);
  const pointerFrameRef = useRef<number | null>(null);
  const palette = useMemo(() => [primary, secondary, tertiary], [primary, secondary, tertiary]);
  const seeds = useMemo<NodeSeed[]>(
    () =>
      Array.from({ length: mode === 'landing' ? 30 : 22 }, (_, index) => ({
        x: Math.random(),
        y: Math.random(),
        vx: (Math.random() - 0.5) * 0.00024,
        vy: (Math.random() - 0.5) * 0.00018,
        radius: 1 + Math.random() * 2.8,
        depth: 0.25 + (index % 7) * 0.11,
        colorIndex: index % 3,
      })),
    [mode],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, reducedMotion ? 1 : 1.25);
      canvas.width = Math.floor(window.innerWidth * ratio);
      canvas.height = Math.floor(window.innerHeight * ratio);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const spawnRipple = (x: number, y: number, colorIndex: number) => {
      ripplesRef.current.push({
        x,
        y,
        radius: 0,
        speed: 0.8 + Math.random() * 1.4,
        life: 1,
        alpha: 0.18 + energy * 0.14,
        colorIndex,
      });
      if (ripplesRef.current.length > 12) {
        ripplesRef.current.shift();
      }
    };

    const draw = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const now = performance.now();
      const heat = Math.min(1, Math.max(0, temperature / 100));
      const activity = Math.min(1, activeTypers / 6);
      const px = (pointerRef.current.x - 0.5) * width * 0.08;
      const py = (pointerRef.current.y - 0.5) * height * 0.08;

      context.clearRect(0, 0, width, height);

      const wash = context.createRadialGradient(
        width * 0.5 + px,
        height * 0.4 + py,
        0,
        width * 0.5,
        height * 0.55,
        Math.max(width, height) * 0.62,
      );
      wash.addColorStop(0, `${primary}${isChaos ? '24' : '18'}`);
      wash.addColorStop(0.32, `${secondary}${heat > 0.58 ? '18' : '12'}`);
      wash.addColorStop(0.68, `${tertiary}${activity > 0.3 ? '16' : '10'}`);
      wash.addColorStop(1, 'rgba(3, 1, 10, 0)');
      context.fillStyle = wash;
      context.fillRect(0, 0, width, height);

      if (mode === 'rift') {
        const field = context.createRadialGradient(
          width * 0.5 + px * 0.45,
          height * 0.5 + py * 0.35,
          0,
          width * 0.5,
          height * 0.5,
          Math.max(width, height) * (0.34 + heat * 0.08),
        );
        field.addColorStop(0, `rgba(255,255,255,${0.015 + heat * 0.015})`);
        field.addColorStop(0.35, `${primary}${heat > 0.72 ? '18' : '12'}`);
        field.addColorStop(0.7, `${isChaos ? '#ff1493' : tertiary}${heat > 0.5 ? '14' : '0d'}`);
        field.addColorStop(1, 'rgba(3,1,10,0)');
        context.globalAlpha = 0.6 + heat * 0.22;
        context.fillStyle = field;
        context.beginPath();
        context.ellipse(
          width * 0.5 + Math.sin(now * 0.00014) * (16 + heat * 24),
          height * 0.5 + Math.cos(now * 0.00011) * (10 + activity * 18),
          width * (0.28 + heat * 0.06),
          height * (0.13 + heat * 0.05),
          Math.sin(now * 0.00008) * (0.24 + heat * 0.16),
          0,
          Math.PI * 2,
        );
        context.fill();
      }

      const membrane = context.createLinearGradient(0, 0, width, height);
      membrane.addColorStop(0, 'rgba(255,255,255,0.015)');
      membrane.addColorStop(0.5, 'rgba(255,255,255,0)');
      membrane.addColorStop(1, 'rgba(255,255,255,0.02)');
      context.fillStyle = membrane;
      context.fillRect(0, 0, width, height);

      if (!reducedMotion && now % Math.max(950, 2800 - temperature * 12 - activeTypers * 120) < 18) {
        const rippleX = width * (0.3 + Math.sin(now * 0.00018) * 0.22 + 0.2);
        const rippleY = height * (mode === 'landing' ? 0.46 : 0.55) + Math.cos(now * 0.00022) * 42;
        spawnRipple(rippleX, rippleY, Math.floor(now / 2400) % 3);
      }

      ripplesRef.current = ripplesRef.current.filter((ripple) => ripple.life > 0.02);
      for (const ripple of ripplesRef.current) {
        ripple.radius += ripple.speed * (mode === 'landing' ? 2.1 : 1.5 + heat * 1.1);
        ripple.life *= 0.986;
        context.beginPath();
        context.strokeStyle = palette[ripple.colorIndex];
        context.globalAlpha = ripple.alpha * ripple.life * (mode === 'rift' ? 0.85 : 1);
        context.lineWidth = mode === 'landing' ? 1.3 : 1 + heat * 0.45;
        context.arc(ripple.x + px * 0.2, ripple.y + py * 0.2, ripple.radius, 0, Math.PI * 2);
        context.stroke();
      }

      for (let index = 0; index < seeds.length; index += 1) {
        const seed = seeds[index];
        seed.x += seed.vx * (1 + energy);
        seed.y += seed.vy * (1 + energy * 0.7);

        if (seed.x < -0.08) seed.x = 1.08;
        if (seed.x > 1.08) seed.x = -0.08;
        if (seed.y < -0.08) seed.y = 1.08;
        if (seed.y > 1.08) seed.y = -0.08;

        const nodeX = seed.x * width + px * seed.depth;
        const nodeY = seed.y * height + py * seed.depth;
        const nodeAlpha = 0.08 + seed.depth * 0.1 + energy * 0.07;

        for (let inner = index + 1; inner < Math.min(seeds.length, index + 6); inner += 1) {
          const peer = seeds[inner];
          const peerX = peer.x * width + px * peer.depth;
          const peerY = peer.y * height + py * peer.depth;
          const dx = nodeX - peerX;
          const dy = nodeY - peerY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const maxDistance = mode === 'landing' ? 170 : 140 + heat * 40;
          if (distance > maxDistance) continue;

          context.beginPath();
          context.strokeStyle = palette[(seed.colorIndex + peer.colorIndex) % palette.length];
          context.globalAlpha = ((1 - distance / maxDistance) * 0.05 + energy * 0.03 + heat * 0.025) * seed.depth;
          context.lineWidth = 0.65 + seed.depth * 0.5 + activity * 0.25;
          context.moveTo(nodeX, nodeY);
          context.quadraticCurveTo(
            (nodeX + peerX) / 2 + Math.sin(now * (0.001 + heat * 0.0015) + inner) * (14 + heat * 16),
            (nodeY + peerY) / 2 + Math.cos(now * (0.0012 + activity * 0.001) + index) * (14 + heat * 12),
            peerX,
            peerY,
          );
          context.stroke();
        }

        const halo = context.createRadialGradient(nodeX, nodeY, 0, nodeX, nodeY, seed.radius * 8);
        halo.addColorStop(0, palette[seed.colorIndex]);
        halo.addColorStop(1, 'rgba(255,255,255,0)');
        context.fillStyle = halo;
        context.globalAlpha = nodeAlpha * 0.55;
        context.beginPath();
        context.arc(nodeX, nodeY, seed.radius * 8, 0, Math.PI * 2);
        context.fill();

        context.fillStyle = palette[seed.colorIndex];
        context.globalAlpha = Math.min(0.85, nodeAlpha + 0.18);
        context.beginPath();
        context.arc(nodeX, nodeY, seed.radius, 0, Math.PI * 2);
        context.fill();
      }

      context.globalAlpha = 1;
      frameRef.current = requestAnimationFrame(draw);
    };

    const handlePointer = (event: PointerEvent) => {
      if (pointerFrameRef.current !== null) return;
      pointerFrameRef.current = requestAnimationFrame(() => {
        pointerFrameRef.current = null;
        pointerRef.current = {
          x: event.clientX / Math.max(1, window.innerWidth),
          y: event.clientY / Math.max(1, window.innerHeight),
        };
        if (!reducedMotion && Math.random() > 0.975) {
          spawnRipple(event.clientX, event.clientY, Math.floor(Math.random() * palette.length));
        }
      });
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', handlePointer);
    frameRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frameRef.current);
      if (pointerFrameRef.current !== null) cancelAnimationFrame(pointerFrameRef.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', handlePointer);
    };
  }, [activeTypers, energy, isChaos, mode, palette, primary, secondary, seeds, temperature, tertiary]);

  return <canvas ref={canvasRef} className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} aria-hidden="true" />;
}
