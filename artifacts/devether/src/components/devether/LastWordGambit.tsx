import { motion, AnimatePresence } from 'framer-motion';

interface LastWordGambitProps {
  isActive: boolean;
  winnerId: string | null;
  currentUserId: string;
  users: Record<string, { username: string; color: string }>;
}

export function LastWordGambit({ isActive, winnerId, currentUserId, users }: LastWordGambitProps) {
  return (
    <AnimatePresence>
      {isActive && !winnerId && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="fixed top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
        >
          <div
            className="px-5 py-2 rounded-full flex items-center gap-3"
            style={{
              background: 'rgba(255,50,50,0.1)',
              border: '1px solid rgba(255,50,50,0.4)',
              boxShadow: '0 0 20px rgba(255,50,50,0.2)',
            }}
          >
            <motion.div
              animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
              className="w-2 h-2 rounded-full bg-red-400"
            />
            <span className="font-mono text-xs text-red-300 tracking-wider uppercase">
              Last Word Gambit — get the final message
            </span>
          </div>
        </motion.div>
      )}

      {winnerId && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[80] pointer-events-none text-center"
        >
          {/* particle burst */}
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
              animate={{
                scale: 1,
                x: Math.cos((i / 8) * Math.PI * 2) * 120,
                y: Math.sin((i / 8) * Math.PI * 2) * 120,
                opacity: 0,
              }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="absolute w-2 h-2 rounded-full"
              style={{
                background: users[winnerId]?.color || '#00ffff',
                left: '50%',
                top: '50%',
              }}
            />
          ))}
          <div
            className="relative px-6 py-4 rounded-2xl"
            style={{
              background: `${users[winnerId]?.color || '#00ffff'}15`,
              border: `1px solid ${users[winnerId]?.color || '#00ffff'}60`,
              boxShadow: `0 0 60px ${users[winnerId]?.color || '#00ffff'}30`,
            }}
          >
            <p className="font-display text-2xl font-black text-white" style={{
              textShadow: `2px 0 2px rgba(255,0,255,0.8), -2px 0 2px rgba(0,255,255,0.8)`
            }}>
              {winnerId === currentUserId ? '🏆 LAST WORD' : `${users[winnerId]?.username || '?'} had the last word`}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
