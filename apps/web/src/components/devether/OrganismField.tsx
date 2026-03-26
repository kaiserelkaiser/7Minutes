import { useEffect, useMemo, useState } from 'react';
import type { Fragment, GhostTrail, RiftMessage, RiftUser } from '@/hooks/use-socket';
import {
  buildConnectionPath,
  buildOrganicPath,
  clamp,
  hashString,
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
  driftDuration: number;
  driftDelay: number;
}

function glitchText(content: string, stage: number) {
  if (stage < 3) return content;
  const glyphs = ['#', '?', '*', '~', '/'];
  return content
    .split('')
    .map((character, index) => {
      if (character === ' ') return ' ';
      return index % 3 === 0 ? glyphs[index % glyphs.length] : character;
    })
    .join('');
}

export function OrganismField({ topic, vibeColor, messages, users, fragments, ghostTrails }: OrganismFieldProps) {
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const measure = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    };

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const center = useMemo(
    () => ({
      x: viewport.width / 2,
      y: viewport.height / 2,
    }),
    [viewport.height, viewport.width],
  );

  const visibleMessages = useMemo<PositionedBlob[]>(() => {
    const now = Date.now();
    const sample = messages.slice(-14);

    return sample.map((message, index) => {
      const hash = Math.abs(hashString(message.id));
      const age = messageAgeProgress(message.createdAt, message.expiresAt, now);
      const angle = (hash % 360) * (Math.PI / 180) + index * 0.34;
      const ring = 170 + (index % 5) * 58 + age * 30;
      const width = clamp(132 + message.content.length * 1.6, 152, 292);
      const height = clamp(88 + message.content.length * 0.65, 96, 176);
      const x = center.x + Math.cos(angle) * ring;
      const y = center.y + Math.sin(angle * 1.36) * ring * 0.38;
      const opacity =
        message.decayStage === 4
          ? 0.14
          : message.decayStage === 3
            ? 0.38
            : message.decayStage === 2
              ? 0.64
              : message.decayStage === 1
                ? 0.84
                : 1;

      return {
        message,
        x,
        y,
        width,
        height,
        path: buildOrganicPath({
          seed: message.id,
          radiusX: width / 2.2,
          radiusY: height / 2.1,
          phase: (hash % 100) / 14,
          sentiment: message.sentiment,
          wobble: message.decayStage >= 3 ? 0.28 : 0.16,
        }),
        opacity,
        age,
        driftDuration: 9 + (hash % 7),
        driftDelay: (hash % 5) * -1.2,
      };
    });
  }, [center.x, center.y, messages]);

  const userFields = useMemo(() => {
    const activeUsers = Object.values(users).slice(0, 10);
    return activeUsers.map((user, index) => {
      const angle = index * (Math.PI * 2 / Math.max(1, activeUsers.length));
      const radius = Math.min(viewport.width, viewport.height) * 0.34;
      const hash = Math.abs(hashString(user.id));
      return {
        user,
        x: center.x + Math.cos(angle) * radius,
        y: center.y + Math.sin(angle) * radius * 0.55,
        driftDuration: 11 + (hash % 5),
        driftDelay: (hash % 4) * -0.9,
      };
    });
  }, [center.x, center.y, users, viewport.height, viewport.width]);

  const connectionPaths = useMemo(() => {
    const paths: Array<{ d: string; color: string; width: number; opacity: number }> = [];
    visibleMessages.forEach((blob, index) => {
      paths.push({
        d: buildConnectionPath(center, { x: blob.x, y: blob.y }, ((index % 2 === 0 ? 1 : -1) * 54)),
        color: blob.message.userColor,
        width: blob.message.decayStage >= 3 ? 1 : 1.5,
        opacity: blob.message.decayStage >= 3 ? 0.14 : 0.24,
      });

      if (index > 0) {
        const previous = visibleMessages[index - 1];
        paths.push({
          d: buildConnectionPath(
            { x: previous.x, y: previous.y },
            { x: blob.x, y: blob.y },
            (index % 2 === 0 ? 1 : -1) * 28,
          ),
          color: previous.message.userColor,
          width: 1,
          opacity: 0.12,
        });
      }
    });
    return paths;
  }, [center, visibleMessages]);

  const membraneBands = useMemo(
    () =>
      Array.from({ length: 4 }, (_, index) => ({
        radiusX: 142 + index * 42,
        radiusY: 66 + index * 18,
        opacity: 0.06 + index * 0.028,
        dash: index % 2 === 0 ? '8 18' : '2 14',
      })),
    [],
  );

  return (
    <div className="absolute inset-0 overflow-hidden">
      <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <radialGradient id="organism-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.92)" />
            <stop offset="45%" stopColor={vibeColor} />
            <stop offset="100%" stopColor="rgba(10,1,24,0)" />
          </radialGradient>
          <radialGradient id="membrane-wash" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.12)" />
            <stop offset="46%" stopColor={vibeColor} stopOpacity="0.14" />
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

        <ellipse
          cx={center.x}
          cy={center.y}
          rx={Math.min(viewport.width, viewport.height) * 0.3}
          ry={Math.min(viewport.width, viewport.height) * 0.12}
          fill="url(#membrane-wash)"
          opacity="0.12"
        />

        {membraneBands.map((band, index) => (
          <ellipse
            key={`band-${index}`}
            cx={center.x}
            cy={center.y}
            rx={band.radiusX}
            ry={band.radiusY}
            fill="none"
            stroke={vibeColor}
            strokeOpacity={band.opacity}
            strokeDasharray={band.dash}
            strokeWidth={index === 0 ? 1.4 : 1}
            className={index % 2 === 0 ? 'field-rotate-slow' : 'field-rotate-fast'}
            style={{ transformOrigin: `${center.x}px ${center.y}px` }}
          />
        ))}

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
        <circle cx={center.x} cy={center.y} r="102" fill="none" stroke={vibeColor} strokeOpacity="0.18" strokeDasharray="6 20" />
        <circle cx={center.x} cy={center.y} r="34" fill="none" stroke="rgba(255,255,255,0.26)" strokeOpacity="0.36" />
        <circle cx={center.x} cy={center.y} r="18" fill="rgba(255,255,255,0.78)" />
      </svg>

      <div className="pointer-events-none absolute inset-0">
        {visibleMessages.map((blob, index) => {
          const stageColor = blob.message.decayStage >= 3 ? 'transparent' : blob.message.userColor;
          const scrambled = glitchText(blob.message.content, blob.message.decayStage);
          return (
            <div
              key={blob.message.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{
                left: blob.x,
                top: blob.y,
                opacity: blob.opacity,
                animation: `field-float ${blob.driftDuration}s ease-in-out ${blob.driftDelay}s infinite`,
              }}
            >
              <div
                className="relative"
                style={{
                  width: blob.width,
                  height: blob.height,
                  filter: blob.message.decayStage >= 3 ? 'blur(1px)' : 'none',
                  transform: blob.message.decayStage >= 4 ? 'scale(0.92)' : 'scale(1)',
                }}
              >
                <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox={`-${blob.width / 2} -${blob.height / 2} ${blob.width} ${blob.height}`}>
                  <path
                    d={blob.path}
                    fill={blob.message.decayStage >= 3 ? 'rgba(255,255,255,0.04)' : stageColor}
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
                  Array.from({ length: 5 }, (_, particleIndex) => {
                    const particleAngle = particleIndex * (Math.PI * 2 / 5);
                    const orbit = blob.width * 0.26 + particleIndex * 6;
                    return (
                      <span
                        key={`${blob.message.id}-p-${particleIndex}`}
                        className="absolute h-1.5 w-1.5 rounded-full"
                        style={{
                          left: blob.width / 2 + Math.cos(particleAngle) * orbit,
                          top: blob.height / 2 + Math.sin(particleAngle) * orbit * 0.55,
                          background: blob.message.userColor,
                          boxShadow: `0 0 12px ${blob.message.userColor}`,
                          opacity: blob.message.decayStage >= 3 ? 0.2 : 0.55,
                          animation: `field-float ${7 + particleIndex}s ease-in-out ${particleIndex * -0.6}s infinite`,
                        }}
                      />
                    );
                  })}

                {index % 2 === 0 && (
                  <span
                    className="absolute inset-0 rounded-[42%_58%_54%_46%/44%_38%_62%_56%]"
                    style={{
                      border: `1px solid ${blob.message.userColor}22`,
                      transform: 'scale(1.04)',
                    }}
                  />
                )}
              </div>
            </div>
          );
        })}

        {fragments.map((fragment, index) => {
          const hash = Math.abs(hashString(fragment.id));
          const x = center.x + Math.cos((hash % 360) * (Math.PI / 180)) * (220 + index * 22);
          const y = center.y + Math.sin(((hash % 360) * 1.2) * (Math.PI / 180)) * 116;
          return (
            <div
              key={fragment.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 text-center"
              style={{
                left: x,
                top: y,
                animation: `field-float ${10 + (hash % 4)}s ease-in-out ${(hash % 5) * -0.8}s infinite`,
              }}
            >
              <div className="text-4xl text-white/35 drop-shadow-[0_0_22px_rgba(255,255,255,0.25)]">?</div>
              <div className="mt-2 max-w-[160px] text-xs leading-relaxed text-white/50">
                {fragment.content}
              </div>
            </div>
          );
        })}

        {userFields.map(({ user, x, y, driftDuration, driftDelay }) => (
          <div
            key={user.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 text-center"
            style={{
              left: x,
              top: y,
              animation: `field-float ${driftDuration}s ease-in-out ${driftDelay}s infinite`,
            }}
          >
            <div
              className="absolute -inset-8 rounded-full aura-breathe"
              style={{
                background: `radial-gradient(circle, ${user.color}22 0%, transparent 72%)`,
                opacity: user.isGhost ? 0.16 : 0.5,
                filter: 'blur(10px)',
                animationDelay: `${driftDelay}s`,
              }}
            />
            <div
              className="relative rounded-full aura-breathe"
              style={{
                width: 28 + user.momentum * 0.18,
                height: 28 + user.momentum * 0.18,
                border: `1px solid ${user.color}`,
                boxShadow: `0 0 28px ${user.color}`,
                opacity: user.isGhost ? 0.28 : 0.76,
                background: `radial-gradient(circle, ${user.color}55 0%, transparent 70%)`,
                animationDelay: `${driftDelay}s`,
              }}
            >
              <span
                className="absolute inset-[-9px] rounded-full aura-breathe"
                style={{
                  border: `1px solid ${user.color}`,
                  opacity: user.isGhost ? 0.16 : 0.22,
                  animationDuration: '5.8s',
                  animationDelay: `${driftDelay - 0.7}s`,
                }}
              />
              {user.isTyping && (
                <>
                  <span
                    className="absolute inset-[-6px] rounded-full aura-breathe"
                    style={{
                      border: `1px solid ${user.color}`,
                      opacity: 0.5,
                      animationDuration: '2s',
                      animationDelay: `${driftDelay}s`,
                    }}
                  />
                  <span
                    className="absolute inset-[-14px] rounded-full aura-breathe"
                    style={{
                      border: `1px solid ${user.color}`,
                      opacity: 0.22,
                      animationDuration: '2.6s',
                      animationDelay: `${driftDelay - 0.4}s`,
                    }}
                  />
                </>
              )}
            </div>
            <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.28em] text-white/35">
              {user.username}
            </div>
          </div>
        ))}

        {ghostTrails.slice(-3).map((trail, index) => (
          <div
            key={`${trail.userId}-${trail.leftAt}`}
            className="absolute text-[10px] uppercase tracking-[0.2em] text-white/18"
            style={{
              left: `${10 + (index % 3) * 22}%`,
              top: `${12 + Math.floor(index / 3) * 8}%`,
            }}
          >
            <div className="font-mono" style={{ color: trail.color }}>
              {trail.username} faded
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
