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
  'locking into the room field...',
  'aligning your name with the network...',
  'pulling an orbit into focus...',
  'warming up the room membrane...',
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
  const [roomMode, setRoomMode] = useState<'standard' | 'quantum' | 'context'>('standard');
  const [dockMode, setDockMode] = useState<'live' | 'friends' | 'plan'>('live');
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
          title: 'Unable to enter the room',
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
          title: result.following ? 'Following enabled' : 'Following removed',
          description: result.following
            ? 'Their live rooms will now show up in your feed.'
            : 'They will no longer surface in your feed.',
        });
        setFollowHandle('');
        void presenceQuery.refetch();
      },
      onError: (error) => {
        toast({
          title: 'Unable to follow this user',
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
          title: 'Scheduled room ready',
          description: `${room.topic} is now in the upcoming queue.`,
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
          description: error instanceof Error ? error.message : 'Try another time.',
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
  const homeFeed = homeFeedQuery.data;
  const hoveredRoom = rifts.find((room) => room.id === hoveredRoomId) ?? null;
  const latestHighlight = homeFeed?.highlights[0] ?? null;
  const pendingEcho = homeFeed?.roomEchoes[0] ?? null;
  const topShareCard = homeFeed?.shareCards[0] ?? null;
  const scheduledRooms = scheduledRoomsQuery.data?.rooms ?? [];
  const inviterLeaderboard = inviterLeaderboardQuery.data?.inviters ?? [];

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
  const backendErrorMessage = riftsQuery.error instanceof Error ? riftsQuery.error.message : null;
  const isDegraded = riftsQuery.isError;
  const canJoin = Boolean(username.trim()) && !joinMutation.isPending && !isDegraded && !isAuthenticating;
  const contextRoomCount = rifts.filter((room) => room.type === 'context').length;
  const currentRoomModeLabel =
    roomMode === 'context' ? 'context room' : roomMode === 'quantum' ? 'quantum room' : 'standard room';
  const currentRoomModeHint =
    roomMode === 'context'
      ? 'Stays open until empty. Messages still self-destruct after seven minutes.'
      : roomMode === 'quantum'
        ? 'Mystery-room energy with the same short-lived message decay.'
        : 'Classic seven-minute room timer with normal ephemeral flow.';

  async function ensureAuthenticated(handle: string): Promise<StoredAuthSession> {
    if (authSession && authSession.user.username.toLowerCase() === handle.toLowerCase()) {
      return authSession;
    }

    setIsAuthenticating(true);
    try {
      const interests = Array.from(new Set([customTopic.trim(), ...topicSeeds].filter(Boolean))).slice(0, 6);
      const response = await registerUserRequest({
        username: handle,
        interests,
        inviteCode: inviteCodeFromUrl || undefined,
      }).catch(async (error: unknown) => {
        const apiError = error as ApiError | undefined;
        if (apiError?.status === 409) {
          return loginUserRequest({ username: handle });
        }
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

  const enterRoom = async (
    topic: string,
    roomId?: string,
    requestedMode: 'standard' | 'quantum' | 'context' = 'standard',
  ) => {
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
          quantum: requestedMode === 'quantum',
          mode: requestedMode === 'context' ? 'context' : 'standard',
          asRadio: joinMode === 'radio',
        },
      });
    } catch (error) {
      toast({
        title: 'Name signal failed',
        description: error instanceof Error ? error.message : 'Try another name.',
        variant: 'destructive',
      });
    }
  };

  const joinFriendRoom = async (roomId: string, roomTopic: string) => {
    const liveRoom = rifts.find((room) => room.id === roomId);
    await enterRoom(
      roomTopic,
      roomId,
      liveRoom?.type === 'context' ? 'context' : liveRoom?.isQuantum ? 'quantum' : 'standard',
    );
  };

  const joinScheduledRoom = async (room: ScheduledRoom) => {
    const startsInMs = new Date(room.scheduledFor).getTime() - Date.now();
    if (startsInMs > 10 * 60 * 1000) {
      toast({
        title: 'Too early',
        description: `${room.topic} opens closer to its scheduled time.`,
      });
      return;
    }

    await enterRoom(room.topic, room.id, 'standard');
  };

  const enableNotifications = async () => {
    const permission = await requestNotificationPermission();
    setNotificationPermission(permission);
    toast({
      title:
        permission === 'granted'
          ? 'Notifications enabled'
          : permission === 'denied'
            ? 'Notifications blocked'
            : 'Notification request dismissed',
      description:
        permission === 'granted'
          ? 'The browser can now notify you about future room activity.'
          : 'You can change this later in browser settings.',
    });
  };

  const shareMoment = async (card: ShareCard) => {
    const shareText = `${card.bestQuote}\n${card.context}\n${card.roomVibe}\n${card.shareUrl}`;
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({
          title: '7MINUTES highlight',
          text: shareText,
          url: card.shareUrl,
        });
        return;
      } catch {
        // Fall through to X intent.
      }
    }

    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  const copyInviteLink = async () => {
    const inviteCode = authSession?.user.inviteCode;
    if (!inviteCode || typeof window === 'undefined') return;
    const inviteUrl = `${window.location.origin}/?invite=${encodeURIComponent(inviteCode)}`;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast({
        title: 'Invite link copied',
        description: 'Ready to send.',
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
        description: 'Choose a name, then schedule a room.',
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
      toast({
        title: echo.title,
        description: echo.finalMoments.join(' | '),
      });
    }
    markEchoViewedMutation.mutate({ echoId });
  };

  return (
    <main className="liquid-stage relative min-h-[100svh] overflow-x-hidden overflow-y-auto text-white">
      <LivingBackdrop primary={identityGlow} secondary="#ff00ff" tertiary="#9d00ff" energy={0.66} mode="landing" />
      <RoomUniverse
        rooms={rifts.map((room) => ({
          id: room.id,
          topic: room.topic,
          type: room.type,
          userCount: room.userCount,
          maxUsers: room.maxUsers,
          vibeColor: room.vibeColor,
          temperature: room.temperature,
          isChaosMode: room.isChaosMode,
          isQuantum: room.isQuantum,
          persistsUntilEmpty: room.persistsUntilEmpty,
        }))}
        hoveredRoomId={hoveredRoomId}
        onHover={setHoveredRoomId}
        onSelect={(roomId, topic, selectedMode) => {
          void enterRoom(topic, roomId, selectedMode);
        }}
      />

      <div className="screen-watermark-overlay" />

      <section className="landing-shell relative z-10 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto grid min-h-[100svh] w-full max-w-[1260px] gap-8 lg:grid-cols-[minmax(0,1.1fr)_390px] lg:items-center lg:gap-10">
          <div className="flex flex-col justify-center gap-7">
            <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }} className="max-w-[42rem]">
              <p className="orbital-overline text-[10px] sm:text-[11px]">ephemeral live conversation</p>
              <h1 className="hero-wordmark mt-4 text-[clamp(3.35rem,8vw,7rem)] text-white">7MINUTES</h1>
              <p className="hero-manifesto mt-5 max-w-[34rem]">
                Pick a name. Enter a room. Speak before the thought disappears. The universe stays dramatic. The interface stays clear.
              </p>
            </motion.div>

            <div className="flex flex-wrap gap-2.5">
              <div className="simple-chip">{presence?.onlineNow ?? 0} online</div>
              <div className="simple-chip">{presence?.activeRooms ?? rifts.length} active rooms</div>
              <div className="simple-chip">{contextRoomCount} context rooms</div>
              <div className="simple-chip">{joinMode === 'radio' ? 'radio mode' : 'live mode'}</div>
              <div className="simple-chip">7 minute decay</div>
            </div>

            <div className="clean-panel px-6 py-5">
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div className="max-w-[28rem]">
                  <div className="font-mono text-[10px] uppercase tracking-[0.42em] text-white/34">
                    {hoveredRoom ? 'selected room' : 'room universe'}
                  </div>
                  <div className="mt-3 text-[clamp(1.2rem,2vw,1.9rem)] font-medium text-white/92">
                    {hoveredRoom
                      ? hoveredRoom.type === 'context'
                        ? `${hoveredRoom.topic} · context`
                        : hoveredRoom.isQuantum
                          ? 'Quantum Room'
                          : hoveredRoom.topic
                      : 'Hover a sphere to inspect it, or create your own room.'}
                  </div>
                  <div className="mt-2 text-sm leading-6 text-white/54">
                    {hoveredRoom
                      ? hoveredRoom.type === 'context'
                        ? `${hoveredRoom.userCount}/${hoveredRoom.maxUsers} live now. No room timer. This one closes only when empty.`
                        : `${hoveredRoom.userCount}/${hoveredRoom.maxUsers} live now. Heat ${Math.round(hoveredRoom.temperature)}. Click the sphere to join.`
                      : 'The orbiting room spheres are the navigation. Everything else stays out of their way.'}
                  </div>
                </div>

                {presence?.celebrityAlert ? (
                  <div className="clean-panel-soft min-w-[190px] px-4 py-4 text-right">
                    <div className="font-mono text-[10px] uppercase tracking-[0.34em] text-[#ffe27a]">celebrity drop</div>
                    <div className="mt-2 text-sm text-white/88">@{presence.celebrityAlert.username}</div>
                    <div className="mt-1 text-xs leading-5 text-white/52">{presence.celebrityAlert.room}</div>
                  </div>
                ) : (
                  <div className="grid min-w-[180px] gap-2">
                    <div className="simple-chip">{presence?.onlineNow ?? 0} online now</div>
                    <div className="simple-chip">{presence?.activeRooms ?? rifts.length} live rooms</div>
                  </div>
                )}
              </div>
            </div>

            <div className="clean-panel px-5 py-5 sm:px-6">
              <div className="flex flex-wrap gap-2">
                {([
                  ['live', 'live feed'],
                  ['friends', 'friends'],
                  ['plan', 'upcoming'],
                ] as const).map(([mode, label]) => {
                  const active = dockMode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setDockMode(mode)}
                      className="control-button px-3 py-2 text-[10px] uppercase tracking-[0.24em]"
                      style={{
                        background: active ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.04)',
                        color: active ? '#fff' : 'rgba(255,255,255,0.56)',
                        borderColor: active ? identityGlow : 'rgba(255,255,255,0.1)',
                        boxShadow: active ? `0 0 22px ${identityGlow}20` : 'none',
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {dockMode === 'live' && (
                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.34em] text-white/32">trending</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(presence?.trendingTopics ?? []).slice(0, 6).map((topic) => (
                        <button
                          key={topic.topic}
                          type="button"
                          onClick={() => {
                            setCustomTopic(topic.topic);
                            void enterRoom(topic.topic);
                          }}
                          disabled={!canJoin}
                          className="control-button px-3 py-2 text-xs disabled:opacity-40"
                        >
                          {topic.topic}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.34em] text-white/32">afterglow</div>
                    {latestHighlight?.bestMoments[0] ? (
                      <div className="mt-3">
                        <div className="text-sm leading-6 text-white/88">&quot;{latestHighlight.bestMoments[0].quote}&quot;</div>
                        <div className="mt-2 text-xs leading-5 text-white/50">{latestHighlight.bestMoments[0].context}</div>
                        {topShareCard && (
                          <div className="mt-3 flex gap-2">
                            <button type="button" onClick={() => void shareMoment(topShareCard)} className="control-button px-3 py-2 text-xs">
                              share
                            </button>
                            <a href={topShareCard.shareUrl} target="_blank" rel="noreferrer" className="control-button px-3 py-2 text-xs text-white/76 no-underline">
                              open
                            </a>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-3 text-sm leading-6 text-white/48">Highlights appear here after rooms close.</div>
                    )}
                  </div>
                </div>
              )}

              {dockMode === 'friends' && (
                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.34em] text-white/32">friends live</div>
                    <div className="mt-3 grid gap-2">
                      {(presence?.friendsOnline ?? []).slice(0, 3).map((friend) => (
                        (() => {
                          const liveRoom = rifts.find((room) => room.id === friend.roomId);
                          const timingLabel =
                            liveRoom?.type === 'context' || friend.timeLeftSeconds < 0
                              ? 'open until empty'
                              : `${Math.max(1, Math.round(friend.timeLeftSeconds / 60))}m`;

                          return (
                            <button
                              key={`${friend.username}-${friend.roomId}`}
                              type="button"
                              onClick={() => {
                                void joinFriendRoom(friend.roomId, friend.roomTopic);
                              }}
                              disabled={!canJoin || !friend.joinable}
                              className="control-button flex items-start justify-between gap-3 px-3 py-3 text-left disabled:opacity-40"
                            >
                              <div>
                                <div className="text-sm text-white/90">{friend.username}</div>
                                <div className="mt-1 text-xs leading-5 text-white/54">
                                  {friend.roomTopic} | {friend.roomUserCount}/{friend.roomMaxUsers} | {timingLabel}
                                </div>
                              </div>
                              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/44">join</span>
                            </button>
                          );
                        })()
                      ))}
                      {!presence?.friendsOnline?.length && <div className="text-sm text-white/46">No followed users are live right now.</div>}
                    </div>
                  </div>

                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.34em] text-white/32">network</div>
                    <div className="mt-3 grid gap-3">
                      <input
                        value={followHandle}
                        onChange={(event) => setFollowHandle(event.target.value.slice(0, 24))}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' && authSession && followHandle.trim()) {
                            followUserMutation.mutate({ username: followHandle.trim() });
                          }
                        }}
                        placeholder="follow a username"
                        className="signal-input text-sm"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (!authSession) {
                              toast({
                                title: 'Pick a name first',
                                description: 'Choose a name before following someone.',
                                variant: 'destructive',
                              });
                              return;
                            }
                            if (!followHandle.trim()) return;
                            followUserMutation.mutate({ username: followHandle.trim() });
                          }}
                          disabled={!followHandle.trim() || followUserMutation.isPending}
                          className="control-button px-3 py-2 text-xs disabled:opacity-35"
                        >
                          {followUserMutation.isPending ? 'following...' : 'follow'}
                        </button>
                        <button type="button" onClick={() => void copyInviteLink()} disabled={!authSession?.user.inviteCode} className="control-button px-3 py-2 text-xs disabled:opacity-35">
                          copy invite
                        </button>
                        <button type="button" onClick={() => void enableNotifications()} className="control-button px-3 py-2 text-xs">
                          {notificationPermission === 'granted' ? 'alerts on' : 'enable alerts'}
                        </button>
                      </div>
                      {pendingEcho && (
                        <div className="clean-panel-soft px-4 py-4">
                          <div className="font-mono text-[10px] uppercase tracking-[0.34em] text-[#9fdfff]">room echo</div>
                          <div className="mt-2 text-sm text-white/86">{pendingEcho.title}</div>
                          <div className="mt-2 text-xs leading-5 text-white/50">{pendingEcho.body}</div>
                          <button type="button" onClick={() => revealEcho(pendingEcho.id)} className="control-button mt-3 px-3 py-2 text-xs">
                            reveal once
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {dockMode === 'plan' && (
                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.34em] text-white/32">upcoming rooms</div>
                    <div className="mt-3 grid gap-2.5">
                      {scheduledRooms.slice(0, 3).map((room) => {
                        const minutes = Math.max(0, Math.round((new Date(room.scheduledFor).getTime() - Date.now()) / 60000));
                        return (
                          <button
                            key={room.id}
                            type="button"
                            onClick={() => {
                              void joinScheduledRoom(room);
                            }}
                            className="control-button flex items-start justify-between gap-3 px-3 py-3 text-left"
                          >
                            <div>
                              <div className="text-sm text-white/90">{room.topic}</div>
                              <div className="mt-1 text-xs leading-5 text-white/50">{room.creatorUsername} | {room.kind} | {minutes}m</div>
                            </div>
                            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/44">{minutes <= 10 ? 'join' : 'soon'}</span>
                          </button>
                        );
                      })}
                      {!scheduledRooms.length && <div className="text-sm text-white/46">No scheduled rooms yet.</div>}
                    </div>
                  </div>

                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.34em] text-white/32">schedule room</div>
                    <div className="mt-3 grid gap-3">
                      <input value={scheduleTopic} onChange={(event) => setScheduleTopic(event.target.value.slice(0, 60))} placeholder="future room topic" className="signal-input text-sm" />
                      <textarea value={scheduleDescription} onChange={(event) => setScheduleDescription(event.target.value.slice(0, 180))} placeholder="why should people show up?" rows={3} className="signal-area text-sm" />
                      <div className="grid gap-2 sm:grid-cols-2">
                        <input type="datetime-local" value={scheduledFor} onChange={(event) => setScheduledFor(event.target.value)} className="signal-input text-sm" />
                        <select value={scheduleKind} onChange={(event) => setScheduleKind(event.target.value as typeof scheduleKind)} className="signal-select text-sm">
                          <option value="open">open</option>
                          <option value="ama">AMA</option>
                          <option value="launch-party">launch party</option>
                          <option value="watch-party">watch party</option>
                          <option value="study-session">study session</option>
                        </select>
                      </div>
                      <button type="button" onClick={() => void scheduleTimeCapsule()} disabled={!scheduleTopic.trim() || !scheduledFor || scheduleRoomMutation.isPending} className="control-button px-3 py-3 text-xs disabled:opacity-35">
                        {scheduleRoomMutation.isPending ? 'scheduling...' : 'schedule room'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="landing-console clean-panel px-5 py-6 sm:px-6">
              <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.12, duration: 0.55 }} className="mx-auto flex h-[220px] w-[220px] items-center justify-center">
                <motion.div
                  animate={{
                    borderRadius: [
                      '56% 44% 62% 38% / 39% 60% 40% 61%',
                      '41% 59% 39% 61% / 63% 33% 67% 37%',
                      '58% 42% 55% 45% / 44% 52% 48% 56%',
                    ],
                    rotate: [0, 4, -3, 0],
                  }}
                  transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
                  className="relative flex h-full w-full items-center justify-center border backdrop-blur-xl"
                  style={{
                    background: `radial-gradient(circle at 30% 30%, ${identityGlow}55, transparent 60%), rgba(7, 10, 28, 0.82)`,
                    borderColor: identityGlow,
                    boxShadow: `0 0 70px ${identityGlow}42`,
                  }}
                >
                  <div className="flex w-[76%] flex-col gap-2.5 text-center">
                    <div className="font-mono text-[10px] uppercase tracking-[0.52em] text-white/40">your name</div>
                    <input
                      value={username}
                      onChange={(event) => setUsername(event.target.value.slice(0, 24))}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && customTopic.trim()) {
                          void enterRoom(customTopic);
                        }
                      }}
                      placeholder="pick any name"
                      className="w-full border-0 border-b border-white/20 bg-transparent px-0 pb-2.5 text-center text-xl font-medium text-white outline-none placeholder:text-white/24"
                    />
                    <div className="text-xs leading-5 text-white/46">{authSession ? `${authSession.user.username} is remembered.` : 'No signup wall. Choose a name and enter.'}</div>
                  </div>
                </motion.div>
              </motion.div>

              <div className="mt-6 grid grid-cols-2 gap-2">
                {(['participate', 'radio'] as const).map((mode) => {
                  const active = joinMode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setJoinMode(mode)}
                      className="control-button px-4 py-3 text-xs uppercase tracking-[0.24em]"
                      style={{
                        background: active ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.05)',
                        borderColor: active ? identityGlow : 'rgba(255,255,255,0.12)',
                        color: active ? '#ffffff' : 'rgba(255,255,255,0.58)',
                        boxShadow: active ? `0 0 26px ${identityGlow}26` : 'none',
                      }}
                    >
                      {mode === 'participate' ? 'enter live' : 'radio mode'}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                {([
                  ['standard', 'standard'],
                  ['quantum', 'quantum'],
                  ['context', 'context'],
                ] as const).map(([mode, label]) => {
                  const active = roomMode === mode;
                  const accent =
                    mode === 'context' ? '#7bf6d1' : mode === 'quantum' ? '#c77dff' : identityGlow;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setRoomMode(mode)}
                      className="control-button px-3 py-2 text-[10px] uppercase tracking-[0.24em]"
                      style={{
                        background: active ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.05)',
                        borderColor: active ? accent : 'rgba(255,255,255,0.12)',
                        color: active ? '#ffffff' : 'rgba(255,255,255,0.58)',
                        boxShadow: active ? `0 0 22px ${accent}22` : 'none',
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 grid gap-3">
                <input
                  value={customTopic}
                  onChange={(event) => setCustomTopic(event.target.value.slice(0, 60))}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && canJoin && customTopic.trim()) {
                      void enterRoom(customTopic, undefined, roomMode);
                    }
                  }}
                  placeholder="type a room topic"
                  className="signal-input text-sm"
                />

                <div className="px-1 text-xs leading-5 text-white/46">
                  <span className="text-white/74">{currentRoomModeLabel}</span> · {currentRoomModeHint}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      void enterRoom(
                        customTopic ||
                          (roomMode === 'context'
                            ? 'Context Drift'
                            : roomMode === 'quantum'
                              ? 'Quantum Drift'
                              : ''),
                        undefined,
                        roomMode,
                      )
                    }
                    disabled={!canJoin || (!customTopic.trim() && roomMode === 'standard')}
                    className="plasma-button plasma-button--primary px-4 py-3 disabled:opacity-35"
                    style={{
                      borderColor: roomMode === 'context' ? '#7bf6d1' : roomMode === 'quantum' ? '#c77dff' : identityGlow,
                      boxShadow: `0 0 30px ${roomMode === 'context' ? '#7bf6d1' : roomMode === 'quantum' ? '#c77dff' : identityGlow}22`,
                    }}
                  >
                    {roomMode === 'context' ? 'open context' : roomMode === 'quantum' ? 'open quantum' : 'join room'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const fallbackTopic =
                        roomMode === 'context'
                          ? 'Context Drift'
                          : roomMode === 'quantum'
                            ? 'Quantum Drift'
                            : topicSeeds[0];
                      setCustomTopic(fallbackTopic);
                    }}
                    className="plasma-button plasma-button--ghost px-4 py-3"
                  >
                    randomize
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {topicSeeds.slice(0, 4).map((topic) => (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => {
                        setCustomTopic(topic);
                        void enterRoom(
                          topic,
                          undefined,
                          roomMode === 'standard' && topic === 'Nightly Void' ? 'quantum' : roomMode,
                        );
                      }}
                      disabled={!canJoin}
                      className="control-button px-3 py-2 text-xs disabled:opacity-40"
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              </div>

              {(joinMutation.isPending || isAuthenticating) && <div className="mt-4 font-mono text-[10px] uppercase tracking-[0.42em] text-white/38">{isAuthenticating ? 'locking in your name...' : loadingMessage}</div>}
            </div>

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
