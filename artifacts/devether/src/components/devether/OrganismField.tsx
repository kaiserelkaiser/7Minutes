import { useEffect, useMemo, useRef, useState } from 'react';
import type { Fragment, GhostTrail, RiftMessage, RiftUser } from '@/hooks/use-socket';
import {
  buildConnectionPath,
  buildOrganicPath,
  clamp,
  colorFromString,
  hashString,
  lerp,
  messageAgeProgress,
} from '@/lib/sevenMinutes';

interface OrganismFieldProps {
  topic: string;
  vibeColor: string;
  messages: RiftMessage[];
  users: Record<string, RiftUser>;
  fragments: Fragment[];
  ghostTrails: GhostTrail[];
}

interface PositionedBlob {
  message: RiftMessage;
  x: number;
  y: number;
  width: number;
  height: number;
  path: string;
  opacity: number;
  age: number;
}

function glitchText(content: string, stage: number, phase: number) {
  if (stage < 3) return content;
  const glyphs = ['#', '?', '*', '~', '/'];
  return content
    .split('')
    .map((character, index) => {
      if (character === ' ') return ' ';
      if ((Math.sin(phase * 2.6 + index) + 1) / 2 > 0.78 - stage * 0.08) {
        return glyphs[(index + stage) % glyphs.length];
      }
      return character;
    })
    .join('');
}

export function OrganismField({ topic, vibeColor, messages, users, fragments, ghostTrails }: OrganismFieldProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [phase, setPhase] = useState(0);
  const [pointer, setPointer] = useState({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const measure = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    };

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => {
    let frame = 0;
    const animate = () => {
      setPhase(performance.now() / 1000);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const handleMove = (event: MouseEvent) => {
      setPointer({ x: event.clientX / window.innerWidth, y: event.clientY / window.innerHeight });
    };

    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  const center = useMemo(
    () => ({
      x: viewport.width / 2 + (pointer.x - 0.5) * 50,
      y: viewport.height / 2 + (pointer.y - 0.5) * 20,
    }),
    [pointer.x, pointer.y, viewport.height, viewport.width],
  );

  const visibleMessages = useMemo<PositionedBlob[]>(() => {
    const now = Date.now();
    const sample = messages.slice(-18);

    return sample.map((message, index) => {
      const hash = Math.abs(hashString(message.id));
      const age = messageAgeProgress(message.createdAt, message.expiresAt, now);
      const angle = hash * 0.0009 + phase * (0.12 + (hash % 9) * 0.01) + index * 0.45;
      const ring = 150 + (index % 6) * 54 + age * 34;
      const width = clamp(120 + message.content.length * 1.9, 140, 300);
      const height = clamp(82 + message.content.length * 0.7, 92, 188);
      const x = center.x + Math.cos(angle) * ring + (pointer.x - 0.5) * 90;
      const y = center.y + Math.sin(angle * 1.45) * ring * 0.34 + Math.sin(phase + hash) * 12;
      const opacity = message.decayStage === 4 ? 0.18 : message.decayStage === 3 ? 0.42 : message.decayStage === 2 ? 0.68 : message.decayStage === 1 ? 0.82 : 1;

      return {
        message,
        x,
        y,
        width,
        height,
        path: buildOrganicPath({
          seed: message.id,
          radiusX: width / 2.25,
          radiusY: height / 2.15,
          phase: phase + index * 0.2,
          sentiment: message.sentiment,
          wobble: message.decayStage >= 3 ? 0.34 : 0.2,
        }),
        opacity,
        age,
      };
    });
  }, [center.x, center.y, messages, phase, pointer.x]);

  const userFields = useMemo(() => {
    const activeUsers = Object.values(users).slice(0, 12);
    return activeUsers.map((user, index) => {
      const angle = phase * 0.08 + index * (Math.PI * 2 / Math.max(1, activeUsers.length));
      const radius = Math.min(viewport.width, viewport.height) * 0.34;
      return {
        user,
        x: center.x + Math.cos(angle) * radius,
        y: center.y + Math.sin(angle) * radius * 0.55,
      };
    });
  }, [center.x, center.y, phase, users, viewport.height, viewport.width]);

  const connectionPaths = useMemo(() => {
    const paths: Array<{ d: string; color: string; width: number; opacity: number }> = [];
    visibleMessages.forEach((blob, index) => {
      paths.push({
        d: buildConnectionPath(center, { x: blob.x, y: blob.y }, Math.sin(index + phase) * 70),
        color: blob.message.userColor,
        width: blob.message.decayStage >= 3 ? 1 : 1.6,
        opacity: blob.message.decayStage >= 3 ? 0.16 : 0.28,
      });

      if (index > 0) {
        const previous = visibleMessages[index - 1];
        paths.push({
          d: buildConnectionPath(
            { x: previous.x, y: previous.y },
            { x: blob.x, y: blob.y },
            Math.cos(index + phase) * 34,
          ),
          color: previous.message.userColor,
          width: 1,
          opacity: 0.14,
        });
      }
    });
    return paths;
  }, [center, phase, visibleMessages]);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <radialGradient id="organism-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.92)" />
            <stop offset="45%" stopColor={vibeColor} />
            <stop offset="100%" stopColor="rgba(10,1,24,0)" />
          </radialGradient>
          <filter id="field-glow" x="-120%" y="-120%" width="320%" height="320%">
            <feGaussianBlur stdDeviation="12" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <path
          d={`M 0 ${center.y} Q ${center.x * 0.4} ${center.y - 180} ${center.x} ${center.y} T ${viewport.width} ${center.y}`}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="180"
          strokeLinecap="round"
          filter="url(#field-glow)"
        />

        {connectionPaths.map((path, index) => (
          <path
            key={`${path.d}-${index}`}
            d={path.d}
            fill="none"
            stroke={path.color}
            strokeOpacity={path.opacity}
            strokeWidth={path.width}
            strokeLinecap="round"
          />
        ))}

        <circle cx={center.x} cy={center.y} r="68" fill="url(#organism-core)" opacity="0.22" />
        <circle cx={center.x} cy={center.y} r="18" fill="rgba(255,255,255,0.78)" />
      </svg>

      <div className="pointer-events-none absolute inset-0">
        {visibleMessages.map((blob) => {
          const stageColor = blob.message.decayStage >= 3 ? 'transparent' : blob.message.userColor;
          const scrambled = glitchText(blob.message.content, blob.message.decayStage, phase + blob.age * 8);
          return (
            <div
              key={blob.message.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: blob.x, top: blob.y, opacity: blob.opacity }}
            >
              <div className="relative" style={{ width: blob.width, height: blob.height }}>
                <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox={`-${blob.width / 2} -${blob.height / 2} ${blob.width} ${blob.height}`}>
                  <path
                    d={blob.path}
                    fill={blob.message.decayStage >= 3 ? 'rgba(255,255,255,0.04)' : `${stageColor}`}
                    fillOpacity={blob.message.decayStage >= 3 ? 1 : 0.14}
                    stroke={blob.message.userColor}
                    strokeWidth={blob.message.decayStage >= 3 ? 1.8 : 1.3}
                    filter="url(#field-glow)"
                  />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
                  <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/40">
                    {blob.message.username}
                  </div>
                  <div className="mt-3 max-w-[80%] text-sm leading-relaxed text-white/88 sm:text-base">
                    {scrambled}
                  </div>
                </div>

                {(blob.message.decayStage >= 2 || blob.message.isBurst) &&
                  Array.from({ length: 6 }, (_, particleIndex) => {
                    const particleAngle = particleIndex * (Math.PI * 2 / 6) + phase + blob.age * 6;
                    const orbit = blob.width * 0.28 + particleIndex * 4;
                    return (
                      <span
                        key={`${blob.message.id}-p-${particleIndex}`}
                        className="absolute h-1.5 w-1.5 rounded-full"
                        style={{
                          left: blob.width / 2 + Math.cos(particleAngle) * orbit,
                          top: blob.height / 2 + Math.sin(particleAngle) * orbit * 0.55,
                          background: blob.message.userColor,
                          boxShadow: `0 0 12px ${blob.message.userColor}`,
                          opacity: blob.message.decayStage >= 3 ? 0.24 : 0.6,
                        }}
                      />
                    );
                  })}
              </div>
            </div>
          );
        })}

        {fragments.map((fragment, index) => {
          const hash = Math.abs(hashString(fragment.id));
          const x = center.x + Math.cos(hash * 0.002 + phase * 0.2) * (220 + index * 24);
          const y = center.y + Math.sin(hash * 0.003 + phase * 0.35) * 120;
          return (
            <div
              key={fragment.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 text-center"
              style={{ left: x, top: y }}
            >
              <div className="text-4xl text-white/35 drop-shadow-[0_0_22px_rgba(255,255,255,0.25)]">?</div>
              <div className="mt-2 max-w-[160px] text-xs leading-relaxed text-white/50">
                {fragment.content}
              </div>
            </div>
          );
        })}

        {userFields.map(({ user, x, y }) => (
          <div
            key={user.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 text-center"
            style={{ left: x, top: y }}
          >
            <div
              className="relative rounded-full"
              style={{
                width: 28 + user.momentum * 0.18,
                height: 28 + user.momentum * 0.18,
                border: `1px solid ${user.color}`,
                boxShadow: `0 0 28px ${user.color}`,
                opacity: user.isGhost ? 0.28 : 0.76,
                background: `radial-gradient(circle, ${user.color}55 0%, transparent 70%)`,
              }}
            >
              {user.isTyping && (
                <span
                  className="absolute inset-[-6px] rounded-full"
                  style={{ border: `1px solid ${user.color}`, opacity: 0.55 }}
                />
              )}
            </div>
            <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.28em] text-white/35">
              {user.username}
            </div>
          </div>
        ))}

        {ghostTrails.map((trail, index) => (
          <div
            key={`${trail.userId}-${trail.leftAt}`}
            className="absolute text-xs text-white/30"
            style={{
              left: `${12 + (index % 4) * 18}%`,
              top: `${14 + Math.floor(index / 4) * 10}%`,
            }}
          >
            <div className="font-mono uppercase tracking-[0.35em]" style={{ color: trail.color }}>
              ghost
            </div>
            <div className="mt-1 max-w-[180px] leading-relaxed">{trail.username} drifted away thinking about {trail.lastTopic}</div>
          </div>
        ))}

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center text-white/22">
          <div className="font-display text-[clamp(1.8rem,5vw,4rem)] uppercase tracking-[0.35em]">{topic}</div>
        </div>
      </div>
    </div>
  );
}
