import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { getRuntimeConfig } from '@/lib/runtime-config';

export interface RiftMessage {
  id: string;
  userId: string;
  username: string;
  userColor: string;
  content: string;
  createdAt: string;
  fadeStartAt: string;
  expiresAt: string;
  isBurst: boolean;
  decayStage: 0 | 1 | 2 | 3 | 4;
  sentiment: 'positive' | 'negative' | 'neutral';
}

export interface RiftUser {
  id: string;
  username: string;
  color: string;
  isGhost: boolean;
  isRadio: boolean;
  isTyping: boolean;
  x?: number;
  y?: number;
  vibeScore: number;
  momentum: number;
  burstUsed: boolean;
}

export interface Fragment {
  id: string;
  userId: string;
  username: string;
  userColor: string;
  content: string;
  createdAt: string;
  expiresAt: string;
}

export interface GhostTrail {
  userId: string;
  username: string;
  color: string;
  lastTopic: string;
  leftAt: string;
  expiresAt: string;
}

export interface EchoMoment {
  message1: { id: string; content: string; userColor: string; username: string };
  message2: { id: string; content: string; userColor: string; username: string };
  mergedContent: string;
}

export interface RiftState {
  id: string;
  topic: string;
  isQuantum: boolean;
  revealedTopic?: string;
  temperature: number;
  isChaosMode: boolean;
  vibeColor: string;
  currentCatalyst: string | null;
  expiresAt: string;
}

export function useSocketRift(
  riftId: string | null,
  userId: string | null,
  username: string | null,
  color: string | null,
  isRadio: boolean
) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<RiftMessage[]>([]);
  const [users, setUsers] = useState<Record<string, RiftUser>>({});
  const [fragments, setFragments] = useState<Fragment[]>([]);
  const [ghostTrails, setGhostTrails] = useState<GhostTrail[]>([]);
  const [vibe, setVibe] = useState<string>('#00ffff');
  const [timeLeft, setTimeLeft] = useState<number>(420);
  const [isClosed, setIsClosed] = useState(false);
  const [riftState, setRiftState] = useState<RiftState | null>(null);
  const [echoMoment, setEchoMoment] = useState<EchoMoment | null>(null);
  const [catalyst, setCatalyst] = useState<string | null>(null);
  const [isLastWordGambit, setIsLastWordGambit] = useState(false);
  const [lastWordWinner, setLastWordWinner] = useState<string | null>(null);
  const [socketError, setSocketError] = useState<string | null>(null);
  const lastMessageRef = useRef<string | null>(null);

  useEffect(() => {
    if (!riftId || !userId || !username || !color) return;
    installAudioUnlock();
    const socketOrigin = getRuntimeConfig().socketOrigin ?? "/";

    const socket = io(socketOrigin, {
      path: '/socket.io',
      reconnectionDelayMax: 10000,
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      setSocketError(null);
      socket.emit('join-rift', { riftId, userId });
    });

    socket.on('disconnect', () => setIsConnected(false));
    socket.on('rift-error', (data: { message?: string }) => {
      setSocketError(data.message ?? 'Rift connection failed');
    });

    socket.on('rift-state', (data: {
      rift: RiftState;
      users: RiftUser[];
      messages: RiftMessage[];
      fragments: Fragment[];
      ghostTrails: GhostTrail[];
      vibeColor: string;
    }) => {
      const usersMap: Record<string, RiftUser> = {};
      if (Array.isArray(data.users)) data.users.forEach(u => { usersMap[u.id] = u; });
      setUsers(usersMap);
      setMessages(data.messages || []);
      setFragments(data.fragments || []);
      setGhostTrails(data.ghostTrails || []);
      setVibe(data.vibeColor || '#00ffff');
      setRiftState(data.rift);
      if (data.rift?.currentCatalyst) setCatalyst(data.rift.currentCatalyst);
      const expires = new Date(data.rift.expiresAt).getTime();
      setTimeLeft(Math.max(0, Math.floor((expires - Date.now()) / 1000)));
    });

    socket.on('new-message', (data: { message: RiftMessage }) => {
      setMessages(prev => [...prev, data.message]);
      lastMessageRef.current = data.message.userId;
      playAudio('blip', data.message.sentiment);
    });

    socket.on('message-decay', (data: { messageId: string; stage: 0 | 1 | 2 | 3 | 4 }) => {
      setMessages(prev => prev.map(m =>
        m.id === data.messageId ? { ...m, decayStage: data.stage } : m
      ));
    });

    socket.on('message-faded', (data: { messageId: string }) => {
      setMessages(prev => prev.filter(m => m.id !== data.messageId));
    });

    socket.on('user-joined', (data: { user: RiftUser }) => {
      setUsers(prev => ({ ...prev, [data.user.id]: data.user }));
      setGhostTrails(prev => prev.filter(t => t.userId !== data.user.id));
      playAudio('chime', 'neutral');
    });

    socket.on('user-left', (data: { userId: string }) => {
      setUsers(prev => { const n = { ...prev }; delete n[data.userId]; return n; });
    });

    socket.on('ghost-trail', (data: { trail: GhostTrail }) => {
      setGhostTrails(prev => [...prev.filter(t => t.userId !== data.trail.userId), data.trail]);
      setTimeout(() => {
        setGhostTrails(prev => prev.filter(t => t.userId !== data.trail.userId));
      }, 30000);
    });

    socket.on('user-updated', (data: { userId: string; isGhost: boolean }) => {
      setUsers(prev => prev[data.userId] ? { ...prev, [data.userId]: { ...prev[data.userId], isGhost: data.isGhost } } : prev);
    });

    socket.on('user-vibe-update', (data: { userId: string; vibeScore: number; momentum: number; burstUsed?: boolean }) => {
      setUsers(prev => prev[data.userId] ? {
        ...prev,
        [data.userId]: {
          ...prev[data.userId],
          vibeScore: data.vibeScore,
          momentum: data.momentum,
          burstUsed: data.burstUsed ?? prev[data.userId].burstUsed,
        }
      } : prev);
    });

    socket.on('typing-update', (data: { typingUsers: string[] }) => {
      setUsers(prev => {
        const n = { ...prev };
        Object.keys(n).forEach(k => { n[k] = { ...n[k], isTyping: data.typingUsers.includes(k) }; });
        return n;
      });
    });

    socket.on('vibe-update', (data: { vibeColor: string; temperature: number; isChaosMode: boolean }) => {
      setVibe(data.vibeColor);
      setRiftState(prev => prev ? { ...prev, vibeColor: data.vibeColor, temperature: data.temperature, isChaosMode: data.isChaosMode } : prev);
    });

    socket.on('echo-moment', (data: EchoMoment) => {
      setEchoMoment(data);
      playAudio('echo', 'neutral');
      setTimeout(() => setEchoMoment(null), 5000);
    });

    socket.on('catalyst-drop', (data: { catalyst: string }) => {
      setCatalyst(data.catalyst);
      playAudio('catalyst', 'neutral');
      setTimeout(() => setCatalyst(null), 12000);
    });

    socket.on('new-fragment', (data: { fragment: Fragment }) => {
      setFragments(prev => [...prev, data.fragment]);
    });

    socket.on('fragment-completed', (data: { fragmentId: string }) => {
      setFragments(prev => prev.filter(f => f.id !== data.fragmentId));
    });

    socket.on('fragment-expired', (data: { fragmentId: string }) => {
      setFragments(prev => prev.filter(f => f.id !== data.fragmentId));
    });

    socket.on('rift-closing', (data: { timeLeft: number }) => {
      setTimeLeft(Math.floor(data.timeLeft / 1000));
    });

    socket.on('last-word-gambit', () => {
      setIsLastWordGambit(true);
      playAudio('lastword', 'neutral');
    });

    socket.on('rift-closed', (data?: { lastWordWinnerId?: string | null }) => {
      setLastWordWinner(data?.lastWordWinnerId ?? lastMessageRef.current);
      setIsClosed(true);
      vibrate([80, 40, 120]);
      playAudio('implode', 'neutral');
    });

    const countdown = setInterval(() => setTimeLeft(prev => Math.max(0, prev - 1)), 1000);

    return () => {
      socket.disconnect();
      clearInterval(countdown);
    };
  }, [riftId, userId, username, color, isRadio]);

  const sendMessage = useCallback((content: string, isBurst = false) => {
    if (socketRef.current && content.trim()) {
      socketRef.current.emit('send-message', { riftId, userId, content, isBurst });
    }
  }, [riftId, userId]);

  const setTyping = useCallback((isTyping: boolean) => {
    if (socketRef.current) {
      socketRef.current.emit(isTyping ? 'typing-start' : 'typing-stop', { riftId, userId });
    }
  }, [riftId, userId]);

  const toggleGhostMode = useCallback((isGhost: boolean) => {
    if (socketRef.current) socketRef.current.emit('ghost-mode', { riftId, userId, isGhost });
  }, [riftId, userId]);

  const dropFragment = useCallback((content: string) => {
    if (socketRef.current && content.trim()) {
      socketRef.current.emit('drop-fragment', { riftId, userId, content });
    }
  }, [riftId, userId]);

  const completeFragment = useCallback((fragmentId: string, completion: string) => {
    if (socketRef.current && completion.trim()) {
      socketRef.current.emit('complete-fragment', { riftId, userId, fragmentId, completion });
    }
  }, [riftId, userId]);

  return {
    isConnected, messages, users, fragments, ghostTrails, vibe, timeLeft,
    isClosed, riftState, echoMoment, catalyst, isLastWordGambit, lastWordWinner, socketError,
    sendMessage, setTyping, toggleGhostMode, dropFragment, completeFragment,
  };
}

let audioCtx: AudioContext | null = null;
let audioUnlockInstalled = false;

function installAudioUnlock() {
  if (typeof window === 'undefined' || audioUnlockInstalled) return;

  const unlock = () => {
    const ctx = getAudioCtx();
    if (ctx && ctx.state === 'suspended') {
      void ctx.resume();
    }
  };

  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('keydown', unlock, { passive: true });
  audioUnlockInstalled = true;
}

function getAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch { return null; }
  }
  return audioCtx;
}

function playAudio(type: 'blip' | 'chime' | 'implode' | 'echo' | 'catalyst' | 'lastword', sentiment: 'positive' | 'negative' | 'neutral') {
  const ctx = getAudioCtx();
  if (!ctx || ctx.state === 'suspended') return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  const now = ctx.currentTime;

  if (type === 'blip') {
    const freq = sentiment === 'positive' ? 900 : sentiment === 'negative' ? 300 : 700;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.5, now + 0.12);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.start(now); osc.stop(now + 0.12);
  } else if (type === 'chime') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1400, now);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.6);
    osc.start(now); osc.stop(now + 0.6);
  } else if (type === 'echo') {
    vibrate([50, 30, 50]);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.5);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0, now + 1.5);
    osc.start(now); osc.stop(now + 1.5);
  } else if (type === 'catalyst') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.setValueAtTime(550, now + 0.1);
    osc.frequency.setValueAtTime(660, now + 0.2);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.5);
    osc.start(now); osc.stop(now + 0.5);
  } else if (type === 'lastword') {
    vibrate(60);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.linearRampToValueAtTime(440, now + 1);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.linearRampToValueAtTime(0, now + 1);
    osc.start(now); osc.stop(now + 1);
  } else if (type === 'implode') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.linearRampToValueAtTime(20, now + 2);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0, now + 2);
    osc.start(now); osc.stop(now + 2);
  }
}

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}
