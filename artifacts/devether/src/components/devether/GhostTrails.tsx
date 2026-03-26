import { motion, AnimatePresence } from 'framer-motion';
import { GhostTrail } from '@/hooks/use-socket';
import { useState } from 'react';

export function GhostTrailDisplay({ trails }: { trails: GhostTrail[] }) {
  const [hoveredTrail, setHoveredTrail] = useState<string | null>(null);

  return (
    <div className="fixed bottom-24 right-6 z-40 flex flex-col gap-2 items-end pointer-events-none">
      <AnimatePresence>
        {trails.map(trail => {
          const secondsAgo = Math.floor((Date.now() - new Date(trail.leftAt).getTime()) / 1000);
          const progress = 1 - (Date.now() - new Date(trail.leftAt).getTime()) / 30000;
          return (
            <motion.div
              key={trail.userId + trail.leftAt}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: Math.max(0, progress) * 0.8 }}
              exit={{ opacity: 0, x: 50, scale: 0.8 }}
              transition={{ duration: 0.4 }}
              className="pointer-events-auto"
              onMouseEnter={() => setHoveredTrail(trail.userId)}
              onMouseLeave={() => setHoveredTrail(null)}
            >
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-full cursor-default"
                style={{
                  background: `${trail.color}15`,
                  border: `1px solid ${trail.color}30`,
                }}
              >
                <div
                  className="w-2 h-2 rounded-full opacity-60"
                  style={{ backgroundColor: trail.color, filter: `blur(1px)` }}
                />
                <span className="font-mono text-xs" style={{ color: trail.color, opacity: 0.7 }}>
                  {trail.username}
                </span>
                <span className="font-mono text-[10px] text-white/30">
                  {secondsAgo}s ago
                </span>
              </div>

              {hoveredTrail === trail.userId && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute right-0 bottom-full mb-1 w-56 px-3 py-2 rounded-xl font-mono text-xs"
                  style={{
                    background: 'rgba(5, 2, 20, 0.95)',
                    border: `1px solid ${trail.color}40`,
                    color: 'rgba(255,255,255,0.7)',
                  }}
                >
                  <span className="text-white/40">was discussing:</span>
                  <br />
                  <span style={{ color: trail.color }}>{trail.lastTopic}</span>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
