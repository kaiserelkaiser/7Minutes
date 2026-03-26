import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { Fragment, GhostTrail, RiftMessage, RiftUser } from '@/hooks/use-socket';
import {
  buildConnectionPath,
  buildOrganicPath,
  clamp,
  hashString,
  layoutOrganicNodes,
  messageAgeProgress,
  resolveDistinctRoomColors,
} from '@/lib/sevenMinutes';

interface OrganismFieldProps {
  topic: string;
  roomType?: 'standard' | 'quantum' | 'context';
  vibeColor: string;
  temperature: number;
  activeTypers: number;
  isChaos: boolean;
  messages: RiftMessage[];
  users: Record<string, RiftUser>;
  fragments: Fragment[];
  ghostTrails: GhostTrail[];
  resolvedUserColors?: Record<string, string>;
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
  color: string;
  isPinned: boolean;
}

interface DragState {
  id: string;
  offsetX: number;
  offsetY: number;
}

interface MessageExplosion {
  id: string;
  x: number;
  y: number;
  color: string;
  intensity: number;
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

export function OrganismField({
  topic,
  roomType = 'standard',
  vibeColor,
  temperature,
  activeTypers,
  isChaos,
  messages,
  users,
  fragments,
  ghostTrails,
  resolvedUserColors,
}: OrganismFieldProps) {
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [pinnedPositions, setPinnedPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [explosions, setExplosions] = useState<MessageExplosion[]>([]);
  const previousBlobsRef = useRef<Record<string, PositionedBlob>>({});

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

  const roomColors = useMemo(
    () =>
      resolvedUserColors ??
      resolveDistinctRoomColors(
        Object.values(users).map((user) => ({ id: user.id, username: user.username, color: user.color })),
      ),
    [resolvedUserColors, users],
  );
  const isContextRoom = roomType === 'context';
  const heatRatio = clamp(temperature / (isContextRoom ? 120 : 100), 0, 1);
  const conversationState = isChaos ? 'intense' : heatRatio > 0.62 || activeTypers > 2 ? 'active' : 'calm';

  const recentActivity = useMemo(() => {
    const activityMap: Record<string, number> = {};

    messages.slice(-24).forEach((message) => {
      const timestamp = new Date(message.createdAt).getTime();
      activityMap[message.userId] = Math.max(activityMap[message.userId] ?? 0, timestamp);
    });

    fragments.slice(-12).forEach((fragment) => {
      const timestamp = new Date(fragment.createdAt).getTime();
      activityMap[fragment.userId] = Math.max(activityMap[fragment.userId] ?? 0, timestamp);
    });

    return activityMap;
  }, [fragments, messages]);

  const visibleMessages = useMemo<PositionedBlob[]>(() => {
    const now = Date.now();
    const sample = messages.slice(-14);

    const rawNodes = sample.map((message) => {
      const hash = Math.abs(hashString(message.id));
      const age = messageAgeProgress(message.createdAt, message.expiresAt, now);
      const width = clamp(132 + message.content.length * 1.5, 156, 286);
      const height = clamp(90 + message.content.length * 0.56, 98, 170);
      const color = roomColors[message.userId] ?? message.userColor;

      return {
        message,
        width,
        height,
        age,
        hash,
        color,
      };
    });

    const positions = layoutOrganicNodes({
      center,
      bounds: viewport,
      radius: Math.min(viewport.width, viewport.height) * 0.16 + 130,
      nodes: rawNodes.map((node) => ({
        id: node.message.id,
        seed: node.message.id,
        width: node.width,
        height: node.height,
        age: node.age,
        pinned: pinnedPositions[node.message.id] ?? null,
      })),
    });

    return rawNodes.map((node) => {
      const position = positions[node.message.id];
      const opacity =
        node.message.decayStage === 4
          ? 0.14
          : node.message.decayStage === 3
            ? 0.38
            : node.message.decayStage === 2
              ? 0.64
              : node.message.decayStage === 1
                ? 0.84
                : 1;

      return {
        message: node.message,
        x: position?.x ?? center.x,
        y: position?.y ?? center.y,
        width: node.width,
        height: node.height,
        path: buildOrganicPath({
          seed: node.message.id,
          radiusX: node.width / 2.2,
          radiusY: node.height / 2.06,
          phase: (node.hash % 100) / 14,
          sentiment: node.message.sentiment,
          wobble: node.message.decayStage >= 3 ? 0.26 : 0.14,
        }),
        opacity,
        age: node.age,
        driftDuration: 9 + (node.hash % 7),
        driftDelay: (node.hash % 5) * -1.2,
        color: node.color,
        isPinned: Boolean(pinnedPositions[node.message.id]),
      };
    });
  }, [center, messages, pinnedPositions, roomColors, viewport]);

  useEffect(() => {
    const visibleIds = new Set(visibleMessages.map((blob) => blob.message.id));
    setPinnedPositions((current) => {
      const next = Object.fromEntries(
        Object.entries(current).filter(([messageId]) => visibleIds.has(messageId)),
      );
      return Object.keys(next).length === Object.keys(current).length ? current : next;
    });
  }, [visibleMessages]);

  useEffect(() => {
    const previousBlobs = previousBlobsRef.current;
    const nextBlobs = visibleMessages.reduce<Record<string, PositionedBlob>>((result, blob) => {
      result[blob.message.id] = blob;
      return result;
    }, {});

    const expiredBursts = Object.values(previousBlobs)
      .filter((blob) => !nextBlobs[blob.message.id])
      .map((blob) => ({
        id: `${blob.message.id}-${Date.now()}`,
        x: blob.x,
        y: blob.y,
        color: blob.color,
        intensity: blob.message.isBurst ? 1.2 : blob.message.decayStage >= 3 ? 1 : 0.82,
      }));

    if (expiredBursts.length > 0) {
      setExplosions((current) => [...current, ...expiredBursts].slice(-16));
      expiredBursts.forEach((burst) => {
        window.setTimeout(() => {
          setExplosions((current) => current.filter((item) => item.id !== burst.id));
        }, 920);
      });
    }

    previousBlobsRef.current = nextBlobs;
  }, [visibleMessages]);

  useEffect(() => {
    if (!dragState) return;

    const handleMove = (event: PointerEvent) => {
      setPinnedPositions((current) => ({
        ...current,
        [dragState.id]: {
          x: clamp(event.clientX - dragState.offsetX, 96, viewport.width - 96),
          y: clamp(event.clientY - dragState.offsetY, 92, viewport.height - 92),
        },
      }));
    };

    const handleUp = () => setDragState(null);

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);

    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [dragState, viewport.height, viewport.width]);

  const userFields = useMemo(() => {
    const activeUsers = Object.values(users).slice(0, 10);
    const now = Date.now();

    return activeUsers.map((user, index) => {
      const angle = index * ((Math.PI * 2) / Math.max(1, activeUsers.length));
      const radius = Math.min(viewport.width, viewport.height) * 0.33;
      const hash = Math.abs(hashString(user.id));
      const lastActionAt = recentActivity[user.id] ?? 0;
      const recentActionScore =
        lastActionAt > 0 ? clamp(1 - (now - lastActionAt) / 8000, 0, 1) : 0;
      const momentumScore = clamp(user.momentum / 100, 0, 1);
      const actionEnergy = clamp(
        recentActionScore * 0.9 + momentumScore * 0.7 + (user.isTyping ? 0.55 : 0),
        0.18,
        1.55,
      );
      const color = roomColors[user.id] ?? user.color;
      const state =
        user.isTyping || actionEnergy > 1.08 ? 'intense' : actionEnergy > 0.58 ? 'active' : 'calm';
      const stateAccent =
        state === 'intense' ? '#ff1493' : state === 'active' ? '#ccff00' : '#00f5ff';

      return {
        user,
        color,
        state,
        stateAccent,
        x: center.x + Math.cos(angle) * radius,
        y: center.y + Math.sin(angle) * radius * 0.55,
        driftDuration: 11 + (hash % 5),
        driftDelay: (hash % 4) * -0.9,
        actionEnergy,
      };
    });
  }, [center.x, center.y, recentActivity, roomColors, users, viewport.height, viewport.width]);

  const connectionPaths = useMemo(() => {
    const paths: Array<{ d: string; color: string; width: number; opacity: number }> = [];
    visibleMessages.forEach((blob, index) => {
      paths.push({
        d: buildConnectionPath(center, { x: blob.x, y: blob.y }, (index % 2 === 0 ? 1 : -1) * 54),
        color: blob.color,
        width: blob.message.decayStage >= 3 ? 1 : 1.5,
        opacity: blob.message.decayStage >= 3 ? 0.12 : blob.isPinned ? 0.32 : 0.22,
      });

      if (index > 0) {
        const previous = visibleMessages[index - 1];
        paths.push({
          d: buildConnectionPath(
            { x: previous.x, y: previous.y },
            { x: blob.x, y: blob.y },
            (index % 2 === 0 ? 1 : -1) * 24,
          ),
          color: previous.color,
          width: 1,
          opacity: 0.1,
        });
      }
    });
    return paths;
  }, [center, visibleMessages]);

  const fragmentPaths = useMemo(() => {
    return fragments.slice(-4).map((fragment, index) => {
      const hash = Math.abs(hashString(fragment.id));
      const from = {
        x: center.x + Math.cos((hash % 360) * (Math.PI / 180)) * (220 + index * 22),
        y: center.y + Math.sin(((hash % 360) * 1.2) * (Math.PI / 180)) * 116,
      };

      return {
        id: fragment.id,
        color: roomColors[fragment.userId] ?? fragment.userColor,
        d: buildConnectionPath(from, center, (index % 2 === 0 ? 1 : -1) * 42),
      };
    });
  }, [center, fragments, roomColors]);

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
    <div className="absolute inset-0 overflow-hidden" data-topic={topic}>
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
          rx={Math.min(viewport.width, viewport.height) * (0.24 + heatRatio * 0.07)}
          ry={Math.min(viewport.width, viewport.height) * (0.1 + heatRatio * 0.04)}
          fill={isChaos ? '#ff1493' : vibeColor}
          fillOpacity={(isContextRoom ? 0.028 : 0.04) + heatRatio * (isContextRoom ? 0.05 : 0.08)}
          filter="url(#field-glow)"
          className={isChaos ? 'vibe-morph-fast' : conversationState === 'active' ? 'vibe-morph-medium' : 'vibe-morph-slow'}
          style={{ transformOrigin: `${center.x}px ${center.y}px` }}
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
            strokeOpacity={isContextRoom ? band.opacity * 0.72 : band.opacity}
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

        {fragmentPaths.map((path) => (
          <path
            key={`fragment-${path.id}`}
            d={path.d}
            fill="none"
            stroke={path.color}
            strokeOpacity="0.12"
            strokeWidth="1.2"
            strokeDasharray="2 10"
            strokeLinecap="round"
            className="fragment-wisp"
          />
        ))}

        <circle cx={center.x} cy={center.y} r="68" fill="url(#organism-core)" opacity="0.22" />
        <circle cx={center.x} cy={center.y} r="102" fill="none" stroke={vibeColor} strokeOpacity="0.18" strokeDasharray="6 20" />
        <circle cx={center.x} cy={center.y} r="34" fill="none" stroke="rgba(255,255,255,0.26)" strokeOpacity="0.36" />
        <circle cx={center.x} cy={center.y} r="18" fill="rgba(255,255,255,0.78)" />
      </svg>

      <div className="absolute inset-0">
        {visibleMessages.map((blob, index) => {
          const scrambled = glitchText(blob.message.content, blob.message.decayStage);
          const isHeld = dragState?.id === blob.message.id;

          return (
            <div
              key={blob.message.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{
                left: blob.x,
                top: blob.y,
                opacity: blob.opacity,
                zIndex: isHeld ? 60 : blob.isPinned ? 48 : 20 + index,
                animation: blob.isPinned || isHeld ? 'none' : `field-float ${blob.driftDuration}s ease-in-out ${blob.driftDelay}s infinite`,
              }}
            >
              <div
                role="button"
                tabIndex={0}
                onPointerDown={(event) => {
                  setPinnedPositions((current) => ({
                    ...current,
                    [blob.message.id]: {
                      x: blob.x,
                      y: blob.y,
                    },
                  }));
                  setDragState({
                    id: blob.message.id,
                    offsetX: event.clientX - blob.x,
                    offsetY: event.clientY - blob.y,
                  });
                }}
                onDoubleClick={() => {
                  setPinnedPositions((current) => {
                    const next = { ...current };
                    delete next[blob.message.id];
                    return next;
                  });
                }}
                onKeyDown={(event) => {
                  if (event.key !== 'Escape' && event.key !== 'Delete' && event.key !== 'Backspace') return;
                  setPinnedPositions((current) => {
                    const next = { ...current };
                    delete next[blob.message.id];
                    return next;
                  });
                }}
                className={`message-grab relative ${blob.isPinned ? 'message-grab--held' : ''}`}
                style={{
                  width: blob.width,
                  height: blob.height,
                  filter: blob.message.decayStage >= 3 ? 'blur(1px)' : 'none',
                  transform: blob.message.decayStage >= 4 ? 'scale(0.92)' : 'scale(1)',
                }}
              >
                <svg
                  className="absolute inset-0 h-full w-full overflow-visible"
                  viewBox={`-${blob.width / 2} -${blob.height / 2} ${blob.width} ${blob.height}`}
                >
                  <path
                    d={blob.path}
                    fill={blob.message.decayStage >= 3 ? 'rgba(255,255,255,0.04)' : blob.color}
                    fillOpacity={blob.message.decayStage >= 3 ? 1 : blob.isPinned ? 0.18 : 0.14}
                    stroke={blob.color}
                    strokeWidth={blob.message.decayStage >= 3 ? 1.8 : blob.isPinned ? 1.8 : 1.3}
                    filter="url(#field-glow)"
                  />
                </svg>

                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
                  <div className="font-mono text-[10px] uppercase tracking-[0.34em] text-white/34">
                    {blob.message.username}
                  </div>
                  <div className="mt-3 max-w-[80%] text-sm leading-relaxed text-white/88 sm:text-base">
                    {scrambled}
                  </div>
                </div>

                {(blob.message.decayStage >= 2 || blob.message.isBurst) &&
                  Array.from({ length: 5 }, (_, particleIndex) => {
                    const particleAngle = particleIndex * ((Math.PI * 2) / 5);
                    const orbit = blob.width * 0.26 + particleIndex * 6;
                    return (
                      <span
                        key={`${blob.message.id}-p-${particleIndex}`}
                        className="pointer-events-none absolute h-1.5 w-1.5 rounded-full"
                        style={{
                          left: blob.width / 2 + Math.cos(particleAngle) * orbit,
                          top: blob.height / 2 + Math.sin(particleAngle) * orbit * 0.55,
                          background: blob.color,
                          boxShadow: `0 0 12px ${blob.color}`,
                          opacity: blob.message.decayStage >= 3 ? 0.2 : 0.55,
                          animation: `field-float ${7 + particleIndex}s ease-in-out ${particleIndex * -0.6}s infinite`,
                        }}
                      />
                    );
                  })}

                <span
                  className="pointer-events-none absolute inset-0 rounded-[42%_58%_54%_46%/44%_38%_62%_56%]"
                  style={{
                    border: `1px solid ${blob.color}${blob.isPinned ? '55' : '22'}`,
                    transform: blob.isPinned ? 'scale(1.06)' : 'scale(1.03)',
                    boxShadow: blob.isPinned ? `0 0 32px ${blob.color}26` : undefined,
                  }}
                />
              </div>
            </div>
          );
        })}

        {fragments.map((fragment, index) => {
          const hash = Math.abs(hashString(fragment.id));
          const color = roomColors[fragment.userId] ?? fragment.userColor;
          const x = center.x + Math.cos((hash % 360) * (Math.PI / 180)) * (220 + index * 22);
          const y = center.y + Math.sin(((hash % 360) * 1.2) * (Math.PI / 180)) * 116;
          return (
            <div
              key={fragment.id}
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-center"
              style={{
                left: x,
                top: y,
                animation: `field-float ${10 + (hash % 4)}s ease-in-out ${(hash % 5) * -0.8}s infinite`,
              }}
            >
              <div className="text-4xl drop-shadow-[0_0_22px_rgba(255,255,255,0.25)]" style={{ color }}>
                ?
              </div>
              <div className="mt-2 max-w-[160px] text-xs leading-relaxed text-white/44">
                {fragment.content}
              </div>
            </div>
          );
        })}

        {userFields.map(({ user, color, state, stateAccent, x, y, driftDuration, driftDelay, actionEnergy }) => (
          <div
            key={user.id}
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-center"
            style={{
              left: x,
              top: y,
              animation: `field-float ${driftDuration}s ease-in-out ${driftDelay}s infinite`,
            }}
          >
            <span
              className="absolute left-1/2 top-1/2 h-14 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full aura-trace"
              style={{
                background: `linear-gradient(90deg, transparent 0%, ${stateAccent}28 45%, transparent 100%)`,
                filter: 'blur(8px)',
                opacity: user.isGhost ? 0.08 : 0.24 + actionEnergy * 0.16,
                transform: `translate(-50%, -50%) rotate(${Math.round((x - center.x) * 0.06)}deg)`,
              }}
            />
            <div
              className="absolute rounded-full aura-breathe"
              style={{
                inset: `${-18 - actionEnergy * 8}px`,
                background: `radial-gradient(circle, ${stateAccent}28 0%, transparent 74%)`,
                opacity: user.isGhost ? 0.12 : 0.28 + actionEnergy * 0.18,
                filter: 'blur(14px)',
                animationDelay: `${driftDelay}s`,
              }}
            />
            <div
              className={`relative rounded-full ${user.isTyping ? 'aura-breathe-fast' : 'aura-breathe'}`}
              style={{
                width: 26 + actionEnergy * 12,
                height: 26 + actionEnergy * 12,
                border: `1px solid ${color}`,
                boxShadow: `0 0 ${28 + actionEnergy * 22}px ${color}, 0 0 ${48 + actionEnergy * 30}px ${stateAccent}22`,
                opacity: user.isGhost ? 0.24 : 0.76,
                background: `radial-gradient(circle, ${color}${user.isGhost ? '22' : '66'} 0%, transparent 72%)`,
                animationDelay: `${driftDelay}s`,
              }}
            >
              <span
                className="absolute rounded-full aura-breathe"
                style={{
                  inset: `${-10 - actionEnergy * 4}px`,
                  border: `1px solid ${stateAccent}`,
                  opacity: user.isGhost ? 0.1 : 0.18 + actionEnergy * 0.14,
                  animationDuration: '5.4s',
                  animationDelay: `${driftDelay - 0.6}s`,
                }}
              />
              <span
                className={`absolute rounded-full ${user.isTyping ? 'aura-breathe-fast' : 'aura-breathe'}`}
                style={{
                  inset: `${-20 - actionEnergy * 7}px`,
                  border: `1px solid ${stateAccent}`,
                  opacity: user.isGhost ? 0.06 : 0.1 + actionEnergy * 0.12,
                  animationDuration: state === 'intense' ? '0.8s' : state === 'active' ? '1.5s' : '3s',
                  animationDelay: `${driftDelay - 1.1}s`,
                }}
              />
            </div>
            <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.26em] text-white/32">
              {user.username}
            </div>
            <div className="mt-1 h-[2px] w-12 overflow-hidden rounded-full bg-white/8">
              <div
                className={state === 'intense' ? 'aura-strobe' : state === 'active' ? 'aura-breathe-fast' : 'aura-breathe'}
                style={{
                  width: `${28 + actionEnergy * 46}%`,
                  height: '100%',
                  background: stateAccent,
                  boxShadow: `0 0 10px ${stateAccent}`,
                }}
              />
            </div>
          </div>
        ))}

        {explosions.map((burst) => (
          <div
            key={burst.id}
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: burst.x, top: burst.y }}
          >
            <span
              className="message-explosion-core"
              style={{
                background: burst.color,
                boxShadow: `0 0 36px ${burst.color}`,
                transform: `scale(${burst.intensity})`,
              }}
            />
            {Array.from({ length: 12 }, (_, index) => {
              const angle = (index / 12) * Math.PI * 2;
              const distance = 44 + burst.intensity * 18 + (index % 3) * 10;
              return (
                <span
                  key={`${burst.id}-${index}`}
                  className="message-explosion-particle"
                  style={
                    {
                      '--burst-x': `${Math.cos(angle) * distance}px`,
                      '--burst-y': `${Math.sin(angle) * distance}px`,
                      '--burst-color': burst.color,
                      '--burst-delay': `${index * 18}ms`,
                    } as CSSProperties
                  }
                />
              );
            })}
          </div>
        ))}

        {ghostTrails.slice(-3).map((trail, index) => {
          const color = roomColors[trail.userId] ?? trail.color;
          return (
            <div
              key={`${trail.userId}-${trail.leftAt}`}
              className="pointer-events-none absolute text-[10px] uppercase tracking-[0.2em] text-white/18"
              style={{
                left: `${10 + (index % 3) * 22}%`,
                top: `${12 + Math.floor(index / 3) * 8}%`,
              }}
            >
              <div className="font-mono" style={{ color }}>
                {trail.username} faded
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
