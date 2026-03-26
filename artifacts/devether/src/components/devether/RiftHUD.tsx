import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Zap, Radio } from 'lucide-react';
import { RiftUser } from '@/hooks/use-socket';

interface RiftHUDProps {
  topic: string;
  isQuantum?: boolean;
  users: Record<string, RiftUser>;
  timeLeft: number;
  vibeColor: string;
  temperature: number;
  isChaosMode: boolean;
}

export function RiftHUD({ topic, isQuantum, users, timeLeft, vibeColor, temperature, isChaosMode }: RiftHUDProps) {
  const activeUsers = Object.values(users).filter(u => !u.isGhost && !u.isRadio);
  const ghosts = Object.values(users).filter(u => u.isGhost);
  const radios = Object.values(users).filter(u => u.isRadio);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const isUrgent = timeLeft < 60;
  const isLastWord = timeLeft < 30;

  const tempBg = isChaosMode
    ? 'rgba(255, 80, 0, 0.15)'
    : temperature > 50
    ? 'rgba(170, 50, 200, 0.1)'
    : 'rgba(0, 20, 40, 0.5)';

  return (
    <div className="fixed top-0 left-0 w-full p-4 sm:p-6 z-40 pointer-events-none flex justify-between items-start gap-4">
      {/* Left: Topic + Users */}
      <div className="flex flex-col gap-3 min-w-0">
        <div
          className="px-4 py-2 rounded-xl inline-flex items-center gap-2 max-w-[280px]"
          style={{
            background: tempBg,
            border: `1px solid ${isChaosMode ? 'rgba(255,80,0,0.4)' : vibeColor + '30'}`,
            boxShadow: isChaosMode ? '0 0 20px rgba(255,80,0,0.2)' : `0 0 10px ${vibeColor}15`,
            backdropFilter: 'blur(12px)',
          }}
        >
          {isQuantum && (
            <motion.span
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="font-mono text-purple-300 text-xs"
            >
              ⟨ψ⟩
            </motion.span>
          )}
          <h1 className="font-display text-sm sm:text-base tracking-widest text-white/90 uppercase truncate">
            {topic}
          </h1>
          {isChaosMode && (
            <motion.span
              animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
              transition={{ duration: 0.3, repeat: Infinity }}
              className="font-mono text-[10px] text-orange-400 shrink-0"
            >
              CHAOS
            </motion.span>
          )}
        </div>

        {/* Temperature bar */}
        {temperature > 10 && (
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] text-white/30 uppercase">heat</span>
            <div className="w-24 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <motion.div
                animate={{ width: `${temperature}%` }}
                transition={{ duration: 0.5 }}
                className="h-full rounded-full"
                style={{
                  background: isChaosMode
                    ? 'linear-gradient(to right, #ff4400, #ff8800)'
                    : temperature > 50
                    ? 'linear-gradient(to right, #aa44ff, #ff00aa)'
                    : `linear-gradient(to right, #0088ff, ${vibeColor})`,
                }}
              />
            </div>
          </div>
        )}

        {/* Users */}
        <div className="flex flex-col gap-1.5">
          <AnimatePresence>
            {activeUsers.map(u => (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex items-center gap-2"
              >
                <motion.div
                  className="w-1.5 h-1.5 rounded-full"
                  animate={u.isTyping ? { scale: [1, 1.8, 1], opacity: [1, 0.6, 1] } : { scale: 1 }}
                  transition={{ duration: 0.4, repeat: u.isTyping ? Infinity : 0 }}
                  style={{ backgroundColor: u.color, boxShadow: `0 0 6px ${u.color}` }}
                />
                <span className="font-mono text-xs text-white/70">{u.username}</span>
                {u.isTyping && (
                  <motion.span
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 0.6, repeat: Infinity }}
                    className="text-[9px] text-white/30"
                  >
                    ···
                  </motion.span>
                )}
                {/* mini momentum bar */}
                {u.momentum > 20 && (
                  <div
                    className="h-0.5 rounded-full"
                    style={{
                      width: `${Math.min(u.momentum * 0.3, 20)}px`,
                      background: u.color,
                      opacity: 0.4,
                    }}
                  />
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          {ghosts.length > 0 && (
            <div className="flex items-center gap-2 opacity-40 mt-1">
              <div className="w-1.5 h-1.5 border border-white/40 rounded-full" />
              <span className="font-mono text-[10px] text-white/40">{ghosts.length} ghost{ghosts.length > 1 ? 's' : ''}</span>
            </div>
          )}
          {radios.length > 0 && (
            <div className="flex items-center gap-2 opacity-30 mt-0.5">
              <Radio size={10} className="text-white/30" />
              <span className="font-mono text-[10px] text-white/30">{radios.length} listening</span>
            </div>
          )}
        </div>
      </div>

      {/* Right: Timer + Vibe */}
      <div className="flex flex-col items-end gap-3 shrink-0">
        <motion.div
          animate={isLastWord
            ? { scale: [1, 1.05, 1], boxShadow: ['0 0 0px rgba(255,50,50,0)', '0 0 20px rgba(255,50,50,0.5)', '0 0 0px rgba(255,50,50,0)'] }
            : isUrgent
            ? { opacity: [1, 0.7, 1] }
            : {}
          }
          transition={{ duration: 0.5, repeat: Infinity }}
          className="px-4 py-2 rounded-xl flex items-center gap-2"
          style={{
            background: isLastWord ? 'rgba(255,30,30,0.15)' : isUrgent ? 'rgba(255,100,0,0.1)' : 'rgba(0,20,40,0.5)',
            border: `1px solid ${isLastWord ? 'rgba(255,30,30,0.5)' : isUrgent ? 'rgba(255,100,0,0.3)' : 'rgba(255,255,255,0.08)'}`,
            backdropFilter: 'blur(12px)',
          }}
        >
          <Clock size={14} style={{ color: isLastWord ? '#ff4444' : isUrgent ? '#ffaa00' : 'rgba(255,255,255,0.5)' }} />
          <span
            className="font-mono font-bold tracking-widest text-sm"
            style={{ color: isLastWord ? '#ff4444' : isUrgent ? '#ffaa00' : 'rgba(255,255,255,0.9)' }}
          >
            {mins.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}
          </span>
        </motion.div>

        <div
          className="px-3 py-1.5 rounded-full flex items-center gap-2"
          style={{
            background: 'rgba(0,20,40,0.5)',
            border: '1px solid rgba(255,255,255,0.06)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <Zap size={12} style={{ color: vibeColor }} />
          <motion.div
            className="w-12 h-1 rounded-full overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            <motion.div
              animate={{ backgroundColor: vibeColor }}
              transition={{ duration: 1 }}
              className="h-full w-full rounded-full"
              style={{ boxShadow: `0 0 6px ${vibeColor}` }}
            />
          </motion.div>
        </div>

        {/* chaos mode intensity */}
        {isChaosMode && (
          <motion.div
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 0.3, repeat: Infinity }}
            className="font-mono text-[10px] text-orange-400 text-right"
          >
            ⚡ CHAOS MODE ⚡
            <br />
            <span className="text-orange-400/50">2min fade active</span>
          </motion.div>
        )}
      </div>
    </div>
  );
}
