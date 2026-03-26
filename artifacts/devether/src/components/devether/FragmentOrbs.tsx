import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Fragment } from '@/hooks/use-socket';

interface FragmentOrbsProps {
  fragments: Fragment[];
  currentUserId: string;
  onComplete: (fragmentId: string, completion: string) => void;
}

export function FragmentOrbs({ fragments, currentUserId, onComplete }: FragmentOrbsProps) {
  const [completing, setCompleting] = useState<string | null>(null);
  const [completion, setCompletion] = useState('');

  const handleComplete = useCallback((fragmentId: string) => {
    if (!completion.trim()) return;
    onComplete(fragmentId, completion);
    setCompleting(null);
    setCompletion('');
  }, [completion, onComplete]);

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 flex gap-4 flex-wrap justify-center max-w-3xl pointer-events-none">
      <AnimatePresence>
        {fragments.map((fragment, i) => {
          const progress = 1 - (Date.now() - new Date(fragment.createdAt).getTime()) / 90000;
          const canComplete = fragment.userId !== currentUserId;
          return (
            <motion.div
              key={fragment.id}
              initial={{ opacity: 0, y: -20, scale: 0.8 }}
              animate={{
                opacity: Math.max(0.3, progress),
                y: [0, -8, 0],
                scale: 1,
              }}
              exit={{ opacity: 0, scale: 0, y: -40 }}
              transition={{
                y: { duration: 2 + i * 0.3, repeat: Infinity, ease: 'easeInOut' },
                opacity: { duration: 0.3 },
              }}
              className="pointer-events-auto"
            >
              <div
                className="relative px-4 py-3 rounded-2xl cursor-pointer select-none"
                style={{
                  background: `${fragment.userColor}12`,
                  border: `1px dashed ${fragment.userColor}60`,
                  boxShadow: `0 0 20px ${fragment.userColor}20`,
                }}
                onClick={() => canComplete && setCompleting(completing === fragment.id ? null : fragment.id)}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="w-1.5 h-1.5 rounded-full animate-pulse"
                    style={{ backgroundColor: fragment.userColor }}
                  />
                  <span className="font-mono text-[10px] opacity-60" style={{ color: fragment.userColor }}>
                    {fragment.username}
                  </span>
                  <span className="font-mono text-[10px] text-white/20">fragment</span>
                </div>
                <p className="font-sans text-sm text-white/80 italic">
                  {fragment.content}
                  <span className="text-white/30 ml-1">...</span>
                </p>

                {/* timer arc */}
                <svg className="absolute -inset-1 w-[calc(100%+8px)] h-[calc(100%+8px)]" style={{ borderRadius: '1rem' }}>
                  <rect
                    x="1" y="1"
                    width="calc(100% - 2px)" height="calc(100% - 2px)"
                    rx="15" fill="none"
                    stroke={fragment.userColor}
                    strokeWidth="1"
                    strokeOpacity={progress * 0.4}
                    strokeDasharray={`${progress * 200} 200`}
                  />
                </svg>

                {canComplete && (
                  <div className="mt-1 text-[10px] font-mono text-white/30 text-center">
                    tap to complete →
                  </div>
                )}
              </div>

              {completing === fragment.id && canComplete && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 flex gap-2"
                >
                  <input
                    autoFocus
                    value={completion}
                    onChange={e => setCompletion(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleComplete(fragment.id)}
                    placeholder="complete the thought..."
                    className="flex-1 bg-black/60 border border-white/20 rounded-lg px-3 py-1.5 text-xs font-mono text-white outline-none focus:border-white/40"
                  />
                  <button
                    onClick={() => handleComplete(fragment.id)}
                    className="px-3 py-1.5 text-xs font-mono rounded-lg"
                    style={{ background: `${fragment.userColor}30`, color: fragment.userColor, border: `1px solid ${fragment.userColor}50` }}
                  >
                    ↵
                  </button>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
