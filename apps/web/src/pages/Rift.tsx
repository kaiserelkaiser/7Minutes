import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { LivingBackdrop } from '@/components/atmosphere/LivingBackdrop';
import { OrganismField } from '@/components/devether/OrganismField';
import { ThoughtManifest } from '@/components/devether/ThoughtManifest';
import { useSocketRift } from '@/hooks/use-socket';
import { clearStoredRoomSession, getStoredRoomSession } from '@/lib/auth-session';
import { formatClock } from '@/lib/sevenMinutes';
import { toast } from '@/hooks/use-toast';

const RIFT_DURATION_SECONDS = 420;

function describeVibe(color: string, temperature: number, isChaos: boolean) {
  if (isChaos) return 'chaotic';
  if (color.includes('255, 107, 107') || color.includes('#ff6b6b')) return 'heated';
  if (color.includes('#ccff00')) return 'creative';
  if (color.includes('#9b5cff') || color.includes('#9d00ff')) return 'mysterious';
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
    sessionToken: string;
  } | null>(null);
  const [isGhostMode, setIsGhostMode] = useState(false);

  useEffect(() => {
    const stored = getStoredRoomSession();
    if (!stored) {
      setLocation('/');
      return;
    }

    if (stored.riftId !== routeRiftId) {
      setLocation('/');
      return;
    }

    setSession(stored);
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
    resonanceChain,
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
    session?.sessionToken ?? null,
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
  const visibleUsers = Object.values(users).filter((user) => !user.isRadio).length;
  const activeTypers = Object.values(users).filter((user) => user.isTyping && !user.isRadio).length;
  const livingBlobs = messages.slice(-18).length;

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
      clearStoredRoomSession();
      setLocation('/');
    }, 1400);

    return () => clearTimeout(timeout);
  }, [setLocation, socketError]);

  useEffect(() => {
    if (!isClosed) return;
    const timeout = setTimeout(() => {
      clearStoredRoomSession();
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
      className={`liquid-stage rift-shell relative min-h-[100svh] overflow-hidden text-white ${timeLeft <= 30 ? 'last-seconds' : ''}`}
      style={{
        backgroundImage: `radial-gradient(circle at 50% 50%, ${vibe}18 0%, transparent 34%), linear-gradient(180deg, #0a0118 0%, #04010b 100%)`,
      }}
    >
      <LivingBackdrop
        primary={vibe}
        secondary={session.color}
        tertiary={isChaos ? '#ff3366' : '#9d00ff'}
        energy={isChaos ? 0.92 : 0.7}
        mode="rift"
      />
      <div className="screen-watermark-overlay" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.05),_transparent_24%),radial-gradient(circle_at_bottom,_rgba(255,0,255,0.12),_transparent_34%)]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${vibe}12 0%, transparent 26%), linear-gradient(180deg, transparent 0%, rgba(2, 1, 8, 0.4) 100%)`,
        }}
      />

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

      <div className="absolute left-4 top-4 z-[150] flex max-w-[min(92vw,24rem)] flex-col gap-3 sm:left-8 sm:top-8 sm:max-w-[25rem]">
        <div className="clean-panel px-4 py-4 sm:px-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.56em] text-white/30">organism status</div>
          <h1 className="mt-3 font-display text-[clamp(1.4rem,3vw,3rem)] uppercase tracking-[0.18em] text-white">
            {topic}
          </h1>
          <div className="mt-3 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.28em] text-white/50">
            <span className="simple-chip">{visibleUsers} visible minds</span>
            <span className="simple-chip">heat {Math.round(temperature)}</span>
            <span className="simple-chip">{isChaos ? 'chaos surge' : 'stable drift'}</span>
          </div>
          <div className="mt-3 text-sm leading-6 text-white/58">
            {activeTypers > 0
              ? `${activeTypers} minds are actively shaping the organism right now.`
              : 'The field is breathing between pulses. Any new thought can bend the room.'}
          </div>
        </div>

        <div className="clean-panel-soft px-4 py-3 text-xs leading-6 text-white/54 sm:px-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.48em] text-white/28">interaction physics</div>
          <div className="mt-2">
            Type anywhere. Enter births a thought. Tab releases smoke fragments. Escape clears the current manifestation.
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute left-1/2 top-1/2 z-[150] -translate-x-1/2 -translate-y-1/2">
        <div className="flex h-[238px] w-[238px] items-center justify-center sm:h-[300px] sm:w-[300px]">
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
              style={{ filter: `drop-shadow(0 0 18px ${vibe})` }}
            />
            <circle
              cx="140"
              cy="140"
              r="88"
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeDasharray="4 12"
              strokeWidth="1"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <div className="font-mono text-[10px] uppercase tracking-[0.62em] text-white/34">temporal core</div>
            <div className="mt-4 font-display text-3xl tracking-[0.28em] text-white sm:text-4xl sm:tracking-[0.38em]">
              {formatClock(timeLeft)}
            </div>
            <div className="mt-3 text-[11px] uppercase tracking-[0.34em] text-white/46">
              {livingBlobs} living blobs - {ghostTrails.length} echoes
            </div>
            <div
              className="mt-3 inline-flex items-center rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.28em]"
              style={{
                color: vibe,
                borderColor: `${vibe}55`,
                background: `${vibe}12`,
                boxShadow: `0 0 28px ${vibe}18`,
              }}
            >
              {vibeLabel}
            </div>
          </div>
        </div>
      </div>

      <div className="absolute right-4 top-4 z-[160] flex w-[min(92vw,21rem)] flex-col gap-3 sm:right-8 sm:top-8 sm:w-[22rem]">
        <div className="clean-panel px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.5em] text-white/30">your aura</div>
              <div className="mt-2 text-sm text-white/84">{session.username}</div>
              <div className="mt-1 text-xs uppercase tracking-[0.26em] text-white/44">
                {isRadio ? 'radio drift' : isGhostMode ? 'ghost wireframe' : 'solid aura'}
              </div>
            </div>
            <div
              className="h-12 w-12 rounded-full"
              style={{
                background: `radial-gradient(circle, ${session.color} 0%, transparent 72%)`,
                boxShadow: `0 0 38px ${session.color}`,
                opacity: isGhostMode ? 0.5 : 0.9,
              }}
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => {
                const next = !isGhostMode;
                setIsGhostMode(next);
                toggleGhostMode(next);
              }}
              className="pointer-events-auto control-button px-4 py-2 text-xs uppercase tracking-[0.28em]"
              style={{
                borderColor: isGhostMode ? session.color : 'rgba(255,255,255,0.12)',
                color: isGhostMode ? '#ffffff' : 'rgba(255,255,255,0.74)',
                boxShadow: isGhostMode ? `0 0 28px ${session.color}28` : undefined,
              }}
            >
              {isGhostMode ? 'ghost wireframe' : 'solid aura'}
            </button>
            <div className="simple-chip">
              {burstAvailable ? 'burst ready' : 'burst spent'}
            </div>
            <div className="simple-chip">
              {messages.length} transmissions
            </div>
          </div>
        </div>

        <div className="clean-panel-soft px-4 py-3 sm:px-5">
          {!isConnected && (
            <div className="font-mono text-[10px] uppercase tracking-[0.45em] text-red-300/74">
              reconnecting to the organism
            </div>
          )}
          {isLastWordGambit && (
            <div className="font-mono text-[10px] uppercase tracking-[0.42em] text-[#ff6b6b]">
              last word gambit active
            </div>
          )}
          {!isConnected && isLastWordGambit && <div className="mt-2 h-px bg-white/8" />}
          <div className="mt-2 text-xs leading-6 text-white/54">
            Room id {session.riftId}. Screens fade, memories distort, and every thought is already dying the second it lands.
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 left-4 z-[150] max-w-[min(92vw,24rem)] sm:bottom-8 sm:left-8">
        <div className="clean-panel-soft px-4 py-3 text-xs leading-6 text-white/52 sm:px-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.48em] text-white/26">conversation current</div>
          <div className="mt-2">
            {isRadio
              ? 'You are drifting invisibly. Watch the organism without adding mass to it.'
              : 'Every reply bends gravity toward the center. Similar ideas can resonate and detonate the room.'}
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-4 right-4 z-[150] max-w-[70vw] sm:bottom-8 sm:right-8 sm:max-w-none">
        <div className="watermark-shell px-4 py-3 text-right text-[9px] uppercase tracking-[0.34em] text-white/24 sm:text-[10px] sm:tracking-[0.48em]">
          <div>{session.username}</div>
          <div className="mt-2">7MINUTES - no history - no replay</div>
          <div className="mt-2">{session.riftId}</div>
        </div>
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
            <div className="clean-panel mt-6 max-w-lg px-8 py-6">
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
            <div className="clean-panel max-w-[min(82vw,46rem)] px-8 py-7 text-center">
              <div className="font-mono text-[11px] uppercase tracking-[0.6em] text-white/40">resonance moment</div>
              <div className="mt-6 text-[clamp(2rem,4.5vw,4rem)] font-semibold leading-tight text-white [text-shadow:0_0_42px_rgba(255,255,255,0.42)]">
                {echoMoment.mergedContent}
              </div>
              <div className="mt-4 text-xs uppercase tracking-[0.32em] text-white/44">
                the room bent around a shared thought
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {resonanceChain && (
          <motion.div
            initial={{ opacity: 0, scale: 0.76 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.15 }}
            className="pointer-events-none absolute inset-0 z-[185] flex items-center justify-center"
          >
            <div className="clean-panel max-w-[min(82vw,44rem)] px-8 py-7 text-center shadow-[0_0_70px_rgba(255,226,122,0.28)]">
              <div className="font-mono text-[11px] uppercase tracking-[0.55em] text-[#ffe27a]/72">
                {resonanceChain.achievement}
              </div>
              <div className="mt-4 text-[clamp(2rem,4vw,3.4rem)] font-semibold uppercase tracking-[0.18em] text-white">
                {resonanceChain.sharedThought}
              </div>
              <div className="mt-4 text-sm uppercase tracking-[0.34em] text-white/52">
                {resonanceChain.participants.map((participant) => participant.username).join(' / ')}
              </div>
              <div className="mt-3 text-xs uppercase tracking-[0.28em] text-[#ffe27a]/70">
                golden aura {resonanceChain.goldenAuraSeconds}s - next thoughts x{resonanceChain.messageBoostMultiplier.toFixed(1)}
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
            <div className="clean-panel px-10 py-10 text-center">
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
