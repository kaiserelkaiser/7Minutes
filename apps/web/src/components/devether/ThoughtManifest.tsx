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
  const [burstCharging, setBurstCharging] = useState(false);
  const [burstReady, setBurstReady] = useState(false);
  const [isMobileComposer, setIsMobileComposer] = useState(false);
  const [composerFocused, setComposerFocused] = useState(false);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const burstTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerFrameRef = useRef<number | null>(null);
  const pendingCursorRef = useRef({ x: 0, y: 0 });
  const mobileInputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const initial = { x: window.innerWidth / 2, y: window.innerHeight * 0.72 };
    pendingCursorRef.current = initial;
    setCursor(initial);
  }, []);

  useEffect(() => {
    const updateMobileState = () => {
      const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
      setIsMobileComposer(coarsePointer || window.innerWidth < 860);
    };

    const updateViewportOffset = () => {
      const viewport = window.visualViewport;
      if (!viewport) {
        setKeyboardOffset(0);
        return;
      }

      const offset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      setKeyboardOffset(offset);
    };

    updateMobileState();
    updateViewportOffset();

    window.addEventListener('resize', updateMobileState);
    window.visualViewport?.addEventListener('resize', updateViewportOffset);
    window.visualViewport?.addEventListener('scroll', updateViewportOffset);

    return () => {
      window.removeEventListener('resize', updateMobileState);
      window.visualViewport?.removeEventListener('resize', updateViewportOffset);
      window.visualViewport?.removeEventListener('scroll', updateViewportOffset);
    };
  }, []);

  useEffect(() => {
    if (!isMobileComposer) return;

    const nextCursor = {
      x: window.innerWidth / 2,
      y: window.innerHeight - keyboardOffset - (composerFocused ? 214 : 178),
    };

    pendingCursorRef.current = nextCursor;
    setCursor(nextCursor);
  }, [composerFocused, isMobileComposer, keyboardOffset]);

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

  const toggleBurstArm = useCallback(() => {
    if (!burstAvailable || mode === 'fragment') return;
    clearBurstTimer();
    setBurstReady((current) => !current);
  }, [burstAvailable, clearBurstTimer, mode]);

  const focusMobileComposer = useCallback(() => {
    setComposerFocused(true);
    requestAnimationFrame(() => {
      mobileInputRef.current?.focus();
    });
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
    mobileInputRef.current?.focus();
  }, [burstAvailable, burstReady, clearBurstTimer, draft, isGhost, isRadio, mode, onDropFragment, onSendMessage, onTyping]);

  useEffect(() => {
    const scheduleCursor = (x: number, y: number) => {
      pendingCursorRef.current = { x, y };
      if (pointerFrameRef.current !== null) return;

      pointerFrameRef.current = requestAnimationFrame(() => {
        pointerFrameRef.current = null;
        setCursor(pendingCursorRef.current);
      });
    };

    const handleMove = (event: MouseEvent) => {
      scheduleCursor(event.clientX, event.clientY);
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
      if (pointerFrameRef.current !== null) cancelAnimationFrame(pointerFrameRef.current);
      clearBurstTimer();
    };
  }, [announceTyping, burstAvailable, burstCharging, burstReady, clearBurstTimer, commit, draft.length, mode, onTyping]);

  const previewColor = useMemo(() => colorFromString(userKey, 82, burstReady ? 68 : 60), [burstReady, userKey]);
  const previewPath = useMemo(
    () => buildOrganicPath({
      seed: `${userKey}-${draft.length || 1}`,
      radiusX: Math.max(72, Math.min(148, 78 + draft.length * 2.2)),
      radiusY: Math.max(46, Math.min(102, 54 + draft.length * 1.15)),
      phase: draft.length * 0.18 + (burstReady ? 0.6 : 0),
      sentiment: draft.length % 2 === 0 ? 'positive' : 'neutral',
      wobble: mode === 'fragment' ? 0.2 : 0.14,
    }),
    [burstReady, draft.length, mode, userKey],
  );
  const burstChargeRatio = burstCharging ? 0.6 : burstReady ? 1 : 0;
  const trailingCharacters = draft.split('').slice(-20);
  const orbitCount = draft ? 4 : 2;

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
        className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full thought-cursor-glow"
        style={{
          left: cursor.x,
          top: cursor.y,
          width: 84,
          height: 84,
          background: `radial-gradient(circle, ${previewColor}22 0%, transparent 72%)`,
          opacity: draft ? 0.9 : 0.48,
        }}
      />

      <div
        className="absolute -translate-x-1/2 -translate-y-1/2"
        style={{ left: cursor.x, top: cursor.y }}
      >
        {draft ? (
          <div className="relative">
            <svg width="340" height="204" viewBox="-170 -102 340 204" className="overflow-visible">
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
                fill={mode === 'fragment' ? 'rgba(155, 92, 255, 0.14)' : 'rgba(0, 245, 255, 0.1)'}
                stroke={previewColor}
                strokeWidth={burstReady ? 2.4 : 1.7}
                filter="url(#thought-glow)"
              />
              <circle
                cx="0"
                cy="0"
                r={70 + burstChargeRatio * 12}
                fill="none"
                stroke={previewColor}
                strokeOpacity={burstReady ? 0.45 : 0.16}
                strokeDasharray="5 14"
                strokeWidth="1"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center px-10 text-center">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.45em] text-white/40">
                  {mode === 'fragment' ? 'fragment' : burstReady ? 'burst armed' : 'manifesting'}
                </div>
                <div className="mt-3 max-w-[240px] text-base font-medium leading-snug text-white drop-shadow-[0_0_18px_rgba(255,255,255,0.24)] sm:text-lg">
                  {draft}
                </div>
                <div className="mt-3 text-[10px] uppercase tracking-[0.32em] text-white/36">
                  {mode === 'fragment' ? 'release a question into the drift' : 'press enter to throw into the core'}
                </div>
              </div>
            </div>
          </div>
        ) : !isGhost && !isMobileComposer ? (
          <div className="-translate-x-1/2 -translate-y-1/2 text-center" style={{ color: vibeColor }}>
            <div className="font-mono text-[9px] uppercase tracking-[0.34em] text-white/24">
              type anywhere
            </div>
            <div className="mt-1.5 text-xs text-white/42">
              Enter sends.
            </div>
          </div>
        ) : null}
      </div>

      {trailingCharacters.map((character, index, collection) => {
        const progress = index / Math.max(1, collection.length - 1);
        const spread = (index - collection.length / 2) * 12;
        return (
          <span
            key={`${character}-${index}`}
            className="thought-trail-char absolute font-mono text-sm text-white/80"
            style={{
              left: cursor.x + spread,
              top: cursor.y - 46 - progress * 24,
              textShadow: `0 0 14px ${previewColor}`,
              opacity: 0.16 + progress * 0.44,
              transform: `translate(-50%, -50%) scale(${0.78 + progress * 0.24})`,
              animationDelay: `${index * 70}ms`,
            }}
          >
            {character === ' ' ? '.' : character}
          </span>
        );
      })}

      {Array.from({ length: orbitCount }, (_, index) => {
        const orbit = 30 + index * 16;
        const side = index % 2 === 0 ? -1 : 1;
        return (
          <span
            key={`thought-orb-${index}`}
            className="thought-orb absolute block rounded-full"
            style={{
              left: cursor.x + side * orbit,
              top: cursor.y - orbit * 0.22,
              width: 5 + index,
              height: 5 + index,
              background: previewColor,
              boxShadow: `0 0 16px ${previewColor}`,
              opacity: draft ? 0.18 + index * 0.08 : 0.14 + index * 0.04,
              transform: 'translate(-50%, -50%)',
              animationDelay: `${index * 180}ms`,
            }}
          />
        );
      })}

      {isMobileComposer && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[165] px-4"
          style={{
            transform: `translateY(-${keyboardOffset}px)`,
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 14px)',
          }}
        >
          {!composerFocused && !draft && !isGhost && (
            <div className="mb-3 flex justify-center">
              <button
                type="button"
                onClick={focusMobileComposer}
                className="mobile-thought-orb pointer-events-auto"
              >
                <span className="mobile-thought-orb__pulse" />
                <span className="mobile-thought-orb__core">
                  <span className="mobile-thought-orb__title">open channel</span>
                  <span className="mobile-thought-orb__hint">tap to bring in the keyboard</span>
                </span>
              </button>
            </div>
          )}

          <div className="mobile-thought-dock pointer-events-auto mx-auto max-w-xl">
            <div className="mobile-thought-dock__topline">
              <div className="mobile-thought-dock__label">
                {mode === 'fragment' ? 'question fragment' : burstReady ? 'burst armed' : 'live thought'}
              </div>
              {!isGhost ? (
                <button
                  type="button"
                  onClick={() => setMode((current) => (current === 'message' ? 'fragment' : 'message'))}
                  className="mobile-thought-dock__toggle"
                >
                  {mode === 'fragment' ? 'switch to message' : 'switch to fragment'}
                </button>
              ) : (
                <div className="mobile-thought-dock__ghost">ghost mode</div>
              )}
            </div>

            <div className="mobile-thought-dock__composer">
              <textarea
                ref={mobileInputRef}
                value={draft}
                onFocus={() => setComposerFocused(true)}
                onBlur={() => setComposerFocused(false)}
                onChange={(event) => {
                  if (burstCharging) clearBurstTimer();
                  setDraft(event.target.value);
                  announceTyping();
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    commit();
                  }
                }}
                rows={2}
                maxLength={280}
                enterKeyHint={mode === 'fragment' ? 'done' : 'send'}
                autoCapitalize="sentences"
                autoCorrect="on"
                placeholder={
                  isGhost
                    ? 'ghost mode blocks your output'
                    : mode === 'fragment'
                      ? 'drop a fragment into the room'
                      : 'tap here and send a thought'
                }
                className="mobile-thought-dock__input"
              />

              <div className="mobile-thought-dock__actions">
                <button
                  type="button"
                  onClick={toggleBurstArm}
                  disabled={!burstAvailable || mode === 'fragment'}
                  className={`mobile-thought-dock__burst ${burstReady ? 'mobile-thought-dock__burst--armed' : ''}`}
                >
                  {burstReady ? 'burst ready' : 'burst'}
                </button>

                <button
                  type="button"
                  onClick={commit}
                  disabled={!draft.trim() || isGhost}
                  className="mobile-thought-dock__send"
                >
                  {mode === 'fragment' ? 'drop' : 'send'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {(mode === 'fragment' || burstCharging || burstReady || isGhost) && (
        <div className="pointer-events-none absolute left-1/2 top-10 -translate-x-1/2 text-center">
          <div className="font-mono text-[9px] uppercase tracking-[0.38em] text-white/24">
            {isGhost ? 'ghost' : burstCharging ? 'charging burst' : burstReady ? 'burst armed' : 'fragment mode'}
          </div>
        </div>
      )}
    </div>
  );
}
