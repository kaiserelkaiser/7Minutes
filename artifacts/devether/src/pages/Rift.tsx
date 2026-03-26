import { useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { OrganismField } from '@/components/devether/OrganismField';
import { ThoughtManifest } from '@/components/devether/ThoughtManifest';
import { useSocketRift } from '@/hooks/use-socket';
import { formatClock } from '@/lib/sevenMinutes';
import { toast } from '@/hooks/use-toast';

const RIFT_DURATION_SECONDS = 420;

function describeVibe(color: string, temperature: number, isChaos: boolean) {
  if (isChaos) return 'chaotic';
  if (color.includes('255, 107, 107') || color.includes('#ff6b6b')) return 'heated';
  if (color.includes('#ccff00')) return 'creative';
  if (color.includes('#9b5cff')) return 'mysterious';
  if (temperature < 28) return 'calm';
  return 'electric';
}

export default function Rift() {
  const { id: routeRiftId } = useParams();
  const [, setLocation] = useLocation();
  const [session, setSession] = useState<{
    userId: string;
    username: string;
    color: string;
    riftId: string;
    isRadio?: boolean;
  } | null>(null);
  const [isGhostMode, setIsGhostMode] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('devether_user');
    if (!stored) {
      setLocation('/');
      return;
    }

    const parsed = JSON.parse(stored) as {
      userId: string;
      username: string;
      color: string;
      riftId: string;
      isRadio?: boolean;
    };

    if (parsed.riftId !== routeRiftId) {
      setLocation('/');
      return;
    }

    setSession(parsed);
  }, [routeRiftId, setLocation]);

  const {
    isConnected,
    messages,
    users,
    fragments,
    ghostTrails,
    vibe,
    timeLeft,
    isClosed,
    riftState,
    echoMoment,
    catalyst,
    socketError,
    isLastWordGambit,
    lastWordWinner,
    sendMessage,
    setTyping,
    toggleGhostMode,
    dropFragment,
  } = useSocketRift(
    session?.riftId ?? null,
    session?.userId ?? null,
    session?.username ?? null,
    session?.color ?? null,
    session?.isRadio ?? false,
  );

  const isRadio = session?.isRadio ?? false;
  const topic = riftState?.topic ?? 'Entering organism';
  const temperature = riftState?.temperature ?? 0;
  const isChaos = riftState?.isChaosMode ?? false;
  const currentUser = session ? users[session.userId] : null;
  const burstAvailable = !isRadio && !currentUser?.burstUsed;
  const timeRatio = Math.max(0, Math.min(1, timeLeft / RIFT_DURATION_SECONDS));
  const circumference = 2 * Math.PI * 118;
  const dashOffset = circumference * (1 - timeRatio);
  const vibeLabel = describeVibe(vibe, temperature, isChaos);

  useEffect(() => {
    document.title = `7MINUTES - ${topic}`;
  }, [topic]);

  useEffect(() => {
    if (!socketError) return;

    toast({
      title: 'The organism destabilized',
      description: socketError,
      variant: 'destructive',
    });

    const timeout = setTimeout(() => {
      sessionStorage.removeItem('devether_user');
      setLocation('/');
    }, 1400);

    return () => clearTimeout(timeout);
  }, [setLocation, socketError]);

  useEffect(() => {
    if (!isClosed) return;
    const timeout = setTimeout(() => {
      sessionStorage.removeItem('devether_user');
      setLocation('/');
    }, 5000);
    return () => clearTimeout(timeout);
  }, [isClosed, setLocation]);

  useEffect(() => {
    const blockContext = (event: MouseEvent) => event.preventDefault();
    const blockKeys = (event: KeyboardEvent) => {
      const modifier = event.ctrlKey || event.metaKey;
      if (modifier && ['c', 's', 'p'].includes(event.key.toLowerCase())) {
        event.preventDefault();
      }
    };

    window.addEventListener('contextmenu', blockContext);
    window.addEventListener('keydown', blockKeys);

    return () => {
      window.removeEventListener('contextmenu', blockContext);
      window.removeEventListener('keydown', blockKeys);
    };
  }, []);

  if (!session) {
    return null;
  }

  return (
    <main
      className={`relative min-h-[100svh] overflow-x-hidden overflow-y-auto bg-[#0a0118] pb-28 text-white sm:pb-36 ${timeLeft <= 30 ? 'last-seconds' : ''}`}
      style={{
        backgroundImage: `radial-gradient(circle at 50% 50%, ${vibe}18 0%, transparent 34%), linear-gradient(180deg, #0a0118 0%, #04010b 100%)`,
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.06),_transparent_24%),radial-gradient(circle_at_bottom,_rgba(255,0,255,0.12),_transparent_34%)]" />

      <OrganismField
        topic={topic}
        vibeColor={vibe}
        messages={messages}
        users={users}
        fragments={fragments}
        ghostTrails={ghostTrails}
      />

      <ThoughtManifest
        userKey={session.username}
        vibeColor={vibe}
        isGhost={isGhostMode}
        isRadio={isRadio}
        burstAvailable={burstAvailable}
        onSendMessage={sendMessage}
        onDropFragment={dropFragment}
        onTyping={setTyping}
      />

      <div className="pointer-events-none absolute left-1/2 top-1/2 z-[150] -translate-x-1/2 -translate-y-1/2">
        <svg width="280" height="280" viewBox="0 0 280 280" className="h-[220px] w-[220px] overflow-visible sm:h-[280px] sm:w-[280px]">
          <circle cx="140" cy="140" r="118" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          <circle
            cx="140"
            cy="140"
            r="118"
            fill="none"
            stroke={timeLeft <= 30 ? '#ff6b6b' : vibe}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 140 140)"
            style={{ filter: `drop-shadow(0 0 16px ${vibe})` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <div className="font-mono text-[11px] uppercase tracking-[0.65em] text-white/34">temporal core</div>
          <div className="mt-3 font-display text-3xl tracking-[0.3em] text-white sm:text-4xl sm:tracking-[0.38em]">{formatClock(timeLeft)}</div>
          <div className="mt-2 text-xs uppercase tracking-[0.32em] sm:mt-3 sm:text-sm sm:tracking-[0.4em]" style={{ color: vibe }}>{vibeLabel}</div>
        </div>
      </div>

      <div className="pointer-events-none absolute left-4 top-4 z-[150] max-w-[14rem] sm:left-8 sm:top-8 sm:max-w-sm">
        <div className="font-mono text-[11px] uppercase tracking-[0.58em] text-white/30">organism status</div>
        <h1 className="mt-3 font-display text-[clamp(1.35rem,4vw,3.2rem)] uppercase tracking-[0.18em] text-white sm:mt-4 sm:tracking-[0.28em]">{topic}</h1>
        <div className="mt-2 text-xs leading-6 text-white/55 sm:mt-3 sm:text-sm sm:leading-7">
          {Object.values(users).filter((user) => !user.isRadio).length} visible minds - heat {Math.round(temperature)} - {isChaos ? 'chaos mode' : 'living equilibrium'}
        </div>
      </div>

      <div className="absolute right-4 top-4 z-[160] flex flex-col items-end gap-2.5 sm:right-8 sm:top-8 sm:gap-3">
        <button
          onClick={() => {
            const next = !isGhostMode;
            setIsGhostMode(next);
            toggleGhostMode(next);
          }}
          className="pointer-events-auto liquid-switch text-[10px] uppercase tracking-[0.4em]"
          style={{
            borderColor: isGhostMode ? session.color : 'rgba(255,255,255,0.1)',
            color: isGhostMode ? '#ffffff' : 'rgba(255,255,255,0.6)',
            background: isGhostMode ? `${session.color}22` : 'rgba(255,255,255,0.05)',
          }}
        >
          {isGhostMode ? 'ghost wireframe' : 'solid aura'}
        </button>

        {!isConnected && (
          <div className="pointer-events-none font-mono text-[10px] uppercase tracking-[0.45em] text-red-300/70">reconnecting</div>
        )}

        {isLastWordGambit && (
          <div className="pointer-events-none font-mono text-[10px] uppercase tracking-[0.42em] text-[#ff6b6b]">last word gambit active</div>
        )}
      </div>

      <div className="pointer-events-none absolute bottom-4 left-4 z-[150] max-w-[min(85vw,22rem)] text-xs leading-6 text-white/46 sm:bottom-8 sm:left-8 sm:max-w-md sm:text-sm sm:leading-7">
        <div className="font-mono text-[11px] uppercase tracking-[0.48em] text-white/28">controls</div>
        <div className="mt-3">Type anywhere. Enter births a thought. Tab becomes a smoke fragment. Escape clears the thought. Hold space on an empty draft for 3 seconds to arm burst mode.</div>
      </div>

      <div className="pointer-events-none absolute bottom-4 right-4 z-[150] max-w-[42vw] text-right text-[9px] uppercase tracking-[0.38em] text-white/16 sm:bottom-8 sm:right-8 sm:max-w-none sm:text-[10px] sm:tracking-[0.52em]">
        <div>{session.username}</div>
        <div className="mt-2">7MINUTES - no history - no replay</div>
        <div className="mt-2">{session.riftId}</div>
      </div>

      <AnimatePresence>
        {catalyst && (
          <motion.div
            initial={{ opacity: 0, y: -120, scale: 0.4 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            className="pointer-events-none absolute left-1/2 top-28 z-[170] -translate-x-1/2 text-center"
          >
            <div className="mx-auto h-6 w-6 rounded-full bg-white/90 shadow-[0_0_30px_rgba(255,255,255,0.8)]" />
            <div className="mt-6 max-w-lg rounded-[48%_52%_55%_45%/41%_44%_56%_59%] border border-white/12 bg-black/25 px-8 py-6 backdrop-blur-xl">
              <div className="font-mono text-[10px] uppercase tracking-[0.55em] text-white/38">catalyst bomb</div>
              <div className="mt-4 text-lg leading-8 text-white/88">{catalyst}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {echoMoment && (
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            className="pointer-events-none absolute inset-0 z-[180] flex items-center justify-center"
          >
            <div className="text-center">
              <div className="font-mono text-[11px] uppercase tracking-[0.6em] text-white/40">resonance moment</div>
              <div className="mt-6 text-[clamp(2rem,4.5vw,4rem)] font-semibold leading-tight text-white [text-shadow:0_0_42px_rgba(255,255,255,0.42)]">
                {echoMoment.mergedContent}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isClosed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-[220] flex items-center justify-center bg-[#030109]/92"
          >
            <div className="text-center">
              <motion.div
                animate={{ scale: [1, 0.2, 0], opacity: [1, 1, 0] }}
                transition={{ duration: 2.4, ease: 'easeIn' }}
                className="mx-auto h-40 w-40 rounded-full border"
                style={{ borderColor: vibe, boxShadow: `0 0 60px ${vibe}` }}
              />
              <div className="mt-10 font-display text-4xl uppercase tracking-[0.4em] text-white">evaporation complete</div>
              <div className="mt-4 text-sm uppercase tracking-[0.45em] text-white/36">
                {lastWordWinner ? `last visible pulse by ${users[lastWordWinner]?.username ?? 'unknown mind'}` : 'the organism closed itself'}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
