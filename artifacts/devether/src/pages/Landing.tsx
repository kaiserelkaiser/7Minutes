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
    <main className="relative min-h-[100svh] overflow-x-hidden overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(0,245,255,0.12),_transparent_35%),radial-gradient(circle_at_bottom,_rgba(255,0,255,0.12),_transparent_30%),linear-gradient(180deg,_#0a0118_0%,_#05010f_100%)] text-white">
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

      <section className="landing-shell relative z-10 flex min-h-[100svh] items-center px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
        <div className="landing-grid mx-auto grid w-full max-w-[1220px] items-center gap-6 lg:grid-cols-[minmax(0,1.02fr)_minmax(340px,400px)] lg:gap-8 xl:gap-12">
          <div className="landing-copy flex flex-col items-center text-center lg:items-start lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="pointer-events-none"
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.58em] text-white/35 sm:text-[11px]">
                living conversation organism
              </p>
              <h1 className="mt-3 font-display text-[clamp(2.5rem,6.5vw,5.8rem)] uppercase tracking-[0.14em] text-white [text-shadow:0_0_38px_rgba(255,255,255,0.22)] sm:mt-4">
                7MINUTES
              </h1>
              <p className="mx-auto mt-3 max-w-[32rem] text-balance text-sm leading-6 text-white/62 sm:text-[15px] sm:leading-7 lg:mx-0 lg:max-w-[28rem] lg:text-base lg:leading-7">
                Fly through a universe of living rooms. Enter a sphere, manifest a thought, and watch the organism remember you only long enough to matter.
              </p>
            </motion.div>

            <div className="landing-hovercard pointer-events-none mt-5 max-w-[32rem] rounded-[1.8rem] border border-white/8 bg-black/12 px-4 py-3 text-white/34 backdrop-blur-xl sm:mt-6 lg:w-full">
              {hoveredRoom ? (
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.48em] sm:text-[11px]" style={{ color: hoveredRoom.vibeColor }}>
                    hovered sphere
                  </div>
                  <div className="mt-2 text-base text-white/88 sm:text-lg">
                    {hoveredRoom.isQuantum ? 'quantum mystery room' : hoveredRoom.topic}
                  </div>
                  <div className="mt-1 text-xs leading-5 text-white/48 sm:text-sm sm:leading-6">
                    {hoveredRoom.userCount}/{hoveredRoom.maxUsers} minds orbiting - heat {Math.round(hoveredRoom.temperature)}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.48em] text-white/30 sm:text-[11px]">room discovery</div>
                  <div className="mt-2 text-xs leading-5 text-white/45 sm:text-sm sm:leading-6">
                    Click the brightest sphere to dive in, or seed an entirely new organism.
                  </div>
                </div>
              )}
            </div>

            <div className="landing-microcopy pointer-events-none mt-4 flex w-full max-w-[32rem] flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[9px] uppercase tracking-[0.28em] text-white/26 sm:mt-5 sm:text-[10px] lg:justify-start">
              <span>{rifts.length} rooms active</span>
              <span>{joinMode === 'radio' ? 'radio drift enabled' : 'live aura enabled'}</span>
              <span>7 minute decay cycle</span>
            </div>

            {joinMutation.isPending && (
              <div className="pointer-events-none mt-5 font-mono text-[10px] uppercase tracking-[0.5em] text-white/42 sm:text-[11px]">
                {loadingMessage}
              </div>
            )}

            {isLoading && rifts.length === 0 && (
              <div className="pointer-events-none mt-3 text-xs text-white/36 sm:text-sm">Scanning the void for active rooms...</div>
            )}

            {isRiftsError && (
              <div className="pointer-events-none mt-4 max-w-[32rem] text-xs leading-5 text-red-200/78 sm:text-sm sm:leading-6">
                The lobby shell is awake, but it cannot reach the live room field yet.
                {backendErrorMessage ? ` ${backendErrorMessage}` : ''}
              </div>
            )}
          </div>

          <div className="landing-console pointer-events-auto flex w-full flex-col items-center gap-4 rounded-[2rem] border border-white/8 bg-black/12 px-4 py-4 backdrop-blur-xl sm:px-5 sm:py-5 lg:gap-3 lg:px-5 lg:py-5">
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 }}
              className="relative flex h-[clamp(160px,23vw,210px)] w-[clamp(160px,23vw,210px)] items-center justify-center"
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

              <div className="relative flex w-[76%] flex-col gap-2.5">
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
                  className="w-full border-0 border-b border-white/20 bg-transparent px-0 pb-2.5 text-center text-lg font-medium text-white outline-none placeholder:text-white/24 sm:text-xl"
                />
                <div className="text-xs leading-5 text-white/44 sm:text-sm sm:leading-relaxed">
                  {joinMode === 'radio' ? 'You will drift in as an invisible witness.' : 'You will arrive as a visible energy field.'}
                </div>
              </div>
            </motion.div>

            <div className="flex flex-wrap items-center justify-center gap-2.5">
              {(['participate', 'radio'] as const).map((mode) => {
                const active = joinMode === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => setJoinMode(mode)}
                    className="liquid-switch px-3.5 py-2 text-[10px] sm:px-4 sm:py-2.5 sm:text-[11px]"
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

            <div className="landing-topics flex max-w-[30rem] flex-wrap items-center justify-center gap-2">
              {topicSeeds.map((topic, index) => (
                <button
                  key={topic}
                  onClick={() => enterRoom(topic)}
                  disabled={!canJoin}
                  className="topic-spore px-3.5 py-2.5 text-[11px]"
                  style={{
                    animationDelay: `${index * 0.12}s`,
                    opacity: canJoin ? 1 : 0.48,
                  }}
                >
                  {topic}
                </button>
              ))}
            </div>

            <div className="flex w-full max-w-[28rem] flex-col items-center gap-2.5 sm:flex-row sm:gap-3">
              <div className="hidden h-px flex-1 bg-white/10 sm:block" />
              <input
                value={customTopic}
                onChange={(event) => setCustomTopic(event.target.value.slice(0, 60))}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    enterRoom(customTopic);
                  }
                }}
                placeholder="birth a new room from a sentence"
              className="w-full border-0 bg-transparent text-center text-sm text-white/82 outline-none placeholder:text-white/24 sm:w-[18rem]"
              />
              <div className="hidden h-px flex-1 bg-white/10 sm:block" />
            </div>

            <button
              onClick={() => enterRoom(customTopic)}
              disabled={!canJoin || !customTopic.trim()}
              className="rounded-full border border-white/15 px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.3em] text-white/82 transition hover:border-white/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 sm:px-6 sm:text-[11px]"
            >
              birth custom orbit
            </button>

            <div className="landing-status w-full max-w-[30rem] pt-1">
              <PlatformStatus
                runtime={runtime}
                roomCount={rifts.length}
                isLoading={isLoading || isHealthLoading}
                isHealthy={isHealthy && !isRiftsError}
                isDegraded={isDegraded}
                errorMessage={backendErrorMessage}
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
