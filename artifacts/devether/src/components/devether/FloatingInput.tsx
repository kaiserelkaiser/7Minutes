import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Send, Ghost, Puzzle, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface FloatingInputProps {
  onSendMessage: (msg: string, isBurst?: boolean) => void;
  onTyping: (isTyping: boolean) => void;
  onDropFragment?: (content: string) => void;
  isGhost: boolean;
  isRadio: boolean;
  onToggleGhost: () => void;
  vibeColor: string;
  burstAvailable: boolean;
  isChaos: boolean;
}

export function FloatingInput({
  onSendMessage, onTyping, onDropFragment, isGhost, isRadio,
  onToggleGhost, vibeColor, burstAvailable, isChaos
}: FloatingInputProps) {
  const [content, setContent] = useState('');
  const [mode, setMode] = useState<'message' | 'fragment'>('message');
  const [isBurstCharging, setIsBurstCharging] = useState(false);
  const [burstReady, setBurstReady] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const burstHoldRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    onTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => onTyping(false), 2000);
  };

  const handleSend = useCallback((forceBurst = false) => {
    const trimmed = content.trim();
    if (!trimmed || isGhost || isRadio) return;

    if (mode === 'fragment') {
      onDropFragment?.(trimmed);
    } else {
      onSendMessage(trimmed, forceBurst && burstAvailable);
    }
    setContent('');
    setBurstReady(false);
    onTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    textareaRef.current?.focus();
  }, [content, isGhost, isRadio, mode, burstAvailable, isBurstCharging, onDropFragment, onSendMessage, onTyping]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(burstReady);
    }
    // spacebar burst charging
    if (e.key === ' ' && content === '' && burstAvailable && !burstReady && mode === 'message') {
      e.preventDefault();
      setIsBurstCharging(true);
      burstHoldRef.current = setTimeout(() => {
        setBurstReady(true);
        setIsBurstCharging(false);
      }, 2000);
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent) => {
    if (e.key === ' ' && isBurstCharging) {
      setIsBurstCharging(false);
      if (burstHoldRef.current) clearTimeout(burstHoldRef.current);
    }
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (burstHoldRef.current) clearTimeout(burstHoldRef.current);
    };
  }, []);

  if (isRadio) {
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div className="px-6 py-3 rounded-full flex items-center gap-3 font-mono text-xs text-white/30"
          style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-white/20 animate-pulse" />
          radio mode — listening only
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[94%] max-w-2xl z-50">
      {/* mode tabs */}
      <div className="flex gap-2 mb-2 justify-center">
        {['message', 'fragment'].map(m => (
          <button
            key={m}
            onClick={() => setMode(m as 'message' | 'fragment')}
            className="font-mono text-[10px] px-3 py-1 rounded-full transition-all uppercase tracking-wider"
            style={{
              background: mode === m ? `${vibeColor}20` : 'rgba(0,0,0,0.3)',
              border: `1px solid ${mode === m ? vibeColor + '50' : 'rgba(255,255,255,0.05)'}`,
              color: mode === m ? vibeColor : 'rgba(255,255,255,0.3)',
            }}
          >
            {m === 'fragment' ? '◈ fragment' : '⊕ message'}
          </button>
        ))}
      </div>

      <motion.div
        animate={isBurstCharging ? { scale: [1, 1.01, 1], boxShadow: [`0 0 0 0 ${vibeColor}00`, `0 0 20px 4px ${vibeColor}40`, `0 0 0 0 ${vibeColor}00`] } : {}}
        transition={{ duration: 0.3, repeat: isBurstCharging ? Infinity : 0 }}
        className={cn(
          "rounded-2xl p-2 flex items-end gap-2 transition-all duration-300",
          isGhost && "opacity-40 grayscale"
        )}
        style={{
          background: isChaos ? 'rgba(30, 8, 0, 0.7)' : 'rgba(0, 8, 20, 0.7)',
          border: `1px solid ${burstReady ? '#ff6600' : isChaos ? 'rgba(255,80,0,0.4)' : isGhost ? 'rgba(255,255,255,0.05)' : vibeColor + '40'}`,
          boxShadow: burstReady ? `0 0 20px rgba(255,100,0,0.4)` : `0 0 20px ${vibeColor}10`,
          backdropFilter: 'blur(16px)',
        }}
      >
        <button
          onClick={onToggleGhost}
          className={cn("p-2.5 rounded-full transition-all hover:bg-white/10", isGhost ? "text-white" : "text-white/30")}
          title="Ghost Mode"
        >
          <Ghost size={18} className={isGhost ? "animate-pulse" : ""} />
        </button>

        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          placeholder={
            isGhost ? "ghosts cannot speak..." :
            mode === 'fragment' ? "drop a half-formed thought..." :
            burstReady ? "⚡ BURST READY — press enter..." :
            isBurstCharging ? "charging burst..." :
            burstAvailable ? "hold space (empty) to charge burst..." :
            "transmit thought..."
          }
          disabled={isGhost}
          rows={Math.min(Math.max(content.split('\n').length, 1), 4)}
          className="flex-1 bg-transparent border-none outline-none resize-none text-white placeholder:text-white/25 py-2.5 font-sans text-sm leading-relaxed"
          style={{
            minHeight: '40px',
            color: burstReady ? '#ff8833' : mode === 'fragment' ? 'rgba(180,130,255,0.9)' : 'white',
          }}
        />

        {/* fragment icon */}
        {mode === 'fragment' && (
          <div className="p-2 opacity-40">
            <Puzzle size={16} style={{ color: 'rgba(180,130,255,0.8)' }} />
          </div>
        )}

        {/* burst indicator */}
        {burstAvailable && mode === 'message' && !isGhost && (
          <AnimatePresence>
            {isBurstCharging && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute -top-8 right-12 font-mono text-[10px] text-orange-400"
              >
                charging...
              </motion.div>
            )}
          </AnimatePresence>
        )}

        <button
          onClick={() => handleSend(burstReady)}
          disabled={!content.trim() || isGhost}
          className="p-2.5 rounded-full transition-all disabled:opacity-20 shrink-0"
          style={{
            background: burstReady ? 'rgba(255,100,0,0.2)' : content.trim() ? `${vibeColor}15` : 'rgba(255,255,255,0.03)',
            color: burstReady ? '#ff6600' : content.trim() && !isGhost ? vibeColor : 'rgba(255,255,255,0.3)',
            boxShadow: burstReady ? `0 0 12px rgba(255,100,0,0.5)` : content.trim() && !isGhost ? `0 0 10px ${vibeColor}30` : 'none',
          }}
        >
          {burstReady ? <Zap size={18} /> : <Send size={18} />}
        </button>
      </motion.div>

      {/* burst hint */}
      {burstAvailable && !burstReady && mode === 'message' && (
        <p className="text-center font-mono text-[9px] text-white/15 mt-1">
          hold space on empty input to charge burst mode
        </p>
      )}
      {!burstAvailable && mode === 'message' && (
        <p className="text-center font-mono text-[9px] text-white/10 mt-1">burst used</p>
      )}
    </div>
  );
}
