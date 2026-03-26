import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { useHealthCheck, useJoinRift, useListRifts } from '@workspace/api-client-react';
import { RoomUniverse } from '@/components/canvas/RoomUniverse';
import { PlatformStatus } from '@/components/system/PlatformStatus';
import { getRuntimeConfig } from '@/lib/runtime-config';
import { colorFromString } from '@/lib/sevenMinutes';
import { toast } from '@/hooks/use-toast';

const DEFAULT_TOPICS = [
  'After Midnight Confessional',
  'Future Cities',
  'Emotional Debates',
  'Creative Disaster Stories',
  'What Changes People',
  'Invent Tomorrow',
];

const LOADING_MESSAGES = [
  'awakening the membrane...',
  'aligning planetary frequencies...',
  'calling nearby minds into orbit...',
  'warming the organism core...',
];

export default function Landing() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState('');
  const [customTopic, setCustomTopic] = useState('');
  const [hoveredRoomId, setHoveredRoomId] = useState<string | null>(null);
  const [joinMode, setJoinMode] = useState<'participate' | 'radio'>('participate');
  const [loadingMessage] = useState(() => LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]);
  const runtime = useMemo(() => getRuntimeConfig(), []);
  const {
    data,
    isLoading,
    isError: isRiftsError,
    error: riftsError,
  } = useListRifts({
    query: {
      queryKey: ['/api/rifts'],
      staleTime: 3500,
      refetchInterval: 4000,
      refetchIntervalInBackground: true,
    },
  });
  const { isSuccess: isHealthy, isLoading: isHealthLoading } = useHealthCheck({
    query: {
      queryKey: ['/api/healthz'],
      staleTime: 10000,
      retry: 1,
      refetchInterval: 10000,
      refetchIntervalInBackground: true,
    },
  });

  useEffect(() => {
    document.title = '7MINUTES';
  }, []);

  const joinMutation = useJoinRift({
    mutation: {
      onSuccess: (response) => {
        sessionStorage.setItem(
          'devether_user',
          JSON.stringify({
            userId: response.userId,
            username: username.trim(),
            color: response.userColor,
            riftId: response.riftId,
            isRadio: response.asRadio,
          }),
        );
        setLocation(`/rift/${response.riftId}`);
      },
      onError: (error) => {
        toast({
          title: 'Unable to enter the organism',
          description: error instanceof Error ? error.message : 'Try another orbit.',
          variant: 'destructive',
        });
      },
    },
  });

  const rifts = data?.rifts ?? [];
  const hoveredRoom = rifts.find((room) => room.id === hoveredRoomId) ?? null;
  const localHour = new Date().getHours();
  const topicSeeds = useMemo(() => {
    const seeds = [...DEFAULT_TOPICS];
    if (localHour >= 23 || localHour < 3) {
      seeds.unshift('Nightly Void');
    }
    return seeds;
  }, [localHour]);

  const identityGlow = useMemo(
    () => (username.trim() ? colorFromString(username.trim(), 82, 64) : '#00f5ff'),
    [username],
  );
  const backendErrorMessage = riftsError instanceof Error ? riftsError.message : null;
  const isDegraded = isRiftsError;
  const canJoin = Boolean(username.trim()) && !joinMutation.isPending && !isDegraded;

  const enterRoom = (topic: string, roomId?: string, quantum = false) => {
    const handle = username.trim().slice(0, 24);
    const chosenTopic = topic.trim().slice(0, 60);
    if (!handle || !chosenTopic || isDegraded) return;

    joinMutation.mutate({
      data: {
        username: handle,
        topic: chosenTopic,
        riftId: roomId,
        quantum,
        asRadio: joinMode === 'radio',
      },
    });
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(0,245,255,0.12),_transparent_35%),radial-gradient(circle_at_bottom,_rgba(255,0,255,0.12),_transparent_30%),linear-gradient(180deg,_#0a0118_0%,_#05010f_100%)] text-white">
      <RoomUniverse
        rooms={rifts.map((room) => ({
          id: room.id,
          topic: room.topic,
          userCount: room.userCount,
          maxUsers: room.maxUsers,
          vibeColor: room.vibeColor,
          temperature: room.temperature,
          isChaosMode: room.isChaosMode,
          isQuantum: room.isQuantum,
        }))}
        hoveredRoomId={hoveredRoomId}
        onHover={setHoveredRoomId}
        onSelect={(roomId, topic) => enterRoom(topic, roomId)}
      />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.04),_transparent_55%)]" />

      <section className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="pointer-events-none"
        >
          <p className="font-mono text-[11px] uppercase tracking-[0.65em] text-white/35">living conversation organism</p>
          <h1 className="mt-4 font-display text-[clamp(4rem,12vw,8.5rem)] uppercase tracking-[0.26em] text-white [text-shadow:0_0_38px_rgba(255,255,255,0.22)]">
            7MINUTES
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-balance text-lg leading-8 text-white/62 sm:text-xl">
            Fly through a universe of living rooms. Enter a sphere, manifest a thought, and watch the organism remember you only long enough to matter.
          </p>
        </motion.div>

        <div className="mt-14 flex w-full max-w-5xl flex-col items-center gap-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
            className="pointer-events-auto relative flex h-[240px] w-[240px] items-center justify-center"
          >
            <motion.div
              animate={{
                borderRadius: [
                  '56% 44% 62% 38% / 39% 60% 40% 61%',
                  '41% 59% 39% 61% / 63% 33% 67% 37%',
                  '58% 42% 55% 45% / 44% 52% 48% 56%',
                ],
                rotate: [0, 5, -4, 0],
              }}
              transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute inset-0 backdrop-blur-xl"
              style={{
                background: `radial-gradient(circle at 30% 30%, ${identityGlow}55, transparent 60%), rgba(7, 10, 28, 0.82)`,
                border: `1px solid ${identityGlow}`,
                boxShadow: `0 0 70px ${identityGlow}55`,
              }}
            />

            <div className="relative flex w-[74%] flex-col gap-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.55em] text-white/40">identity</div>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value.slice(0, 24))}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && customTopic.trim()) {
                    enterRoom(customTopic);
                  }
                }}
                placeholder="choose a signal"
                className="w-full border-0 border-b border-white/20 bg-transparent px-0 pb-3 text-center text-2xl font-medium text-white outline-none placeholder:text-white/24"
              />
              <div className="text-sm leading-relaxed text-white/44">
                {joinMode === 'radio' ? 'You will drift in as an invisible witness.' : 'You will arrive as a visible energy field.'}
              </div>
            </div>
          </motion.div>

          <div className="pointer-events-auto flex items-center gap-4">
            {(['participate', 'radio'] as const).map((mode) => {
              const active = joinMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => setJoinMode(mode)}
                  className="liquid-switch"
                  style={{
                    background: active ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.05)',
                    color: active ? '#ffffff' : 'rgba(255,255,255,0.5)',
                    borderColor: active ? identityGlow : 'rgba(255,255,255,0.08)',
                    boxShadow: active ? `0 0 30px ${identityGlow}35` : 'none',
                  }}
                >
                  {mode === 'participate' ? 'enter organism' : 'radio drift'}
                </button>
              );
            })}
          </div>

          <div className="pointer-events-auto flex max-w-4xl flex-wrap items-center justify-center gap-3">
            {topicSeeds.map((topic, index) => (
              <button
                key={topic}
                onClick={() => enterRoom(topic)}
                disabled={!canJoin}
                className="topic-spore"
                style={{
                  animationDelay: `${index * 0.12}s`,
                  opacity: canJoin ? 1 : 0.48,
                }}
              >
                {topic}
              </button>
            ))}
          </div>

          <div className="pointer-events-auto flex w-full max-w-xl items-center gap-5">
            <div className="h-px flex-1 bg-white/10" />
            <input
              value={customTopic}
              onChange={(event) => setCustomTopic(event.target.value.slice(0, 60))}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  enterRoom(customTopic);
                }
              }}
              placeholder="birth a new room from a sentence"
              className="w-[min(70vw,24rem)] border-0 bg-transparent text-center text-base text-white/82 outline-none placeholder:text-white/24"
            />
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <button
            onClick={() => enterRoom(customTopic)}
            disabled={!canJoin || !customTopic.trim()}
            className="pointer-events-auto rounded-full border border-white/15 px-8 py-3 font-mono text-[11px] uppercase tracking-[0.42em] text-white/82 transition hover:border-white/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            birth custom orbit
          </button>
        </div>

        <div className="pointer-events-none mt-10 text-center text-white/34">
          {hoveredRoom ? (
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.5em]" style={{ color: hoveredRoom.vibeColor }}>
                hovered sphere
              </div>
              <div className="mt-2 text-xl text-white/88">{hoveredRoom.isQuantum ? 'quantum mystery room' : hoveredRoom.topic}</div>
              <div className="mt-1 text-sm text-white/48">
                {hoveredRoom.userCount}/{hoveredRoom.maxUsers} minds orbiting - heat {Math.round(hoveredRoom.temperature)}
              </div>
            </div>
          ) : (
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.5em] text-white/30">room discovery</div>
              <div className="mt-2 text-sm text-white/45">
                Click the brightest sphere to dive in, or seed an entirely new organism.
              </div>
            </div>
          )}
        </div>

        {joinMutation.isPending && (
          <div className="pointer-events-none mt-8 font-mono text-[11px] uppercase tracking-[0.55em] text-white/42">
            {loadingMessage}
          </div>
        )}

        {isLoading && rifts.length === 0 && (
          <div className="pointer-events-none mt-4 text-sm text-white/36">Scanning the void for active rooms...</div>
        )}

        {isRiftsError && (
          <div className="pointer-events-none mt-4 max-w-xl text-sm leading-7 text-red-200/78">
            The lobby shell is awake, but it cannot reach the live room field yet.
            {backendErrorMessage ? ` ${backendErrorMessage}` : ''}
          </div>
        )}
      </section>

      <PlatformStatus
        runtime={runtime}
        roomCount={rifts.length}
        isLoading={isLoading || isHealthLoading}
        isHealthy={isHealthy && !isRiftsError}
        isDegraded={isDegraded}
        errorMessage={backendErrorMessage}
      />
    </main>
  );
}
