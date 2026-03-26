import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildOrganicPath, colorFromString } from '@/lib/sevenMinutes';

interface ThoughtManifestProps {
  userKey: string;
  vibeColor: string;
  isGhost: boolean;
  isRadio: boolean;
  burstAvailable: boolean;
  onSendMessage: (content: string, isBurst?: boolean) => void;
  onDropFragment: (content: string) => void;
  onTyping: (typing: boolean) => void;
}

export function ThoughtManifest({
  userKey,
  vibeColor,
  isGhost,
  isRadio,
  burstAvailable,
  onSendMessage,
  onDropFragment,
  onTyping,
}: ThoughtManifestProps) {
  const [draft, setDraft] = useState('');
  const [mode, setMode] = useState<'message' | 'fragment'>('message');
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [phase, setPhase] = useState(0);
  const [burstCharging, setBurstCharging] = useState(false);
  const [burstReady, setBurstReady] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const burstTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setCursor({ x: window.innerWidth / 2, y: window.innerHeight * 0.72 });
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

  const announceTyping = useCallback(() => {
    onTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => onTyping(false), 1600);
  }, [onTyping]);

  const clearBurstTimer = useCallback(() => {
    if (burstTimerRef.current) {
      clearTimeout(burstTimerRef.current);
      burstTimerRef.current = null;
    }
    setBurstCharging(false);
  }, []);

  const commit = useCallback(() => {
    const content = draft.trim();
    if (!content || isGhost || isRadio) return;

    if (mode === 'fragment') {
      onDropFragment(content);
    } else {
      onSendMessage(content, burstReady && burstAvailable);
    }

    setDraft('');
    setBurstReady(false);
    clearBurstTimer();
    onTyping(false);
  }, [burstAvailable, burstReady, clearBurstTimer, draft, isGhost, isRadio, mode, onDropFragment, onSendMessage, onTyping]);

  useEffect(() => {
    const handleMove = (event: MouseEvent) => {
      setCursor({ x: event.clientX, y: event.clientY });
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        commit();
        return;
      }

      if (event.key === 'Tab') {
        event.preventDefault();
        setMode((current) => (current === 'message' ? 'fragment' : 'message'));
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        setDraft('');
        setBurstReady(false);
        clearBurstTimer();
        onTyping(false);
        return;
      }

      if (
        event.key === ' ' &&
        draft.length === 0 &&
        mode === 'message' &&
        burstAvailable &&
        !burstReady
      ) {
        event.preventDefault();
        if (!burstTimerRef.current) {
          setBurstCharging(true);
          burstTimerRef.current = setTimeout(() => {
            setBurstReady(true);
            setBurstCharging(false);
            burstTimerRef.current = null;
          }, 3000);
        }
        return;
      }

      if (event.key === 'Backspace') {
        event.preventDefault();
        setDraft((current) => current.slice(0, -1));
        announceTyping();
        return;
      }

      if (event.key.length === 1) {
        event.preventDefault();
        if (burstCharging) clearBurstTimer();
        setDraft((current) => current + event.key);
        announceTyping();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === ' ' && burstCharging && !burstReady) {
        clearBurstTimer();
      }
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      clearBurstTimer();
    };
  }, [announceTyping, burstAvailable, burstCharging, burstReady, clearBurstTimer, commit, draft.length, mode, onTyping]);

  const previewColor = useMemo(() => colorFromString(userKey, 82, burstReady ? 68 : 60), [burstReady, userKey]);
  const previewPath = useMemo(
    () => buildOrganicPath({
      seed: `${userKey}-${draft.length || 1}`,
      radiusX: Math.max(70, Math.min(160, 76 + draft.length * 2.8)),
      radiusY: Math.max(44, Math.min(110, 52 + draft.length * 1.4)),
      phase,
      sentiment: draft.length % 2 === 0 ? 'positive' : 'neutral',
      wobble: mode === 'fragment' ? 0.26 : 0.18,
    }),
    [draft.length, mode, phase, userKey],
  );
  const burstChargeRatio = burstCharging ? (Math.sin(phase * 4) + 1) / 2 : burstReady ? 1 : 0;

  if (isRadio) {
    return (
      <div className="pointer-events-none absolute inset-x-0 bottom-10 z-[120] flex justify-center">
        <div className="text-center font-mono text-[11px] uppercase tracking-[0.45em] text-white/40">
          radio mode
          <div className="mt-2 font-sans text-sm normal-case tracking-normal text-white/55">
            observe the organism without leaving a trace
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-[140] overflow-hidden">
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          left: cursor.x,
          top: cursor.y,
          width: 84,
          height: 84,
          background: `radial-gradient(circle, ${previewColor}22 0%, transparent 72%)`,
          filter: 'blur(12px)',
          opacity: draft ? 0.9 : 0.48,
        }}
      />

      <div
        className="absolute -translate-x-1/2 -translate-y-1/2"
        style={{ left: cursor.x, top: cursor.y }}
      >
        {draft && (
          <div className="relative">
            <svg width="360" height="220" viewBox="-180 -110 360 220" className="overflow-visible">
              <defs>
                <filter id="thought-glow" x="-120%" y="-120%" width="340%" height="340%">
                  <feGaussianBlur stdDeviation="10" result="blur" />
                  <feColorMatrix
                    in="blur"
                    type="matrix"
                    values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8"
                    result="glow"
                  />
                  <feMerge>
                    <feMergeNode in="glow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <path
                d={previewPath}
                fill={mode === 'fragment' ? 'rgba(155, 92, 255, 0.16)' : 'rgba(0, 245, 255, 0.12)'}
                stroke={previewColor}
                strokeWidth={burstReady ? 2.6 : 1.8}
                filter="url(#thought-glow)"
              />
              <circle
                cx="0"
                cy="0"
                r={72 + burstChargeRatio * 10}
                fill="none"
                stroke={previewColor}
                strokeOpacity={burstReady ? 0.45 : 0.18}
                strokeDasharray="5 14"
                strokeWidth="1"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center px-10 text-center">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.45em] text-white/40">
                  {mode === 'fragment' ? 'fragment' : burstReady ? 'burst armed' : 'manifesting'}
                </div>
                <div className="mt-3 max-w-[260px] text-lg font-medium leading-snug text-white drop-shadow-[0_0_18px_rgba(255,255,255,0.24)]">
                  {draft}
                </div>
                <div className="mt-3 text-[10px] uppercase tracking-[0.32em] text-white/36">
                  {mode === 'fragment' ? 'release a question into the drift' : 'press enter to throw into the core'}
                </div>
              </div>
            </div>
          </div>
        )}

        {!draft && !isGhost && (
          <div className="-translate-x-1/2 -translate-y-1/2 text-center" style={{ color: vibeColor }}>
            <div className="font-mono text-[10px] uppercase tracking-[0.45em] text-white/35">
              type anywhere
            </div>
            <div className="mt-2 text-sm text-white/60">
              Enter sends. Tab toggles fragment. Hold space to arm burst.
            </div>
          </div>
        )}
      </div>

      {draft.split('').slice(-28).map((character, index, collection) => {
        const wave = phase * 2.4 + index * 0.45;
        const spread = (index - collection.length / 2) * 13;
        return (
          <span
            key={`${character}-${index}`}
            className="absolute font-mono text-sm text-white/85"
            style={{
              left: cursor.x + spread + Math.sin(wave) * 8,
              top: cursor.y - 54 + Math.cos(wave * 1.2) * 10,
              textShadow: `0 0 14px ${previewColor}`,
              opacity: 0.18 + index / Math.max(1, collection.length),
              transform: `translate(-50%, -50%) scale(${0.72 + index / Math.max(1, collection.length) * 0.45})`,
            }}
          >
            {character === ' ' ? '.' : character}
          </span>
        );
      })}

      {Array.from({ length: draft ? 6 : 3 }, (_, index) => {
        const orbit = 28 + index * 14;
        const angle = phase * (1.3 + index * 0.16) + index;
        const x = cursor.x + Math.cos(angle) * orbit;
        const y = cursor.y + Math.sin(angle * 1.2) * orbit * 0.55;
        return (
          <span
            key={`thought-orb-${index}`}
            className="absolute block rounded-full"
            style={{
              left: x,
              top: y,
              width: 4 + index,
              height: 4 + index,
              background: previewColor,
              boxShadow: `0 0 16px ${previewColor}`,
              opacity: draft ? 0.22 + index * 0.08 : 0.14 + index * 0.05,
              transform: 'translate(-50%, -50%)',
            }}
          />
        );
      })}

      <div className="absolute left-1/2 top-10 -translate-x-1/2 text-center">
        <div className="font-mono text-[10px] uppercase tracking-[0.55em] text-white/25">
          {isGhost ? 'ghost wireframe active' : burstCharging ? 'charging burst mode' : mode === 'fragment' ? 'fragment mode' : 'message mode'}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-8 flex justify-center">
        <div className="flex flex-wrap items-center justify-center gap-2 px-4">
          <div className="rift-control-chip px-3 py-2 text-[10px] uppercase tracking-[0.28em] text-white/52">
            {mode === 'fragment' ? 'tab for message' : 'tab for fragment'}
          </div>
          <div className="rift-control-chip px-3 py-2 text-[10px] uppercase tracking-[0.28em] text-white/52">
            {burstReady ? 'burst armed' : burstCharging ? 'charging burst' : 'hold space to charge'}
          </div>
          <div className="rift-control-chip px-3 py-2 text-[10px] uppercase tracking-[0.28em] text-white/52">
            escape clears thought
          </div>
        </div>
      </div>
    </div>
  );
}
