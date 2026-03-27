import { useCallback, useEffect, useMemo, useRef } from 'react';
import { clamp, hashString } from '@/lib/sevenMinutes';

export interface UniverseRoom {
  id: string;
  topic: string;
  type: 'standard' | 'quantum' | 'context';
  userCount: number;
  maxUsers: number;
  vibeColor: string;
  temperature: number;
  isChaosMode: boolean;
  isQuantum: boolean;
  persistsUntilEmpty: boolean;
}

interface RoomUniverseProps {
  rooms: UniverseRoom[];
  hoveredRoomId: string | null;
  onHover: (roomId: string | null) => void;
  onSelect: (roomId: string, topic: string, mode: 'standard' | 'quantum' | 'context') => void;
}

interface PlanetHitZone {
  roomId: string;
  topic: string;
  mode: 'standard' | 'quantum' | 'context';
  x: number;
  y: number;
  radius: number;
}

function hexToRgb(color: string): [number, number, number] {
  if (color.startsWith('hsl')) {
    return [0, 245, 255];
  }

  const normalized = color.replace('#', '');
  if (normalized.length !== 6) return [0, 245, 255];
  return [
    parseInt(normalized.slice(0, 2), 16),
    parseInt(normalized.slice(2, 4), 16),
    parseInt(normalized.slice(4, 6), 16),
  ];
}

export function RoomUniverse({ rooms, hoveredRoomId, onHover, onSelect }: RoomUniverseProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const pointerFrameRef = useRef<number | null>(null);
  const pointerRef = useRef({ x: 0.5, y: 0.5 });
  const hitZonesRef = useRef<PlanetHitZone[]>([]);
  const roomsRef = useRef<UniverseRoom[]>(rooms);
  const hoveredRef = useRef<string | null>(hoveredRoomId);

  useEffect(() => {
    roomsRef.current = rooms;
  }, [rooms]);

  useEffect(() => {
    hoveredRef.current = hoveredRoomId;
  }, [hoveredRoomId]);

  const ambientSeeds = useMemo(
    () => Array.from({ length: 36 }, (_, index) => ({
      offset: index / 36,
      depth: 0.15 + (index % 8) * 0.08,
      sparkle: 0.4 + (index % 5) * 0.1,
    })),
    [],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const targetFrameMs = reducedMotion ? 1000 / 14 : 1000 / 28;
    let lastFrameTime = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener('resize', resize);

    const draw = (frameTime: number) => {
      if (!context || !canvas) return;
      if (document.visibilityState === 'hidden') {
        frameRef.current = requestAnimationFrame(draw);
        return;
      }

      if (frameTime - lastFrameTime < targetFrameMs) {
        frameRef.current = requestAnimationFrame(draw);
        return;
      }

      lastFrameTime = frameTime;

      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;
      const now = frameTime / 1000;
      const pointerX = (pointerRef.current.x - 0.5) * 80;
      const pointerY = (pointerRef.current.y - 0.5) * 40;

      context.clearRect(0, 0, width, height);

      const voidGradient = context.createRadialGradient(
        centerX + pointerX,
        centerY + pointerY,
        0,
        centerX,
        centerY,
        Math.max(width, height),
      );
      voidGradient.addColorStop(0, 'rgba(0, 245, 255, 0.08)');
      voidGradient.addColorStop(0.35, 'rgba(155, 92, 255, 0.10)');
      voidGradient.addColorStop(1, 'rgba(10, 1, 24, 0.96)');
      context.fillStyle = voidGradient;
      context.fillRect(0, 0, width, height);

      ambientSeeds.forEach((seed, index) => {
        const angle = seed.offset * Math.PI * 2 + now * seed.depth * 0.12;
        const radius = Math.min(width, height) * (0.25 + seed.depth * 0.6);
        const x = centerX + Math.cos(angle + index) * radius + pointerX * seed.depth * 0.4;
        const y = centerY + Math.sin(angle * 1.3 + index) * radius * 0.5 + pointerY * seed.depth * 0.2;
        const size = 0.6 + seed.depth * 1.6 + Math.sin(now * 2 + index) * 0.5;
        context.beginPath();
        context.arc(x, y, size, 0, Math.PI * 2);
        context.fillStyle = `rgba(255,255,255,${0.08 + seed.sparkle * 0.1})`;
        context.fill();
      });

      hitZonesRef.current = [];
      const activeRooms = roomsRef.current;
      const orbitBase = Math.max(180, Math.min(width, height) * 0.22);

      activeRooms.forEach((room, index) => {
        const hash = Math.abs(hashString(room.id));
        const depth = 0.8 + (hash % 7) * 0.14;
        const orbitRadius = orbitBase + index * 58 + (hash % 13) * 6;
        const angle = now * (0.16 + room.temperature / 800) + index * 1.25 + (hash % 360) * 0.01;
        const planetX = centerX + Math.cos(angle) * orbitRadius + pointerX * depth * 0.5;
        const planetY = centerY + Math.sin(angle * 1.4) * orbitRadius * 0.42 + pointerY * depth * 0.3;
        const pulse = 1 + Math.sin(now * (1.3 + room.temperature / 100) + index) * 0.05;
        const radius = clamp(20 + room.userCount * 3.2 + room.temperature * 0.08, 28, 72) * pulse;
        const [red, green, blue] = hexToRgb(room.vibeColor);
        const hovered = hoveredRef.current === room.id;
        const contextRoom = room.type === 'context';

        const atmosphere = context.createRadialGradient(planetX, planetY, 0, planetX, planetY, radius * 3.4);
        atmosphere.addColorStop(0, `rgba(${red}, ${green}, ${blue}, ${room.isChaosMode ? 0.42 : 0.26})`);
        atmosphere.addColorStop(0.6, `rgba(${red}, ${green}, ${blue}, 0.08)`);
        atmosphere.addColorStop(1, 'rgba(0, 0, 0, 0)');
        context.beginPath();
        context.arc(planetX, planetY, radius * 3.4, 0, Math.PI * 2);
        context.fillStyle = atmosphere;
        context.fill();

        context.beginPath();
        context.strokeStyle = `rgba(${red}, ${green}, ${blue}, ${hovered ? 0.6 : 0.14})`;
        context.lineWidth = hovered ? 2.2 : 1;
        context.arc(centerX + pointerX * 0.12, centerY + pointerY * 0.12, orbitRadius, 0, Math.PI * 2);
        context.stroke();

        const sphere = context.createRadialGradient(
          planetX - radius * 0.25,
          planetY - radius * 0.25,
          radius * 0.2,
          planetX,
          planetY,
          radius,
        );
        sphere.addColorStop(0, 'rgba(255,255,255,0.95)');
        sphere.addColorStop(0.2, `rgba(${red}, ${green}, ${blue}, 0.95)`);
        sphere.addColorStop(0.7, `rgba(${red}, ${green}, ${blue}, 0.28)`);
        sphere.addColorStop(1, 'rgba(0,0,0,0)');

        context.beginPath();
        context.arc(planetX, planetY, radius, 0, Math.PI * 2);
        context.fillStyle = sphere;
        context.fill();

        if (contextRoom) {
          context.beginPath();
          context.lineWidth = hovered ? 2.8 : 1.6;
          context.strokeStyle = hovered
            ? 'rgba(123, 246, 209, 0.92)'
            : 'rgba(123, 246, 209, 0.5)';
          context.arc(planetX, planetY, radius * 1.34 + Math.sin(now * 1.6 + index) * 2, 0, Math.PI * 2);
          context.stroke();
        }

        if (room.isChaosMode || room.temperature > 52) {
          context.beginPath();
          context.lineWidth = 1.6;
          context.strokeStyle = room.isChaosMode ? 'rgba(255, 51, 102, 0.65)' : `rgba(${red}, ${green}, ${blue}, 0.45)`;
          context.arc(planetX, planetY, radius * 1.45 + Math.sin(now * 4 + index) * 4, 0, Math.PI * 2);
          context.stroke();
        }

        const satellites = Math.min(6, room.userCount);
        for (let satellite = 0; satellite < satellites; satellite += 1) {
          const satelliteAngle = angle * 2.4 + satellite * (Math.PI * 2 / Math.max(1, satellites));
          const satelliteRadius = radius * 1.9;
          context.beginPath();
          context.arc(
            planetX + Math.cos(satelliteAngle) * satelliteRadius,
            planetY + Math.sin(satelliteAngle) * satelliteRadius,
            1.8,
            0,
            Math.PI * 2,
          );
          context.fillStyle = 'rgba(255,255,255,0.7)';
          context.fill();
        }

        if (hovered) {
          context.textAlign = 'center';
          context.font = '600 12px "JetBrains Mono", monospace';
          context.fillStyle = 'rgba(245, 248, 255, 0.95)';
          context.fillText(
            room.type === 'context' ? 'context room' : room.isQuantum ? 'quantum room' : room.topic,
            planetX,
            planetY - radius - 26,
          );
          context.font = '500 11px "Space Grotesk", sans-serif';
          context.fillStyle = contextRoom ? 'rgba(123, 246, 209, 0.95)' : `rgba(${red}, ${green}, ${blue}, 0.95)`;
          context.fillText(
            contextRoom
              ? `${room.userCount}/${room.maxUsers} minds  |  open until empty`
              : `${room.userCount}/${room.maxUsers} minds  |  heat ${Math.round(room.temperature)}`,
            planetX,
            planetY - radius - 10,
          );
        }

        hitZonesRef.current.push({
          roomId: room.id,
          topic: room.topic,
          mode: room.type,
          x: planetX,
          y: planetY,
          radius: radius * 1.2,
        });
      });

      context.beginPath();
      context.arc(centerX + pointerX * 0.12, centerY + pointerY * 0.12, 44, 0, Math.PI * 2);
      context.fillStyle = 'rgba(0, 245, 255, 0.08)';
      context.fill();
      context.beginPath();
      context.arc(centerX + pointerX * 0.12, centerY + pointerY * 0.12, 18, 0, Math.PI * 2);
      context.fillStyle = 'rgba(255, 255, 255, 0.72)';
      context.fill();

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frameRef.current);
      if (pointerFrameRef.current !== null) cancelAnimationFrame(pointerFrameRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [ambientSeeds]);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (pointerFrameRef.current !== null) return;

    pointerFrameRef.current = requestAnimationFrame(() => {
      pointerFrameRef.current = null;
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      pointerRef.current = { x, y };

      const hit = hitZonesRef.current.find((zone) => {
        const dx = event.clientX - rect.left - zone.x;
        const dy = event.clientY - rect.top - zone.y;
        return Math.sqrt(dx * dx + dy * dy) <= zone.radius;
      });

      onHover(hit?.roomId ?? null);
    });
  }, [onHover]);

  const handlePointerLeave = useCallback(() => {
    if (pointerFrameRef.current !== null) {
      cancelAnimationFrame(pointerFrameRef.current);
      pointerFrameRef.current = null;
    }
    onHover(null);
  }, [onHover]);

  const handleClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    const hit = hitZonesRef.current.find((zone) => {
      const dx = event.clientX - rect.left - zone.x;
      const dy = event.clientY - rect.top - zone.y;
      return Math.sqrt(dx * dx + dy * dy) <= zone.radius;
    });

    if (hit) {
      onSelect(hit.roomId, hit.topic, hit.mode);
    }
  }, [onSelect]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full cursor-crosshair"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onClick={handleClick}
    />
  );
}
