import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import {
  loginUser as loginUserRequest,
  registerUser as registerUserRequest,
  useFollowUser,
  useGetCurrentUser,
  useGetHomeFeed,
  useGetInviterLeaderboard,
  useGetPresenceSnapshot,
  useGetUserProfile,
  useHealthCheck,
  useJoinRift,
  useListScheduledRooms,
  useListRifts,
  useMarkRoomEchoViewed,
  useScheduleRoom,
} from '@workspace/api-client-react';
import type { ApiError, ScheduledRoom, ShareCard } from '@workspace/api-client-react';
import { LivingBackdrop } from '@/components/atmosphere/LivingBackdrop';
import { RoomUniverse } from '@/components/canvas/RoomUniverse';
import { PlatformStatus } from '@/components/system/PlatformStatus';
import {
  clearStoredAuthSession,
  getStoredAuthSession,
  persistAuthSession,
  persistRoomSession,
  type StoredAuthSession,
} from '@/lib/auth-session';
import { requestNotificationPermission } from '@/lib/pwa';
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

const initialAuthSession = getStoredAuthSession();

export default function Landing() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState(initialAuthSession?.user.username ?? '');
  const [authSession, setAuthSession] = useState<StoredAuthSession | null>(initialAuthSession);
  const [customTopic, setCustomTopic] = useState('');
  const [followHandle, setFollowHandle] = useState('');
  const [scheduleTopic, setScheduleTopic] = useState('');
  const [scheduleDescription, setScheduleDescription] = useState('');
  const [scheduleKind, setScheduleKind] = useState<'open' | 'ama' | 'launch-party' | 'watch-party' | 'study-session'>('open');
  const [scheduledFor, setScheduledFor] = useState('');
  const [hoveredRoomId, setHoveredRoomId] = useState<string | null>(null);
  const [joinMode, setJoinMode] = useState<'participate' | 'radio'>('participate');
  const [spotlightMode, setSpotlightMode] = useState<'now' | 'echo' | 'growth'>('now');
  const [controlDeckMode, setControlDeckMode] = useState<'join' | 'network' | 'schedule'>('join');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default',
  );
  const [loadingMessage] = useState(
    () => LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)],
  );
  const runtime = useMemo(() => getRuntimeConfig(), []);
  const inviteCodeFromUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('invite')?.trim() ?? '';
  }, []);

  const riftsQuery = useListRifts({
    query: {
      queryKey: ['/api/rifts'],
      staleTime: 3500,
      refetchInterval: 4000,
      refetchIntervalInBackground: true,
    },
  });
  const presenceQuery = useGetPresenceSnapshot({
    query: {
      queryKey: ['/api/presence'],
      staleTime: 2500,
      refetchInterval: 3000,
      refetchIntervalInBackground: true,
    },
  });
  const healthQuery = useHealthCheck({
    query: {
      queryKey: ['/api/healthz'],
      staleTime: 10000,
      retry: 1,
      refetchInterval: 10000,
      refetchIntervalInBackground: true,
    },
  });
  const currentUserQuery = useGetCurrentUser({
    query: {
      queryKey: ['/api/auth/me'],
      enabled: Boolean(authSession?.token),
      retry: false,
      staleTime: 30000,
    },
  });
  const profileQuery = useGetUserProfile(authSession?.user.username ?? '', {
    query: {
      queryKey: authSession?.user.username
        ? [`/api/users/${authSession.user.username}`]
        : ['/api/users/anonymous'],
      enabled: Boolean(authSession?.user.username),
      staleTime: 15000,
      refetchOnWindowFocus: false,
    },
  });
  const homeFeedQuery = useGetHomeFeed({
    query: {
      queryKey: ['/api/auth/home-feed'],
      enabled: Boolean(authSession?.token),
      staleTime: 12000,
      refetchInterval: 15000,
      refetchIntervalInBackground: true,
    },
  });
  const inviterLeaderboardQuery = useGetInviterLeaderboard({
    query: {
      queryKey: ['/api/leaderboard/inviters'],
      staleTime: 15000,
      refetchInterval: 20000,
      refetchIntervalInBackground: true,
    },
  });
  const scheduledRoomsQuery = useListScheduledRooms({
    query: {
      queryKey: ['/api/rooms/upcoming'],
      staleTime: 12000,
      refetchInterval: 15000,
      refetchIntervalInBackground: true,
    },
  });

  const joinMutation = useJoinRift({
    mutation: {
      onSuccess: (response) => {
        persistRoomSession({
          userId: response.userId,
          username: username.trim() || authSession?.user.username || 'signal',
          color: response.userColor,
          riftId: response.riftId,
          isRadio: response.asRadio,
          sessionToken: response.sessionToken,
        });
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
  const followUserMutation = useFollowUser({
    mutation: {
      onSuccess: (result) => {
        toast({
          title: result.following ? 'Signal linked' : 'Signal released',
          description: result.following
            ? 'Their live rooms will now surface in your social proof feed.'
            : 'They will disappear from your live friend radar.',
        });
        setFollowHandle('');
        void presenceQuery.refetch();
      },
      onError: (error) => {
        toast({
          title: 'Unable to follow this signal',
          description: error instanceof Error ? error.message : 'Try another username.',
          variant: 'destructive',
        });
      },
    },
  });
  const markEchoViewedMutation = useMarkRoomEchoViewed({
    mutation: {
      onSuccess: () => {
        void homeFeedQuery.refetch();
      },
    },
  });
  const scheduleRoomMutation = useScheduleRoom({
    mutation: {
      onSuccess: (room) => {
        toast({
          title: 'Time capsule armed',
          description: `${room.topic} is now pulsing in the upcoming event field.`,
        });
        setScheduleTopic('');
        setScheduleDescription('');
        setScheduleKind('open');
        setScheduledFor('');
        void scheduledRoomsQuery.refetch();
      },
      onError: (error) => {
        toast({
          title: 'Unable to schedule room',
          description: error instanceof Error ? error.message : 'Try another time capsule slot.',
          variant: 'destructive',
        });
      },
    },
  });

  useEffect(() => {
    document.title = '7MINUTES';
  }, []);

  useEffect(() => {
    if (!currentUserQuery.data || !authSession) return;
    const nextSession = { token: authSession.token, user: currentUserQuery.data };
    persistAuthSession(nextSession);
    setAuthSession(nextSession);
    setUsername((current) => current || currentUserQuery.data.username);
  }, [authSession, currentUserQuery.data]);

  useEffect(() => {
    if (!currentUserQuery.error) return;
    clearStoredAuthSession();
    setAuthSession(null);
  }, [currentUserQuery.error]);

  const rifts = riftsQuery.data?.rifts ?? [];
  const presence = presenceQuery.data;
  const profile = profileQuery.data;
  const homeFeed = homeFeedQuery.data;
  const hoveredRoom = rifts.find((room) => room.id === hoveredRoomId) ?? null;
  const localHour = new Date().getHours();
  const topicSeeds = useMemo(() => {
    const seeds = [...DEFAULT_TOPICS];
    if (localHour >= 23 || localHour < 3) seeds.unshift('Nightly Void');
    return seeds;
  }, [localHour]);
  const identityGlow = useMemo(
    () => (username.trim() ? colorFromString(username.trim(), 82, 64) : '#00f5ff'),
    [username],
  );
  const backendErrorMessage = riftsQuery.error instanceof Error ? riftsQuery.error.message : null;
  const isDegraded = riftsQuery.isError;
  const canJoin = Boolean(username.trim()) && !joinMutation.isPending && !isDegraded && !isAuthenticating;
  const mostRecentMemory = profile?.recentMemories[0] ?? null;
  const latestHighlight = homeFeed?.highlights[0] ?? null;
  const pendingEcho = homeFeed?.roomEchoes[0] ?? null;
  const topShareCard = homeFeed?.shareCards[0] ?? null;
  const inviterLeaderboard = inviterLeaderboardQuery.data?.inviters ?? [];
  const scheduledRooms = scheduledRoomsQuery.data?.rooms ?? [];
  const invitedByUsername = authSession?.user.invitedByUsername ?? null;

  async function ensureAuthenticated(handle: string): Promise<StoredAuthSession> {
    if (authSession && authSession.user.username.toLowerCase() === handle.toLowerCase()) {
      return authSession;
    }

    setIsAuthenticating(true);
    try {
      const interests = Array.from(new Set([customTopic.trim(), ...topicSeeds].filter(Boolean))).slice(0, 6);
      const response = await registerUserRequest({ username: handle, interests, inviteCode: inviteCodeFromUrl || undefined }).catch(async (error: unknown) => {
        const apiError = error as ApiError | undefined;
        if (apiError?.status === 409) return loginUserRequest({ username: handle });
        throw error;
      });

      const nextSession = { token: response.token, user: response.user };
      persistAuthSession(nextSession);
      setAuthSession(nextSession);
      return nextSession;
    } finally {
      setIsAuthenticating(false);
    }
  }

  const enterRoom = async (topic: string, roomId?: string, quantum = false) => {
    const handle = (username.trim() || authSession?.user.username || '').slice(0, 24);
    const chosenTopic = topic.trim().slice(0, 60);
    if (!handle || !chosenTopic || isDegraded) return;

    try {
      const activeSession = await ensureAuthenticated(handle);
      joinMutation.mutate({
        data: {
          username: activeSession.user.username,
          topic: chosenTopic,
          riftId: roomId,
          quantum,
          asRadio: joinMode === 'radio',
        },
      });
    } catch (error) {
      toast({
        title: 'Name signal failed',
        description: error instanceof Error ? error.message : 'Try another name and slip back in.',
        variant: 'destructive',
      });
    }
  };

  const joinFriendRoom = async (roomId: string, roomTopic: string) => {
    await enterRoom(roomTopic, roomId);
  };

  const joinScheduledRoom = async (room: ScheduledRoom) => {
    const startMs = new Date(room.scheduledFor).getTime() - Date.now();
    if (startMs > 10 * 60 * 1000) {
      toast({
        title: 'Not live yet',
        description: `${room.topic} wakes up closer to its scheduled start.`,
      });
      return;
    }

    await enterRoom(room.topic, room.id, false);
  };

  const enableNotifications = async () => {
    const permission = await requestNotificationPermission();
    setNotificationPermission(permission);
    toast({
      title:
        permission === 'granted'
          ? 'Orbit alerts enabled'
          : permission === 'denied'
            ? 'Notifications blocked'
            : 'Notification request dismissed',
      description:
        permission === 'granted'
          ? 'The PWA shell can now wake you when the platform learns to broadcast follow activity.'
          : 'You can change this later from your browser settings.',
    });
  };

  const shareMoment = async (card: ShareCard) => {
    const shareText = `${card.bestQuote}\n${card.context}\n${card.roomVibe}\n${card.shareUrl}`;
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ title: '7MINUTES highlight', text: shareText, url: card.shareUrl });
        return;
      } catch {}
    }
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, '_blank', 'noopener,noreferrer');
  };

  const shareToDiscord = (card: ShareCard) => {
    window.open(card.shareUrl, '_blank', 'noopener,noreferrer');
  };

  const copyInviteLink = async () => {
    const inviteCode = authSession?.user.inviteCode;
    if (!inviteCode || typeof window === 'undefined') return;
    const inviteUrl = `${window.location.origin}/?invite=${encodeURIComponent(inviteCode)}`;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast({
        title: 'Invite link copied',
        description: 'Now the social obligation begins.',
      });
    } catch {
      toast({
        title: 'Copy failed',
        description: inviteUrl,
      });
    }
  };

  const scheduleTimeCapsule = async () => {
    if (!authSession) {
      toast({
        title: 'Pick a name first',
        description: 'Choose a name, then you can schedule a room in seconds.',
        variant: 'destructive',
      });
      return;
    }

    if (!scheduleTopic.trim() || !scheduledFor) return;
    scheduleRoomMutation.mutate({
      data: {
        topic: scheduleTopic.trim(),
        scheduledFor: new Date(scheduledFor).toISOString(),
        description: scheduleDescription.trim() || undefined,
        kind: scheduleKind,
        maxUsers: 12,
        isPublic: true,
        reminderEnabled: true,
      },
    });
  };

  const revealEcho = (echoId: string) => {
    const echo = homeFeed?.roomEchoes.find((entry) => entry.id === echoId);
    if (echo) {
      toast({ title: echo.title, description: echo.finalMoments.join(' - ') });
    }
    markEchoViewedMutation.mutate({ echoId });
  };

  return (
    <main className="liquid-stage relative min-h-[100svh] overflow-x-hidden overflow-y-auto text-white">
      <LivingBackdrop primary={identityGlow} secondary="#ff00ff" tertiary="#9d00ff" energy={0.72} mode="landing" />
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
        onSelect={(roomId, topic) => void enterRoom(topic, roomId)}
      />

      <div className="screen-watermark-overlay" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.04),_transparent_55%)]" />

      <section className="landing-shell relative z-10 flex min-h-[100svh] items-center px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
        <div className="landing-grid mx-auto grid w-full max-w-[1220px] items-center gap-6 lg:grid-cols-[minmax(0,1.02fr)_minmax(340px,400px)] lg:gap-8 xl:gap-12">
          <div className="landing-copy flex flex-col items-center text-center lg:items-start lg:text-left">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="pointer-events-none">
              <p className="orbital-overline text-[10px] sm:text-[11px]">
                living conversation organism
              </p>
              <h1 className="hero-wordmark mt-3 text-[clamp(2.9rem,7vw,6.4rem)] text-white sm:mt-4">
                7MINUTES
              </h1>
              <p className="hero-manifesto mx-auto mt-3 lg:mx-0">
                Pick a name, jump into a living room, and let your thoughts flare for seven minutes. No heavy signup, no history, just beautiful temporary conversation.
              </p>
            </motion.div>

            <div className="landing-hovercard organism-node organism-node--quiet pointer-events-none mt-5 max-w-[32rem] px-4 py-3 text-white/34 sm:mt-6 lg:w-full">
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
              <span>{authSession ? 'name remembered' : 'just pick a name'}</span>
            </div>

            {(joinMutation.isPending || isAuthenticating) && (
              <div className="pointer-events-none mt-5 font-mono text-[10px] uppercase tracking-[0.5em] text-white/42 sm:text-[11px]">
                {isAuthenticating ? 'locking in your name...' : loadingMessage}
              </div>
            )}

            {riftsQuery.isLoading && rifts.length === 0 && (
              <div className="pointer-events-none mt-3 text-xs text-white/36 sm:text-sm">
                Scanning the void for active rooms...
              </div>
            )}

            {riftsQuery.isError && (
              <div className="pointer-events-none mt-4 max-w-[32rem] text-xs leading-5 text-red-200/78 sm:text-sm sm:leading-6">
                The lobby shell is awake, but it cannot reach the live room field yet.
                {backendErrorMessage ? ` ${backendErrorMessage}` : ''}
              </div>
            )}

            <div className="mt-5 flex w-full max-w-[36rem] flex-wrap gap-2 sm:mt-6">
              {([
                ['now', 'live pulse'],
                ['echo', 'afterglow'],
                ['growth', 'signal web'],
              ] as const).map(([mode, label]) => {
                const active = spotlightMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setSpotlightMode(mode)}
                    className="liquid-switch px-3 py-2 text-[10px] uppercase tracking-[0.32em]"
                    style={{
                      background: active ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.045)',
                      color: active ? '#fff' : 'rgba(255,255,255,0.56)',
                      borderColor: active ? identityGlow : 'rgba(255,255,255,0.08)',
                      boxShadow: active ? `0 0 28px ${identityGlow}24` : 'none',
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 grid w-full max-w-[36rem] gap-3">
              {spotlightMode === 'now' && (
                <div className="organism-node organism-node--dense px-4 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.42em] text-white/32">who&apos;s here now</div>
                      <div className="mt-2 text-sm text-white/86">
                        {presence ? `${presence.onlineNow} minds online - ${presence.activeRooms} live rooms` : 'Reading the live social pulse...'}
                      </div>
                    </div>
                    {presence?.celebrityAlert
                      ? (() => {
                          const celebrityAlert = presence.celebrityAlert;
                          return (
                            <button
                              onClick={() => void joinFriendRoom(celebrityAlert.roomId, celebrityAlert.room)}
                              className="plasma-button plasma-button--ghost px-3 py-1.5 text-[#ffcf6e]"
                            >
                              notable mind
                            </button>
                          );
                        })()
                      : null}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(presence?.trendingTopics ?? []).slice(0, 4).map((topic) => (
                      <div key={topic.topic} className="liquid-tag text-[11px]">
                        {topic.topic} - {topic.totalUsers}
                      </div>
                    ))}
                  </div>
                  {presence?.friendsOnline?.length ? (
                    <div className="mt-4 grid gap-2">
                      {presence.friendsOnline.slice(0, 2).map((friend) => (
                        <button
                          key={`${friend.userId}-${friend.roomId}`}
                          onClick={() => void joinFriendRoom(friend.roomId, friend.roomTopic)}
                          className="organism-ribbon flex items-center justify-between px-3 py-2 text-left transition hover:border-white/20 hover:bg-white/[0.06]"
                        >
                          <div>
                            <div className="text-sm text-white/86">{friend.username} is in &ldquo;{friend.roomTopic}&rdquo;</div>
                            <div className="mt-1 text-xs text-white/46">
                              {friend.roomUserCount}/{friend.roomMaxUsers} users - {Math.ceil(friend.timeLeftSeconds / 60)} min left
                            </div>
                          </div>
                          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-white/46">join</div>
                        </button>
                      ))}
                    </div>
                  ) : presence?.featuredRooms?.length ? (
                    <div className="mt-4 grid gap-2">
                      {presence.featuredRooms.slice(0, 2).map((room) => (
                        <button
                          key={`${room.roomId}-${room.username}`}
                          onClick={() => void joinFriendRoom(room.roomId, room.topic)}
                          className="organism-ribbon flex items-center justify-between px-3 py-2 text-left transition hover:border-[#ffcf6e]/32 hover:bg-[linear-gradient(135deg,rgba(255,207,110,0.16),rgba(8,8,18,0.32))]"
                        >
                          <div>
                            <div className="text-sm text-white/88">{room.username} is hosting &ldquo;{room.topic}&rdquo;</div>
                            <div className="mt-1 text-xs text-white/48">
                              {room.verificationTier} orbit - {room.userCount}/{room.maxUsers} users
                            </div>
                          </div>
                          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-[#ffcf6e]">featured</div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-3 text-xs leading-5 text-white/42">
                      Follow someone and their live rooms will light up here the moment they enter orbit.
                    </div>
                  )}
                </div>
              )}

              {spotlightMode === 'echo' && (
                <div className="organism-node organism-node--hero px-4 py-4">
                  {latestHighlight ? (
                    <>
                      <div className="font-mono text-[10px] uppercase tracking-[0.42em] text-white/38">highlight reel</div>
                      <div className="mt-3 text-xl text-white/94">{latestHighlight.shareCard.bestQuote}</div>
                      <div className="mt-2 text-sm text-white/62">
                        {latestHighlight.shareCard.context} - {latestHighlight.vibeLabel}
                      </div>
                      <div className="mt-4 grid gap-2">
                        {latestHighlight.bestMoments.slice(0, 2).map((moment) => (
                          <div key={`${latestHighlight.id}-${moment.timestamp}`} className="organism-ribbon px-3 py-2">
                            <div className="text-xs uppercase tracking-[0.24em] text-white/40">{moment.timestamp}</div>
                            <div className="mt-1 text-sm text-white/86">{moment.quote}</div>
                            <div className="mt-1 text-xs text-white/46">{moment.context}</div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button onClick={() => void shareMoment(latestHighlight.shareCard)} className="plasma-button px-4 py-2">
                          share moment
                        </button>
                        <button onClick={() => shareToDiscord(latestHighlight.shareCard)} className="plasma-button plasma-button--ghost px-4 py-2">
                          open card
                        </button>
                      </div>
                    </>
                  ) : pendingEcho ? (
                    <>
                      <div className="font-mono text-[10px] uppercase tracking-[0.42em] text-[#ff9c9c]/78">room echo</div>
                      <div className="mt-2 text-lg text-white/92">{pendingEcho.title}</div>
                      <div className="mt-2 text-sm leading-6 text-white/62">{pendingEcho.body}</div>
                      <div className="mt-3 grid gap-2">
                        {pendingEcho.finalMoments.slice(0, 3).map((moment, index) => (
                          <div key={`${pendingEcho.id}-${index}`} className="organism-ribbon px-3 py-2 text-sm text-white/82">
                            {moment}
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => revealEcho(pendingEcho.id)}
                        className="plasma-button plasma-button--ghost mt-4 px-4 py-2 text-white/78"
                      >
                        consume replay
                      </button>
                    </>
                  ) : (
                    <div className="text-sm leading-6 text-white/58">
                      Stay until a room collapses and the platform will condense the best moment into an afterglow shard.
                    </div>
                  )}
                </div>
              )}

              {spotlightMode === 'growth' && (
                <div className="organism-node organism-node--hero px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.42em] text-white/34">signal web</div>
                      <div className="mt-2 text-sm text-white/88">
                        {profile?.inviteStats
                          ? `${profile.inviteStats.activeInvites} active invites - ${profile.inviteStats.points} ripple points`
                          : 'Invite friends and turn social gravity into growth.'}
                      </div>
                      <div className="mt-1 text-xs leading-5 text-white/48">
                        {profile?.inviteStats?.reward ?? '5 active invites unlocks the silver inviter badge.'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void copyInviteLink()}
                      disabled={!authSession?.user.inviteCode}
                      className="plasma-button px-4 py-2 disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      copy invite relic
                    </button>
                  </div>
                  <div className="mt-4 grid gap-2">
                    {inviterLeaderboard.slice(0, 3).map((entry, index) => (
                      <div key={entry.userId} className="organism-ribbon flex items-center justify-between px-3 py-2">
                        <div>
                          <div className="text-sm text-white/86">
                            #{index + 1} {entry.username}
                            {entry.verificationTier ? ` - ${entry.verificationTier}` : ''}
                          </div>
                          <div className="mt-1 text-xs text-white/46">
                            {entry.activeInvites} active invites - {entry.points} points
                          </div>
                        </div>
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ background: entry.colorSignature, boxShadow: `0 0 16px ${entry.colorSignature}` }}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="organism-node organism-node--quiet px-4 py-3">
                      <div className="font-mono text-[10px] uppercase tracking-[0.42em] text-white/32">name memory</div>
                      <div className="mt-2 text-sm text-white/86">
                        {profile?.stats.currentStreak ?? authSession?.user.currentStreak ?? 0} day streak
                      </div>
                      <div className="mt-1 text-xs leading-5 text-white/48">
                        Reputation {profile?.reputation ?? authSession?.user.reputation ?? 50} - creature stage {profile?.creatureStage ?? authSession?.user.creatureStage ?? 1}
                      </div>
                    </div>
                    <div className="organism-node organism-node--quiet px-4 py-3">
                      <div className="font-mono text-[10px] uppercase tracking-[0.42em] text-white/32">memory constellation</div>
                      <div className="mt-2 text-sm text-white/86">
                        {mostRecentMemory?.essence ?? 'Your first memory crystal will appear after a room closes.'}
                      </div>
                      <div className="mt-1 text-xs leading-5 text-white/48">
                        {mostRecentMemory ? mostRecentMemory.roomTopic : 'No persistent room artifacts yet'}
                      </div>
                      {invitedByUsername && (
                        <div className="mt-2 text-xs leading-5 text-[#9fdfff]">
                          {invitedByUsername} invited you into this signal web.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="landing-console organism-node organism-node--hero pointer-events-auto flex w-full flex-col items-center gap-4 px-4 py-4 sm:px-5 sm:py-5 lg:gap-3 lg:px-5 lg:py-5">
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
                <div className="font-mono text-[10px] uppercase tracking-[0.55em] text-white/40">your name</div>
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value.slice(0, 24))}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && customTopic.trim()) void enterRoom(customTopic);
                  }}
                  placeholder="pick any name"
                  className="w-full border-0 border-b border-white/20 bg-transparent px-0 pb-2.5 text-center text-lg font-medium text-white outline-none placeholder:text-white/24 sm:text-xl"
                />
                <div className="text-xs leading-5 text-white/44 sm:text-sm sm:leading-relaxed">
                  {authSession
                    ? `${authSession.user.username} is ready to drop back in.`
                    : 'No signup wall. Pick a name and you are in.'}
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

            <div className="organism-node organism-node--quiet w-full px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.42em] text-white/34">orbit alerts</div>
                  <div className="mt-1 text-xs leading-5 text-white/56">
                    {notificationPermission === 'granted'
                      ? 'Notifications are armed for echoes, follow activity, and room aftermath.'
                      : 'Enable notifications so the organism can pull you back when something wild happens.'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void enableNotifications()}
                  className="plasma-button plasma-button--ghost px-3.5 py-2 text-white/80"
                >
                  {notificationPermission === 'granted' ? 'alerts active' : 'enable alerts'}
                </button>
              </div>
            </div>

            <div className="w-full">
              <div className="font-mono text-[10px] uppercase tracking-[0.42em] text-white/32">topic spores</div>
              <div className="mt-3 flex flex-wrap justify-center gap-2.5">
                {topicSeeds.map((topic) => (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => {
                      setCustomTopic(topic);
                      void enterRoom(topic, undefined, topic === 'Nightly Void');
                    }}
                    disabled={!username.trim() || joinMutation.isPending || isAuthenticating}
                    className="topic-spore text-[11px] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </div>

            <div className="organism-node organism-node--dense w-full px-4 py-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.42em] text-white/34">birth a room</div>
              <div className="mt-3 flex flex-col gap-3">
                <input
                  value={customTopic}
                  onChange={(event) => setCustomTopic(event.target.value.slice(0, 60))}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && canJoin && customTopic.trim()) {
                      void enterRoom(customTopic, undefined, /quantum|void/i.test(customTopic));
                    }
                  }}
                  placeholder="seed a room topic"
                  className="signal-input text-sm"
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => void enterRoom(customTopic)}
                    disabled={!canJoin || !customTopic.trim()}
                    className="plasma-button plasma-button--primary px-4 py-3 disabled:cursor-not-allowed disabled:opacity-35"
                    style={{
                      borderColor: identityGlow,
                      color: '#ffffff',
                      background: `linear-gradient(135deg, ${identityGlow}30, rgba(255,255,255,0.04))`,
                      boxShadow: `0 0 30px ${identityGlow}25`,
                    }}
                  >
                    enter fresh organism
                  </button>
                  <button
                    type="button"
                    onClick={() => void enterRoom(customTopic || 'Quantum Drift', undefined, true)}
                    disabled={!canJoin}
                    className="plasma-button plasma-button--ghost px-4 py-3 text-white/76 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    birth quantum room
                  </button>
                </div>
                <div className="text-xs leading-5 text-white/42">
                  {joinMode === 'radio'
                    ? 'Radio drift lets you ghost through the room without showing up in the active aura cluster.'
                    : 'Participate mode births your blob directly into the organism and can trigger resonance chains.'}
                </div>
              </div>
            </div>

            <div className="flex w-full flex-wrap gap-2">
              {([
                ['join', 'launch'],
                ['network', 'network'],
                ['schedule', 'schedule'],
              ] as const).map(([mode, label]) => {
                const active = controlDeckMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setControlDeckMode(mode)}
                    className="liquid-switch px-3 py-2 text-[10px] uppercase tracking-[0.32em]"
                    style={{
                      background: active ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.045)',
                      color: active ? '#fff' : 'rgba(255,255,255,0.56)',
                      borderColor: active ? identityGlow : 'rgba(255,255,255,0.08)',
                      boxShadow: active ? `0 0 28px ${identityGlow}24` : 'none',
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {controlDeckMode === 'network' && (
              <div className="organism-node organism-node--dense w-full px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.42em] text-white/34">social graph</div>
                    <div className="mt-2 text-sm text-white/84">
                      {authSession ? `Moving through the void as ${authSession.user.username}` : 'Pick a name to follow minds you want to orbit.'}
                    </div>
                    <div className="mt-1 text-xs leading-5 text-white/46">
                      {presence?.friendsOnline?.length
                        ? `${presence.friendsOnline.length} followed signals are live right now.`
                        : 'No followed minds live yet. Add one and their rooms will surface instantly.'}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {topShareCard && (
                      <button
                        type="button"
                        onClick={() => void shareMoment(topShareCard)}
                        className="plasma-button plasma-button--ghost px-3 py-1.5 text-white/74"
                      >
                        share latest card
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void copyInviteLink()}
                      disabled={!authSession?.user.inviteCode}
                      className="plasma-button plasma-button--ghost px-3 py-1.5 text-white/74 disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      invite link
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-3">
                  <input
                    value={followHandle}
                    onChange={(event) => setFollowHandle(event.target.value.slice(0, 24))}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && followHandle.trim() && authSession) {
                        followUserMutation.mutate({ username: followHandle.trim() });
                      }
                    }}
                    placeholder="follow a username"
                    className="signal-input text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!authSession) {
                        toast({
                          title: 'Pick a name first',
                          description: 'Choose a name, then you can follow people instantly.',
                          variant: 'destructive',
                        });
                        return;
                      }
                      if (!followHandle.trim()) return;
                      followUserMutation.mutate({ username: followHandle.trim() });
                    }}
                    disabled={!followHandle.trim() || followUserMutation.isPending}
                    className="plasma-button plasma-button--ghost px-4 py-3 text-white/78 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    {followUserMutation.isPending ? 'linking signal...' : 'follow signal'}
                  </button>
                </div>
              </div>
            )}

            {controlDeckMode === 'schedule' && (
              <div className="organism-node organism-node--quiet w-full px-4 py-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.42em] text-white/34">time capsules</div>
                <div className="mt-2 text-sm text-white/84">
                  Schedule a room people can plan around instead of hoping to catch by chance.
                </div>

                <div className="mt-4 flex flex-col gap-3">
                  <input
                    value={scheduleTopic}
                    onChange={(event) => setScheduleTopic(event.target.value.slice(0, 60))}
                    placeholder="future room topic"
                    className="signal-input text-sm"
                  />
                  <textarea
                    value={scheduleDescription}
                    onChange={(event) => setScheduleDescription(event.target.value.slice(0, 180))}
                    placeholder="why should people show up?"
                    rows={3}
                    className="signal-area text-sm"
                  />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      type="datetime-local"
                      value={scheduledFor}
                      onChange={(event) => setScheduledFor(event.target.value)}
                      className="signal-input text-sm"
                    />
                    <select
                      value={scheduleKind}
                      onChange={(event) => setScheduleKind(event.target.value as typeof scheduleKind)}
                      className="signal-select text-sm"
                    >
                      <option value="open">open capsule</option>
                      <option value="ama">AMA</option>
                      <option value="launch-party">launch party</option>
                      <option value="watch-party">watch party</option>
                      <option value="study-session">study session</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => void scheduleTimeCapsule()}
                    disabled={!scheduleTopic.trim() || !scheduledFor || scheduleRoomMutation.isPending}
                    className="plasma-button plasma-button--ghost px-4 py-3 text-white/78 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    {scheduleRoomMutation.isPending ? 'arming capsule...' : 'schedule time capsule'}
                  </button>
                </div>
                <div className="mt-4 grid gap-2">
                  {scheduledRooms.slice(0, 2).map((room) => {
                    const minutes = Math.max(0, Math.round((new Date(room.scheduledFor).getTime() - Date.now()) / 60000));
                    return (
                      <button
                        key={room.id}
                        type="button"
                        onClick={() => void joinScheduledRoom(room)}
                        className="organism-ribbon flex items-center justify-between px-3 py-2 text-left transition hover:border-white/22 hover:bg-white/[0.06]"
                      >
                        <div>
                          <div className="text-sm text-white/84">{room.topic}</div>
                          <div className="mt-1 text-xs text-white/46">
                            {room.creatorUsername} - {room.kind} - {minutes} min
                          </div>
                        </div>
                        <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/42">
                          {minutes <= 10 ? 'enter' : 'countdown'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <PlatformStatus
              runtime={runtime}
              roomCount={presence?.activeRooms ?? rifts.length}
              isLoading={riftsQuery.isLoading || healthQuery.isLoading}
              isHealthy={Boolean(healthQuery.data) && !isDegraded}
              isDegraded={isDegraded || Boolean(healthQuery.error)}
              errorMessage={backendErrorMessage}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
